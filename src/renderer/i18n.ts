import type { LanguageCode } from '../shared/types';
import { useTaskStore } from './store/useTaskStore';

const translations = {
  ru: {
    addTask: 'Добавить задачу',
    back: 'Назад',
    categories: 'Категории',
    changelog: 'История изменений',
    clear: 'Очистить',
    clearCurrentSectionConfirm: 'Очистить текущий раздел от задач?',
    close: 'Закрыть',
    closeWindow: 'Закрыть',
    collapseSidebar: 'Свернуть боковую панель',
    createCategory: 'Создать категорию',
    favoriteAdd: 'Добавить в избранное',
    favoriteRemove: 'Убрать из избранного',
    delete: 'Удалить',
    deleteCategoryConfirm: 'Удалить категорию “{title}”?',
    dragTaskHere: 'Перетащите задачу сюда',
    editTask: 'Редактировать задачу',
    expired: 'Просрочено',
    expandSidebar: 'Развернуть боковую панель',
    favorite: 'Избранное',
    forward: 'Вперёд',
    history: 'История',
    help: 'Помощь',
    inbox: 'Входящие',
    loadingData: 'Загрузка данных...',
    loadingApp: 'Загрузка Afterlight...',
    maximize: 'Развернуть',
    minimize: 'Свернуть',
    nothingFound: 'Ничего не найдено',
    notes: 'Заметки',
    noDate: 'Без даты',
    openTabs: 'Открытые вкладки',
    recent: 'Недавно открытые',
    results: 'Результаты',
    search: 'Поиск',
    searchPlaceholder: 'Поиск в рабочем пространстве {name}...',
    settings: 'Настройки',
    pageActions: 'Действия страницы',
    quickActions: 'Быстрые действия',
    today: 'Сегодня',
    taskComplete: 'Завершить задачу',
    taskRestore: 'Вернуть задачу',
    tomorrow: 'Завтра',
    updateDownloadingTitle: 'Скачиваем обновление',
    updateNewVersion: 'новая версия',
    updateReadyBody: 'Обновление {version} готово к установке.',
    updateReadyTitle: 'Доступно обновление',
    updateRestart: 'Перезапустить',
    updatedDaysAgo: 'Изменено {value}д назад',
    updatedHoursAgo: 'Изменено {value}ч назад',
    updatedJustNow: 'Изменено только что',
    updatedMinuteAgo: 'Изменено минуту назад',
    updatedMinutesAgo: 'Изменено {value}м назад',
    updatedMonthsAgo: 'Изменено {value}мес. назад',
    updatedSecondsAgo: 'Изменено {value}с назад',
    week: 'Неделя',
    writeNote: 'Напишите что-нибудь важное, чтобы не забыть.',
  },
  en: {
    addTask: 'Add task',
    back: 'Back',
    categories: 'Categories',
    changelog: 'Changelog',
    clear: 'Clear',
    clearCurrentSectionConfirm: 'Clear tasks from the current section?',
    close: 'Close',
    closeWindow: 'Close',
    collapseSidebar: 'Collapse sidebar',
    createCategory: 'Create category',
    favoriteAdd: 'Add to favorites',
    favoriteRemove: 'Remove from favorites',
    delete: 'Delete',
    deleteCategoryConfirm: 'Delete category “{title}”?',
    dragTaskHere: 'Drag a task here',
    editTask: 'Edit task',
    expired: 'Overdue',
    expandSidebar: 'Expand sidebar',
    favorite: 'Favorites',
    forward: 'Forward',
    history: 'History',
    help: 'Help',
    inbox: 'Inbox',
    loadingData: 'Loading data...',
    loadingApp: 'Loading Afterlight...',
    maximize: 'Maximize',
    minimize: 'Minimize',
    nothingFound: 'Nothing found',
    notes: 'Notes',
    noDate: 'No date',
    openTabs: 'Open tabs',
    recent: 'Recently opened',
    results: 'Results',
    search: 'Search',
    searchPlaceholder: 'Search in {name} workspace...',
    settings: 'Settings',
    pageActions: 'Page actions',
    quickActions: 'Quick actions',
    today: 'Today',
    taskComplete: 'Complete task',
    taskRestore: 'Restore task',
    tomorrow: 'Tomorrow',
    updateDownloadingTitle: 'Downloading update',
    updateNewVersion: 'new version',
    updateReadyBody: 'Update {version} is ready to install.',
    updateReadyTitle: 'Update is ready',
    updateRestart: 'Restart',
    updatedDaysAgo: 'Updated {value}d ago',
    updatedHoursAgo: 'Updated {value}h ago',
    updatedJustNow: 'Updated just now',
    updatedMinuteAgo: 'Updated a minute ago',
    updatedMinutesAgo: 'Updated {value}m ago',
    updatedMonthsAgo: 'Updated {value}mo ago',
    updatedSecondsAgo: 'Updated {value}s ago',
    week: 'Week',
    writeNote: 'Write something important so you do not forget.',
  },
} as const;

export type TranslationKey = keyof (typeof translations)['ru'];

export const translate = (language: LanguageCode, key: TranslationKey, params?: Record<string, string | number>) => {
  const template: string = translations[language][key] ?? translations.ru[key];
  if (!params) {
    return template;
  }

  let result = template;
  Object.entries(params).forEach(([paramKey, value]) => {
    result = result.replace(`{${paramKey}}`, String(value));
  });

  return result;
};

export const useTranslator = () => {
  const language = useTaskStore((state) => state.settings.language);
  return (key: TranslationKey, params?: Record<string, string | number>) => translate(language, key, params);
};
