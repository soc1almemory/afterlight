import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { safeStorage } from 'electron';
import type {
  Category,
  CreateTaskInput,
  LanguageCode,
  Task,
  TaskScope,
  TelegramBotMode,
  TelegramBotStatus,
  TelegramConfigInput,
} from '../../shared/types';
import { createCategory, createTask, deleteTask, listCategories, listTasks, toggleTask } from '../storage/repositories';
import { getStoragePaths } from '../storage/database';

type TelegramConversation =
  | {
      categoryId?: string;
      dueDate?: string;
      mode: 'awaiting_task_text';
      scope: TaskScope;
    }
  | {
      mode: 'awaiting_category_title';
    }
  | undefined;

interface TelegramConfig {
  botMessageIds?: number[];
  botMode?: TelegramBotMode;
  botUsername?: string;
  chatSessionSchemaVersion?: number;
  chatSessions?: Record<string, unknown>;
  chatId?: number;
  conversation?: TelegramConversation;
  enabled: boolean;
  language?: LanguageCode;
  lastUpdateId?: number;
  linkCode?: string;
  pendingAuthChats?: Record<string, unknown>;
  serverDeadlineNotifiedKeys?: string[];
  serverLastError?: string;
  serverLastHeartbeatAt?: string;
  serverLastUpdateId?: number;
  serverLastStatus?: string;
  token?: string;
  tokenEncrypted?: string;
}

interface TelegramUser {
  first_name?: string;
  id: number;
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
  error_code?: number;
  ok: boolean;
  parameters?: {
    migrate_to_chat_id?: number;
    retry_after?: number;
  };
  result?: T;
}

class TelegramRateLimitError extends Error {
  retryAfterMs: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = 'TelegramRateLimitError';
    this.retryAfterMs = Math.max(1, retryAfterSeconds) * 1000;
  }
}

const extractRetryAfterSeconds = (message: string) => {
  const match = message.match(/retry after (\d+)/i);
  return match ? Number(match[1]) : undefined;
};

const isTelegramRateLimitError = (error: unknown): error is TelegramRateLimitError =>
  error instanceof TelegramRateLimitError;

const getTelegramRetryDelayMs = (error: unknown) =>
  isTelegramRateLimitError(error) ? error.retryAfterMs + 1000 : POLL_RETRY_DELAY_MS;

const formatTelegramRateLimitError = (error: TelegramRateLimitError) =>
  `Telegram rate limit. Retrying after ${Math.ceil(error.retryAfterMs / 1000)}s...`;

type BotCopy = typeof botCopy.ru;

const POLL_TIMEOUT_SECONDS = 25;
const POLL_RETRY_DELAY_MS = 5000;
const TELEGRAM_API_TIMEOUT_MS = 15000;
const TASK_LIST_LIMIT = 8;
const STORED_BOT_MESSAGE_LIMIT = 16;
const SERVER_HEARTBEAT_STALE_MS = 90_000;
const CATEGORY_COLORS = ['#7c65ff', '#ffb84d', '#45c27a', '#4aa3ff', '#f06795', '#9b7cff'];

