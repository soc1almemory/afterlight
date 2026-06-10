import fs from 'node:fs';
import path from 'node:path';
import type {
  Category,
  CreateTaskInput,
  SystemQuickAction,
  Task,
  TaskScope,
  TelegramBotStatus,
  TelegramConfigInput,
} from '../../shared/types';
import { createTask, deleteTask, listAppData, listCategories, listTasks, toggleTask } from '../storage/repositories';
import { getStoragePaths } from '../storage/database';

type TelegramConversation =
  | {
      categoryId?: string;
      dueDate?: string;
      mode: 'awaiting_task_text';
      scope: TaskScope;
    }
  | undefined;

interface TelegramConfig {
  botUsername?: string;
  chatId?: number;
  conversation?: TelegramConversation;
  enabled: boolean;
  lastUpdateId?: number;
  token?: string;
}

interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
}

interface TelegramMessage {
  chat: TelegramChat;
  date: number;
  from?: TelegramUser;
  message_id: number;
  text?: string;
}

interface TelegramUpdate {
  callback_query?: TelegramCallbackQuery;
  message?: TelegramMessage;
  update_id: number;
}

interface TelegramCallbackQuery {
  data?: string;
  from: TelegramUser;
  id: string;
  message?: TelegramMessage;
}

interface InlineKeyboardButton {
  callback_data: string;
  text: string;
}

interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

interface ReplyKeyboardButton {
  text: string;
}

interface ReplyKeyboardMarkup {
  is_persistent?: boolean;
  keyboard: ReplyKeyboardButton[][];
  resize_keyboard?: boolean;
}

type TelegramReplyMarkup = InlineKeyboardMarkup | ReplyKeyboardMarkup;

interface TelegramApiResponse<T> {
  description?: string;
  ok: boolean;
  result: T;
}

const POLL_TIMEOUT_SECONDS = 25;
const POLL_RETRY_DELAY_MS = 5000;
const TASK_LIST_LIMIT = 8;

const menuLabels = {
  addTask: '➕ Добавить задачу',
  categories: '📂 Категории',
  help: '❓ Помощь',
  inbox: '📥 Входящие',
  openApp: '⚙️ Открыть Afterlight',
  today: '📅 Сегодня',
  week: '🗓 Неделя',
} as const;

const mainMenuKeyboard: ReplyKeyboardMarkup = {
  is_persistent: true,
  keyboard: [
    [{ text: menuLabels.addTask }, { text: menuLabels.inbox }],
    [{ text: menuLabels.today }, { text: menuLabels.week }],
    [{ text: menuLabels.categories }, { text: menuLabels.openApp }],
    [{ text: menuLabels.help }],
  ],
  resize_keyboard: true,
};

let isRunning = false;
let lastError: string | undefined;
let lastUpdateAt: string | undefined;
let pollAbortController: AbortController | undefined;
let pollSessionId = 0;
let pollTimer: NodeJS.Timeout | undefined;
let onDataChanged: (() => void) | undefined;
let onQuickAction: ((action: SystemQuickAction) => void) | undefined;

export const configureTelegramBotRuntime = (options: {
  onDataChanged: () => void;
  onQuickAction?: (action: SystemQuickAction) => void;
}) => {
  onDataChanged = options.onDataChanged;
  onQuickAction = options.onQuickAction;
};

export const getTelegramBotStatus = (): TelegramBotStatus => {
  const config = readConfig();

  return {
    botUsername: config.botUsername,
    chatId: config.chatId,
    enabled: config.enabled,
    hasToken: Boolean(config.token),
    isRunning,
    lastError,
    lastUpdateAt,
  };
};

