import { create } from 'zustand';
import type {
  AppData,
  AppSettings,
  Category,
  CreateCategoryInput,
  CreateTaskInput,
  Note,
  ProfileSetupInput,
  Task,
  TaskScope,
  UpdateCategoryInput,
  UpdateProfileInput,
  UpdateSettingsInput,
  UpdateTaskInput,
  UpdateWorkspaceInput,
  UserProfile,
  Workspace,
} from '../../shared/types';

const THEME_STORAGE_KEY = 'afterlight.theme';
const ROUTE_HISTORY_LIMIT = 24;

interface AppRoute {
  categoryId?: string;
  scope: TaskScope;
}

interface RouteVisit extends AppRoute {
  openedAt: string;
}

type TabStateUpdate = Partial<
  Pick<TaskState, 'activeCategoryId' | 'activeScope' | 'canGoBack' | 'canGoForward' | 'openTabs' | 'routeHistory'>
>;

const defaultProfile: UserProfile = {
  id: 'default-profile',
  activeWorkspaceId: 'default-workspace',
  email: 'username@gmail.com',
  isSetupComplete: false,
  name: 'Username',
};

const defaultWorkspace: Workspace = {
  id: 'default-workspace',
  profileId: 'default-profile',
  title: 'Личное пространство',
};

const defaultSettings: AppSettings = {
  autoBackupEnabled: true,
  autoBackupIntervalHours: 24,
  autoCollapseSidebar: false,
  autosaveNotesIntervalSeconds: 1,
  categorySortMode: 'created',
  closeBehavior: 'exit',
  confirmCategoryDelete: true,
  confirmExit: false,
  confirmTaskDelete: true,
  countCompletedTasks: true,
  counterCriticalAt: 31,
  counterHighAt: 16,
  counterMediumAt: 6,
  highlightTodayInWeek: true,
  includeTodayDueTasks: true,
  language: 'ru',
  launchMinimized: false,
  launchWithWindows: false,
  minimizeToTrayOnClose: false,
  deadlineNotifyBeforeMinutes: 60,
  notifyBeforeTodayRefresh: false,
  notifyDeadlines: false,
  notifyOverdue: false,
  notesLineLimit: 50,
  overdueNotifyEveryMinutes: 240,
  openMode: 'normal',
  restoreTabs: false,
  restoreWindowState: 'normal',
  showCategoryCounts: true,
  showLastModified: true,
  showSidebarCounts: true,
  showTabBar: true,
  showTodayOverdueFirst: true,
  sortCompletedTasksLast: true,
  showWeekNoDate: true,
  startSection: 'inbox',
  taskSortMode: 'created',
  theme: getInitialTheme(),
  todayRefreshNotifyBeforeMinutes: 10,
  todayRefreshTime: '00:00',
  trayEnabled: true,
  weekOrderMode: 'monday',
};

