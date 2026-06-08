import { create } from 'zustand';
import type { Category, Note, Task, TaskScope } from '../../shared/types';
import { categories as seedCategories, notes as seedNotes, tasks as seedTasks } from '../data/seed';

interface TaskState {
  activeScope: TaskScope;
  activeCategoryId: string;
  categories: Category[];
  error?: string;
  isLoading: boolean;
  notes: Note[];
  tasks: Task[];
  addTask: (title: string) => Promise<void>;
  hydrate: () => Promise<void>;
  setActiveCategory: (categoryId: string) => void;
  setScope: (scope: TaskScope) => void;
  toggleTask: (taskId: string) => Promise<void>;
  updateNote: (scope: TaskScope, text: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  activeScope: 'inbox',
  activeCategoryId: 'study',
  categories: seedCategories,
  error: undefined,
  isLoading: false,
  notes: seedNotes,
  tasks: seedTasks,
  addTask: async (title) => {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      return;
    }

    const state = get();
    const task = await requireApi().createTask({
      title: cleanTitle,
      priority: 4,
      scope: state.activeScope,
      categoryId: state.activeScope === 'category' ? state.activeCategoryId : undefined,
    });

    set((currentState) => ({ error: undefined, tasks: [task, ...currentState.tasks] }));
  },
  hydrate: async () => {
    set({ error: undefined, isLoading: true });

    try {
      const data = await requireApi().loadData();
      set({
        categories: data.categories,
        error: undefined,
        isLoading: false,
        notes: data.notes,
        tasks: data.tasks,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Не удалось загрузить данные.',
        isLoading: false,
      });
    }
  },
  setScope: (scope) => set({ activeScope: scope }),
  setActiveCategory: (categoryId) => set({ activeScope: 'category', activeCategoryId: categoryId }),
  toggleTask: async (taskId) => {
    const task = await requireApi().toggleTask(taskId);

    set((state) => ({
      error: undefined,
      tasks: state.tasks.map((item) => (item.id === task.id ? task : item)),
    }));
  },
  updateNote: async (scope, text) => {
    set((state) => {
      const existing = state.notes.some((note) => note.scope === scope);

      if (!existing) {
        return { notes: [...state.notes, { id: crypto.randomUUID(), scope, text }] };
      }

      return { notes: state.notes.map((note) => (note.scope === scope ? { ...note, text } : note)) };
    });

    try {
      const note = await requireApi().updateNote(scope, text);
      set((state) => ({
        error: undefined,
        notes: state.notes.map((item) => (item.scope === note.scope ? note : item)),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Не удалось сохранить заметку.',
      });
    }
  },
}));

const requireApi = () => {
  if (!window.afterlightApi) {
    throw new Error('Afterlight API is not available outside Electron.');
  }

  return window.afterlightApi;
};