export const updateTelegramBotConfig = async (input: TelegramConfigInput): Promise<TelegramBotStatus> => {
  const currentConfig = readConfig();
  const nextConfig: TelegramConfig = {
    ...currentConfig,
    enabled: input.enabled,
    token: cleanToken(input.token) ?? currentConfig.token,
  };

  if (input.token !== undefined) {
    nextConfig.botUsername = undefined;
    nextConfig.chatId = undefined;
    nextConfig.conversation = undefined;
    nextConfig.lastUpdateId = undefined;
  }

  writeConfig(nextConfig);

  if (nextConfig.enabled && nextConfig.token) {
    await restartTelegramBot();
  } else {
    stopTelegramBot();
  }

  return getTelegramBotStatus();
};

export const disconnectTelegramBot = (): TelegramBotStatus => {
  stopTelegramBot();
  writeConfig({ enabled: false });
  lastError = undefined;
  lastUpdateAt = undefined;
  return getTelegramBotStatus();
};

export const testTelegramBotConnection = async (token?: string): Promise<TelegramBotStatus> => {
  const config = readConfig();
  const tokenToTest = cleanToken(token) ?? config.token;

  if (!tokenToTest) {
    lastError = 'Telegram token is not configured.';
    return getTelegramBotStatus();
  }

  try {
    const bot = await telegramApi<{ id: number; username?: string }>(tokenToTest, 'getMe');
    writeConfig({ ...config, botUsername: bot.username });
    await setupBotCommands(tokenToTest);
    lastError = undefined;
    lastUpdateAt = new Date().toISOString();
  } catch (error) {
    lastError = getErrorMessage(error);
  }

  return getTelegramBotStatus();
};

export const restartTelegramBot = async () => {
  stopTelegramBot();
  const config = readConfig();

  if (!config.enabled || !config.token) {
    return;
  }

  isRunning = true;
  lastError = undefined;
  const sessionId = startPollingSession();

  try {
    const bot = await telegramApi<{ id: number; username?: string }>(config.token, 'getMe');
    writeConfig({ ...config, botUsername: bot.username });
    await setupBotCommands(config.token);
  } catch (error) {
    if (isCurrentPollingSession(sessionId)) {
      const message = getErrorMessage(error);

      if (isNetworkFetchFailure(message)) {
        lastError = 'Telegram connection failed. Retrying...';
        scheduleNextPoll(POLL_RETRY_DELAY_MS, sessionId);
        return;
      }

      lastError = message;
      isRunning = false;
    }
    return;
  }

  void pollTelegram(sessionId);
};

export const stopTelegramBot = () => {
  isRunning = false;
  pollSessionId += 1;
  pollAbortController?.abort();
  pollAbortController = undefined;

  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = undefined;
  }
};

const pollTelegram = async (sessionId: number) => {
  if (!isRunning || !isCurrentPollingSession(sessionId)) {
    return;
  }

  const config = readConfig();

  if (!config.enabled || !config.token) {
    if (isCurrentPollingSession(sessionId)) {
      stopTelegramBot();
    }
    return;
  }

  try {
    pollAbortController = new AbortController();
    const updates = await telegramApi<TelegramUpdate[]>(config.token, 'getUpdates', {
      allowed_updates: ['callback_query', 'message'],
      offset: config.lastUpdateId ? config.lastUpdateId + 1 : undefined,
      timeout: POLL_TIMEOUT_SECONDS,
    }, pollAbortController.signal);

    let nextConfig = readConfig();
    for (const update of updates) {
      nextConfig = {
        ...nextConfig,
        lastUpdateId: Math.max(nextConfig.lastUpdateId ?? 0, update.update_id),
      };
      writeConfig(nextConfig);
      await handleUpdate(update, nextConfig.token);
    }

    lastError = undefined;
    lastUpdateAt = new Date().toISOString();
    scheduleNextPoll(0, sessionId);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return;
    }

    if (isRunning && isCurrentPollingSession(sessionId)) {
      const message = getErrorMessage(error);

      if (isTelegramPollingConflict(message)) {
        stopTelegramBot();
        lastError = 'Telegram bot is already running in another Afterlight window. Close the duplicate app instance and start again.';
        return;
      }

      lastError = isNetworkFetchFailure(message) ? 'Telegram connection failed. Retrying...' : message;
      scheduleNextPoll(POLL_RETRY_DELAY_MS, sessionId);
    }
  }
};