const botCopy = {
  ru: {
    buttons: {
      addTask: '➕ Добавить задачу',
      cancel: '❌️ Отмена',
      categories: '📂 Категории',
      createCategory: '✍ Создать категорию',
      deleteTask: '🗑 Удалить',
      doneTask: '✅ Выполнить',
      help: '❓ Помощь',
      inbox: '📥 Входящие',
      language: '🌐 Язык / Language',
      noDate: 'Без даты',
      restoreTask: '↩️ Вернуть',
      today: '📅 Сегодня',
      week: '7⃣ Неделя',
    },
    commands: {
      add: 'Добавить задачу',
      categories: 'Показать категории',
      help: 'Помощь и примеры',
      inbox: 'Показать входящие',
      language: 'Выбрать язык',
      menu: 'Открыть главное меню',
      start: 'Запустить меню',
      today: 'Показать задачи на сегодня',
      week: 'Показать неделю',
    },
    text: {
      alreadyConnected: 'Afterlight уже подключён. Главное меню открыто.',
      botConnected:
        'Afterlight подключён. Теперь можно управлять задачами прямо из Telegram.\n\nAfterlight is connected. You can now manage tasks directly from Telegram.',
      cancel: 'Действие отменено. Главное меню открыто.',
      categoryCreated: (title: string) => `Категория создана: #${title}`,
      categoryCreatedForTask: (title: string) => `Создал категорию: #${title}`,
      categoryEmpty: 'Название категории пустое. Напишите название или нажмите “❌️ Отмена”.',
      categoryExists: (title: string) => `Категория #${title} уже есть. Можно сразу добавлять в неё задачи.`,
      categoryPrompt:
        'Напишите название новой категории.\n\nПримеры:\nРабота\nУчёба\nДом\n\nПосле создания можно писать задачи с хэштегом, например: “Позвонить клиенту завтра 12:00 #Работа”.',
      chooseLanguage: 'Выберите язык бота.',
      connectedElsewhere: 'Этот бот уже подключён к другому рабочему пространству Afterlight.',
      connectPrompt:
        'Откройте настройки Afterlight, включите Telegram-интеграцию и отправьте команду с кодом привязки.\n\nOpen Afterlight settings, enable Telegram integration, then send the pairing command.',
      createdPrefix: 'Добавлено:',
      deleted: (title?: string) => `Удалено: ${title ?? 'задача'}`,
      deadlineReminder: (title: string, due: string, minutes: number) =>
        `⏰ Скоро дедлайн\n${title}\n${due ? `Срок: ${due}\n` : ''}Напоминание за ${minutes} мин.`,
      emptyList: 'Активных задач нет.',
      emptyTask: 'Название задачи пустое. Напишите задачу по примеру ниже или нажмите “❌️ Отмена”.',
      helpIntro: 'Afterlight bot работает полностью внутри Telegram:',
      invalidCommand: 'Команда не распознана. Вот что можно сделать:',
      languageSaved: 'Язык сохранён. Главное меню обновлено.',
      noCategories: 'Категорий пока нет. Создайте первую кнопкой ниже.',
      staleMessageClosed: 'Сообщение закрыто.',
      taskCompleted: (title: string) => `Готово: ${title}`,
      taskNotFound: 'Задача не найдена.',
      taskRestored: (title: string) => `Вернул в активные: ${title}`,
      taskWasDeleted: 'Задача уже удалена или не найдена.',
      unknownCategory: (name: string) => `Категория #${name} не найдена. Создайте её кнопкой “➕ Категория” или выберите существующую.`,
      weekDayPrompt: 'Выберите день недели для новой задачи.',
      writeTask: (target: string) => `Напишите задачу для раздела: ${target}`,
    },
    title: {
      categories: 'Категории:',
      category: 'Категория',
      inbox: '📥 Входящие',
      today: '📅 Сегодня',
      week: '7⃣ Неделя',
    },
    guide: [
      'Как писать задачи:',
      '• Купить молоко',
      '• Купить молоко сегодня',
      '• Купить молоко завтра 18:00',
      '• Сдать отчёт 12.06 14:30',
      '• Позвонить клиенту #Работа',
      '• Домашка завтра #Учёба',
      '• 1 Срочно отправить отчёт',
      '• 2 Сделать домашку',
      '• 3 Посмотреть материалы',
      '',
      'Что понимает бот:',
      '• Дата: сегодня, завтра, 12.06, 12.06.2026',
      '• Время: 09:30, 18:00',
      '• Категория: #Название, если такая категория уже есть',
      '• Приоритет в начале: 1 - высший, 2 - средний, 3 - низкий',
      '',
      'Можно также использовать /add текст задачи.',
    ],
    help: [
      '• добавляет задачи обычным сообщением или через кнопку',
      '• понимает дату, время и #Категорию',
      '• показывает входящие, сегодня, неделю и категории',
      '• закрывает и удаляет задачи кнопками',
      '• создаёт категории прямо из Telegram',
      '',
      'Быстрые команды:',
      '/add Купить молоко завтра 18:00',
      '/inbox, /today, /week, /categories, /language',
    ],
  },
  en: {
    buttons: {
      addTask: '➕ Add task',
      cancel: '❌️ Cancel',
      categories: '📂 Categories',
      createCategory: '✍ Create category',
      deleteTask: '🗑 Delete',
      doneTask: '✅ Done',
      help: '❓ Help',
      inbox: '📥 Inbox',
      language: '🌐 Language / Язык',
      noDate: 'No date',
      restoreTask: '↩️ Restore',
      today: '📅 Today',
      week: '7⃣ Week',
    },
    commands: {
      add: 'Add a task',
      categories: 'Show categories',
      help: 'Help and examples',
      inbox: 'Show inbox',
      language: 'Choose language',
      menu: 'Open main menu',
      start: 'Open menu',
      today: 'Show today tasks',
      week: 'Show week',
    },
    text: {
      alreadyConnected: 'Afterlight is already connected. Main menu is open.',
      botConnected: 'Afterlight is connected. You can now manage tasks directly from Telegram.',
      cancel: 'Action canceled. Main menu is open.',
      categoryCreated: (title: string) => `Category created: #${title}`,
      categoryCreatedForTask: (title: string) => `Created category: #${title}`,
      categoryEmpty: 'Category name is empty. Send a name or tap “❌️ Cancel”.',
      categoryExists: (title: string) => `Category #${title} already exists. You can add tasks to it right away.`,
      categoryPrompt:
        'Send the new category name.\n\nExamples:\nWork\nStudy\nHome\n\nAfter creating it, use a hashtag in tasks, for example: “Call client tomorrow 12:00 #Work”.',
      chooseLanguage: 'Choose bot language.',
      connectedElsewhere: 'This bot is already connected to another Afterlight workspace.',
      connectPrompt: 'Open Afterlight settings, enable Telegram integration, then send the pairing command.',
      createdPrefix: 'Added:',
      deleted: (title?: string) => `Deleted: ${title ?? 'task'}`,
      deadlineReminder: (title: string, due: string, minutes: number) =>
        `⏰ Deadline soon\n${title}\n${due ? `Due: ${due}\n` : ''}Reminder ${minutes} min before.`,
      emptyList: 'No active tasks.',
      emptyTask: 'Task title is empty. Send a task using the examples below or tap “❌️ Cancel”.',
      helpIntro: 'Afterlight bot works fully inside Telegram:',
      invalidCommand: 'Unknown command. Here is what you can do:',
      languageSaved: 'Language saved. Main menu updated.',
      noCategories: 'No categories yet. Create the first one with the button below.',
      staleMessageClosed: 'Message closed.',
      taskCompleted: (title: string) => `Done: ${title}`,
      taskNotFound: 'Task not found.',
      taskRestored: (title: string) => `Moved back to active: ${title}`,
      taskWasDeleted: 'Task was already deleted or not found.',
      unknownCategory: (name: string) => `Category #${name} was not found. Create it with “➕ Category” or pick an existing one.`,
      weekDayPrompt: 'Choose a week day for the new task.',
      writeTask: (target: string) => `Send a task for: ${target}`,
    },
    title: {
      categories: 'Categories:',
      category: 'Category',
      inbox: '📥 Inbox',
      today: '📅 Today',
      week: '7⃣ Week',
    },
    guide: [
      'How to write tasks:',
      '• Buy milk',
      '• Buy milk today',
      '• Buy milk tomorrow 18:00',
      '• Submit report 12.06 14:30',
      '• Call client #Work',
      '• Homework tomorrow #Study',
      '• 1 Send the report',
      '• 2 Do homework',
      '• 3 Read materials',
      '',
      'What the bot understands:',
      '• Date: today, tomorrow, 12.06, 12.06.2026',
      '• Time: 09:30, 18:00',
      '• Category: #Name, if this category already exists',
      '• Priority at the start: 1 - highest, 2 - medium, 3 - low',
      '',
      'You can also use /add task text.',
    ],
    help: [
      '• adds tasks from a normal message or button',
      '• understands date, time, and #Category',
      '• shows inbox, today, week, and categories',
      '• completes and deletes tasks with buttons',
      '• creates categories directly from Telegram',
      '',
      'Quick commands:',
      '/add Buy milk tomorrow 18:00',
      '/inbox, /today, /week, /categories, /language',
    ],
  },
} as const;

let isRunning = false;
let lastError: string | undefined;
let lastUpdateAt: string | undefined;
let pollAbortController: AbortController | undefined;
let pollSessionId = 0;
let pollTimer: NodeJS.Timeout | undefined;
let onDataChanged: (() => void) | undefined;

export const configureTelegramBotRuntime = (options: {
  onDataChanged: () => void;
}) => {
  onDataChanged = options.onDataChanged;
};

export const getTelegramBotStatus = (): TelegramBotStatus => {
  const config = readConfig();
  const botMode = getBotMode(config);
  const linkCode = isTelegramConfigReadyForLink(config) ? getOrCreateLinkCode(config) : undefined;
  const isServerMode = botMode === 'afterlight';
  const isServerRunning = isServerMode && isFreshServerHeartbeat(config.serverLastHeartbeatAt);
  const authorizedChatCount = isServerMode ? getAuthorizedChatCount(config) : config.chatId ? 1 : 0;
  const serverLastError =
    isServerMode && config.enabled && !isServerRunning
      ? config.serverLastError ?? 'Afterlight Bot server is not running.'
      : config.serverLastError;

  return {
    botMode,
    authorizedChatCount,
    botUsername: isServerMode ? config.botUsername ?? 'afterlight_task_bot' : config.botUsername,
    chatId: config.chatId,
    enabled: config.enabled,
    hasToken: isServerMode || Boolean(config.token),
    isRunning: isServerMode ? isServerRunning : isRunning,
    linkCode,
    lastError: isServerMode ? serverLastError : lastError,
    lastUpdateAt: isServerMode ? config.serverLastHeartbeatAt : lastUpdateAt,
    serverLastHeartbeatAt: config.serverLastHeartbeatAt,
  };
};

