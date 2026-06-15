const BOT_USERNAME = 'afterlight_task_bot';
const TASK_LIST_LIMIT = 30;
const BOT_MESSAGE_HISTORY_LIMIT = 20;
const BOT_TIMEZONE_OFFSET_MINUTES = 180;
const CATEGORY_COLORS = ['#7c65ff', '#ffb84d', '#45c27a', '#4aa3ff', '#f06795', '#9b7cff'];

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error(error);
      return json({ error: error instanceof Error ? error.message : String(error), ok: false }, 500);
    }
  },
};

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === '/health') {
    return json({ bot: `@${BOT_USERNAME}`, ok: true });
  }

  if (request.method === 'POST' && url.pathname === '/telegram/webhook') {
    await handleTelegramUpdate(await request.json(), env);
    return json({ ok: true });
  }

  if (request.method === 'POST' && url.pathname === '/api/workspaces/register') {
    return json({ ok: true, ...(await registerWorkspace(await request.json(), env)) });
  }

  if (request.method === 'POST' && url.pathname === '/api/workspaces/status') {
    const client = await getAuthorizedClient(await request.json(), env);
    return json({
      authorizedChatCount: await countAuthorizedChats(client.workspace_id, env),
      bot: `@${BOT_USERNAME}`,
      ok: true,
      workspaceId: client.workspace_id,
    });
  }

  if (request.method === 'POST' && url.pathname === '/api/workspaces/reset-sessions') {
    const client = await getAuthorizedClient(await request.json(), env);
    await env.DB.prepare('DELETE FROM chat_sessions WHERE workspace_id = ?').bind(client.workspace_id).run();
    return json({ authorizedChatCount: 0, ok: true, workspaceId: client.workspace_id });
  }

  return json({ error: 'Not found', ok: false }, 404);
}

async function ensureSchema(env) {
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS clients (
        client_id TEXT PRIMARY KEY,
        client_secret TEXT NOT NULL,
        workspace_id TEXT NOT NULL UNIQUE,
        link_code TEXT NOT NULL UNIQUE,
        language TEXT NOT NULL DEFAULT 'ru',
        profile_name TEXT,
        timezone_name TEXT,
        timezone_offset_minutes INTEGER NOT NULL DEFAULT 180,
        workspace_title TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_sync_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS chat_sessions (
        chat_id INTEGER PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'ru',
        conversation_json TEXT,
        bot_message_ids_json TEXT NOT NULL DEFAULT '[]',
        timezone_name TEXT,
        timezone_offset_minutes INTEGER NOT NULL DEFAULT 180,
        authenticated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_label TEXT
      )`,
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS pending_auth_chats (
        chat_id INTEGER PRIMARY KEY,
        language TEXT NOT NULL DEFAULT 'ru',
        requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_label TEXT
      )`,
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        title TEXT NOT NULL,
        color TEXT NOT NULL,
        icon_mode TEXT NOT NULL DEFAULT 'color',
        emoji TEXT,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT,
        due_at TEXT,
        priority INTEGER NOT NULL DEFAULT 4,
        status TEXT NOT NULL DEFAULT 'active',
        scope TEXT NOT NULL DEFAULT 'inbox',
        category_id TEXT,
        is_expired INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS deleted_tasks (
        workspace_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        deleted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (workspace_id, task_id)
      )`,
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS app_settings (
        workspace_id TEXT PRIMARY KEY,
        settings_json TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    ),
  ]);

  await ensureColumn(env, 'clients', 'timezone_name TEXT');
  await ensureColumn(env, 'clients', 'timezone_offset_minutes INTEGER NOT NULL DEFAULT 180');
  await ensureColumn(env, 'chat_sessions', 'timezone_name TEXT');
  await ensureColumn(env, 'chat_sessions', 'timezone_offset_minutes INTEGER NOT NULL DEFAULT 180');
}

async function ensureColumn(env, tableName, columnDefinition) {
  try {
    await env.DB.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`).run();
  } catch (error) {
    if (!String(error?.message ?? error).toLowerCase().includes('duplicate column')) throw error;
  }
}

