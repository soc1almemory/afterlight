import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppUpdateStatus, Category, Task } from '../shared/types';
import { CategoryDialog } from './components/CategoryDialog';
import { ContentView } from './components/ContentView';
import { InfoDialog } from './components/InfoDialog';
import { ProfileSetup } from './components/ProfileSetup';
import { SearchDialog } from './components/SearchDialog';
import { SettingsDialog } from './components/SettingsDialog';
import type { SettingsPage } from './components/SettingsDialog';
import { Sidebar } from './components/Sidebar';
import { TaskDialog } from './components/TaskDialog';
import { TitleBar } from './components/TitleBar';
import { useTranslator } from './i18n';
import { assetUrl } from './lib/assets';
import { useTaskStore } from './store/useTaskStore';

type AppViewMode = 'app' | 'loading' | 'setup';
type AppTransitionDirection = 'app-to-setup' | 'direct' | 'setup-to-app';
const UPDATE_TOAST_EXIT_MS = 180;

export const App = () => {
  const [isTaskDialogOpen, setTaskDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [initialTaskDate, setInitialTaskDate] = useState<string | undefined>();
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialPage, setSettingsInitialPage] = useState<SettingsPage>('account');
  const [infoDialog, setInfoDialog] = useState<'changelog' | 'help' | undefined>();
  const [updateStatus, setUpdateStatus] = useState<AppUpdateStatus | undefined>();
  const [dismissedUpdateStatus, setDismissedUpdateStatus] = useState<string | undefined>();
  const [closingUpdateToastKey, setClosingUpdateToastKey] = useState<string | undefined>();
  const updateToastCloseTimer = useRef<number | undefined>(undefined);
  const activeScope = useTaskStore((state) => state.activeScope);
  const hasHydrated = useTaskStore((state) => state.hasHydrated);
  const hydrate = useTaskStore((state) => state.hydrate);
  const profile = useTaskStore((state) => state.profile);
  const settings = useTaskStore((state) => state.settings);
  const setScope = useTaskStore((state) => state.setScope);
  const t = useTranslator();
  const currentViewMode: AppViewMode = !hasHydrated ? 'loading' : profile.isSetupComplete ? 'app' : 'setup';
  const [displayViewMode, setDisplayViewMode] = useState<AppViewMode>(currentViewMode);
  const [leavingViewMode, setLeavingViewMode] = useState<AppViewMode | undefined>();
  const [transitionDirection, setTransitionDirection] = useState<AppTransitionDirection>('direct');

  const openCreateDialog = useCallback((dueDate?: string) => {
    setEditingTask(undefined);
    setInitialTaskDate(dueDate);
    setTaskDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((task: Task) => {
    setEditingTask(task);
    setInitialTaskDate(undefined);
    setTaskDialogOpen(true);
  }, []);

  const closeDialog = () => {
    setTaskDialogOpen(false);
    setEditingTask(undefined);
    setInitialTaskDate(undefined);
  };

  const openCreateCategoryDialog = () => {
    setEditingCategory(undefined);
    setCategoryDialogOpen(true);
  };

  const openEditCategoryDialog = (category: Category) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const closeCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setEditingCategory(undefined);
  };

  const openSettings = (page: SettingsPage = 'account') => {
    setSettingsInitialPage(page);
    setSettingsOpen(true);
  };

  const pageClass = useMemo(() => {
    if (!profile.isSetupComplete) return 'page-setup';
    if (activeScope === 'today') return 'page-today';
    if (activeScope === 'week') return 'page-week';
    if (activeScope === 'category') return 'page-category-page';
    return 'page-inbox';
  }, [activeScope, profile.isSetupComplete]);

  useEffect(() => {
    document.body.className = `${pageClass} theme-${settings.theme}`;
  }, [pageClass, settings.theme]);

  useEffect(() => {
    if (currentViewMode === displayViewMode) {
      return undefined;
    }

    if (currentViewMode === 'loading' || displayViewMode === 'loading') {
      setDisplayViewMode(currentViewMode);
      setLeavingViewMode(undefined);
      setTransitionDirection('direct');
      return undefined;
    }

    setLeavingViewMode(displayViewMode);
    setDisplayViewMode(currentViewMode);
    setTransitionDirection(displayViewMode === 'setup' && currentViewMode === 'app' ? 'setup-to-app' : 'app-to-setup');

    const timerId = window.setTimeout(() => {
      setLeavingViewMode(undefined);
      setTransitionDirection('direct');
    }, 520);

    return () => window.clearTimeout(timerId);
  }, [currentViewMode, displayViewMode]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const unsubscribeData = window.afterlightApi?.onDataChanged(() => {
      void hydrate();
    });
    void window.afterlightApi?.getUpdateStatus().then(setUpdateStatus);
    const unsubscribeUpdateStatus = window.afterlightApi?.onUpdateStatus((status) => {
      if (updateToastCloseTimer.current) {
        window.clearTimeout(updateToastCloseTimer.current);
        updateToastCloseTimer.current = undefined;
      }

      setUpdateStatus(status);
      setDismissedUpdateStatus(undefined);
      setClosingUpdateToastKey(undefined);
    });
    const unsubscribeQuickAction = window.afterlightWindow?.onQuickAction((action) => {
      if (action === 'add-task') {
        openCreateDialog();
        return;
      }

      if (action === 'today') {
        setScope('today');
        return;
      }

      if (action === 'week') {
        setScope('week');
      }
    });

    return () => {
      unsubscribeData?.();
      unsubscribeUpdateStatus?.();
      unsubscribeQuickAction?.();
    };
  }, [hydrate, openCreateDialog, setScope]);

  useEffect(() => {
    if (!hasHydrated || !profile.isSetupComplete) {
      return;
    }

    void window.afterlightWindow?.setFullScreen(settings.openMode === 'fullscreen');
  }, [hasHydrated, profile.isSetupComplete, settings.openMode]);

  useEffect(
    () => () => {
      if (updateToastCloseTimer.current) {
        window.clearTimeout(updateToastCloseTimer.current);
      }
    },
    [],
  );

  const appClassName = [
    'afterlight-app',
    `theme-${settings.theme}`,
    isSidebarCollapsed ? 'sidebar-collapsed' : '',
    settings.autoCollapseSidebar ? 'auto-sidebar' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const updateToastKey = updateStatus ? `${updateStatus.status}:${updateStatus.releaseName ?? ''}` : undefined;
  const shouldShowUpdateToast =
    updateStatus && updateToastKey !== dismissedUpdateStatus && updateStatus.status === 'downloaded';
  const closeUpdateToast = useCallback(() => {
    if (!updateToastKey || closingUpdateToastKey === updateToastKey) {
      return;
    }

    if (updateToastCloseTimer.current) {
      window.clearTimeout(updateToastCloseTimer.current);
    }

    setClosingUpdateToastKey(updateToastKey);
    updateToastCloseTimer.current = window.setTimeout(() => {
      setDismissedUpdateStatus(updateToastKey);
      setClosingUpdateToastKey(undefined);
      updateToastCloseTimer.current = undefined;
    }, UPDATE_TOAST_EXIT_MS);
  }, [closingUpdateToastKey, updateToastKey]);

  const renderView = (mode: AppViewMode) => {
    if (mode === 'loading') {
      return (
      <div className={`app-loading theme-${settings.theme}`} role="status" aria-label={t('loadingApp')}>
        <span className="app-loading-spinner" />
      </div>
      );
    }

    if (mode === 'setup') {
      return <ProfileSetup />;
    }

    return (
      <div
        className={appClassName}
        onMouseMove={(event) => {
          if (!settings.autoCollapseSidebar) {
            return;
          }

          const target = event.target as HTMLElement;
          if (target.closest('.sidebar')) {
            setSidebarCollapsed(false);
            return;
          }

          if (target.closest('.workspace')) {
            setSidebarCollapsed(true);
          }
        }}
      >
        <TitleBar
          isSidebarCollapsed={isSidebarCollapsed}
          onAddCategory={openCreateCategoryDialog}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
        />
        <Sidebar
          onAddCategory={openCreateCategoryDialog}
          onEditCategory={openEditCategoryDialog}
          onMouseEnter={() => {
            if (settings.autoCollapseSidebar) {
              setSidebarCollapsed(false);
            }
          }}
          onOpenInfo={setInfoDialog}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenSettings={() => openSettings()}
          onOpenTelegramSettings={() => openSettings('telegram')}
        />
        <ContentView
          onAddTask={openCreateDialog}
          onEditTask={openEditDialog}
          onMouseEnter={() => {
            if (settings.autoCollapseSidebar) {
              setSidebarCollapsed(true);
            }
          }}
        />
        <TaskDialog isOpen={isTaskDialogOpen} task={editingTask} initialDueDate={initialTaskDate} onClose={closeDialog} />
        <CategoryDialog isOpen={isCategoryDialogOpen} category={editingCategory} onClose={closeCategoryDialog} />
        <SearchDialog isOpen={isSearchOpen} onClose={() => setSearchOpen(false)} onEditTask={openEditDialog} />
        <SettingsDialog initialPage={settingsInitialPage} isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
        {infoDialog ? <InfoDialog kind={infoDialog} onClose={() => setInfoDialog(undefined)} /> : null}
        {shouldShowUpdateToast ? (
          <div
            className={`update-toast${closingUpdateToastKey === updateToastKey ? ' closing' : ''}`}
            role="status"
            aria-live="polite"
          >
            <button
              className="update-toast-close"
              type="button"
              aria-label={t('close')}
              onClick={closeUpdateToast}
            >
              <img src={assetUrl('popup-close-icon.svg')} alt="" />
            </button>
            <div className="update-toast-copy">
              <strong>{t('updateReadyTitle')}</strong>
              <span>{t('updateReadyBody', { version: updateStatus.releaseName ?? t('updateNewVersion') })}</span>
            </div>
            <button
              className="settings-save-button update-toast-action"
              type="button"
              onClick={() => window.afterlightApi?.installUpdate()}
            >
              {t('updateRestart')}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className={`app-transition-root theme-${settings.theme} transition-${transitionDirection}`}>
      {leavingViewMode ? (
        <div className={`app-screen app-screen-${leavingViewMode} app-screen-leaving`} aria-hidden="true">
          {renderView(leavingViewMode)}
        </div>
      ) : null}
      <div className={`app-screen app-screen-${displayViewMode} app-screen-active`}>{renderView(displayViewMode)}</div>
    </div>
  );
};