export const updateTelegramBotConfig = async (input: TelegramConfigInput): Promise<TelegramBotStatus> => {
  const currentConfig = readConfig();
  const botMode = input.botMode ?? getBotMode(currentConfig);
  const nextConfig: TelegramConfig = {
    ...currentConfig,
    botMode,
    enabled: input.enabled,
    token: botMode === 'custom' ? cleanToken(input.token) ?? currentConfig.token : currentConfig.token,
  };

  if (input.botMode && input.botMode !== getBotMode(currentConfig)) {
    nextConfig.botMessageIds = [];
    nextConfig.chatId = undefined;
    nextConfig.conversation = undefined;
    nextConfig.linkCode = undefined;
  }

  if (botMode === 'custom' && input.token !== undefined) {
    nextConfig.botMessageIds = [];
    nextConfig.botUsername = undefined;
    nextConfig.chatId = undefined;
    nextConfig.conversation = undefined;
    nextConfig.lastUpdateId = undefined;
    nextConfig.linkCode = undefined;
  }

  if (botMode === 'afterlight') {
    nextConfig.botUsername = 'afterlight_task_bot';
  }

  if (isTelegramConfigReadyForLink(nextConfig)) {
    nextConfig.linkCode = nextConfig.linkCode ?? createLinkCode();
  }

  writeConfig(nextConfig);

  if (botMode === 'custom' && nextConfig.enabled && nextConfig.token) {
    await restartTelegramBot();
  } else {
    stopTelegramBot();
  }

  return getTelegramBotStatus();
};

export const disconnectTelegramBot = (): TelegramBotStatus => {
  const config = readConfig();
  stopTelegramBot();
  writeConfig({
    ...config,
    botMessageIds: [],
    chatId: undefined,
    conversation: undefined,
    enabled: false,
    linkCode: undefined,
  });
  lastError = undefined;
  lastUpdateAt = undefined;
  return getTelegramBotStatus();
};

export const resetTelegramSessions = (): TelegramBotStatus => {
  const config = readConfig();
  writeConfig({
    ...config,
    botMessageIds: [],
    chatId: undefined,
    chatSessions: {},
    conversation: undefined,
    pendingAuthChats: {},
  });
  return getTelegramBotStatus();
};

export const testTelegramBotConnection = async (token?: string): Promise<TelegramBotStatus> => {
  const config = readConfig();
  if (getBotMode(config) === 'afterlight') {
    writeConfig({ ...config, botUsername: 'afterlight_task_bot' });
    lastError = undefined;
    lastUpdateAt = new Date().toISOString();
    return getTelegramBotStatus();
  }

  const tokenToTest = cleanToken(token) ?? config.token;

  if (!tokenToTest) {
    lastError = 'Telegram token is not configured.';
    return getTelegramBotStatus();
  }

  try {
    const bot = await telegramApi<{ id: number; username?: string }>(tokenToTest, 'getMe');

    if (!token || tokenToTest === config.token) {
      writeConfig({ ...config, botUsername: bot.username });
    }

    lastError = undefined;
    lastUpdateAt = new Date().toISOString();
  } catch (error) {
    lastError = isTelegramRateLimitError(error)
      ? formatTelegramRateLimitError(error)
      : getErrorMessage(error);
  }

  return getTelegramBotStatus();
};

export const notifyTelegramDeadline = async (task: Task, leadMinutes: number) => {
  const config = readConfig();

  if (getBotMode(config) !== 'custom' || !config.enabled || !config.token || !config.chatId) {
    return false;
  }

  const language = getLanguage(config);
  const due = formatTaskDue(task) ?? '';

  try {
    await sendMessage(
      config.token,
      config.chatId,
      getCopy(language).text.deadlineReminder(task.title, due, leadMinutes),
      buildTaskKeyboard(task, language),
    );
    lastError = undefined;
    lastUpdateAt = new Date().toISOString();
    return true;
  } catch (error) {
    lastError = getErrorMessage(error);
    return false;
  }
};