const scheduleNextPoll = (delayMs: number, sessionId: number) => {
  if (!isRunning || !isCurrentPollingSession(sessionId)) {
    return;
  }

  pollTimer = setTimeout(() => {
    void pollTelegram(sessionId);
  }, delayMs);
};

const startPollingSession = () => {
  pollSessionId += 1;
  return pollSessionId;
};

const isCurrentPollingSession = (sessionId: number) => sessionId === pollSessionId;

const handleUpdate = async (update: TelegramUpdate, token?: string) => {
  if (update.callback_query && token) {
    await handleCallbackQuery(update.callback_query, token);
    return;
  }

  const message = update.message;

  if (!message?.text || !token) {
    return;
  }

  const config = readConfig();
  const text = message.text.trim();

  if (!config.chatId) {
    if (text.startsWith('/start')) {
      writeConfig({ ...config, chatId: message.chat.id, conversation: undefined });
      await sendMessage(
        token,
        message.chat.id,
        'Afterlight подключён. Используйте кнопки меню или отправьте текст задачи.',
        mainMenuKeyboard,
      );
      return;
    }

    await sendMessage(token, message.chat.id, 'Откройте настройки Afterlight и отправьте /start, чтобы подключить этот чат.');
    return;
  }

  if (message.chat.id !== config.chatId) {
    await sendMessage(token, message.chat.id, 'This bot is already connected to another Afterlight workspace.');
    return;
  }

  if (config.conversation) {
    await handleConversationMessage(token, message.chat.id, text, config.conversation);
    return;
  }

  if (text.startsWith('/start')) {
    writeConfig({ ...config, conversation: undefined });
    await sendMessage(token, message.chat.id, 'Afterlight уже подключён. Главное меню открыто.', mainMenuKeyboard);
    return;
  }

  if (isHelpIntent(text)) {
    await sendHelp(token, message.chat.id);
    return;
  }

  if (isAddIntent(text) && !getAddCommandText(text)) {
    await startAddFlow(token, message.chat.id, { scope: 'inbox' });
    return;
  }

  if (isInboxIntent(text)) {
    await sendTaskList(token, message.chat.id, { scope: 'inbox' });
    return;
  }

  if (isTodayIntent(text)) {
    await sendTaskList(token, message.chat.id, { scope: 'today' });
    return;
  }

  if (isWeekIntent(text)) {
    await sendTaskList(token, message.chat.id, { scope: 'week' });
    return;
  }

  if (isCategoriesIntent(text)) {
    await sendCategories(token, message.chat.id);
    return;
  }

  if (isOpenAppIntent(text)) {
    onQuickAction?.('open');
    await sendMessage(token, message.chat.id, 'Открыл Afterlight.');
    return;
  }

  if (text.startsWith('/') && !isAddIntent(text)) {
    await sendHelp(token, message.chat.id);
    return;
  }

  await createTaskFromTelegramText(token, message.chat.id, getAddCommandText(text) ?? text);
};

