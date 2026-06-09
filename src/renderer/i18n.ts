import type { LanguageCode } from '../shared/types';
import { useTaskStore } from './store/useTaskStore';

const translations = {
  ru: {
    addTask: 'Добавить задачу',
    categories: 'Категории',
    changelog: 'История изменений',
    clear: 'Очистить',
    close: 'Закрыть',
    delete: 'Удалить',
    favorite: 'Избранное',
    help: 'Помощь',
    inbox: 'Входящие',
    loadingData: 'Загрузка данных...',
    notes: 'Заметки',
    search: 'Поиск',
    settings: 'Настройки',
    today: 'Сегодня',
    updatedDaysAgo: 'Изменено {value}д назад',
    updatedHoursAgo: 'Изменено {value}ч назад',
    updatedJustNow: 'Изменено только что',
    updatedMinutesAgo: 'Изменено {value}м назад',
    week: 'Неделя',
    writeNote: 'Напишите что-нибудь важное, чтобы не забыть.',
  },
  en: {
    addTask: 'Add task',
    categories: 'Categories',
    changelog: 'Changelog',
    clear: 'Clear',
    close: 'Close',
    delete: 'Delete',
    favorite: 'Favorites',
    help: 'Help',
    inbox: 'Inbox',
    loadingData: 'Loading data...',
    notes: 'Notes',
    search: 'Search',
    settings: 'Settings',
    today: 'Today',
    updatedDaysAgo: 'Updated {value}d ago',
    updatedHoursAgo: 'Updated {value}h ago',
    updatedJustNow: 'Updated just now',
    updatedMinutesAgo: 'Updated {value}m ago',
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
