import type { Category, Note, Task } from './types';

export const seedCategories: Category[] = [
  { id: 'study', title: 'Учёба', color: '#7c65ff', isFavorite: true },
  { id: 'home', title: 'Дом', color: '#00a878', isFavorite: false },
  { id: 'work', title: 'Работа', color: '#ff9f1c', isFavorite: false },
];

export const seedTasks: Task[] = [
  {
    id: 'cook-pie',
    title: 'Приготовить пирог',
    description: 'Приготовить пирог для гостей',
    dueLabel: 'Сегодня, 17:00',
    priority: 1,
    status: 'active',
    scope: 'inbox',
  },
  {
    id: 'shop',
    title: 'Сходить в магазин',
    description: 'Купить продукты на неделю',
    dueLabel: 'Сегодня, 12:00',
    priority: 2,
    status: 'completed',
    scope: 'inbox',
  },
  {
    id: 'backup',
    title: 'Сделать резервную копию файлов',
    description: 'Перенести важные документы на облако',
    dueLabel: '18.10.2025',
    priority: 4,
    status: 'active',
    scope: 'inbox',
    isExpired: true,
  },
  {
    id: 'training',
    title: 'Сделать тренировку',
    dueLabel: '12:00',
    priority: 1,
    status: 'active',
    scope: 'today',
  },
  {
    id: 'report',
    title: 'Подготовить отчёт',
    description: 'Завершить раздел "Заключение"',
    dueLabel: '17:00',
    priority: 1,
    status: 'active',
    scope: 'today',
    categoryId: 'study',
  },
  {
    id: 'lecture',
    title: 'Посмотреть лекцию',
    dueLabel: 'До завтра',
    priority: 2,
    status: 'active',
    scope: 'today',
    categoryId: 'study',
  },
  {
    id: 'architecture',
    title: 'Сделать презентацию',
    description: 'Подготовить слайды по архитектуре приложения',
    dueLabel: 'До завтра',
    priority: 3,
    status: 'active',
    scope: 'week',
    categoryId: 'study',
  },
  {
    id: 'mail',
    title: 'Разобрать почту',
    priority: 4,
    status: 'active',
    scope: 'category',
    categoryId: 'work',
  },
];

export const seedNotes: Note[] = [
  {
    id: 'inbox-note',
    scope: 'inbox',
    text: 'Напишите что-нибудь важное, чтобы не забыть.',
  },
];