const handleCallbackQuery = async (query: TelegramCallbackQuery, token: string) => {
  const chatId = query.message?.chat.id;
  const data = query.data ?? '';
  const config = readConfig();

  if (!chatId) {
    await answerCallbackQuery(token, query.id);
    return;
  }

  if (!config.chatId || chatId !== config.chatId) {
    await answerCallbackQuery(token, query.id, 'Этот бот подключён к другому рабочему пространству.');
    return;
  }

  await answerCallbackQuery(token, query.id);

  if (data === 'flow:cancel') {
    writeConfig({ ...config, conversation: undefined });
    await sendMessage(token, chatId, 'Добавление отменено.', mainMenuKeyboard);
    return;
  }

  if (data === 'view:inbox') {
    await sendTaskList(token, chatId, { scope: 'inbox' });
    return;
  }

  if (data === 'view:today') {
    await sendTaskList(token, chatId, { scope: 'today' });
    return;
  }

  if (data === 'view:week') {
    await sendTaskList(token, chatId, { scope: 'week' });
    return;
  }

  if (data === 'view:categories') {
    await sendCategories(token, chatId);
    return;
  }

  if (data === 'add:inbox') {
    await startAddFlow(token, chatId, { scope: 'inbox' });
    return;
  }

  if (data === 'add:today') {
    await startAddFlow(token, chatId, { dueDate: getTodayDate(), scope: 'today' });
    return;
  }

  if (data === 'add:week') {
    await startAddFlow(token, chatId, { scope: 'week' });
    return;
  }

  if (data.startsWith('cat:view:')) {
    await sendTaskList(token, chatId, { categoryId: data.slice('cat:view:'.length), scope: 'category' });
    return;
  }

  if (data.startsWith('cat:add:')) {
    const categoryId = data.slice('cat:add:'.length);
    await startAddFlow(token, chatId, { categoryId, scope: 'category' });
    return;
  }

  if (data.startsWith('task:toggle:')) {
    await toggleTaskFromTelegram(token, chatId, data.slice('task:toggle:'.length));
    return;
  }

  if (data.startsWith('task:delete:')) {
    await deleteTaskFromTelegram(token, chatId, data.slice('task:delete:'.length));
    return;
  }

  if (data === 'app:open') {
    onQuickAction?.('open');
    await sendMessage(token, chatId, 'Открыл Afterlight.');
    return;
  }

  if (data === 'app:add') {
    onQuickAction?.('add-task');
    await sendMessage(token, chatId, 'Открыл форму добавления задачи в Afterlight.');
    return;
  }

  if (data === 'app:today') {
    onQuickAction?.('today');
    await sendMessage(token, chatId, 'Открыл раздел “Сегодня” в Afterlight.');
    return;
  }

  if (data === 'app:week') {
    onQuickAction?.('week');
    await sendMessage(token, chatId, 'Открыл раздел “Неделя” в Afterlight.');
  }
};

const handleConversationMessage = async (
  token: string,
  chatId: number,
  text: string,
  conversation: NonNullable<TelegramConversation>,
) => {
  const config = readConfig();

  if (isCancelIntent(text)) {
    writeConfig({ ...config, conversation: undefined });
    await sendMessage(token, chatId, 'Добавление отменено.', mainMenuKeyboard);
    return;
  }

  const taskInput = mergeConversationTaskInput(parseTaskText(text), conversation);

  if (!taskInput.title) {
    await sendMessage(token, chatId, 'Название задачи пустое. Отправьте текст задачи или нажмите “Отмена”.', buildCancelKeyboard());
    return;
  }

  const task = createTask(taskInput);
  writeConfig({ ...config, conversation: undefined });
  onDataChanged?.();
  await sendMessage(token, chatId, formatCreatedTask(task), buildTaskKeyboard(task));
};

const createTaskFromTelegramText = async (token: string, chatId: number, text: string) => {
  const taskInput = parseTaskText(text);

  if (!taskInput.title) {
    await sendMessage(token, chatId, 'Название задачи пустое. Отправьте /add и текст задачи.');
    return;
  }

  const task = createTask(taskInput);
  onDataChanged?.();
  await sendMessage(token, chatId, formatCreatedTask(task), buildTaskKeyboard(task));
};

const startAddFlow = async (
  token: string,
  chatId: number,
  input: { categoryId?: string; dueDate?: string; scope: TaskScope },
) => {
  const config = readConfig();
  const category = input.categoryId ? listCategories().find((item) => item.id === input.categoryId) : undefined;
  const target = formatTaskTarget(input.scope, input.dueDate, category);

  writeConfig({
    ...config,
    conversation: {
      categoryId: input.categoryId,
      dueDate: input.dueDate,
      mode: 'awaiting_task_text',
      scope: input.scope,
    },
  });

  await sendMessage(
    token,
    chatId,
    `Напишите задачу для раздела: ${target}\n\nМожно сразу указать дату, время или категорию: “Купить молоко завтра 18:00 #Дом”.`,
    buildCancelKeyboard(),
  );
};

