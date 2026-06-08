import { create } from 'zustand';
import type {
  Category,
  CreateCategoryInput,
  CreateTaskInput,
  Note,
  Task,
  TaskScope,
  UpdateCategoryInput,
  UpdateTaskInput,
} from '../../shared/types';
import { categories as seedCategories, notes as seedNotes, tasks as seedTasks } from '../data/seed';

interface AppRoute {
  categoryId?: string;
  scope: TaskScope;
}

interface TaskState {
  activeScope: TaskScope;
  activeCategoryId: string;
  categories: Category[];
  canGoBack: boolean;
  canGoForward: boolean;
  error?: string;
  isLoading: boolean;
  notes: Note[];
  tasks: Task[];
  createCategory: (input: CreateCategoryInput) => Promise<void>;
  createTask: (input: Omit<CreateTaskInput, 'scope' | 'categoryId'> & { categoryId?: string }) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  goBack: () => void;
  goForward: () => void;
  hydrate: () => Promise<void>;
  navigationFuture: AppRoute[];
  navigationPast: AppRoute[];
  setActiveCategory: (categoryId: string) => void;
  setScope: (scope: TaskScope) => void;
  toggleCategoryFavorite: (categoryId: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  updateCategory: (input: UpdateCategoryInput) => Promise<void>;
  updateTask: (input: UpdateTaskInput) => Promise<void>;
  updateNote: (scope: TaskScope, text: string, categoryId?: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  activeScope: 'inbox',
  activeCategoryId: 'study',
  canGoBack: false,
  canGoForward: false,
  categories: seedCategories,
  error: undefined,
  isLoading: false,
  navigationFuture: [],
  navigationPast: [],
  notes: seedNotes,
  tasks: seedTasks,
  createCategory: async (input) => {
    const category = await requireApi().createCategory({
      ...input,
      title: input.title.trim(),
    });

    set((state) => ({
      activeCategoryId: category.id,
      activeScope: 'category',
      canGoBack: true,
      canGoForward: false,
      categories: sortCategories([category, ...state.categories]),
      error: undefined,
      navigationFuture: [],
      navigationPast: [...state.navigationPast, getCurrentRoute(state)],
    }));
  },
  createTask: async (input) => {
    const cleanTitle = input.title.trim();

    if (!cleanTitle) {
      return;
    }

    const state = get();
    const task = await requireApi().createTask({
      ...input,
      title: cleanTitle,
      scope: state.activeScope,
      categoryId: input.categoryId || (state.activeScope === 'category' ? state.activeCategoryId : undefined),
    });

    set((currentState) => ({ error: undefined, tasks: [task, ...currentState.tasks] }));
  },
  deleteCategory: async (categoryId) => {
    await requireApi().deleteCategory(categoryId);

    set((state) => ({
      activeCategoryId: state.activeCategoryId === categoryId ? '' : state.activeCategoryId,
      activeScope: state.activeCategoryId === categoryId ? 'inbox' : state.activeScope,
      categories: state.categories.filter((category) => category.id !== categoryId),
      error: undefined,
      notes: state.notes.filter((note) => note.categoryId !== categoryId),
      tasks: state.tasks.map((task) => (task.categoryId === categoryId ? { ...task, categoryId: undefined } : task)),
    }));
  },
  deleteTask: async (taskId) => {
    await requireApi().deleteTask(taskId);

    set((state) => ({
      error: undefined,
      tasks: state.tasks.filter((task) => task.id !== taskId),
    }));
  },
  goBack: () => {
    const state = get();
    const previousRoute = state.navigationPast.at(-1);

    if (!previousRoute) {
      return;
    }

    const nextPast = state.navigationPast.slice(0, -1);
    const nextFuture = [getCurrentRoute(state), ...state.navigationFuture];

    set({
      activeCategoryId: previousRoute.categoryId ?? state.activeCategoryId,
      activeScope: previousRoute.scope,
      canGoBack: nextPast.length > 0,
      canGoForward: true,
      navigationFuture: nextFuture,
      navigationPast: nextPast,
    });
  },
  goForward: () => {
    const state = get();
    const nextRoute = state.navigationFuture[0];

    if (!nextRoute) {
      return;
    }

    const nextPast = [...state.navigationPast, getCurrentRoute(state)];
    const nextFuture = state.navigationFuture.slice(1);

    set({
      activeCategoryId: nextRoute.categoryId ?? state.activeCategoryId,
      activeScope: nextRoute.scope,
      canGoBack: true,
      canGoForward: nextFuture.length > 0,
      navigationFuture: nextFuture,
      navigationPast: nextPast,
    });
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
  setScope: (scope) => {
    set((state) => pushRoute(state, { scope }));
  },
  setActiveCategory: (categoryId) => {
    set((state) => pushRoute(state, { categoryId, scope: 'category' }));
  },
  toggleCategoryFavorite: async (categoryId) => {
    const category = await requireApi().toggleCategoryFavorite(categoryId);

    set((state) => ({
      categories: sortCategories(state.categories.map((item) => (item.id === category.id ? category : item))),
      error: undefined,
    }));
  },
  toggleTask: async (taskId) => {
    const task = await requireApi().toggleTask(taskId);

    set((state) => ({
      error: undefined,
      tasks: state.tasks.map((item) => (item.id === task.id ? task : item)),
    }));
  },
  updateCategory: async (input) => {
    const category = await requireApi().updateCategory({
      ...input,
      title: input.title.trim(),
    });

    set((state) => ({
      categories: sortCategories(state.categories.map((item) => (item.id === category.id ? category : item))),
      error: undefined,
    }));
  },
  updateTask: async (input) => {
    const task = await requireApi().updateTask({
      ...input,
      title: input.title.trim(),
      dueDate: input.dueDate || undefined,
      scope: input.scope,
      categoryId: input.categoryId || undefined,
    });

    set((state) => ({
      error: undefined,
      tasks: state.tasks.map((item) => (item.id === task.id ? task : item)),
    }));
  },
  updateNote: async (scope, text, categoryId) => {
    const noteCategoryId = scope === 'category' ? categoryId : undefined;

    set((state) => {
      const existing = state.notes.some((note) => note.scope === scope && note.categoryId === noteCategoryId);

      if (!existing) {
        return { notes: [...state.notes, { id: crypto.randomUUID(), scope, categoryId: noteCategoryId, text }] };
      }

      return {
        notes: state.notes.map((note) =>
          note.scope === scope && note.categoryId === noteCategoryId ? { ...note, text } : note,
        ),
      };
    });

    try {
      const note = await requireApi().updateNote(scope, text, noteCategoryId);
      set((state) => {
        const existing = state.notes.some((item) => item.scope === note.scope && item.categoryId === note.categoryId);

        return {
          error: undefined,
          notes: existing
            ? state.notes.map((item) =>
                item.scope === note.scope && item.categoryId === note.categoryId ? note : item,
              )
            : [...state.notes, note],
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Не удалось сохранить заметку.',
      });
    }
  },
}));

const sortCategories = (categories: Category[]) =>
  [...categories].sort((first, second) => Number(second.isFavorite) - Number(first.isFavorite));

const getCurrentRoute = (state: Pick<TaskState, 'activeCategoryId' | 'activeScope'>): AppRoute => ({
  categoryId: state.activeScope === 'category' ? state.activeCategoryId : undefined,
  scope: state.activeScope,
});

const isSameRoute = (first: AppRoute, second: AppRoute) =>
  first.scope === second.scope && (first.scope !== 'category' || first.categoryId === second.categoryId);

const pushRoute = (
  state: Pick<
    TaskState,
    'activeCategoryId' | 'activeScope' | 'navigationPast'
  >,
  nextRoute: AppRoute,
) => {
  const currentRoute = getCurrentRoute(state);

  if (isSameRoute(currentRoute, nextRoute)) {
    return {};
  }

  return {
    activeCategoryId: nextRoute.categoryId ?? state.activeCategoryId,
    activeScope: nextRoute.scope,
    canGoBack: true,
    canGoForward: false,
    navigationFuture: [],
    navigationPast: [...state.navigationPast, currentRoute],
  };
};

const requireApi = () => {
  if (!window.afterlightApi) {
    throw new Error('Afterlight API is not available outside Electron.');
  }

  return window.afterlightApi;
};