export const restartTelegramBot = async () => {
  stopTelegramBot();
  const config = readConfig();

  if (getBotMode(config) !== 'custom' || !config.enabled || !config.token) {
    return;
  }

  isRunning = true;
  lastError = undefined;
  const sessionId = startPollingSession();

  try {
    const bot = await telegramApi<{ id: number; username?: string }>(config.token, 'getMe');
    writeConfig({ ...config, botUsername: bot.username });
    await setupBotCommands(config.token, getLanguage(config));
  } catch (error) {
    if (isCurrentPollingSession(sessionId)) {
      const message = getErrorMessage(error);

      if (isTelegramRateLimitError(error)) {
        lastError = formatTelegramRateLimitError(error);
        scheduleNextPoll(getTelegramRetryDelayMs(error), sessionId);
        return;
      }

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
    const updates = await telegramApi<TelegramUpdate[]>(
      config.token,
      'getUpdates',
      {
        allowed_updates: ['callback_query', 'message'],
        offset: config.lastUpdateId ? config.lastUpdateId + 1 : undefined,
        timeout: POLL_TIMEOUT_SECONDS,
      },
      pollAbortController.signal,
    );

    let nextConfig = readConfig();

    for (const update of updates) {
      const freshConfig = readConfig();
      nextConfig = {
        ...freshConfig,
        lastUpdateId: Math.max(freshConfig.lastUpdateId ?? 0, update.update_id),
      };
      writeConfig(nextConfig);

      try {
        await handleUpdate(update, nextConfig.token);
      } catch (error) {
        lastError = getErrorMessage(error);

        if (isTelegramRateLimitError(error)) {
          throw error;
        }
      }
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

      if (isTelegramRateLimitError(error)) {
        lastError = formatTelegramRateLimitError(error);
        scheduleNextPoll(getTelegramRetryDelayMs(error), sessionId);
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
  const language = getLanguage(config);
  const copy = getCopy(language);
  const text = message.text.trim();

  if (!config.chatId) {
    if (isStartIntent(text) && isValidLinkStart(text, config)) {
      writeConfig({ ...config, chatId: message.chat.id, conversation: undefined, language, linkCode: undefined });
      await clearChatBeforeAction(token, message.chat.id, message.message_id, copy.text.staleMessageClosed);
      await sendMainMenu(token, message.chat.id, copy.text.botConnected, language);
      return;
    }

    await sendMessage(token, message.chat.id, copy.text.connectPrompt);
    return;
  }

  if (message.chat.id !== config.chatId) {
    await sendMessage(token, message.chat.id, copy.text.connectedElsewhere);
    return;
  }

  await clearChatBeforeAction(token, message.chat.id, message.message_id, copy.text.staleMessageClosed);
  const freshConfig = readConfig();
  const freshLanguage = getLanguage(freshConfig);
  const freshCopy = getCopy(freshLanguage);

  if (freshConfig.conversation) {
    await handleConversationMessage(token, message.chat.id, text, freshConfig.conversation, freshLanguage);
    return;
  }

  if (isStartIntent(text) || isMenuIntent(text)) {
    writeConfig({ ...freshConfig, conversation: undefined });
    await sendMainMenu(token, message.chat.id, freshCopy.text.alreadyConnected, freshLanguage);
    return;
  }

  if (isLanguageIntent(text)) {
    await sendLanguagePicker(token, message.chat.id, freshLanguage);
    return;
  }

  if (isHelpIntent(text)) {
    await sendHelp(token, message.chat.id, freshLanguage);
    return;
  }

  if (isCategoryCreateIntent(text)) {
    await startCategoryFlow(token, message.chat.id, freshLanguage);
    return;
  }

  if (isAddIntent(text) && !getAddCommandText(text)) {
    await startAddFlow(token, message.chat.id, { scope: 'inbox' }, freshLanguage);
    return;
  }

  if (isInboxIntent(text)) {
    await sendTaskList(token, message.chat.id, { scope: 'inbox' }, freshLanguage);
    return;
  }

  if (isTodayIntent(text)) {
    await sendTaskList(token, message.chat.id, { scope: 'today' }, freshLanguage);
    return;
  }

  if (isWeekIntent(text)) {
    await sendTaskList(token, message.chat.id, { scope: 'week' }, freshLanguage);
    return;
  }

  if (isCategoriesIntent(text)) {
    await sendCategories(token, message.chat.id, freshLanguage);
    return;
  }

  if (text.startsWith('/') && !isAddIntent(text)) {
    await sendHelp(token, message.chat.id, freshLanguage, freshCopy.text.invalidCommand);
    return;
  }

  await createTaskFromTelegramText(token, message.chat.id, getAddCommandText(text) ?? text, freshLanguage);
};

const handleCallbackQuery = async (query: TelegramCallbackQuery, token: string) => {
  const chatId = query.message?.chat.id;
  const data = query.data ?? '';
  const config = readConfig();
  const language = getLanguage(config);
  const copy = getCopy(language);

  if (!chatId) {
    await answerCallbackQuery(token, query.id);
    return;
  }

  if (!config.chatId || chatId !== config.chatId) {
    await answerCallbackQuery(token, query.id, copy.text.connectedElsewhere);
    return;
  }

  await answerCallbackQuery(token, query.id);
  await clearChatBeforeAction(token, chatId, query.message?.message_id, copy.text.staleMessageClosed, true);
  const freshConfig = readConfig();
  const freshLanguage = getLanguage(freshConfig);
  const freshCopy = getCopy(freshLanguage);

  if (data === 'flow:cancel') {
    writeConfig({ ...freshConfig, conversation: undefined });
    await sendMainMenu(token, chatId, freshCopy.text.cancel, freshLanguage);
    return;
  }

  if (data === 'lang:ru' || data === 'lang:en') {
    const nextLanguage = data.slice('lang:'.length) as LanguageCode;
    writeConfig({ ...freshConfig, conversation: undefined, language: nextLanguage });
    await setupBotCommands(token, nextLanguage);
    await sendMainMenu(token, chatId, getCopy(nextLanguage).text.languageSaved, nextLanguage);
    return;
  }

  if (data === 'view:inbox') {
    await sendTaskList(token, chatId, { scope: 'inbox' }, freshLanguage);
    return;
  }

  if (data === 'view:today') {
    await sendTaskList(token, chatId, { scope: 'today' }, freshLanguage);
    return;
  }

  if (data === 'view:week') {
    await sendTaskList(token, chatId, { scope: 'week' }, freshLanguage);
    return;
  }

  if (data === 'view:categories') {
    await sendCategories(token, chatId, freshLanguage);
    return;
  }

  if (data === 'view:language') {
    await sendLanguagePicker(token, chatId, freshLanguage);
    return;
  }

  if (data === 'cat:create') {
    await startCategoryFlow(token, chatId, freshLanguage);
    return;
  }

  if (data === 'add:inbox') {
    await startAddFlow(token, chatId, { scope: 'inbox' }, freshLanguage);
    return;
  }

  if (data === 'add:today') {
    await startAddFlow(token, chatId, { dueDate: getTodayDate(), scope: 'today' }, freshLanguage);
    return;
  }

  if (data === 'add:week') {
    await sendWeekDayPicker(token, chatId, freshLanguage);
    return;
  }

  if (data === 'week:add:none') {
    await startAddFlow(token, chatId, { scope: 'inbox' }, freshLanguage);
    return;
  }

  if (data.startsWith('week:add:')) {
    const dueDate = data.slice('week:add:'.length);
    await startAddFlow(token, chatId, { dueDate, scope: 'week' }, freshLanguage);
    return;
  }

  if (data.startsWith('cat:view:')) {
    await sendTaskList(token, chatId, { categoryId: data.slice('cat:view:'.length), scope: 'category' }, freshLanguage);
    return;
  }

  if (data.startsWith('cat:add:')) {
    const categoryId = data.slice('cat:add:'.length);
    await startAddFlow(token, chatId, { categoryId, scope: 'category' }, freshLanguage);
    return;
  }

  if (data.startsWith('task:toggle:')) {
    await toggleTaskFromTelegram(token, chatId, data.slice('task:toggle:'.length), freshLanguage);
    return;
  }

  if (data.startsWith('task:delete:')) {
    await deleteTaskFromTelegram(token, chatId, data.slice('task:delete:'.length), freshLanguage);
  }
};

const handleConversationMessage = async (
  token: string,
  chatId: number,
  text: string,
  conversation: NonNullable<TelegramConversation>,
  language: LanguageCode,
) => {
  const config = readConfig();
  const copy = getCopy(language);

  if (isCancelIntent(text)) {
    writeConfig({ ...config, conversation: undefined });
    await sendMainMenu(token, chatId, copy.text.cancel, language);
    return;
  }

  if (conversation.mode === 'awaiting_category_title') {
    await createCategoryFromTelegramText(token, chatId, text, language);
    return;
  }

  const parsedTask = parseTaskText(text);

  const createdCategory = parsedTask.unknownCategoryName
    ? createCategoryForTask(parsedTask.unknownCategoryName)
    : undefined;

  const taskInput = mergeConversationTaskInput(
    {
      ...parsedTask.input,
      categoryId: createdCategory?.id ?? parsedTask.input.categoryId,
      scope: createdCategory ? 'category' : parsedTask.input.scope,
    },
    conversation,
  );

  if (!taskInput.title) {
    await sendMessage(token, chatId, `${copy.text.emptyTask}\n\n${formatGuide(language)}`, buildCancelKeyboard(language));
    return;
  }

  const task = createTask(taskInput);
  writeConfig({ ...config, conversation: undefined });
  onDataChanged?.();
  await sendMessage(
    token,
    chatId,
    [createdCategory ? copy.text.categoryCreatedForTask(createdCategory.title) : undefined, formatCreatedTask(task, language)]
      .filter(Boolean)
      .join('\n\n'),
    buildTaskKeyboard(task, language),
  );
};

const createCategoryForTask = (name: string) => {
  const title = cleanCategoryTitle(name);

  if (!title) {
    return undefined;
  }

  const existingCategory = findCategoryByTitle(title);

  if (existingCategory) {
    return existingCategory;
  }

  const category = createCategory({
    color: pickCategoryColor(),
    iconMode: 'hash',
    isFavorite: false,
    title,
  });

  onDataChanged?.();
  return category;
};

const createTaskFromTelegramText = async (token: string, chatId: number, text: string, language: LanguageCode) => {
  const copy = getCopy(language);
  const parsedTask = parseTaskText(text);

  const createdCategory = parsedTask.unknownCategoryName
    ? createCategoryForTask(parsedTask.unknownCategoryName)
    : undefined;

  const taskInput: CreateTaskInput = {
    ...parsedTask.input,
    categoryId: createdCategory?.id ?? parsedTask.input.categoryId,
    scope: createdCategory ? 'category' : parsedTask.input.scope,
  };

  if (!taskInput.title) {
    await sendMessage(token, chatId, `${copy.text.emptyTask}\n\n${formatGuide(language)}`, buildHomeKeyboard(language));
    return;
  }

  const task = createTask(taskInput);
  onDataChanged?.();
  await sendMessage(
    token,
    chatId,
    [createdCategory ? copy.text.categoryCreatedForTask(createdCategory.title) : undefined, formatCreatedTask(task, language)]
      .filter(Boolean)
      .join('\n\n'),
    buildTaskKeyboard(task, language),
  );
};

const createCategoryFromTelegramText = async (token: string, chatId: number, text: string, language: LanguageCode) => {
  const config = readConfig();
  const copy = getCopy(language);
  const title = cleanCategoryTitle(text);

  if (!title) {
    await sendMessage(token, chatId, copy.text.categoryEmpty, buildCancelKeyboard(language));
    return;
  }

  const existingCategory = findCategoryByTitle(title);

  if (existingCategory) {
    writeConfig({ ...config, conversation: undefined });
    await sendMessage(token, chatId, copy.text.categoryExists(existingCategory.title), buildCategoryKeyboard(existingCategory, language));
    return;
  }

  const category = createCategory({
    color: pickCategoryColor(),
    iconMode: 'hash',
    isFavorite: false,
    title,
  });

  writeConfig({ ...config, conversation: undefined });
  onDataChanged?.();
  await sendMessage(token, chatId, copy.text.categoryCreated(category.title), buildCategoryKeyboard(category, language));
};

const startAddFlow = async (
  token: string,
  chatId: number,
  input: { categoryId?: string; dueDate?: string; scope: TaskScope },
  language: LanguageCode,
) => {
  const config = readConfig();
  const category = input.categoryId ? listCategories().find((item) => item.id === input.categoryId) : undefined;
  const target = formatTaskTarget(input.scope, language, input.dueDate, category);
  const copy = getCopy(language);

  writeConfig({
    ...config,
    conversation: {
      categoryId: input.categoryId,
      dueDate: input.dueDate,
      mode: 'awaiting_task_text',
      scope: input.scope,
    },
  });

  await sendMessage(token, chatId, `${copy.text.writeTask(target)}\n\n${formatGuide(language)}`, buildCancelKeyboard(language));
};

const startCategoryFlow = async (token: string, chatId: number, language: LanguageCode) => {
  const config = readConfig();
  const copy = getCopy(language);
  writeConfig({ ...config, conversation: { mode: 'awaiting_category_title' } });
  await sendMessage(token, chatId, copy.text.categoryPrompt, buildCancelKeyboard(language));
};

const sendWeekDayPicker = async (token: string, chatId: number, language: LanguageCode) => {
  await sendMessage(token, chatId, getCopy(language).text.weekDayPrompt, buildWeekDayKeyboard(language));
};

const sendTaskList = async (
  token: string,
  chatId: number,
  filter: { categoryId?: string; scope: TaskScope },
  language: LanguageCode,
) => {
  const tasks = getVisibleTasks(filter).slice(0, TASK_LIST_LIMIT);
  const categories = listCategories();
  const copy = getCopy(language);
  const title = getTaskListTitle(filter, categories, language);
  const text =
    tasks.length > 0
      ? `${title}\n\n${tasks.map((task, index) => formatTaskLine(task, index, categories)).join('\n')}`
      : `${title}\n\n${copy.text.emptyList}`;

  await sendMessage(token, chatId, text, buildTaskListKeyboard(tasks, filter, language));
};

const sendCategories = async (token: string, chatId: number, language: LanguageCode) => {
  const categories = listCategories();
  const copy = getCopy(language);
  const rows = categories.flatMap((category) => [
    [{ callback_data: `cat:view:${category.id}`, text: `${formatCategoryMarker(category)} ${category.title}` }],
    [{ callback_data: `cat:add:${category.id}`, text: `${copy.buttons.addTask} #${truncate(category.title, 24)}` }],
  ]);

  await sendMessage(token, chatId, categories.length > 0 ? copy.title.categories : `${copy.title.categories}\n\n${copy.text.noCategories}`, {
    inline_keyboard: [
      [{ callback_data: 'cat:create', text: copy.buttons.createCategory }],
      ...rows,
      ...buildCancelRows(language),
      ...buildNavigationRows(language),
    ],
  });
};

const sendHelp = async (token: string, chatId: number, language: LanguageCode, prefix?: string) => {
  const copy = getCopy(language);
  await sendMessage(
    token,
    chatId,
    [prefix, copy.text.helpIntro, ...copy.help, '', formatGuide(language)].filter(Boolean).join('\n'),
    buildHomeKeyboard(language),
  );
};

const sendLanguagePicker = async (token: string, chatId: number, language: LanguageCode) => {
  const copy = getCopy(language);
  await sendMessage(token, chatId, copy.text.chooseLanguage, {
    inline_keyboard: [
      [
        { callback_data: 'lang:ru', text: 'Русский' },
        { callback_data: 'lang:en', text: 'English' },
      ],
      ...buildCancelRows(language),
    ],
  });
};

const sendMainMenu = async (token: string, chatId: number, text: string, language: LanguageCode) => {
  await sendMessage(token, chatId, text, buildMainMenuKeyboard(language));
};

const toggleTaskFromTelegram = async (token: string, chatId: number, taskId: string, language: LanguageCode) => {
  const copy = getCopy(language);
  const task = toggleTask(taskId);

  if (!task) {
    await sendMessage(token, chatId, copy.text.taskNotFound);
    return;
  }

  onDataChanged?.();
  await sendMessage(
    token,
    chatId,
    task.status === 'completed' ? copy.text.taskCompleted(task.title) : copy.text.taskRestored(task.title),
    buildTaskKeyboard(task, language),
  );
};

const deleteTaskFromTelegram = async (token: string, chatId: number, taskId: string, language: LanguageCode) => {
  const copy = getCopy(language);
  const task = listTasks().find((item) => item.id === taskId);
  const wasDeleted = deleteTask(taskId);

  if (!wasDeleted) {
    await sendMessage(token, chatId, copy.text.taskWasDeleted);
    return;
  }

  onDataChanged?.();
  await sendMessage(token, chatId, copy.text.deleted(task?.title), buildNavigationKeyboard(language));
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
        return task.dueDate ? weekDates.includes(task.dueDate) : task.scope === 'inbox' || task.scope === 'week';
      }

      return task.scope === 'inbox';
    });
};

const mergeConversationTaskInput = (
  input: CreateTaskInput,
  conversation: Extract<NonNullable<TelegramConversation>, { mode: 'awaiting_task_text' }>,
): CreateTaskInput => {
  const categoryId = input.categoryId ?? conversation.categoryId;
  const dueDate = input.dueDate ?? conversation.dueDate;

  return {
    ...input,
    categoryId,
    dueDate,
    scope: resolveConversationTaskScope(conversation.scope, categoryId, dueDate),
  };
};

const resolveConversationTaskScope = (conversationScope: TaskScope, categoryId?: string, dueDate?: string): TaskScope => {
  if (categoryId) {
    return 'category';
  }

  if (!dueDate) {
    return conversationScope;
  }

  if (conversationScope === 'week') {
    return 'week';
  }

  return dueDate === getTodayDate() ? 'today' : 'week';
};

const buildMainMenuKeyboard = (language: LanguageCode): ReplyKeyboardMarkup => {
  const copy = getCopy(language);

  return {
    is_persistent: true,
    keyboard: [
      [{ text: copy.buttons.addTask }, { text: copy.buttons.inbox }],
      [{ text: copy.buttons.today }, { text: copy.buttons.week }],
      [{ text: copy.buttons.categories }, { text: copy.buttons.createCategory }],
      [{ text: copy.buttons.language }, { text: copy.buttons.help }],
    ],
    resize_keyboard: true,
  };
};

const buildTaskListKeyboard = (
  tasks: Task[],
  filter: { categoryId?: string; scope: TaskScope },
  language: LanguageCode,
): InlineKeyboardMarkup => {
  const copy = getCopy(language);
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
      [{ callback_data: addCallbackData, text: copy.buttons.addTask }],
      ...buildCancelRows(language),
      ...buildNavigationRows(language),
    ],
  };
};