const sendTaskList = async (
  token: string,
  chatId: number,
  filter: { categoryId?: string; scope: TaskScope },
) => {
  const tasks = getVisibleTasks(filter).slice(0, TASK_LIST_LIMIT);
  const categories = listCategories();
  const title = getTaskListTitle(filter, categories);
  const text =
    tasks.length > 0
      ? `${title}\n\n${tasks.map((task, index) => formatTaskLine(task, index, categories)).join('\n')}`
      : `${title}\n\nАктивных задач нет.`;

  await sendMessage(token, chatId, text, buildTaskListKeyboard(tasks, filter));
};

const sendCategories = async (token: string, chatId: number) => {
  const categories = listCategories();

  if (categories.length === 0) {
    await sendMessage(token, chatId, 'Категорий пока нет.', buildNavigationKeyboard());
    return;
  }

  const rows = categories.flatMap((category) => [
    [{ text: `${formatCategoryMarker(category)} ${category.title}`, callback_data: `cat:view:${category.id}` }],
    [{ text: `➕ Добавить в “${truncate(category.title, 28)}”`, callback_data: `cat:add:${category.id}` }],
  ]);

  await sendMessage(token, chatId, 'Категории:', {
    inline_keyboard: [...rows, ...buildNavigationRows()],
  });
};

const sendHelp = async (token: string, chatId: number) => {
  await sendMessage(
    token,
    chatId,
    [
      'Afterlight bot умеет:',
      '• добавлять задачи обычным сообщением или через кнопку',
      '• понимать “сегодня”, “завтра”, дату 12.06, время 18:30 и #Категорию',
      '• показывать входящие, сегодня, неделю и категории',
      '• закрывать и удалять задачи кнопками',
      '• открывать нужные разделы в приложении',
      '',
      'Примеры:',
      '/add Купить молоко завтра 18:00',
      'Сделать отчёт сегодня #Работа',
    ].join('\n'),
    buildHomeKeyboard(),
  );
};

const toggleTaskFromTelegram = async (token: string, chatId: number, taskId: string) => {
  const task = toggleTask(taskId);

  if (!task) {
    await sendMessage(token, chatId, 'Задача не найдена.');
    return;
  }

  onDataChanged?.();
  await sendMessage(token, chatId, task.status === 'completed' ? `Готово: ${task.title}` : `Вернул в активные: ${task.title}`, buildTaskKeyboard(task));
};

const deleteTaskFromTelegram = async (token: string, chatId: number, taskId: string) => {
  const task = listTasks().find((item) => item.id === taskId);
  const wasDeleted = deleteTask(taskId);

  if (!wasDeleted) {
    await sendMessage(token, chatId, 'Задача уже удалена или не найдена.');
    return;
  }

  onDataChanged?.();
  await sendMessage(token, chatId, `Удалено: ${task?.title ?? 'задача'}`, buildNavigationKeyboard());
};

const getVisibleTasks = (filter: { categoryId?: string; scope: TaskScope }) => {
  const today = getTodayDate();
  const weekDates = getCurrentWeekDates();

  return listTasks()
    .filter((task) => task.status === 'active')
    .filter((task) => {
      if (filter.scope === 'category') {
        return task.categoryId === filter.categoryId;
      }

      if (filter.scope === 'today') {
        return task.scope === 'today' || task.dueDate === today || Boolean(task.dueDate && task.dueDate < today);
      }

      if (filter.scope === 'week') {
        return task.scope === 'week' || Boolean(task.dueDate && weekDates.includes(task.dueDate));
      }

      return task.scope === 'inbox';
    });
};