async function registerWorkspace(input, env) {
  await ensureSchema(env);
  const clientId = requiredString(input.clientId, 128, 'clientId');
  const clientSecret = requiredString(input.clientSecret, 256, 'clientSecret');
  const linkCode = normalizeLinkCode(input.linkCode);
  if (!linkCode) throw new Error('Invalid linkCode');

  const existing = await env.DB.prepare('SELECT * FROM clients WHERE client_id = ?').bind(clientId).first();
  if (existing && existing.client_secret !== clientSecret) throw new Error('Client secret mismatch');

  const workspaceId = existing?.workspace_id ?? `client-${clientId}`;
  const language = normalizeLanguage(input.language);
  const profileName = optionalString(input.profileName)?.slice(0, 120) ?? 'Afterlight User';
  const timezoneName = optionalString(input.timezoneName)?.slice(0, 120) ?? null;
  const timezoneOffsetMinutes = normalizeTimezoneOffset(input.timezoneOffsetMinutes);
  const workspaceTitle = optionalString(input.workspaceTitle)?.slice(0, 120) ?? 'Afterlight Workspace';

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO clients (client_id, client_secret, workspace_id, link_code, language, profile_name, timezone_name, timezone_offset_minutes, workspace_title, updated_at, last_sync_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(client_id) DO UPDATE SET
         link_code = excluded.link_code,
         language = excluded.language,
         profile_name = excluded.profile_name,
         timezone_name = excluded.timezone_name,
         timezone_offset_minutes = excluded.timezone_offset_minutes,
         workspace_title = excluded.workspace_title,
         updated_at = CURRENT_TIMESTAMP,
         last_sync_at = CURRENT_TIMESTAMP`,
    ).bind(clientId, clientSecret, workspaceId, linkCode, language, profileName, timezoneName, timezoneOffsetMinutes, workspaceTitle),
    env.DB.prepare(
      `INSERT INTO app_settings (workspace_id, settings_json, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(workspace_id) DO UPDATE SET settings_json = excluded.settings_json, updated_at = CURRENT_TIMESTAMP`,
    ).bind(workspaceId, JSON.stringify(input.settings && typeof input.settings === 'object' ? input.settings : {})),
    env.DB.prepare(
      `UPDATE chat_sessions
       SET language = ?, timezone_name = ?, timezone_offset_minutes = ?
       WHERE workspace_id = ?`,
    ).bind(language, timezoneName, timezoneOffsetMinutes, workspaceId),
  ]);

  await upsertCategories(Array.isArray(input.categories) ? input.categories : [], workspaceId, env);
  await recordDeletedTasks(Array.isArray(input.deletedTaskIds) ? input.deletedTaskIds : [], workspaceId, env);
  await upsertTasks(Array.isArray(input.tasks) ? input.tasks : [], workspaceId, env);

  return {
    authorizedChatCount: await countAuthorizedChats(workspaceId, env),
    categories: await listCategories(workspaceId, env),
    deletedTaskIds: await listDeletedTaskIds(workspaceId, env),
    tasks: await listTasks(workspaceId, env),
    workspaceId,
  };
}

async function handleTelegramUpdate(update, env) {
  if (update.callback_query) {
    await handleCallback(update.callback_query, env);
    return;
  }

  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();
  const session = await getSession(chatId, env);
  const fallbackLanguage = session?.language ?? 'ru';
  const copy = getCopy(fallbackLanguage);

  if (!session) {
    const startCode = getStartPayload(text);
    const target = startCode ? await getWorkspaceByCode(startCode, env) : undefined;
    if (target) {
      await authorizeChat(chatId, message.from, target, env);
      await sendMainMenu(chatId, getCopy(target.language).text.botConnected, target.language, env);
      return;
    }

    if (isStartIntent(text)) {
      await env.DB.prepare(
        `INSERT INTO pending_auth_chats (chat_id, language, requested_at, user_label)
         VALUES (?, ?, CURRENT_TIMESTAMP, ?)
         ON CONFLICT(chat_id) DO UPDATE SET language = excluded.language, requested_at = CURRENT_TIMESTAMP, user_label = excluded.user_label`,
      ).bind(chatId, fallbackLanguage, formatUser(message.from)).run();
      await sendMessage(chatId, copy.text.authPrompt, undefined, env);
      return;
    }

    const codeTarget = await getWorkspaceByCode(text, env);
    if (codeTarget) {
      await authorizeChat(chatId, message.from, codeTarget, env);
      await sendMainMenu(chatId, getCopy(codeTarget.language).text.botConnected, codeTarget.language, env);
      return;
    }

    const pending = await env.DB.prepare('SELECT chat_id FROM pending_auth_chats WHERE chat_id = ?').bind(chatId).first();
    await sendMessage(chatId, pending ? copy.text.authCodeInvalid : copy.text.authRequired, undefined, env);
    return;
  }

  const language = session.language;
  const activeCopy = getCopy(language);
  const conversation = parseJson(session.conversation_json);
  await clearBotMessages(chatId, env);

  if (conversation?.mode === 'awaiting_category_title') {
    await createCategoryFromText(chatId, text, session.workspace_id, language, env);
    return;
  }

  if (conversation?.mode === 'awaiting_task_text') {
    await createTaskFromText(chatId, text, session.workspace_id, language, env, conversation);
    return;
  }

  if (isStartIntent(text) || isMenuIntent(text)) {
    await sendMainMenu(chatId, activeCopy.text.alreadyConnected, language, env);
    return;
  }

  if (isLanguageIntent(text)) return sendLanguagePicker(chatId, language, env);
  if (isHelpIntent(text)) return sendHelp(chatId, language, undefined, env);
  if (isInboxIntent(text)) return sendTaskList(chatId, { scope: 'inbox' }, language, env);
  if (isTodayIntent(text)) return sendTaskList(chatId, { scope: 'today' }, language, env);
  if (isWeekIntent(text)) return sendTaskList(chatId, { scope: 'week' }, language, env);
  if (isCategoriesIntent(text)) return sendCategories(chatId, language, env);
  if (isCategoryCreateIntent(text)) return startCategoryFlow(chatId, language, env);

  if (isAddIntent(text)) {
    const addText = getAddCommandText(text);
    if (addText) return createTaskFromText(chatId, addText, session.workspace_id, language, env);
    return startAddFlow(chatId, { scope: 'inbox' }, language, env);
  }

  await createTaskFromText(chatId, text, session.workspace_id, language, env);
}

async function handleCallback(query, env) {
  const chatId = query.message?.chat?.id;
  const data = query.data;
  if (!chatId || !data) return;
  const session = await getSession(chatId, env);
  if (!session) {
    await answerCallback(query.id, 'Connect Afterlight first.', env);
    return;
  }
  const language = session.language;
  const copy = getCopy(language);
  await answerCallback(query.id, undefined, env);
  await clearBotMessages(chatId, env, query.message?.message_id ? [query.message.message_id] : []);

  if (data === 'flow:cancel') {
    await updateConversation(chatId, undefined, env);
    await sendMainMenu(chatId, copy.text.cancel, language, env);
    return;
  }
  if (data === 'view:inbox') return sendTaskList(chatId, { scope: 'inbox' }, language, env);
  if (data === 'view:today') return sendTaskList(chatId, { scope: 'today' }, language, env);
  if (data === 'view:week') return sendTaskList(chatId, { scope: 'week' }, language, env);
  if (data === 'view:categories') return sendCategories(chatId, language, env);
  if (data === 'view:language') return sendLanguagePicker(chatId, language, env);
  if (data === 'add:inbox') return startAddFlow(chatId, { scope: 'inbox' }, language, env);
  if (data === 'add:today') return startAddFlow(chatId, { dueDate: todayKey(getSessionTimezoneOffset(session)), scope: 'today' }, language, env);
  if (data === 'add:week') return sendWeekDayPicker(chatId, language, env);
  if (data.startsWith('week:add:')) return startAddFlow(chatId, { dueDate: data.slice(9), scope: 'week' }, language, env);
  if (data === 'cat:create') return startCategoryFlow(chatId, language, env);
  if (data.startsWith('cat:view:')) return sendTaskList(chatId, { categoryId: data.slice(9), scope: 'category' }, language, env);
  if (data.startsWith('cat:add:')) return startAddFlow(chatId, { categoryId: data.slice(8), scope: 'category' }, language, env);
  if (data.startsWith('task:toggle:')) return toggleTaskFromTelegram(chatId, data.slice(12), session.workspace_id, language, env);
  if (data.startsWith('task:delete:')) return deleteTaskFromTelegram(chatId, data.slice(12), session.workspace_id, language, env);
  if (data === 'lang:ru' || data === 'lang:en') {
    const nextLanguage = data.slice(5);
    await env.DB.prepare('UPDATE chat_sessions SET language = ? WHERE chat_id = ?').bind(nextLanguage, chatId).run();
    await sendMainMenu(chatId, getCopy(nextLanguage).text.languageSaved, nextLanguage, env);
  }
}

async function authorizeChat(chatId, from, target, env) {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO chat_sessions (chat_id, workspace_id, language, conversation_json, bot_message_ids_json, timezone_name, timezone_offset_minutes, authenticated_at, user_label)
       VALUES (?, ?, ?, NULL, '[]', ?, ?, CURRENT_TIMESTAMP, ?)
       ON CONFLICT(chat_id) DO UPDATE SET
         workspace_id = excluded.workspace_id,
         language = excluded.language,
         conversation_json = NULL,
         timezone_name = excluded.timezone_name,
         timezone_offset_minutes = excluded.timezone_offset_minutes,
         authenticated_at = CURRENT_TIMESTAMP,
         user_label = excluded.user_label`,
    ).bind(chatId, target.workspaceId, target.language, target.timezoneName ?? null, normalizeTimezoneOffset(target.timezoneOffsetMinutes), formatUser(from)),
    env.DB.prepare('DELETE FROM pending_auth_chats WHERE chat_id = ?').bind(chatId),
  ]);
}

async function getWorkspaceByCode(value, env) {
  const code = normalizeLinkCode(value);
  if (!code) return undefined;
  const client = await env.DB.prepare('SELECT workspace_id, language, timezone_name, timezone_offset_minutes FROM clients WHERE link_code = ?').bind(code).first();
  return client
    ? {
        language: normalizeLanguage(client.language),
        timezoneName: optionalString(client.timezone_name) ?? undefined,
        timezoneOffsetMinutes: normalizeTimezoneOffset(client.timezone_offset_minutes),
        workspaceId: client.workspace_id,
      }
    : undefined;
}