const buildTaskKeyboard = (task: Task, language: LanguageCode): InlineKeyboardMarkup => {
  const copy = getCopy(language);

  return {
    inline_keyboard: [
      [
        {
          callback_data: `task:toggle:${task.id}`,
          text: task.status === 'completed' ? copy.buttons.restoreTask : copy.buttons.doneTask,
        },
        { callback_data: `task:delete:${task.id}`, text: copy.buttons.deleteTask },
      ],
      ...buildCancelRows(language),
      ...buildNavigationRows(language),
    ],
  };
};

const buildCategoryKeyboard = (category: Category, language: LanguageCode): InlineKeyboardMarkup => {
  const copy = getCopy(language);

  return {
    inline_keyboard: [
      [{ callback_data: `cat:add:${category.id}`, text: `${copy.buttons.addTask} #${category.title}` }],
      [{ callback_data: `cat:view:${category.id}`, text: `${formatCategoryMarker(category)} ${category.title}` }],
      ...buildCancelRows(language),
      ...buildNavigationRows(language),
    ],
  };
};

const buildCategoryCreateKeyboard = (language: LanguageCode): InlineKeyboardMarkup => {
  const copy = getCopy(language);

  return {
    inline_keyboard: [[{ callback_data: 'cat:create', text: copy.buttons.createCategory }], ...buildCancelRows(language)],
  };
};