const mergeConversationTaskInput = (
  input: CreateTaskInput,
  conversation: NonNullable<TelegramConversation>,
): CreateTaskInput => {
  const categoryId = input.categoryId ?? conversation.categoryId;
  const dueDate = input.dueDate ?? conversation.dueDate;

  return {
    ...input,
    categoryId,
    dueDate,
    scope: categoryId ? 'category' : dueDate === getTodayDate() ? 'today' : dueDate ? 'week' : conversation.scope,
  };
};

const buildTaskListKeyboard = (
  tasks: Task[],
  filter: { categoryId?: string; scope: TaskScope },
): InlineKeyboardMarkup => {
  const addCallbackData =
    filter.scope === 'category' && filter.categoryId
      ? `cat:add:${filter.categoryId}`
      : filter.scope === 'today'
        ? 'add:today'
        : filter.scope === 'week'
          ? 'add:week'
          : 'add:inbox';

  return {
    inline_keyboard: [
      ...tasks.map((task) => [
        {
          callback_data: `task:toggle:${task.id}`,
          text: task.status === 'completed' ? `↩️ ${truncate(task.title, 24)}` : `✅ ${truncate(task.title, 24)}`,
        },
        { callback_data: `task:delete:${task.id}`, text: '🗑' },
      ]),
      [{ callback_data: addCallbackData, text: '➕ Добавить задачу' }],
      ...buildNavigationRows(),
    ],
  };
};

const buildTaskKeyboard = (task: Task): InlineKeyboardMarkup => ({
  inline_keyboard: [
    [
      {
        callback_data: `task:toggle:${task.id}`,
        text: task.status === 'completed' ? '↩️ Вернуть' : '✅ Выполнить',
      },
      { callback_data: `task:delete:${task.id}`, text: '🗑 Удалить' },
    ],
    ...buildNavigationRows(),
  ],
});

const buildCancelKeyboard = (): InlineKeyboardMarkup => ({
  inline_keyboard: [[{ callback_data: 'flow:cancel', text: 'Отмена' }], ...buildNavigationRows()],
});

const buildHomeKeyboard = (): InlineKeyboardMarkup => ({
  inline_keyboard: [
    [{ callback_data: 'add:inbox', text: '➕ Добавить задачу' }],
    ...buildNavigationRows(),
  ],
});

const buildNavigationKeyboard = (): InlineKeyboardMarkup => ({
  inline_keyboard: buildNavigationRows(),
});

const buildNavigationRows = (): InlineKeyboardButton[][] => [
  [
    { callback_data: 'view:inbox', text: '📥 Входящие' },
    { callback_data: 'view:today', text: '📅 Сегодня' },
  ],
  [
    { callback_data: 'view:week', text: '🗓 Неделя' },
    { callback_data: 'view:categories', text: '📂 Категории' },
  ],
  [
    { callback_data: 'app:add', text: 'Открыть добавление' },
    { callback_data: 'app:open', text: 'Открыть приложение' },
  ],
];

const formatCreatedTask = (task: Task) => `Добавлено:\n${formatTaskLine(task, 0, listCategories()).replace('1. ', '')}`;

const formatTaskLine = (task: Task, index: number, categories: Category[]) => {
  const parts = [`${index + 1}.`, formatPriority(task), task.title];
  const category = categories.find((item) => item.id === task.categoryId);
  const meta = [category ? `#${category.title}` : undefined, formatTaskDue(task)].filter(Boolean).join(' · ');

  return meta ? `${parts.join(' ')}\n   ${meta}` : parts.join(' ');
};

const formatTaskDue = (task: Task) => {
  if (!task.dueDate && !task.dueLabel) {
    return undefined;
  }

  const date = task.dueDate ? formatDateForUser(task.dueDate) : undefined;
  return [date, task.dueLabel].filter(Boolean).join(' ');
};

const formatTaskTarget = (scope: TaskScope, dueDate?: string, category?: Category) => {
  if (category) {
    return `#${category.title}`;
  }

  if (dueDate === getTodayDate()) {
    return 'Сегодня';
  }

  if (scope === 'week') {
    return 'Неделя';
  }

  return 'Входящие';
};