async function getAuthorizedClient(input, env) {
  const clientId = requiredString(input.clientId, 128, 'clientId');
  const clientSecret = requiredString(input.clientSecret, 256, 'clientSecret');
  const client = await env.DB.prepare('SELECT * FROM clients WHERE client_id = ?').bind(clientId).first();
  if (!client || client.client_secret !== clientSecret) throw new Error('Client is not authorized');
  return client;
}

async function upsertCategories(categories, workspaceId, env) {
  for (const category of categories) {
    const id = optionalString(category?.id);
    const title = optionalString(category?.title);
    if (!id || !title) continue;
    const updatedAt = normalizeTimestamp(category.updatedAt);
    await env.DB.prepare(
      `INSERT INTO categories (id, workspace_id, title, color, icon_mode, emoji, is_favorite, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         color = excluded.color,
         icon_mode = excluded.icon_mode,
         emoji = excluded.emoji,
         is_favorite = excluded.is_favorite,
         updated_at = CASE
           WHEN categories.title IS NOT excluded.title
             OR categories.color IS NOT excluded.color
             OR categories.icon_mode IS NOT excluded.icon_mode
             OR categories.emoji IS NOT excluded.emoji
             OR categories.is_favorite IS NOT excluded.is_favorite
           THEN excluded.updated_at
           ELSE categories.updated_at
         END`,
    ).bind(id, workspaceId, title.slice(0, 120), normalizeColor(category.color), normalizeIconMode(category.iconMode, category.emoji), optionalString(category.emoji) ?? null, category.isFavorite ? 1 : 0, updatedAt).run();
  }
}

async function upsertTasks(tasks, workspaceId, env) {
  for (const task of tasks) {
    const id = optionalString(task?.id);
    const title = optionalString(task?.title);
    if (!id || !title || (await isDeletedTask(workspaceId, id, env))) continue;
    const categoryId = optionalString(task.categoryId);
    const updatedAt = normalizeTimestamp(task.updatedAt);
    await env.DB.prepare(
      `INSERT INTO tasks (id, workspace_id, title, description, due_date, due_at, priority, status, scope, category_id, is_expired, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         due_date = excluded.due_date,
         due_at = excluded.due_at,
         priority = excluded.priority,
         status = excluded.status,
         scope = excluded.scope,
         category_id = excluded.category_id,
         is_expired = excluded.is_expired,
         updated_at = CASE
           WHEN tasks.title IS NOT excluded.title
             OR tasks.description IS NOT excluded.description
             OR tasks.due_date IS NOT excluded.due_date
             OR tasks.due_at IS NOT excluded.due_at
             OR tasks.priority IS NOT excluded.priority
             OR tasks.status IS NOT excluded.status
             OR tasks.scope IS NOT excluded.scope
             OR tasks.category_id IS NOT excluded.category_id
           THEN excluded.updated_at
           ELSE tasks.updated_at
         END`,
    ).bind(id, workspaceId, title.slice(0, 240), optionalString(task.description) ?? null, normalizeDate(task.dueDate) ?? null, normalizeDueTime(task.dueLabel) ?? null, normalizePriority(task.priority), task.status === 'completed' ? 'completed' : 'active', normalizeScope(task.scope), categoryId ?? null, task.isExpired ? 1 : 0, updatedAt).run();
  }
}

async function recordDeletedTasks(taskIds, workspaceId, env) {
  const ids = [...new Set(taskIds.map(optionalString).filter(Boolean))];
  for (const taskId of ids) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM tasks WHERE workspace_id = ? AND id = ?').bind(workspaceId, taskId),
      env.DB.prepare(
        `INSERT INTO deleted_tasks (workspace_id, task_id, deleted_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(workspace_id, task_id) DO UPDATE SET deleted_at = CURRENT_TIMESTAMP`,
      ).bind(workspaceId, taskId),
    ]);
  }
}

async function createTaskFromText(chatId, text, workspaceId, language, env, conversation) {
  const copy = getCopy(language);
  const parsed = await parseTaskText(text, workspaceId, env);
  let category = parsed.unknownCategoryName ? await findOrCreateCategory(parsed.unknownCategoryName, workspaceId, env) : undefined;
  const input = mergeConversationTaskInput({
    ...parsed.input,
    categoryId: category?.id ?? parsed.input.categoryId,
    scope: category ? 'category' : parsed.input.scope,
  }, conversation, parsed.timezoneOffsetMinutes);

  if (!input.title) {
    await sendMessage(chatId, `${copy.text.emptyTask}\n\n${formatGuide(language)}`, buildCancelKeyboard(language), env);
    return;
  }

  const task = await createTask(input, workspaceId, env);
  await updateConversation(chatId, undefined, env);
  await sendMessage(
    chatId,
    [category ? copy.text.categoryCreated(category.title) : undefined, await formatCreatedTask(task, language, workspaceId, env)]
      .filter(Boolean)
      .join('\n\n'),
    buildTaskKeyboard(task, language),
    env,
  );
}

async function createCategoryFromText(chatId, text, workspaceId, language, env) {
  const copy = getCopy(language);
  const title = cleanCategoryTitle(text);
  if (!title) {
    await sendMessage(chatId, copy.text.categoryEmpty, buildCancelKeyboard(language), env);
    return;
  }
  const existing = await findCategoryByTitle(title, workspaceId, env);
  if (existing) {
    await updateConversation(chatId, undefined, env);
    await sendMessage(chatId, copy.text.categoryExists(existing.title), buildCategoryKeyboard(existing, language), env);
    return;
  }
  const category = await createCategory({ color: await pickCategoryColor(workspaceId, env), iconMode: 'hash', isFavorite: false, title }, workspaceId, env);
  await updateConversation(chatId, undefined, env);
  await sendMessage(chatId, copy.text.categoryCreated(category.title), buildCategoryKeyboard(category, language), env);
}

async function startAddFlow(chatId, input, language, env) {
  const session = await getSession(chatId, env);
  const category = input.categoryId ? await getCategory(input.categoryId, session.workspace_id, env) : undefined;
  const timezoneOffsetMinutes = getSessionTimezoneOffset(session);
  await updateConversation(chatId, { categoryId: input.categoryId, dueDate: input.dueDate, mode: 'awaiting_task_text', scope: input.scope }, env);
  await sendMessage(chatId, `${getCopy(language).text.writeTask(formatTaskTarget(input.scope, language, input.dueDate, category, timezoneOffsetMinutes))}\n\n${formatGuide(language)}`, buildCancelKeyboard(language), env);
}

async function startCategoryFlow(chatId, language, env) {
  await updateConversation(chatId, { mode: 'awaiting_category_title' }, env);
  await sendMessage(chatId, getCopy(language).text.categoryPrompt, buildCancelKeyboard(language), env);
}

async function sendTaskList(chatId, filter, language, env) {
  const session = await getSession(chatId, env);
  const categories = await listCategories(session.workspace_id, env);
  const timezoneOffsetMinutes = getSessionTimezoneOffset(session);
  const allTasks = sortTasksForDisplay(await getVisibleTasks(filter, session.workspace_id, env));
  const tasks = allTasks.slice(0, TASK_LIST_LIMIT);
  const title = getTaskListTitle(filter, categories, language);
  const text = formatTaskListText({ categories, filter, language, tasks, timezoneOffsetMinutes, title, totalCount: allTasks.length });
  await sendMessage(chatId, text, buildTaskListKeyboard(tasks, filter, language), env);
}