const buildCancelKeyboard = (language: LanguageCode): InlineKeyboardMarkup => ({
  inline_keyboard: [...buildCancelRows(language), ...buildNavigationRows(language)],
});

const buildWeekDayKeyboard = (language: LanguageCode): InlineKeyboardMarkup => {
  const copy = getCopy(language);
  const dayRows = chunkRows(
    getCurrentWeekDates().map((dateValue) => ({
      callback_data: `week:add:${dateValue}`,
      text: formatWeekDayButton(dateValue, language),
    })),
    2,
  );

  return {
    inline_keyboard: [
      [{ callback_data: 'week:add:none', text: copy.buttons.inbox }],
      ...dayRows,
      ...buildCancelRows(language),
      ...buildNavigationRows(language),
    ],
  };
};

const buildHomeKeyboard = (language: LanguageCode): InlineKeyboardMarkup => {
  const copy = getCopy(language);

  return {
    inline_keyboard: [[{ callback_data: 'add:inbox', text: copy.buttons.addTask }], ...buildCancelRows(language), ...buildNavigationRows(language)],
  };
};

const buildNavigationKeyboard = (language: LanguageCode): InlineKeyboardMarkup => ({
  inline_keyboard: [...buildCancelRows(language), ...buildNavigationRows(language)],
});

const buildCancelRows = (language: LanguageCode): InlineKeyboardButton[][] => [
  [{ callback_data: 'flow:cancel', text: getCopy(language).buttons.cancel }],
];

const buildNavigationRows = (language: LanguageCode): InlineKeyboardButton[][] => {
  const copy = getCopy(language);

  return [
    [
      { callback_data: 'view:inbox', text: copy.buttons.inbox },
      { callback_data: 'view:today', text: copy.buttons.today },
    ],
    [
      { callback_data: 'view:week', text: copy.buttons.week },
      { callback_data: 'view:categories', text: copy.buttons.categories },
    ],
    [{ callback_data: 'view:language', text: copy.buttons.language }],
  ];
};

const formatCreatedTask = (task: Task, language: LanguageCode) =>
  `${getCopy(language).text.createdPrefix}\n${formatTaskLine(task, 0, listCategories()).replace('1. ', '')}`;

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

const formatTaskTarget = (scope: TaskScope, language: LanguageCode, dueDate?: string, category?: Category) => {
  const copy = getCopy(language);

  if (category) {
    return `#${category.title}`;
  }

  if (dueDate === getTodayDate()) {
    return scope === 'week'
      ? `${copy.title.week.replace(/^.\s/, '')} · ${formatWeekDayButton(dueDate, language)}`
      : copy.title.today.replace(/^.\s/, '');
  }

  if (scope === 'week') {
    return dueDate
      ? `${copy.title.week.replace(/^.\s/, '')} · ${formatWeekDayButton(dueDate, language)}`
      : copy.title.week.replace(/^.\s/, '');
  }

  return copy.title.inbox.replace(/^.\s/, '');
};

const getTaskListTitle = (filter: { categoryId?: string; scope: TaskScope }, categories: Category[], language: LanguageCode) => {
  const copy = getCopy(language);

  if (filter.scope === 'category') {
    const category = categories.find((item) => item.id === filter.categoryId);
    return category ? `${formatCategoryMarker(category)} ${category.title}` : copy.title.category;
  }

  if (filter.scope === 'today') {
    return copy.title.today;
  }

  if (filter.scope === 'week') {
    return copy.title.week;
  }

  return copy.title.inbox;
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

const formatGuide = (language: LanguageCode) => getCopy(language).guide.join('\n');

const setupBotCommands = (token: string, language: LanguageCode) => {
  const commands = getCopy(language).commands;

  return telegramApi(token, 'setMyCommands', {
    commands: [
      { command: 'start', description: commands.start },
      { command: 'add', description: commands.add },
      { command: 'inbox', description: commands.inbox },
      { command: 'today', description: commands.today },
      { command: 'week', description: commands.week },
      { command: 'categories', description: commands.categories },
      { command: 'language', description: commands.language },
      { command: 'menu', description: commands.menu },
      { command: 'help', description: commands.help },
    ],
  });
};

const parseTaskText = (value: string): { input: CreateTaskInput; unknownCategoryName?: string } => {
  let text = value.replace(/^\/add(@\w+)?\s*/i, '').trim();
  const priorityInfo = extractPriority(text);
  text = priorityInfo.text;
  const categoryInfo = extractCategory(text);
  text = categoryInfo.text;

  const dueLabel = text.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/)?.[0];

  if (dueLabel) {
    text = text.replace(dueLabel, '').trim();
  }

  const dateInfo = extractDate(text);
  text = dateInfo.text;

  return {
    input: {
      categoryId: categoryInfo.category?.id,
      dueDate: dateInfo.dueDate,
      dueLabel,
      priority: priorityInfo.priority,
      scope: categoryInfo.category ? 'category' : dateInfo.dueDate === getTodayDate() ? 'today' : 'inbox',
      title: text,
    },
    unknownCategoryName: categoryInfo.unknownCategoryName,
  };
};

const extractPriority = (value: string): { priority: CreateTaskInput['priority']; text: string } => {
  const match = value.match(/^\s*([123])(?:[\s.)-]+)(.+)$/);

  if (!match) {
    return { priority: 4, text: value.trim() };
  }

  return {
    priority: Number(match[1]) as CreateTaskInput['priority'],
    text: match[2].trim(),
  };
};