const getTaskListTitle = (filter: { categoryId?: string; scope: TaskScope }, categories: Category[]) => {
  if (filter.scope === 'category') {
    const category = categories.find((item) => item.id === filter.categoryId);
    return category ? `${formatCategoryMarker(category)} ${category.title}` : 'Категория';
  }

  if (filter.scope === 'today') {
    return '📅 Сегодня';
  }

  if (filter.scope === 'week') {
    return '🗓 Неделя';
  }

  return '📥 Входящие';
};

const formatCategoryMarker = (category: Category) => {
  if (category.iconMode === 'emoji' && category.emoji) {
    return category.emoji;
  }

  if (category.iconMode === 'hash') {
    return '#';
  }

  return '●';
};

const formatPriority = (task: Task) => {
  if (task.priority === 1) return '🔴';
  if (task.priority === 2) return '🟡';
  if (task.priority === 3) return '🟢';
  return '🔵';
};

const setupBotCommands = (token: string) =>
  telegramApi(token, 'setMyCommands', {
    commands: [
      { command: 'add', description: 'Добавить задачу' },
      { command: 'inbox', description: 'Показать входящие' },
      { command: 'today', description: 'Показать задачи на сегодня' },
      { command: 'week', description: 'Показать неделю' },
      { command: 'categories', description: 'Показать категории' },
      { command: 'menu', description: 'Открыть меню' },
      { command: 'help', description: 'Помощь' },
    ],
  });

const parseTaskText = (value: string): CreateTaskInput => {
  let text = value.replace(/^\/add(@\w+)?\s*/i, '').trim();
  const categories = listCategories();
  const categoryMatch = text.match(/(?:^|\s)#([^\s#]+)/);
  const category = categoryMatch
    ? categories.find((item) => item.title.toLocaleLowerCase('ru-RU') === categoryMatch[1].toLocaleLowerCase('ru-RU'))
    : undefined;

  if (categoryMatch) {
    text = text.replace(categoryMatch[0], ' ').trim();
  }

  const dueLabel = text.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/)?.[0];

  if (dueLabel) {
    text = text.replace(dueLabel, '').trim();
  }

  const dateInfo = extractDate(text);
  text = dateInfo.text;

  return {
    categoryId: category?.id,
    dueDate: dateInfo.dueDate,
    dueLabel,
    priority: 4,
    scope: category ? 'category' : dateInfo.dueDate === getTodayDate() ? 'today' : 'inbox',
    title: text,
  };
};

const extractDate = (value: string): { dueDate?: string; text: string } => {
  const lowerValue = value.toLocaleLowerCase('ru-RU');

  if (/\b(today|сегодня)\b/i.test(lowerValue)) {
    return { dueDate: getTodayDate(), text: value.replace(/\b(today|сегодня)\b/gi, '').trim() };
  }

  if (/\b(tomorrow|завтра)\b/i.test(lowerValue)) {
    return { dueDate: getRelativeDate(1), text: value.replace(/\b(tomorrow|завтра)\b/gi, '').trim() };
  }

  const dateMatch = value.match(/\b(\d{2})\.(\d{2})(?:\.(\d{4}))?\b/);

  if (!dateMatch) {
    return { text: value.trim() };
  }

  const year = dateMatch[3] ?? String(new Date().getFullYear());
  const dueDate = `${year}-${dateMatch[2]}-${dateMatch[1]}`;
  return { dueDate, text: value.replace(dateMatch[0], '').trim() };
};

const getAddCommandText = (value: string) => {
  const match = value.match(/^\/add(?:@\w+)?(?:\s+(.+))?$/i);
  return match ? match[1]?.trim() ?? '' : undefined;
};

const isAddIntent = (value: string) => value === menuLabels.addTask || /^\/add(?:@\w+)?(?:\s|$)/i.test(value);

