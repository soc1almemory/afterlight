import fs from 'node:fs';
import path from 'node:path';
import type { CreateTaskInput, TelegramBotStatus, TelegramConfigInput } from '../../shared/types';
import { createTask, listCategories, listAppData } from '../storage/repositories';
import { getStoragePaths } from '../storage/database';

interface TelegramConfig {
  botUsername?: string;
  chatId?: number;
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
  message?: TelegramMessage;
  update_id: number;
}

interface TelegramApiResponse<T> {
  description?: string;
  ok: boolean;
  result: T;
}

const POLL_TIMEOUT_SECONDS = 25;
const POLL_RETRY_DELAY_MS = 5000;

let isRunning = false;
let lastError: string | undefined;
let lastUpdateAt: string | undefined;
let pollAbortController: AbortController | undefined;
let pollTimer: NodeJS.Timeout | undefined;
let onDataChanged: (() => void) | undefined;

export const configureTelegramBotRuntime = (options: { onDataChanged: () => void }) => {
  onDataChanged = options.onDataChanged;
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

  try {
    const bot = await telegramApi<{ id: number; username?: string }>(config.token, 'getMe');
    writeConfig({ ...config, botUsername: bot.username });
  } catch (error) {
    lastError = getErrorMessage(error);
    isRunning = false;
    return;
  }

  void pollTelegram();
};

export const stopTelegramBot = () => {
  isRunning = false;
  pollAbortController?.abort();
  pollAbortController = undefined;

  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = undefined;
  }
};

const pollTelegram = async () => {
  if (!isRunning) {
    return;
  }

  const config = readConfig();

  if (!config.enabled || !config.token) {
    stopTelegramBot();
    return;
  }

  try {
    pollAbortController = new AbortController();
    const updates = await telegramApi<TelegramUpdate[]>(config.token, 'getUpdates', {
      allowed_updates: ['message'],
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
    scheduleNextPoll(0);
  } catch (error) {
    if (isRunning) {
      lastError = getErrorMessage(error);
      scheduleNextPoll(POLL_RETRY_DELAY_MS);
    }
  }
};

const scheduleNextPoll = (delayMs: number) => {
  if (!isRunning) {
    return;
  }

  pollTimer = setTimeout(() => {
    void pollTelegram();
  }, delayMs);
};

const handleUpdate = async (update: TelegramUpdate, token?: string) => {
  const message = update.message;

  if (!message?.text || !token) {
    return;
  }

  const config = readConfig();
  const text = message.text.trim();

  if (!config.chatId) {
    if (text.startsWith('/start')) {
      writeConfig({ ...config, chatId: message.chat.id });
      await sendMessage(token, message.chat.id, 'Afterlight connected. Send a task text or /add task text.');
      return;
    }

    await sendMessage(token, message.chat.id, 'Open Afterlight settings and send /start to connect this chat.');
    return;
  }

  if (message.chat.id !== config.chatId) {
    await sendMessage(token, message.chat.id, 'This bot is already connected to another Afterlight workspace.');
    return;
  }

  if (text.startsWith('/start')) {
    await sendMessage(token, message.chat.id, 'Afterlight is already connected. Send /add task text.');
    return;
  }

  if (text.startsWith('/help')) {
    await sendMessage(token, message.chat.id, 'Commands: /add task text, /today, /help. Plain text also creates a task.');
    return;
  }

  if (text.startsWith('/today')) {
    const today = getTodayDate();
    const tasks = listAppData().tasks.filter((task) => task.status === 'active' && task.dueDate === today);
    const body = tasks.length > 0 ? tasks.map((task) => `- ${task.title}`).join('\n') : 'No tasks for today.';
    await sendMessage(token, message.chat.id, body);
    return;
  }

  const taskInput = parseTaskText(text);

  if (!taskInput.title) {
    await sendMessage(token, message.chat.id, 'Task text is empty.');
    return;
  }

  const task = createTask(taskInput);
  onDataChanged?.();
  await sendMessage(token, message.chat.id, `Added: ${task.title}`);
};

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

const sendMessage = (token: string, chatId: number, text: string) =>
  telegramApi(token, 'sendMessage', {
    chat_id: chatId,
    text,
  });

const readConfig = (): TelegramConfig => {
  try {
    const rawValue = fs.readFileSync(getConfigPath(), 'utf8');
    const parsed = JSON.parse(rawValue) as Partial<TelegramConfig>;

    return {
      botUsername: typeof parsed.botUsername === 'string' ? parsed.botUsername : undefined,
      chatId: typeof parsed.chatId === 'number' ? parsed.chatId : undefined,
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

const getTodayDate = () => getRelativeDate(0);

const getRelativeDate = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
