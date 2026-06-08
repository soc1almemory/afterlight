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

type TabStateUpdate = Partial<
  Pick<TaskState, 'activeCategoryId' | 'activeScope' | 'canGoBack' | 'canGoForward' | 'openTabs'>
>;

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
  closeTab: (route: AppRoute) => void;
  deleteCategory: (categoryId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  goBack: () => void;
  goForward: () => void;
  hydrate: () => Promise<void>;
  moveTab: (sourceKey: string, targetKey: string) => void;
  openTabs: AppRoute[];
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
  notes: seedNotes,
  openTabs: [{ scope: 'inbox' }],
  tasks: seedTasks,
  createCategory: async (input) => {
    const category = await requireApi().createCategory({
      ...input,
      title: input.title.trim(),
    });

    set((state) => ({
      ...openRoute(state, { categoryId: category.id, scope: 'category' }),
      categories: sortCategories([category, ...state.categories]),
      error: undefined,
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
  closeTab: (route) => {
    set((state) => closeRoute(state, route));
  },
  deleteCategory: async (categoryId) => {
    await requireApi().deleteCategory(categoryId);

    set((state) => {
      const nextState = closeRoute(state, { categoryId, scope: 'category' }, true);
      const activeCategoryId =
        nextState.activeCategoryId ?? (state.activeCategoryId === categoryId ? '' : state.activeCategoryId);
      const activeScope = nextState.activeScope ?? (state.activeCategoryId === categoryId ? 'inbox' : state.activeScope);

      return {
        ...nextState,
        activeCategoryId,
        activeScope,
        categories: state.categories.filter((category) => category.id !== categoryId),
        error: undefined,
        notes: state.notes.filter((note) => note.categoryId !== categoryId),
        tasks: state.tasks.map((task) => (task.categoryId === categoryId ? { ...task, categoryId: undefined } : task)),
      };
    });
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
    const currentIndex = getActiveTabIndex(state);
    const previousRoute = state.openTabs[currentIndex - 1];

    if (!previousRoute) {
      return;
    }

    set(activateRoute(state, previousRoute));
  },
  goForward: () => {
    const state = get();
    const currentIndex = getActiveTabIndex(state);
    const nextRoute = state.openTabs[currentIndex + 1];

    if (!nextRoute) {
      return;
    }

    set(activateRoute(state, nextRoute));
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
  moveTab: (sourceKey, targetKey) => {
    set((state) => {
      const sourceIndex = state.openTabs.findIndex((route) => getRouteKey(route) === sourceKey);
      const targetIndex = state.openTabs.findIndex((route) => getRouteKey(route) === targetKey);

      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return {};
      }

      const openTabs = [...state.openTabs];
      const [movedRoute] = openTabs.splice(sourceIndex, 1);
      openTabs.splice(targetIndex, 0, movedRoute);

      return getTabNavigationState({ ...state, openTabs });
    });
  },
  setScope: (scope) => {
    set((state) => openRoute(state, { scope }));
  },
  setActiveCategory: (categoryId) => {
    set((state) => openRoute(state, { categoryId, scope: 'category' }));
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

const getRouteKey = (route: AppRoute) => (route.scope === 'category' ? `category:${route.categoryId}` : route.scope);

const isSameRoute = (first: AppRoute, second: AppRoute) =>
  first.scope === second.scope && (first.scope !== 'category' || first.categoryId === second.categoryId);

const getActiveTabIndex = (state: Pick<TaskState, 'activeCategoryId' | 'activeScope' | 'openTabs'>) => {
  const currentRoute = getCurrentRoute(state);
  const activeIndex = state.openTabs.findIndex((route) => isSameRoute(route, currentRoute));

  return activeIndex >= 0 ? activeIndex : 0;
};

const getTabNavigationState = (state: Pick<TaskState, 'activeCategoryId' | 'activeScope' | 'openTabs'>) => {
  const activeIndex = getActiveTabIndex(state);

  return {
    canGoBack: activeIndex > 0,
    canGoForward: activeIndex < state.openTabs.length - 1,
    openTabs: state.openTabs,
  };
};

const activateRoute = (
  state: Pick<TaskState, 'activeCategoryId' | 'activeScope' | 'openTabs'>,
  route: AppRoute,
): TabStateUpdate => {
  const nextState = {
    activeCategoryId: route.categoryId ?? state.activeCategoryId,
    activeScope: route.scope,
    openTabs: state.openTabs,
  };

  return {
    ...nextState,
    ...getTabNavigationState(nextState),
  };
};

const openRoute = (
  state: Pick<TaskState, 'activeCategoryId' | 'activeScope' | 'openTabs'>,
  route: AppRoute,
): TabStateUpdate => {
  const openTabs = state.openTabs.some((tab) => isSameRoute(tab, route)) ? state.openTabs : [...state.openTabs, route];
  return activateRoute({ ...state, openTabs }, route);
};

const closeRoute = (
  state: Pick<TaskState, 'activeCategoryId' | 'activeScope' | 'openTabs'>,
  route: AppRoute,
  force = false,
): TabStateUpdate => {
  if (!force && state.openTabs.length <= 1) {
    return {};
  }

  const closingIndex = state.openTabs.findIndex((tab) => isSameRoute(tab, route));

  if (closingIndex < 0) {
    return {};
  }

  const wasActive = isSameRoute(getCurrentRoute(state), route);
  const openTabs = state.openTabs.filter((tab) => !isSameRoute(tab, route));
  const safeTabs = openTabs.length > 0 ? openTabs : [{ scope: 'inbox' as const }];
  const fallbackRoute = safeTabs[Math.max(0, closingIndex - 1)] ?? safeTabs[0];

  if (!wasActive) {
    return getTabNavigationState({ ...state, openTabs: safeTabs });
  }

  return activateRoute({ ...state, openTabs: safeTabs }, fallbackRoute);
};

const requireApi = () => {
  if (!window.afterlightApi) {
    throw new Error('Afterlight API is not available outside Electron.');
  }

  return window.afterlightApi;
};