const extractCategory = (value: string): { category?: Category; text: string; unknownCategoryName?: string } => {
  const categories = listCategories().sort((a, b) => b.title.length - a.title.length);

  for (const category of categories) {
    const escapedTitle = escapeRegExp(category.title);
    const match = value.match(new RegExp(`(^|\\s)#${escapedTitle}(?=\\s|$)`, 'i'));

    if (match) {
      return { category, text: value.replace(match[0], ' ').trim() };
    }
  }

  const categoryMatch = value.match(/(?:^|\s)#([^\s#]+)/);

  if (!categoryMatch) {
    return { text: value.trim() };
  }

  return {
    text: value.replace(categoryMatch[0], ' ').trim(),
    unknownCategoryName: categoryMatch[1],
  };
};

const extractDate = (value: string): { dueDate?: string; text: string } => {
  const todayPattern = /\b(today|сегодня)\b/i;
  const tomorrowPattern = /\b(tomorrow|завтра)\b/i;

  if (todayPattern.test(value)) {
    return { dueDate: getTodayDate(), text: value.replace(todayPattern, '').trim() };
  }

  if (tomorrowPattern.test(value)) {
    return { dueDate: getRelativeDate(1), text: value.replace(tomorrowPattern, '').trim() };
  }

  const dateMatch = value.match(/\b(\d{2})\.(\d{2})(?:\.(\d{4}))?\b/);

  if (!dateMatch) {
    return { text: value.trim() };
  }

  const year = dateMatch[3] ?? String(new Date().getFullYear());
  const dueDate = `${year}-${dateMatch[2]}-${dateMatch[1]}`;
  if (!isValidDateKey(dueDate)) {
    return { text: value.trim() };
  }

  return { dueDate, text: value.replace(dateMatch[0], '').trim() };
};

const getAddCommandText = (value: string) => {
  const match = value.match(/^\/add(?:@\w+)?(?:\s+(.+))?$/i);
  return match ? match[1]?.trim() ?? '' : undefined;
};

const isAddIntent = (value: string) => isMenuButton(value, 'addTask') || /^\/add(?:@\w+)?(?:\s|$)/i.test(value);
const isCancelIntent = (value: string) => isMenuButton(value, 'cancel') || /^\/cancel(?:@\w+)?$/i.test(value);
const isCategoriesIntent = (value: string) => isMenuButton(value, 'categories') || /^\/categories(?:@\w+)?$/i.test(value);
const isCategoryCreateIntent = (value: string) => isMenuButton(value, 'createCategory') || /^\/category(?:@\w+)?$/i.test(value);
const isHelpIntent = (value: string) => isMenuButton(value, 'help') || /^\/help(?:@\w+)?$/i.test(value);
const isInboxIntent = (value: string) => isMenuButton(value, 'inbox') || /^\/inbox(?:@\w+)?$/i.test(value);
const isLanguageIntent = (value: string) => isMenuButton(value, 'language') || /^\/language(?:@\w+)?$/i.test(value);
const isMenuIntent = (value: string) => /^\/menu(?:@\w+)?$/i.test(value);
const isStartIntent = (value: string) => /^\/start(?:@\w+)?(?:\s|$)/i.test(value);
const isTodayIntent = (value: string) => isMenuButton(value, 'today') || /^\/today(?:@\w+)?$/i.test(value);
const isWeekIntent = (value: string) => isMenuButton(value, 'week') || /^\/week(?:@\w+)?$/i.test(value);

const isMenuButton = (value: string, key: keyof BotCopy['buttons']) =>
  Object.values(botCopy).some((copy) => value === copy.buttons[key]);

const telegramApi = async <T>(
  token: string,
  method: string,
  payload: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> => {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), getTelegramApiTimeoutMs(method));
  const requestSignal = signal ? AbortSignal.any([signal, timeoutController.signal]) : timeoutController.signal;
  let response: Response;

  try {
    response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: requestSignal,
    });
  } catch (error) {
    if (timeoutController.signal.aborted && !(signal?.aborted)) {
      throw new Error(`Telegram API request timed out: ${method}`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  let data: TelegramApiResponse<T>;
  try {
    data = (await response.json()) as TelegramApiResponse<T>;
  } catch {
    throw new Error(`Telegram API returned an invalid response for ${method}.`);
  }

  if (!response.ok || !data.ok) {
    const message = data.description ?? `Telegram API request failed: ${method}`;
    const retryAfterSeconds = data.parameters?.retry_after ?? extractRetryAfterSeconds(message);

    if (response.status === 429 || data.error_code === 429 || retryAfterSeconds) {
      throw new TelegramRateLimitError(message, retryAfterSeconds ?? 60);
    }

    throw new Error(message);
  }

  return data.result as T;
};

const sendMessage = async (token: string, chatId: number, text: string, replyMarkup?: TelegramReplyMarkup) => {
  const message = await telegramApi<TelegramMessage>(token, 'sendMessage', {
    chat_id: chatId,
    reply_markup: replyMarkup,
    text,
  });

  rememberBotMessage(chatId, message.message_id);
  return message;
};

const answerCallbackQuery = (token: string, callbackQueryId: string, text?: string) =>
  telegramApi(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    show_alert: Boolean(text),
    text,
  });

const deleteMessage = async (token: string, chatId: number, messageId: number) => {
  try {
    await telegramApi(token, 'deleteMessage', {
      chat_id: chatId,
      message_id: messageId,
    });
    return true;
  } catch (error) {
    lastError = `Telegram cleanup failed: ${getErrorMessage(error)}`;
    return false;
  }
};

const closeStaleBotMessage = async (token: string, chatId: number, messageId: number, text: string) => {
  try {
    await telegramApi(token, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
      text,
    });
    return true;
  } catch (error) {
    lastError = `Telegram cleanup fallback failed: ${getErrorMessage(error)}`;
    return false;
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const clearChatBeforeAction = async (
  token: string,
  chatId: number,
  incomingMessageId?: number,
  fallbackText?: string,
  canFallbackIncomingMessage = false,
) => {
  const config = readConfig();
  const botMessageIds = new Set(config.botMessageIds ?? []);
  const ids = [...botMessageIds].filter((messageId) => messageId !== incomingMessageId);

  if (ids.length === 0) {
    return;
  }

  for (const messageId of ids) {
    const wasDeleted = await deleteMessage(token, chatId, messageId);

    const canUseFallback = botMessageIds.has(messageId) || (canFallbackIncomingMessage && messageId === incomingMessageId);

    if (!wasDeleted && fallbackText && canUseFallback) {
      await closeStaleBotMessage(token, chatId, messageId, fallbackText);
    }

    await delay(250);
  }

  writeConfig({
    ...readConfig(),
    botMessageIds: isNumber(incomingMessageId) && botMessageIds.has(incomingMessageId) ? [incomingMessageId] : [],
  });
};

const rememberBotMessage = (chatId: number, messageId: number) => {
  const config = readConfig();

  if (config.chatId !== chatId) {
    return;
  }

  writeConfig({
    ...config,
    botMessageIds: [...(config.botMessageIds ?? []), messageId].slice(-STORED_BOT_MESSAGE_LIMIT),
  });
};

const readConfig = (): TelegramConfig => {
  try {
    const rawValue = fs.readFileSync(getConfigPath(), 'utf8');
    const parsed = JSON.parse(rawValue) as Partial<TelegramConfig>;
    const token = readStoredToken(parsed);

    return {
      ...parsed,
      botMessageIds: Array.isArray(parsed.botMessageIds) ? parsed.botMessageIds.filter(isNumber) : [],
      botMode: normalizeBotMode(parsed.botMode),
      botUsername: typeof parsed.botUsername === 'string' ? parsed.botUsername : undefined,
      chatSessionSchemaVersion: typeof parsed.chatSessionSchemaVersion === 'number' ? parsed.chatSessionSchemaVersion : undefined,
      chatSessions: parsed.chatSessions && typeof parsed.chatSessions === 'object' ? parsed.chatSessions : undefined,
      chatId: typeof parsed.chatId === 'number' ? parsed.chatId : undefined,
      conversation: normalizeConversation(parsed.conversation),
      enabled: Boolean(parsed.enabled),
      language: normalizeLanguage(parsed.language),
      lastUpdateId: typeof parsed.lastUpdateId === 'number' ? parsed.lastUpdateId : undefined,
      linkCode: normalizeLinkCode(parsed.linkCode),
      pendingAuthChats: parsed.pendingAuthChats && typeof parsed.pendingAuthChats === 'object' ? parsed.pendingAuthChats : undefined,
      serverDeadlineNotifiedKeys: Array.isArray(parsed.serverDeadlineNotifiedKeys)
        ? parsed.serverDeadlineNotifiedKeys.filter((item): item is string => typeof item === 'string')
        : [],
      serverLastError: typeof parsed.serverLastError === 'string' ? parsed.serverLastError : undefined,
      serverLastHeartbeatAt: typeof parsed.serverLastHeartbeatAt === 'string' ? parsed.serverLastHeartbeatAt : undefined,
      serverLastUpdateId: typeof parsed.serverLastUpdateId === 'number' ? parsed.serverLastUpdateId : undefined,
      serverLastStatus: typeof parsed.serverLastStatus === 'string' ? parsed.serverLastStatus : undefined,
      token,
    };
  } catch {
    return { botMessageIds: [], botMode: 'custom', enabled: false, language: 'ru' };
  }
};

const writeConfig = (config: TelegramConfig) => {
  const configPath = getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(serializeConfig(config), null, 2), 'utf8');
};

const getConfigPath = () => path.join(getStoragePaths().storageDir, 'telegram.json');

const readStoredToken = (config: Partial<TelegramConfig>) => {
  if (typeof config.tokenEncrypted === 'string' && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(config.tokenEncrypted, 'base64'));
    } catch {
      return undefined;
    }
  }

  return typeof config.token === 'string' ? config.token : undefined;
};