const isCancelIntent = (value: string) => /^\/cancel(?:@\w+)?$/i.test(value) || value.toLocaleLowerCase('ru-RU') === 'отмена';

const isCategoriesIntent = (value: string) => value === menuLabels.categories || /^\/categories(?:@\w+)?$/i.test(value);

const isHelpIntent = (value: string) =>
  value === menuLabels.help || /^\/(?:help|menu|start)(?:@\w+)?$/i.test(value);

const isInboxIntent = (value: string) => value === menuLabels.inbox || /^\/inbox(?:@\w+)?$/i.test(value);

const isOpenAppIntent = (value: string) => value === menuLabels.openApp || /^\/open(?:@\w+)?$/i.test(value);

const isTodayIntent = (value: string) => value === menuLabels.today || /^\/today(?:@\w+)?$/i.test(value);

const isWeekIntent = (value: string) => value === menuLabels.week || /^\/week(?:@\w+)?$/i.test(value);

const telegramApi = async <T>(
  token: string,
  method: string,
  payload: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> => {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal,
  });
  const data = (await response.json()) as TelegramApiResponse<T>;

  if (!response.ok || !data.ok) {
    throw new Error(data.description ?? `Telegram API request failed: ${method}`);
  }

  return data.result;
};

const sendMessage = (token: string, chatId: number, text: string, replyMarkup?: TelegramReplyMarkup) =>
  telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    reply_markup: replyMarkup,
    text,
  });

const answerCallbackQuery = (token: string, callbackQueryId: string, text?: string) =>
  telegramApi(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    show_alert: Boolean(text),
    text,
  });

const readConfig = (): TelegramConfig => {
  try {
    const rawValue = fs.readFileSync(getConfigPath(), 'utf8');
    const parsed = JSON.parse(rawValue) as Partial<TelegramConfig>;

    return {
      botUsername: typeof parsed.botUsername === 'string' ? parsed.botUsername : undefined,
      chatId: typeof parsed.chatId === 'number' ? parsed.chatId : undefined,
      conversation: normalizeConversation(parsed.conversation),
      enabled: Boolean(parsed.enabled),
      lastUpdateId: typeof parsed.lastUpdateId === 'number' ? parsed.lastUpdateId : undefined,
      token: typeof parsed.token === 'string' ? parsed.token : undefined,
    };
  } catch {
    return { enabled: false };
  }
};

const writeConfig = (config: TelegramConfig) => {
  const configPath = getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
};

const getConfigPath = () => path.join(getStoragePaths().storageDir, 'telegram.json');

const cleanToken = (value: string | undefined) => {
  const cleanValue = value?.trim();
  return cleanValue ? cleanValue : undefined;
};

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Telegram bot error.');

const isTelegramPollingConflict = (message: string) =>
  message.includes('Conflict: terminated by other getUpdates request');

const isNetworkFetchFailure = (message: string) => message === 'fetch failed';

const normalizeConversation = (value: unknown): TelegramConversation => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const conversation = value as Partial<NonNullable<TelegramConversation>>;

  if (conversation.mode !== 'awaiting_task_text') {
    return undefined;
  }

  return {
    categoryId: typeof conversation.categoryId === 'string' ? conversation.categoryId : undefined,
    dueDate: typeof conversation.dueDate === 'string' ? conversation.dueDate : undefined,
    mode: 'awaiting_task_text',
    scope: normalizeTaskScope(conversation.scope),
  };
};

const normalizeTaskScope = (value: unknown): TaskScope => {
  if (value === 'today' || value === 'week' || value === 'category') {
    return value;
  }

  return 'inbox';
};

const getTodayDate = () => getRelativeDate(0);

const getCurrentWeekDates = () => {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_item, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return toDateKey(date);
  });
};

const getRelativeDate = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return toDateKey(date);
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateForUser = (dateValue: string) => {
  const [year, month, day] = dateValue.split('-');
  return `${day}.${month}.${year}`;
};

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1))}…` : value;