async function sendCategories(chatId, language, env) {
  const session = await getSession(chatId, env);
  const categories = await listCategories(session.workspace_id, env);
  const copy = getCopy(language);
  const rows = categories.flatMap((category) => [
    [{ callback_data: `cat:view:${category.id}`, text: `${formatCategoryMarker(category)} ${category.title}` }],
    [{ callback_data: `cat:add:${category.id}`, text: `${copy.buttons.addTask} #${truncate(category.title, 24)}` }],
  ]);
  await sendMessage(chatId, categories.length ? copy.title.categories : `${copy.title.categories}\n\n${copy.text.noCategories}`, { inline_keyboard: [[{ callback_data: 'cat:create', text: copy.buttons.createCategory }], ...rows, ...buildCancelRows(language)] }, env);
}

async function sendWeekDayPicker(chatId, language, env) {
  const session = await getSession(chatId, env);
  const timezoneOffsetMinutes = getSessionTimezoneOffset(session);
  const rows = chunkRows(currentWeekDates(timezoneOffsetMinutes).map((date) => ({ callback_data: `week:add:${date}`, text: formatWeekPickerDateV2(date, language, timezoneOffsetMinutes) })), 2);
  await sendMessage(chatId, getCopy(language).text.weekDayPrompt, { inline_keyboard: [...rows, ...buildCancelRows(language)] }, env);
}

async function sendHelp(chatId, language, prefix, env) {
  const copy = getCopy(language);
  await sendMessage(chatId, [prefix, copy.text.helpIntro, ...copy.help, '', formatGuide(language)].filter(Boolean).join('\n'), buildHomeKeyboard(language), env);
}

async function sendLanguagePicker(chatId, language, env) {
  await sendMessage(chatId, getCopy(language).text.chooseLanguage, { inline_keyboard: [[{ callback_data: 'lang:ru', text: 'Русский' }, { callback_data: 'lang:en', text: 'English' }], ...buildCancelRows(language)] }, env);
}

async function sendMainMenu(chatId, text, language, env) {
  await sendMessage(chatId, text, buildMainMenuKeyboard(language), env);
}

async function toggleTaskFromTelegram(chatId, taskId, workspaceId, language, env) {
  const task = await getTask(taskId, workspaceId, env);
  if (!task) return sendMessage(chatId, getCopy(language).text.taskNotFound, undefined, env);
  const status = task.status === 'completed' ? 'active' : 'completed';
  await env.DB.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?').bind(status, taskId, workspaceId).run();
  const updated = await getTask(taskId, workspaceId, env);
  await sendMessage(chatId, status === 'completed' ? getCopy(language).text.taskCompleted(updated.title) : getCopy(language).text.taskRestored(updated.title), buildTaskKeyboard(updated, language), env);
}

async function deleteTaskFromTelegram(chatId, taskId, workspaceId, language, env) {
  const task = await getTask(taskId, workspaceId, env);
  await recordDeletedTasks([taskId], workspaceId, env);
  await sendMessage(chatId, task ? getCopy(language).text.deleted(task.title) : getCopy(language).text.taskWasDeleted, buildNavigationKeyboard(language), env);
}

async function listCategories(workspaceId, env) {
  const result = await env.DB.prepare('SELECT id, title, color, icon_mode, emoji, is_favorite, updated_at FROM categories WHERE workspace_id = ? ORDER BY created_at ASC').bind(workspaceId).all();
  return (result.results ?? []).map(mapCategory);
}

async function listTasks(workspaceId, env) {
  await refreshTaskExpiration(workspaceId, env);
  const result = await env.DB.prepare('SELECT id, title, description, due_date, due_at, priority, status, scope, category_id, is_expired, updated_at FROM tasks WHERE workspace_id = ? ORDER BY status ASC, priority ASC, due_date ASC, due_at ASC, created_at DESC').bind(workspaceId).all();
  return (result.results ?? []).map(mapTask);
}

async function createTask(input, workspaceId, env) {
  const id = crypto.randomUUID();
  const categoryId = optionalString(input.categoryId);
  await env.DB.prepare(
    `INSERT INTO tasks (id, workspace_id, title, description, due_date, due_at, priority, status, scope, category_id, is_expired)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 0)`,
  ).bind(id, workspaceId, input.title.trim(), optionalString(input.description) ?? null, normalizeDate(input.dueDate) ?? null, normalizeDueTime(input.dueLabel) ?? null, normalizePriority(input.priority), normalizeScope(input.scope), categoryId ?? null).run();
  return getTask(id, workspaceId, env);
}

async function createCategory(input, workspaceId, env) {
  const id = crypto.randomUUID();
  const category = { id, title: input.title.trim(), color: normalizeColor(input.color), emoji: optionalString(input.emoji), iconMode: normalizeIconMode(input.iconMode, input.emoji), isFavorite: Boolean(input.isFavorite) };
  await env.DB.prepare('INSERT INTO categories (id, workspace_id, title, color, icon_mode, emoji, is_favorite, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)').bind(id, workspaceId, category.title, category.color, category.iconMode, category.emoji ?? null, category.isFavorite ? 1 : 0).run();
  return category;
}

async function getTask(taskId, workspaceId, env) {
  const row = await env.DB.prepare('SELECT id, title, description, due_date, due_at, priority, status, scope, category_id, is_expired, updated_at FROM tasks WHERE id = ? AND workspace_id = ?').bind(taskId, workspaceId).first();
  return row ? mapTask(row) : undefined;
}

async function getCategory(categoryId, workspaceId, env) {
  const row = await env.DB.prepare('SELECT id, title, color, icon_mode, emoji, is_favorite, updated_at FROM categories WHERE id = ? AND workspace_id = ?').bind(categoryId, workspaceId).first();
  return row ? mapCategory(row) : undefined;
}

async function findCategoryByTitle(title, workspaceId, env) {
  return (await listCategories(workspaceId, env)).find((category) => category.title.toLowerCase() === title.toLowerCase());
}

async function findOrCreateCategory(name, workspaceId, env) {
  const title = cleanCategoryTitle(name);
  if (!title) return undefined;
  return (await findCategoryByTitle(title, workspaceId, env)) ?? createCategory({ color: await pickCategoryColor(workspaceId, env), iconMode: 'hash', isFavorite: false, title }, workspaceId, env);
}

async function pickCategoryColor(workspaceId, env) {
  return CATEGORY_COLORS[(await listCategories(workspaceId, env)).length % CATEGORY_COLORS.length];
}

async function getVisibleTasks(filter, workspaceId, env) {
  const tasks = await listTasks(workspaceId, env);
  const timezoneOffsetMinutes = await getWorkspaceTimezoneOffset(workspaceId, env);
  const today = todayKey(timezoneOffsetMinutes);
  const weekDates = currentWeekDates(timezoneOffsetMinutes);
  return tasks.filter((task) => {
    if (filter.scope === 'category') return task.categoryId === filter.categoryId;
    if (filter.scope === 'today') return task.scope === 'today' || task.dueDate === today || Boolean(task.dueDate && task.dueDate < today);
    if (filter.scope === 'week') return task.dueDate ? weekDates.includes(task.dueDate) : task.scope === 'week';
    return task.scope === 'inbox';
  });
}