const serializeConfig = (config: TelegramConfig) => {
  const { token, tokenEncrypted: _tokenEncrypted, ...safeConfig } = config;

  if (!token) {
    return safeConfig;
  }

  if (safeStorage.isEncryptionAvailable()) {
    return {
      ...safeConfig,
      tokenEncrypted: safeStorage.encryptString(token).toString('base64'),
    };
  }

  return {
    ...safeConfig,
    token,
  };
};

const cleanToken = (value: string | undefined) => {
  const cleanValue = value?.trim();
  return cleanValue ? cleanValue : undefined;
};

const normalizeBotMode = (value: unknown): TelegramBotMode => (value === 'afterlight' ? 'afterlight' : 'custom');

const getBotMode = (config: TelegramConfig): TelegramBotMode => normalizeBotMode(config.botMode);

const getAuthorizedChatCount = (config: TelegramConfig) =>
  Object.values(config.chatSessions ?? {}).filter((session) => {
    if (!session || typeof session !== 'object') {
      return false;
    }

    const typedSession = session as { authenticatedAt?: unknown; authSource?: unknown; workspaceId?: unknown };
    return (
      typeof typedSession.workspaceId === 'string' &&
      (typeof typedSession.authenticatedAt === 'string' || typedSession.authSource === 'legacy')
    );
  }).length;

const isFreshServerHeartbeat = (value: string | undefined) => {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp <= SERVER_HEARTBEAT_STALE_MS;
};

const isTelegramConfigReadyForLink = (config: TelegramConfig) => {
  if (!config.enabled) {
    return false;
  }

  return getBotMode(config) === 'afterlight' || Boolean(config.token);
};

const createLinkCode = () => String(crypto.randomInt(100000, 1000000));

const getOrCreateLinkCode = (config: TelegramConfig) => {
  const existingCode = normalizeLinkCode(config.linkCode);

  if (existingCode) {
    return existingCode;
  }

  const linkCode = createLinkCode();
  writeConfig({ ...config, linkCode });
  return linkCode;
};

const normalizeLinkCode = (value: unknown) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const cleanValue = value.trim().toUpperCase();
  return /^\d{6}$/.test(cleanValue) ? cleanValue : undefined;
};

const getStartPayload = (value: string) => {
  const match = value.trim().match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  return match?.[1]?.trim();
};

const isValidLinkStart = (value: string, config: TelegramConfig) => {
  const linkCode = getOrCreateLinkCode(config);
  return normalizeLinkCode(getStartPayload(value)) === linkCode;
};

const cleanCategoryTitle = (value: string) =>
  value
    .replace(/^#/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64);

const findCategoryByTitle = (title: string) =>
  listCategories().find((category) => category.title.toLocaleLowerCase() === title.toLocaleLowerCase());

const pickCategoryColor = () => CATEGORY_COLORS[listCategories().length % CATEGORY_COLORS.length];

const getCopy = (language: LanguageCode) => botCopy[language];

const getLanguage = (config: TelegramConfig): LanguageCode => normalizeLanguage(config.language);

const normalizeLanguage = (value: unknown): LanguageCode => (value === 'en' ? 'en' : 'ru');

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Telegram bot error.');

const isTelegramPollingConflict = (message: string) => message.includes('Conflict: terminated by other getUpdates request');

const isNetworkFetchFailure = (message: string) => message === 'fetch failed';

const getTelegramApiTimeoutMs = (method: string) =>
  method === 'getUpdates' ? (POLL_TIMEOUT_SECONDS + 10) * 1000 : TELEGRAM_API_TIMEOUT_MS;

const normalizeConversation = (value: unknown): TelegramConversation => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const conversation = value as Partial<NonNullable<TelegramConversation>>;

  if (conversation.mode === 'awaiting_category_title') {
    return { mode: 'awaiting_category_title' };
  }

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

const formatWeekDayButton = (dateValue: string, language: LanguageCode) => {
  const date = parseDateKey(dateValue);
  const dayNames =
    language === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return `${formatShortDateForUser(dateValue)} ${date ? dayNames[getMondayBasedDayIndex(date)] : ''}`.trim();
};

const parseDateKey = (dateValue: string) => {
  const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return undefined;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const getMondayBasedDayIndex = (date: Date) => {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
};

const chunkRows = <T>(items: T[], size: number) => {
  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
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

const isValidDateKey = (dateValue: string) => {
  const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const formatDateForUser = (dateValue: string) => {
  const [year, month, day] = dateValue.split('-');
  return `${day}.${month}.${year}`;
};

const formatShortDateForUser = (dateValue: string) => {
  const [_year, month, day] = dateValue.split('-');
  return `${day}.${month}`;
};

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1))}…` : value;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
