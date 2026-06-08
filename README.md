# Afterlight

Afterlight — легковесный Windows task manager для дипломной работы.

## Стек

- Electron Forge + Vite — desktop shell, dev server и упаковка приложения.
- React + TypeScript — renderer-часть, экраны, состояние UI.
- Zustand — локальное состояние задач, категорий и заметок.
- SQLite (`better-sqlite3`) — заготовка локального хранилища в main-процессе.

## Структура

- `src/main` — Electron main process, preload и SQLite bootstrap.
- `src/renderer` — React-приложение.
- `src/shared` — общие типы для main/renderer.
- `assets` — SVG-ассеты из Figma.
- `style.css`, `global.css`, папки `inbox`, `today`, `week`, `category-page`, `popups` — сохранённый HTML/CSS экспорт из Figma как визуальный референс.

## Команды

```bash
npm install
npm run dev
npm run lint
npm run package
```

После `npm run package` Windows-сборка появляется в `out/afterlight-win32-x64/afterlight.exe`.