async function refreshTaskExpiration(workspaceId, env) {
  const timezoneOffsetMinutes = await getWorkspaceTimezoneOffset(workspaceId, env);
  await env.DB.prepare("UPDATE tasks SET is_expired = CASE WHEN status = 'active' AND due_date IS NOT NULL AND due_date < ? THEN 1 ELSE 0 END WHERE workspace_id = ?").bind(todayKey(timezoneOffsetMinutes), workspaceId).run();
}

async function getSession(chatId, env) {
  return env.DB.prepare('SELECT * FROM chat_sessions WHERE chat_id = ?').bind(chatId).first();
}

function getSessionTimezoneOffset(session) {
  return normalizeTimezoneOffset(session?.timezone_offset_minutes);
}

async function getWorkspaceTimezoneOffset(workspaceId, env) {
  const client = await env.DB.prepare('SELECT timezone_offset_minutes FROM clients WHERE workspace_id = ?').bind(workspaceId).first();
  return normalizeTimezoneOffset(client?.timezone_offset_minutes);
}

function getStoredBotMessageIds(session) {
  const ids = parseJson(session?.bot_message_ids_json);
  return Array.isArray(ids) ? ids.map(Number).filter(Number.isFinite) : [];
}

async function rememberBotMessage(chatId, messageId, env) {
  if (!Number.isFinite(Number(messageId))) return;
  const session = await getSession(chatId, env);
  if (!session) return;
  const ids = [...new Set([...getStoredBotMessageIds(session), Number(messageId)])].slice(-BOT_MESSAGE_HISTORY_LIMIT);
  await env.DB.prepare('UPDATE chat_sessions SET bot_message_ids_json = ? WHERE chat_id = ?').bind(JSON.stringify(ids), chatId).run();
}

async function deleteTelegramMessage(chatId, messageId, env) {
  if (!Number.isFinite(Number(messageId))) return;
  try {
    await telegramApi('deleteMessage', { chat_id: chatId, message_id: Number(messageId) }, env);
  } catch {
    // Telegram may reject deletion for old messages or messages already removed.
  }
}

async function clearBotMessages(chatId, env, extraMessageIds = []) {
  const session = await getSession(chatId, env);
  if (!session) return;
  const ids = [...new Set([...getStoredBotMessageIds(session), ...extraMessageIds.map(Number).filter(Number.isFinite)])];
  await Promise.all(ids.map((messageId) => deleteTelegramMessage(chatId, messageId, env)));
  await env.DB.prepare('UPDATE chat_sessions SET bot_message_ids_json = ? WHERE chat_id = ?').bind('[]', chatId).run();
}

async function updateConversation(chatId, conversation, env) {
  await env.DB.prepare('UPDATE chat_sessions SET conversation_json = ? WHERE chat_id = ?').bind(conversation ? JSON.stringify(conversation) : null, chatId).run();
}

async function countAuthorizedChats(workspaceId, env) {
  const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM chat_sessions WHERE workspace_id = ?').bind(workspaceId).first();
  return Number(row?.count ?? 0);
}

async function isDeletedTask(workspaceId, taskId, env) {
  return Boolean(await env.DB.prepare('SELECT task_id FROM deleted_tasks WHERE workspace_id = ? AND task_id = ?').bind(workspaceId, taskId).first());
}

async function listDeletedTaskIds(workspaceId, env) {
  const result = await env.DB.prepare('SELECT task_id FROM deleted_tasks WHERE workspace_id = ?').bind(workspaceId).all();
  return (result.results ?? []).map((row) => row.task_id).filter(Boolean);
}

