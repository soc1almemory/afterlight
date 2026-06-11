# Afterlight
### Локальный Windows task manager для задач, заметок, категорий и Telegram-напоминаний.

![Version](https://img.shields.io/badge/version-0.2.0-111111)
![Platform](https://img.shields.io/badge/platform-Windows-0078D4)
![Runtime](https://img.shields.io/badge/runtime-Electron-47848F)
![UI](https://img.shields.io/badge/UI-React%20%2B%20TypeScript-61DAFB)
![Storage](https://img.shields.io/badge/storage-SQLite-003B57)

# About

**Afterlight** — локальное desktop-приложение для Windows, созданное как компактный task manager для личного workflow. Приложение помогает вести задачи, заметки, категории, следить за дедлайнами и управлять повседневным расписанием без обязательного сервера.

Данные хранятся локально в SQLite, интерфейс работает на Electron + React, а Telegram-бот позволяет добавлять и контролировать задачи прямо из мессенджера, пока запущено приложение.

# Features

- **Tasks** — создание, редактирование, выполнение и удаление задач.
- **Inbox / Today / Week** — системные разделы для входящих задач, текущего дня и недельного планирования.
- **Categories** — пользовательские категории с цветом, иконкой, emoji-режимом и избранным.
- **Notes** — заметки на страницах и в категориях с автосохранением.
- **Search** — быстрый поиск по разделам, категориям и задачам.
- **Tabs & history** — вкладки, история переходов, навигация назад и вперед.
- **Themes** — светлая и темная тема интерфейса.
- **Settings** — настройки аккаунта, языка, темы, уведомлений, sidebar, Telegram и резервных копий.
- **Notifications** — Windows-уведомления о дедлайнах, просроченных задачах и обновлении страницы “Сегодня”.
- **Telegram bot** — локальный бот для создания, просмотра, выполнения и удаления задач.
- **Import / Export / Backup** — экспорт JSON/CSV, импорт JSON и резервные копии SQLite.

# Tech stack

| Layer | Tools |
|---|---|
| Desktop | Electron, Electron Forge |
| Build | Vite, TypeScript |
| UI | React 19, CSS |
| State | Zustand |
| Database | SQLite, better-sqlite3 |
| Integration | Telegram Bot API |
| Platform | Windows |

# Architecture

Afterlight построен по стандартной Electron-архитектуре:

```text
Main process     -> окно, tray, SQLite, файлы, backup, уведомления, Telegram
Preload process  -> безопасный мост между renderer и main через contextBridge
Renderer process -> React-интерфейс, страницы, popup, настройки, состояние UI
Shared layer     -> общие TypeScript-типы и версия приложения
```

# Project structure

```text
src/
├─ main/
│  ├─ main.ts              # Electron main process
│  ├─ preload.ts           # безопасный API для renderer
│  ├─ ipc/                 # IPC handlers
│  ├─ storage/             # SQLite, миграции, repositories
│  └─ telegram/            # локальный Telegram-бот
│
├─ renderer/
│  ├─ App.tsx              # основной UI
│  ├─ components/          # компоненты интерфейса
│  ├─ store/               # Zustand-store
│  ├─ styles/              # app.css, темы, layout, анимации
│  └─ content/             # help и changelog в Markdown
│
└─ shared/
   ├─ types.ts             # общие типы данных
   └─ app-version.json     # версия приложения

assets/                    # SVG/PNG/ICO ассеты
reference/                 # HTML/CSS экспорт из Figma и визуальные референсы
```

# Commands

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# TypeScript check
npm run lint

# Package Windows build
npm run package

# Create distributable artifacts
npm run make
```

После `npm run package` Windows-сборка появляется здесь:

```text
out/afterlight-win32-x64/afterlight.exe
```

# Telegram integration

Telegram-бот работает локально через long polling. Отдельный сервер, webhook, VPS или ngrok не требуются.

Что умеет бот:

- добавлять задачи обычным текстом или через `/add`;
- показывать задачи из “Входящих”, “Сегодня”, “Недели” и категорий;
- выполнять, возвращать и удалять задачи;
- создавать категории;
- отправлять напоминания о дедлайнах;
- работать на русском и английском языке.

Примеры задач для Telegram:

```text
Купить молоко сегодня
Сдать отчет завтра 18:00
Позвонить клиенту #Работа
Домашка 12.06 14:30 #Учеба
```

# Local data

Пользовательские данные хранятся локально:

```text
app.getPath('userData')/storage/afterlight.sqlite
```

Рядом находятся:

```text
storage/backups        # резервные копии SQLite
storage/telegram.json  # локальный конфиг Telegram-бота
```