interface TaskState {
  activeScope: TaskScope;
  activeCategoryId: string;
  categories: Category[];
  canGoBack: boolean;
  canGoForward: boolean;
  error?: string;
  hasHydrated: boolean;
  isLoading: boolean;
  notes: Note[];
  profile: UserProfile;
  settings: AppSettings;
  tasks: Task[];
  workspace: Workspace;
  completeProfileSetup: (input: ProfileSetupInput) => Promise<void>;
  createCategory: (input: CreateCategoryInput) => Promise<void>;
  createTask: (input: Omit<CreateTaskInput, 'scope' | 'categoryId'> & { categoryId?: string }) => Promise<void>;
  closeTab: (route: AppRoute) => void;
  deleteCategory: (categoryId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  deleteTasks: (taskIds: string[]) => Promise<void>;
  goBack: () => void;
  goForward: () => void;
  hydrate: () => Promise<void>;
  moveTab: (sourceKey: string, targetKey: string) => void;
  openTabs: AppRoute[];
  resetProfile: () => Promise<void>;
  routeHistory: RouteVisit[];
  setActiveCategory: (categoryId: string) => void;
  setScope: (scope: TaskScope) => void;
  toggleCategoryFavorite: (categoryId: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  updateCategory: (input: UpdateCategoryInput) => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  updateSettings: (input: UpdateSettingsInput) => Promise<void>;
  updateTask: (input: UpdateTaskInput) => Promise<void>;
  updateWorkspace: (input: UpdateWorkspaceInput) => Promise<void>;
  updateNote: (scope: TaskScope, text: string, categoryId?: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  activeScope: 'inbox',
  activeCategoryId: '',
  canGoBack: false,
  canGoForward: false,
  categories: [],
  error: undefined,
  hasHydrated: false,
  isLoading: false,
  notes: [],
  openTabs: [{ scope: 'inbox' }],
  profile: defaultProfile,
  routeHistory: [],
  settings: defaultSettings,
  tasks: [],
  workspace: defaultWorkspace,
  completeProfileSetup: async (input) => {
    const data = await requireApi().completeProfileSetup({
      ...input,
      email: input.email.trim(),
      name: input.name.trim(),
      workspaceTitle: input.workspaceTitle.trim(),
    });

    set({ ...appDataToState(data), ...getInitialRouteState() });
  },
  createCategory: async (input) => {
    const category = await requireApi().createCategory({
      ...input,
      title: input.title.trim(),
    });

    set((state) => ({
      ...openRoute(state, { categoryId: category.id, scope: 'category' }),
      categories: sortCategories([...state.categories, category]),
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

    set((currentState) => ({ error: undefined, tasks: [{ ...task, updatedAt: task.updatedAt ?? new Date().toISOString() }, ...currentState.tasks] }));
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
  deleteTasks: async (taskIds) => {
    const cleanTaskIds = [...new Set(taskIds.filter(Boolean))];

    if (cleanTaskIds.length === 0) {
      return;
    }

    const deletedTaskIds = await requireApi().deleteTasks(cleanTaskIds);
    const deletedTaskIdsSet = new Set(deletedTaskIds);

    set((state) => ({
      error: undefined,
      tasks: state.tasks.filter((task) => !deletedTaskIdsSet.has(task.id)),
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
    const wasHydrated = get().hasHydrated;
    set({ error: undefined, isLoading: !wasHydrated });

    try {
      const data = await requireApi().loadData();
      set({ ...appDataToState(data), ...(wasHydrated ? {} : getStartupRouteState(data.settings)) });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Не удалось загрузить данные.',
        hasHydrated: true,
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
      persistNavigationState({ ...state, openTabs });

      return getTabNavigationState({ ...state, openTabs });
    });
  },
  resetProfile: async () => {
    const data = await requireApi().resetProfile();
    set({ ...appDataToState(data), ...getInitialRouteState() });
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
  updateProfile: async (input) => {
    const profile = await requireApi().updateProfile({
      ...input,
      name: input.name.trim(),
      email: input.email?.trim() || undefined,
      avatarDataUrl: input.avatarDataUrl || undefined,
      isSetupComplete: input.isSetupComplete,
    });

    set({ error: undefined, profile });
  },
  updateSettings: async (input) => {
    const settings = await requireApi().updateSettings(input);

    if (input.theme) {
      persistTheme(input.theme);
    }

    set((state) => {
      const nextRouteState =
        input.showTabBar === false
          ? { ...getInitialRouteState(), activeScope: state.activeScope, activeCategoryId: state.activeCategoryId }
          : {};

      return { ...nextRouteState, error: undefined, settings };
    });
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
  updateWorkspace: async (input) => {
    const workspace = await requireApi().updateWorkspace({
      ...input,
      title: input.title.trim(),
    });

    set({ error: undefined, workspace });
  },
  updateNote: async (scope, text, categoryId) => {
    const noteCategoryId = scope === 'category' ? categoryId : undefined;
    const updatedAt = new Date().toISOString();

    set((state) => {
      const existing = state.notes.some((note) => note.scope === scope && note.categoryId === noteCategoryId);

      if (!existing) {
        return { notes: [...state.notes, { id: crypto.randomUUID(), scope, categoryId: noteCategoryId, text, updatedAt }] };
      }

      return {
        notes: state.notes.map((note) =>
          note.scope === scope && note.categoryId === noteCategoryId ? { ...note, text, updatedAt } : note,
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

const appDataToState = (data: AppData) => {
  persistTheme(data.settings.theme);

  return {
    categories: data.categories,
    error: undefined,
    hasHydrated: true,
    isLoading: false,
    notes: data.notes,
    profile: data.profile,
    settings: data.settings,
    tasks: data.tasks,
    workspace: data.workspace,
  };
};

const getInitialRouteState = () => ({
  activeCategoryId: '',
  activeScope: 'inbox' as const,
  canGoBack: false,
  canGoForward: false,
  openTabs: [{ scope: 'inbox' as const }],
  routeHistory: [],
});

const NAVIGATION_STORAGE_KEY = 'afterlight.navigation';

const getStartupRouteState = (settings: AppSettings): TabStateUpdate => {
  const restoredState = readNavigationState();
  const routeHistory = restoredState?.routeHistory ?? [];

  if (settings.restoreTabs) {
    if (restoredState) {
      return restoredState;
    }
  }

  if (settings.startSection === 'last') {
    return restoredState ?? getInitialRouteState();
  }

  return activateRoute({ ...getInitialRouteState(), routeHistory }, { scope: settings.startSection }, false);
};

const persistNavigationState = (
  state: Pick<TaskState, 'activeCategoryId' | 'activeScope' | 'openTabs'> & { routeHistory?: RouteVisit[] },
) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    NAVIGATION_STORAGE_KEY,
    JSON.stringify({
      activeCategoryId: state.activeCategoryId,
      activeScope: state.activeScope,
      openTabs: state.openTabs,
      routeHistory: state.routeHistory ?? [],
    }),
  );
};

const readNavigationState = (): TabStateUpdate | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const rawValue = window.localStorage.getItem(NAVIGATION_STORAGE_KEY);
    const parsed = rawValue
      ? (JSON.parse(rawValue) as Pick<TaskState, 'activeCategoryId' | 'activeScope' | 'openTabs'> & { routeHistory?: RouteVisit[] })
      : undefined;

    if (!parsed?.openTabs?.length) {
      return undefined;
    }

    const safeState = {
      activeCategoryId: parsed.activeCategoryId ?? '',
      activeScope: parsed.activeScope ?? 'inbox',
      openTabs: parsed.openTabs,
      routeHistory: normalizeRouteHistory(parsed.routeHistory),
    };

    return {
      ...safeState,
      ...getTabNavigationState(safeState),
    };
  } catch {
    return undefined;
  }
};

const sortCategories = (categories: Category[]) => categories;

function getInitialTheme(): AppSettings['theme'] {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return value === 'dark' || value === 'light' ? value : 'light';
}

const persistTheme = (theme: AppSettings['theme']) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
};

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

const getTabNavigationState = (
  state: Pick<TaskState, 'activeCategoryId' | 'activeScope' | 'openTabs'> & { routeHistory?: RouteVisit[] },
) => {
  const activeIndex = getActiveTabIndex(state);

  return {
    canGoBack: activeIndex > 0,
    canGoForward: activeIndex < state.openTabs.length - 1,
    openTabs: state.openTabs,
    routeHistory: state.routeHistory ?? [],
  };
};

const activateRoute = (
  state: Pick<TaskState, 'activeCategoryId' | 'activeScope' | 'openTabs'> & { routeHistory?: RouteVisit[] },
  route: AppRoute,
  recordVisit = true,
): TabStateUpdate => {
  const nextState = {
    activeCategoryId: route.categoryId ?? state.activeCategoryId,
    activeScope: route.scope,
    openTabs: state.openTabs,
    routeHistory: recordVisit ? addRouteVisit(state.routeHistory ?? [], route) : state.routeHistory ?? [],
  };
  persistNavigationState(nextState);

  return {
    ...nextState,
    ...getTabNavigationState(nextState),
  };
};

const openRoute = (
  state: Pick<TaskState, 'activeCategoryId' | 'activeScope' | 'openTabs' | 'routeHistory'>,
  route: AppRoute,
): TabStateUpdate => {
  const openTabs = state.openTabs.some((tab) => isSameRoute(tab, route)) ? state.openTabs : [...state.openTabs, route];
  return activateRoute({ ...state, openTabs }, route);
};

const closeRoute = (
  state: Pick<TaskState, 'activeCategoryId' | 'activeScope' | 'openTabs' | 'routeHistory'>,
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
    persistNavigationState({ ...state, openTabs: safeTabs });
    return getTabNavigationState({ ...state, openTabs: safeTabs });
  }

  return activateRoute({ ...state, openTabs: safeTabs }, fallbackRoute, false);
};

const addRouteVisit = (routeHistory: RouteVisit[], route: AppRoute): RouteVisit[] => {
  const nextVisit: RouteVisit = {
    categoryId: route.scope === 'category' ? route.categoryId : undefined,
    openedAt: new Date().toISOString(),
    scope: route.scope,
  };

  return [nextVisit, ...routeHistory.filter((visit) => !isSameRoute(visit, route))].slice(0, ROUTE_HISTORY_LIMIT);
};

const normalizeRouteHistory = (value: unknown): RouteVisit[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): RouteVisit | undefined => {
      if (!item || typeof item !== 'object') {
        return undefined;
      }

      const visit = item as Partial<RouteVisit>;
      const scope = visit.scope === 'today' || visit.scope === 'week' || visit.scope === 'category' ? visit.scope : 'inbox';
      const openedAt = typeof visit.openedAt === 'string' ? visit.openedAt : undefined;

      if (!openedAt) {
        return undefined;
      }

      return {
        ...(scope === 'category' && typeof visit.categoryId === 'string' ? { categoryId: visit.categoryId } : {}),
        openedAt,
        scope,
      };
    })
    .filter(isRouteVisit)
    .slice(0, ROUTE_HISTORY_LIMIT);
};

const isRouteVisit = (visit: RouteVisit | undefined): visit is RouteVisit => Boolean(visit);

const requireApi = () => {
  if (!window.afterlightApi) {
    throw new Error('Afterlight API is not available outside Electron.');
  }

  return window.afterlightApi;
};