async function telegramApi(method, payload, env) {
  const response = await fetch(`https://api.telegram.org/bot${env.AFTERLIGHT_BOT_TOKEN}/${method}`, {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.description ?? `Telegram API failed: ${method}`);
  return data.result;
}

async function sendMessage(chatId, text, replyMarkup, env) {
  const message = await telegramApi('sendMessage', { chat_id: chatId, reply_markup: replyMarkup, text }, env);
  await rememberBotMessage(chatId, message?.message_id, env);
  return message;
}

async function answerCallback(callbackQueryId, text, env) {
  return telegramApi('answerCallbackQuery', { callback_query_id: callbackQueryId, show_alert: Boolean(text), text }, env);
}

function parseTaskText(value, workspaceId, env) {
  let text = value.replace(/^\/add(@\w+)?\s*/i, '').trim();
  const priorityInfo = extractPriority(text);
  text = priorityInfo.text;
  const categoryInfoPromise = extractCategory(text, workspaceId, env);
  const timezoneOffsetPromise = getWorkspaceTimezoneOffset(workspaceId, env);
  return Promise.all([categoryInfoPromise, timezoneOffsetPromise]).then(([categoryInfo, timezoneOffsetMinutes]) => {
    text = categoryInfo.text;
    const dueLabelMatch = text.match(/(?<!\d)(?:[01]?\d|2[0-3]):[0-5]\d(?!\d)/);
    const dueLabel = dueLabelMatch ? normalizeParsedDueTime(dueLabelMatch[0]) : undefined;
    if (dueLabelMatch) text = text.replace(dueLabelMatch[0], '').trim();
    const dateInfo = extractDate(text, timezoneOffsetMinutes);
    text = dateInfo.text;
    return {
      input: { categoryId: categoryInfo.category?.id, dueDate: dateInfo.dueDate, dueLabel, priority: priorityInfo.priority, scope: categoryInfo.category ? 'category' : dateInfo.dueDate === todayKey(timezoneOffsetMinutes) ? 'today' : dateInfo.dueDate ? 'week' : 'inbox', title: text },
      timezoneOffsetMinutes,
      unknownCategoryName: categoryInfo.unknownCategoryName,
    };
  });
}

async function extractCategory(value, workspaceId, env) {
  const categories = (await listCategories(workspaceId, env)).sort((a, b) => b.title.length - a.title.length);
  for (const category of categories) {
    const match = value.match(new RegExp(`(^|\\s)#${escapeRegExp(category.title)}(?=\\s|$)`, 'i'));
    if (match) return { category, text: value.replace(match[0], ' ').trim() };
  }
  const categoryMatch = value.match(/(?:^|\s)#([^\s#]+)/);
  return categoryMatch ? { text: value.replace(categoryMatch[0], ' ').trim(), unknownCategoryName: categoryMatch[1] } : { text: value.trim() };
}

function extractPriority(value) {
  const match = value.match(/^\s*([123])(?:[\s.)-]+)(.+)$/);
  return match ? { priority: Number(match[1]), text: match[2].trim() } : { priority: 4, text: value.trim() };
}

function extractDate(value, timezoneOffsetMinutes = BOT_TIMEZONE_OFFSET_MINUTES) {
  const todayPattern = /(?<![\p{L}\p{N}_])(?:today|сегодня)(?![\p{L}\p{N}_])/iu;
  const tomorrowPattern = /(?<![\p{L}\p{N}_])(?:tomorrow|завтра)(?![\p{L}\p{N}_])/iu;
  if (todayPattern.test(value)) return { dueDate: todayKey(timezoneOffsetMinutes), text: value.replace(todayPattern, '').trim() };
  if (tomorrowPattern.test(value)) return { dueDate: relativeDateKey(1, timezoneOffsetMinutes), text: value.replace(tomorrowPattern, '').trim() };
  const match = value.match(/(?<!\d)(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?(?!\d)/);
  if (!match) return { text: value.trim() };
  const dueDate = `${match[3] ?? getBotTimeZoneYear(timezoneOffsetMinutes)}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return isValidDateKey(dueDate) ? { dueDate, text: value.replace(match[0], '').trim() } : { text: value.trim() };
}

function mergeConversationTaskInput(input, conversation, timezoneOffsetMinutes = BOT_TIMEZONE_OFFSET_MINUTES) {
  const categoryId = input.categoryId ?? conversation?.categoryId;
  const dueDate = input.dueDate ?? conversation?.dueDate;
  return { ...input, categoryId, dueDate, scope: categoryId ? 'category' : dueDate === todayKey(timezoneOffsetMinutes) ? 'today' : dueDate ? 'week' : conversation?.scope ?? input.scope };
}

function buildMainMenuKeyboard(language) {
  const b = getCopy(language).buttons;
  return { is_persistent: true, keyboard: [[{ text: b.addTask }, { text: b.inbox }], [{ text: b.today }, { text: b.week }], [{ text: b.categories }, { text: b.createCategory }], [{ text: b.language }, { text: b.help }]], resize_keyboard: true };
}

function buildTaskListKeyboard(tasks, filter, language) {
  const addCallbackData = filter.scope === 'category' && filter.categoryId ? `cat:add:${filter.categoryId}` : filter.scope === 'today' ? 'add:today' : filter.scope === 'week' ? 'add:week' : 'add:inbox';
  return { inline_keyboard: [...tasks.map((task) => [{ callback_data: `task:toggle:${task.id}`, text: `${task.status === 'completed' ? '↩️' : '✅'} ${truncate(task.title, 24)}` }, { callback_data: `task:delete:${task.id}`, text: '🗑' }]), [{ callback_data: addCallbackData, text: getCopy(language).buttons.addTask }], ...buildCancelRows(language)] };
}

function buildTaskKeyboard(task, language) {
  const b = getCopy(language).buttons;
  return { inline_keyboard: [[{ callback_data: `task:toggle:${task.id}`, text: task.status === 'completed' ? b.restoreTask : b.doneTask }, { callback_data: `task:delete:${task.id}`, text: b.deleteTask }], ...buildCancelRows(language)] };
}

function buildCategoryKeyboard(category, language) {
  const b = getCopy(language).buttons;
  return { inline_keyboard: [[{ callback_data: `cat:add:${category.id}`, text: `${b.addTask} #${category.title}` }], [{ callback_data: `cat:view:${category.id}`, text: `${formatCategoryMarker(category)} ${category.title}` }], ...buildCancelRows(language)] };
}

function buildCancelKeyboard(language) {
  return { inline_keyboard: buildCancelRows(language) };
}
function buildHomeKeyboard(language) {
  return { inline_keyboard: [[{ callback_data: 'add:inbox', text: getCopy(language).buttons.addTask }], ...buildCancelRows(language)] };
}
function buildNavigationKeyboard(language) {
  return { inline_keyboard: buildCancelRows(language) };
}
function buildCancelRows(language) {
  return [[{ callback_data: 'flow:cancel', text: getCopy(language).buttons.cancel }]];
}
async function formatCreatedTask(task, language, workspaceId, env) {
  return `${getCopy(language).text.createdPrefix}\n${formatTaskLine(task, 0, await listCategories(workspaceId, env)).replace('1. ', '')}`;
}

function formatTaskListText({ categories, filter, language, tasks, timezoneOffsetMinutes, title, totalCount }) {
  if (!tasks.length) return `${title}\n\n${getCopy(language).text.emptyList}`;
  const body = filter.scope === 'week'
    ? formatWeekTaskList(tasks, categories, language, timezoneOffsetMinutes)
    : tasks.map((task, index) => formatTaskLine(task, index, categories)).join('\n');
  return [title, '', body, formatListLimitNotice(language, tasks.length, totalCount)].filter(Boolean).join('\n');
}

function formatWeekTaskList(tasks, categories, language, timezoneOffsetMinutes) {
  const weekDates = currentWeekDates(timezoneOffsetMinutes);
  const sections = [];
  let visibleIndex = 0;
  for (const date of weekDates) {
    const dateTasks = tasks.filter((task) => task.dueDate === date);
    if (!dateTasks.length) continue;
    sections.push([
      formatWeekSectionTitle(date, language, timezoneOffsetMinutes),
      ...dateTasks.map((task) => formatTaskLine(task, visibleIndex++, categories, { hideDueDate: true })),
    ].join('\n'));
  }
  const undatedTasks = tasks.filter((task) => !task.dueDate);
  if (undatedTasks.length) {
    sections.push([
      language === 'en' ? 'No date' : 'Без даты',
      ...undatedTasks.map((task) => formatTaskLine(task, visibleIndex++, categories)),
    ].join('\n'));
  }
  return sections.join('\n\n');
}

function formatTaskLine(task, index, categories, options = {}) {
  const category = categories.find((item) => item.id === task.categoryId);
  const meta = [category ? `#${category.title}` : undefined, formatTaskDue(task, options)].filter(Boolean).join(' · ');
  return meta ? `${index + 1}. ${formatPriority(task)} ${task.title} · ${meta}` : `${index + 1}. ${formatPriority(task)} ${task.title}`;
}

function formatTaskDue(task, options = {}) {
  if (!task.dueDate && !task.dueLabel) return undefined;
  return [task.dueDate && !options.hideDueDate ? formatDate(task.dueDate) : undefined, task.dueLabel].filter(Boolean).join(' ');
}

function formatListLimitNotice(language, shownCount, totalCount) {
  if (totalCount <= shownCount) return undefined;
  return language === 'en' ? `\nShown ${shownCount} of ${totalCount}.` : `\nПоказано ${shownCount} из ${totalCount}.`;
}

function sortTasksForDisplay(tasks) {
  return [...tasks].sort((left, right) => {
    const priorityDiff = normalizePriority(left.priority) - normalizePriority(right.priority);
    if (priorityDiff) return priorityDiff;
    const statusDiff = taskStatusRank(left) - taskStatusRank(right);
    if (statusDiff) return statusDiff;
    const dueDateDiff = compareOptionalText(left.dueDate, right.dueDate);
    if (dueDateDiff) return dueDateDiff;
    const dueTimeDiff = compareOptionalText(left.dueLabel, right.dueLabel);
    if (dueTimeDiff) return dueTimeDiff;
    return left.title.localeCompare(right.title);
  });
}

function taskStatusRank(task) {
  return task.status === 'completed' ? 1 : 0;
}

function compareOptionalText(left, right) {
  if (left && right) return left.localeCompare(right);
  if (left) return -1;
  if (right) return 1;
  return 0;
}

function formatWeekSectionTitle(value, language, timezoneOffsetMinutes = BOT_TIMEZONE_OFFSET_MINUTES) {
  const isToday = value === todayKey(timezoneOffsetMinutes);
  const marker = isToday ? '▶ ' : '';
  const todayLabel = isToday ? (language === 'en' ? ' · today' : ' · сегодня') : '';
  return `${marker}${formatShortDate(value)} ${getWeekdayLabel(value, language)}${todayLabel}`;
}

function getWeekdayLabel(value, language) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const ru = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const en = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (language === 'en' ? en : ru)[date.getUTCDay()];
}

function formatWeekPickerDateV2(value, language, timezoneOffsetMinutes = BOT_TIMEZONE_OFFSET_MINUTES) {
  const label = `${formatShortDate(value)} ${getWeekdayLabel(value, language)}`;
  return value === todayKey(timezoneOffsetMinutes) ? `▶ ${label}${language === 'en' ? ' today' : ' сегодня'}` : label;
}

function formatTaskTarget(scope, language, dueDate, category, timezoneOffsetMinutes = BOT_TIMEZONE_OFFSET_MINUTES) {
  if (category) return `#${category.title}`;
  if (dueDate === todayKey(timezoneOffsetMinutes)) return getCopy(language).title.today.replace(/^.\s/, '');
  if (scope === 'week') return dueDate ? `${getCopy(language).title.week.replace(/^.\s/, '')} · ${formatShortDate(dueDate)}` : getCopy(language).title.week.replace(/^.\s/, '');
  return getCopy(language).title.inbox.replace(/^.\s/, '');
}
function getTaskListTitle(filter, categories, language) {
  if (filter.scope === 'category') return categories.find((item) => item.id === filter.categoryId)?.title ?? getCopy(language).title.category;
  return filter.scope === 'today' ? getCopy(language).title.today : filter.scope === 'week' ? getCopy(language).title.week : getCopy(language).title.inbox;
}

function getCopy(language) {
  return copy[language === 'en' ? 'en' : 'ru'];
}

const copy = {
  ru: {
    buttons: { addTask: '➕ Добавить задачу', cancel: '❌️ Отмена', categories: '📂 Категории', createCategory: '✍ Создать категорию', deleteTask: '🗑 Удалить', doneTask: '✅ Выполнить', help: '❓ Помощь', inbox: '📥 Входящие', language: '🌐 Язык / Language', restoreTask: '↩️ Вернуть', today: '📅 Сегодня', week: '7️⃣ Неделя' },
    title: { categories: 'Категории:', category: 'Категория', inbox: '📥 Входящие', today: '📅 Сегодня', week: '7️⃣ Неделя' },
    text: {
      alreadyConnected: 'Afterlight уже подключён. Главное меню открыто.\n\nAfterlight is already connected. Main menu is open.', authCodeInvalid: 'Код не подошёл. Проверьте 6 цифр в настройках Afterlight и отправьте код ещё раз.',
      authPrompt: 'Отправьте 6-значный код подключения из настроек Afterlight.\n\nSend the 6-digit pairing code from Afterlight settings.',
      authRequired: 'Сначала подключите этот чат к Afterlight: отправьте /start, затем 6-значный код из настроек приложения.\n\nFirst connect this chat to Afterlight: send /start, then the 6-digit code from app settings.',
      botConnected: 'Afterlight подключён. Теперь можно управлять задачами прямо из Telegram.', cancel: 'Действие отменено.', categoryCreated: (title) => `Категория создана: ${title}`, categoryEmpty: 'Напишите название категории.', categoryExists: (title) => `Категория уже есть: ${title}`,
      categoryPrompt: 'Напишите название новой категории.\n\nПримеры:\nРабота\nУчёба\nДом', chooseLanguage: 'Выберите язык.', createdPrefix: 'Задача добавлена:', deleted: (title) => `Задача удалена${title ? `: ${title}` : ''}.`, emptyList: 'Здесь пока пусто.', emptyTask: 'Не вижу текста задачи.', helpIntro: 'Afterlight Bot помогает управлять задачами без открытия приложения.', languageSaved: 'Язык сохранён.', noCategories: 'Категорий пока нет.', taskCompleted: (title) => `Готово: ${title}`, taskNotFound: 'Задача не найдена.', taskRestored: (title) => `Вернул задачу: ${title}`, taskWasDeleted: 'Задача уже удалена.', weekDayPrompt: 'Выберите день недели.', writeTask: (target) => `Напишите задачу для: ${target}`,
    },
    guide: ['Как писать задачи:', '• Купить молоко', '• Купить молоко сегодня', '• Купить молоко завтра 18:00', '• Позвонить клиенту #Работа', '• 1 Срочно отправить отчёт', '• 2 Сделать домашку', '• 3 Прочитать материалы', '', 'Понимаю дату, время, #Категорию и приоритет 1/2/3 в начале.'],
    help: ['• добавляет задачи обычным сообщением', '• понимает дату, время, #Категорию', '• показывает входящие, сегодня, неделю и категории', '• выполняет и удаляет задачи кнопками'],
  },
  en: {
    buttons: { addTask: '➕ Add task', cancel: '❌️ Cancel', categories: '📂 Categories', createCategory: '✍ Create category', deleteTask: '🗑 Delete', doneTask: '✅ Done', help: '❓ Help', inbox: '📥 Inbox', language: '🌐 Language', restoreTask: '↩️ Restore', today: '📅 Today', week: '7️⃣ Week' },
    title: { categories: 'Categories:', category: 'Category', inbox: '📥 Inbox', today: '📅 Today', week: '7️⃣ Week' },
    text: {
      alreadyConnected: 'Afterlight is already connected. Main menu is open.', authCodeInvalid: 'The code is invalid. Check the 6 digits in Afterlight settings and send the code again.', authPrompt: 'Send the 6-digit pairing code from Afterlight settings.', authRequired: 'Connect this chat first: send /start, then the 6-digit code from app settings.', botConnected: 'Afterlight is connected. You can now manage tasks directly from Telegram.', cancel: 'Action cancelled.', categoryCreated: (title) => `Category created: ${title}`, categoryEmpty: 'Send a category name.', categoryExists: (title) => `Category already exists: ${title}`, categoryPrompt: 'Send the new category name.\n\nExamples:\nWork\nStudy\nHome', chooseLanguage: 'Choose language.', createdPrefix: 'Task added:', deleted: (title) => `Task deleted${title ? `: ${title}` : ''}.`, emptyList: 'Nothing here yet.', emptyTask: 'I do not see task text.', helpIntro: 'Afterlight Bot helps manage tasks without opening the app.', languageSaved: 'Language saved.', noCategories: 'No categories yet.', taskCompleted: (title) => `Done: ${title}`, taskNotFound: 'Task not found.', taskRestored: (title) => `Restored: ${title}`, taskWasDeleted: 'Task was already deleted.', weekDayPrompt: 'Choose weekday.', writeTask: (target) => `Send a task for: ${target}`,
    },
    guide: ['How to write tasks:', '• Buy milk', '• Buy milk today', '• Buy milk tomorrow 18:00', '• Call client #Work', '• 1 Send report', '• 2 Do homework', '• 3 Read materials', '', 'Understands date, time, #Category, and priority 1/2/3 at the start.'],
    help: ['• adds tasks from normal messages', '• understands date, time, and #Category', '• shows inbox, today, week, and categories', '• completes and deletes tasks with buttons'],
  },
};

function formatGuide(language) { return getCopy(language).guide.join('\n'); }
function mapCategory(row) { return { id: row.id, title: row.title, color: row.color, emoji: row.emoji ?? undefined, iconMode: normalizeIconMode(row.icon_mode, row.emoji), isFavorite: Boolean(row.is_favorite), updatedAt: row.updated_at ?? undefined }; }
function mapTask(row) { return { id: row.id, title: row.title, description: row.description ?? undefined, dueDate: row.due_date ?? undefined, dueLabel: row.due_at ?? undefined, priority: normalizePriority(row.priority), status: row.status, scope: row.scope, categoryId: row.category_id ?? undefined, isExpired: Boolean(row.is_expired), updatedAt: row.updated_at }; }
function formatCategoryMarker(category) { return category.iconMode === 'emoji' && category.emoji ? category.emoji : category.iconMode === 'hash' ? '#' : '●'; }
function formatPriority(task) {
  const priority = normalizePriority(task.priority);
  return priority === 1 ? '🔴' : priority === 2 ? '🟡' : priority === 3 ? '🟢' : '🔵';
}
function isAddIntent(value) { return isMenuButton(value, 'addTask') || /^\/add(?:@\w+)?(?:\s|$)/i.test(value); }
function isCancelIntent(value) { return isMenuButton(value, 'cancel') || /^\/cancel(?:@\w+)?$/i.test(value); }
function isCategoriesIntent(value) { return isMenuButton(value, 'categories') || /^\/categories(?:@\w+)?$/i.test(value); }
function isCategoryCreateIntent(value) { return isMenuButton(value, 'createCategory') || /^\/category(?:@\w+)?$/i.test(value); }
function isHelpIntent(value) { return isMenuButton(value, 'help') || /^\/help(?:@\w+)?$/i.test(value); }
function isInboxIntent(value) { return isMenuButton(value, 'inbox') || /^\/inbox(?:@\w+)?$/i.test(value); }
function isLanguageIntent(value) { return isMenuButton(value, 'language') || /^\/language(?:@\w+)?$/i.test(value); }
function isMenuIntent(value) { return /^\/menu(?:@\w+)?$/i.test(value); }
function isStartIntent(value) { return /^\/start(?:@\w+)?(?:\s|$)/i.test(value); }
function isTodayIntent(value) { return isMenuButton(value, 'today') || /^\/today(?:@\w+)?$/i.test(value); }
function isWeekIntent(value) { return isMenuButton(value, 'week') || /^\/week(?:@\w+)?$/i.test(value); }
function isMenuButton(value, key) { return Object.values(copy).some((item) => value === item.buttons[key]); }
function getAddCommandText(value) { return value.match(/^\/add(?:@\w+)?(?:\s+(.+))?$/i)?.[1]?.trim(); }
function getStartPayload(value) { return value.trim().match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i)?.[1]?.trim(); }
function normalizeLanguage(value) { return value === 'en' ? 'en' : 'ru'; }
function normalizeLinkCode(value) { const clean = optionalString(value)?.toUpperCase(); return clean && /^\d{6}$/.test(clean) ? clean : undefined; }
function normalizeIconMode(value, emoji) { return value === 'emoji' && optionalString(emoji) ? 'emoji' : value === 'hash' ? 'hash' : 'color'; }
function normalizeColor(value) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : '#7c65ff'; }
function normalizeDate(value) { const clean = optionalString(value); return clean && /^\d{4}-\d{2}-\d{2}$/.test(clean) && isValidDateKey(clean) ? clean : undefined; }
function normalizeDueTime(value) { const clean = optionalString(value); return clean && /^\d{2}:\d{2}$/.test(clean) ? clean : undefined; }
function normalizePriority(value) {
  const priority = Number(value);
  return priority === 1 || priority === 2 || priority === 3 || priority === 4 ? priority : 4;
}
function normalizeScope(value) { return value === 'today' || value === 'week' || value === 'category' ? value : 'inbox'; }
function normalizeTimezoneOffset(value) { const offset = Number(value); return Number.isFinite(offset) && offset >= -840 && offset <= 840 ? Math.trunc(offset) : BOT_TIMEZONE_OFFSET_MINUTES; }
function normalizeTimestamp(value) { const clean = optionalString(value); const date = clean ? new Date(clean.includes('T') ? clean : `${clean.replace(' ', 'T')}Z`) : undefined; return date && !Number.isNaN(date.getTime()) ? clean : new Date().toISOString(); }
function normalizeParsedDueTime(value) { const [h, m] = value.split(':'); return `${h.padStart(2, '0')}:${m}`; }
function cleanCategoryTitle(value) { return String(value ?? '').replace(/^#/, '').replace(/\s+/g, ' ').trim().slice(0, 64); }
function optionalString(value) { const clean = typeof value === 'string' ? value.trim() : undefined; return clean || undefined; }
function requiredString(value, maxLength, label) { const clean = optionalString(value); if (!clean) throw new Error(`${label} is required`); return clean.slice(0, maxLength); }
function parseJson(value) { try { return value ? JSON.parse(value) : undefined; } catch { return undefined; } }
function truncate(value, maxLength) { return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value; }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function chunkRows(items, size) { const rows = []; for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size)); return rows; }
function formatUser(user) { return [user?.username ? `@${user.username}` : undefined, [user?.first_name, user?.last_name].filter(Boolean).join(' ') || undefined, user?.id ? `id:${user.id}` : undefined].filter(Boolean).join(' '); }
function nowInBotTimeZone(timezoneOffsetMinutes = BOT_TIMEZONE_OFFSET_MINUTES) { return new Date(Date.now() + timezoneOffsetMinutes * 60_000); }
function todayKey(timezoneOffsetMinutes = BOT_TIMEZONE_OFFSET_MINUTES) { return dateKey(nowInBotTimeZone(timezoneOffsetMinutes)); }
function relativeDateKey(offset, timezoneOffsetMinutes = BOT_TIMEZONE_OFFSET_MINUTES) { const date = nowInBotTimeZone(timezoneOffsetMinutes); date.setUTCDate(date.getUTCDate() + offset); return dateKey(date); }
function currentWeekDates(timezoneOffsetMinutes = BOT_TIMEZONE_OFFSET_MINUTES) {
  const today = nowInBotTimeZone(timezoneOffsetMinutes);
  const day = today.getUTCDay();
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  monday.setUTCDate(today.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return Array.from({ length: 7 }, (_item, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return dateKey(date);
  });
}
function getBotTimeZoneYear(timezoneOffsetMinutes = BOT_TIMEZONE_OFFSET_MINUTES) { return nowInBotTimeZone(timezoneOffsetMinutes).getUTCFullYear(); }
function dateKey(date) { return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`; }
function isValidDateKey(value) { const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!match) return false; const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))); return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]); }
function formatDate(value) { const [year, month, day] = value.split('-'); return `${day}.${month}.${year}`; }
function formatShortDate(value) { const [_year, month, day] = value.split('-'); return `${day}.${month}`; }
function formatWeekPickerDate(value, language, timezoneOffsetMinutes = BOT_TIMEZONE_OFFSET_MINUTES) { return value === todayKey(timezoneOffsetMinutes) ? `▶ ${formatShortDate(value)}${language === 'en' ? ' today' : ' сегодня'}` : formatShortDate(value); }
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' }, status }); }
