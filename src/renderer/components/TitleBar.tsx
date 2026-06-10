import type { KeyboardEvent, MouseEvent } from 'react';
import type { Category, TaskScope } from '../../shared/types';
import type { TranslationKey } from '../i18n';
import { useTranslator } from '../i18n';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface AppRoute {
  categoryId?: string;
  scope: TaskScope;
}

interface TitleBarProps {
  isSidebarCollapsed: boolean;
  onAddCategory: () => void;
  onToggleSidebar: () => void;
}

const systemTabMeta: Record<Exclude<TaskScope, 'category'>, { icon: string; labelKey: TranslationKey }> = {
  inbox: { icon: 'incoming-icon.svg', labelKey: 'inbox' },
  today: { icon: 'today-icon.svg', labelKey: 'today' },
  week: { icon: 'week-icon.svg', labelKey: 'week' },
};

export const TitleBar = ({ isSidebarCollapsed, onAddCategory, onToggleSidebar }: TitleBarProps) => {
  const controls = window.afterlightWindow;
  const activeCategoryId = useTaskStore((state) => state.activeCategoryId);
  const activeScope = useTaskStore((state) => state.activeScope);
  const canGoBack = useTaskStore((state) => state.canGoBack);
  const canGoForward = useTaskStore((state) => state.canGoForward);
  const categories = useTaskStore((state) => state.categories);
  const closeTab = useTaskStore((state) => state.closeTab);
  const goBack = useTaskStore((state) => state.goBack);
  const goForward = useTaskStore((state) => state.goForward);
  const moveTab = useTaskStore((state) => state.moveTab);
  const openTabs = useTaskStore((state) => state.openTabs);
  const settings = useTaskStore((state) => state.settings);
  const setActiveCategory = useTaskStore((state) => state.setActiveCategory);
  const setScope = useTaskStore((state) => state.setScope);
  const t = useTranslator();

  const activateTab = (route: AppRoute) => {
    if (route.scope === 'category' && route.categoryId) {
      setActiveCategory(route.categoryId);
      return;
    }

    if (route.scope !== 'category') {
      setScope(route.scope);
    }
  };

  return (
    <header className="app-titlebar">
      <div className="titlebar-sidebar-tools">
        <img src={assetUrl('afterlight-icon.svg')} alt="" />
        <button
          className={isSidebarCollapsed ? 'titlebar-sidebar-toggle collapsed' : 'titlebar-sidebar-toggle'}
          type="button"
          aria-label={isSidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
          aria-pressed={isSidebarCollapsed}
          onClick={onToggleSidebar}
        >
          <span aria-hidden="true" />
        </button>
      </div>

      {settings.showTabBar ? <div className="tab-navigation">
        <div className="nav-arrows">
          <button type="button" aria-label={t('back')} disabled={!canGoBack} onClick={goBack}>
            <img src={assetUrl('left-nav-arrow.svg')} alt="" />
          </button>
          <button type="button" aria-label={t('forward')} disabled={!canGoForward} onClick={goForward}>
            <img src={assetUrl('right-nav-arrow.svg')} alt="" />
          </button>
        </div>

        <div className="tabs-group" role="tablist" aria-label={t('openTabs')}>
          {openTabs.map((route) => (
            <TabItem
              activeCategoryId={activeCategoryId}
              activeScope={activeScope}
              categories={categories}
              key={getRouteKey(route)}
              onActivate={activateTab}
              onClose={closeTab}
              onMove={moveTab}
              route={route}
              t={t}
            />
          ))}
        </div>

        <button className="add-tab-button" type="button" aria-label={t('createCategory')} onClick={onAddCategory}>
          <img src={assetUrl('add-icon.svg')} alt="" />
        </button>
      </div> : null}

      <div className="drag-region" />
      <div className="window-actions">
        <button type="button" aria-label={t('minimize')} onClick={() => void controls?.minimize()}>
          <img src={assetUrl('Minimize.svg')} alt="" />
        </button>
        <button type="button" aria-label={t('maximize')} onClick={() => void controls?.toggleMaximize()}>
          <img src={assetUrl('Maximize.svg')} alt="" />
        </button>
        <button type="button" aria-label={t('closeWindow')} onClick={() => void controls?.close()}>
          <img src={assetUrl('Close.svg')} alt="" />
        </button>
      </div>
    </header>
  );
};

const TabItem = ({
  activeCategoryId,
  activeScope,
  categories,
  onActivate,
  onClose,
  onMove,
  route,
  t,
}: {
  activeCategoryId: string;
  activeScope: TaskScope;
  categories: Category[];
  onActivate: (route: AppRoute) => void;
  onClose: (route: AppRoute) => void;
  onMove: (sourceKey: string, targetKey: string) => void;
  route: AppRoute;
  t: ReturnType<typeof useTranslator>;
}) => {
  const tab = getTabDisplay(route, categories, t);
  const routeKey = getRouteKey(route);
  const isActive =
    activeScope === route.scope && (route.scope !== 'category' || activeCategoryId === route.categoryId);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate(route);
    }
  };

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button === 1) {
      event.preventDefault();
    }
  };

  const handleAuxClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button === 1) {
      event.preventDefault();
      event.stopPropagation();
      onClose(route);
    }
  };

  return (
    <div
      className={isActive ? 'app-tab active' : 'app-tab'}
      draggable
      onAuxClick={handleAuxClick}
      onClick={() => onActivate(route)}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', routeKey);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onMove(event.dataTransfer.getData('text/plain'), routeKey);
      }}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      role="tab"
      tabIndex={0}
      aria-selected={isActive}
    >
      <span className="tab-title">
        {tab.icon ? <img src={assetUrl(tab.icon)} alt="" /> : <span className="tab-hash">#</span>}
        <span>{tab.label}</span>
      </span>
      <button
        className="tab-close-button"
        type="button"
        aria-label={`${t('close')} ${tab.label}`}
        onClick={(event) => {
          event.stopPropagation();
          onClose(route);
        }}
      >
        <img src={assetUrl('close-icon.svg')} alt="" />
      </button>
    </div>
  );
};

const getTabDisplay = (route: AppRoute, categories: Category[], t: ReturnType<typeof useTranslator>) => {
  if (route.scope !== 'category') {
    const meta = systemTabMeta[route.scope];
    return { icon: meta.icon, label: t(meta.labelKey) };
  }

  const category = categories.find((item) => item.id === route.categoryId);
  return { icon: undefined, label: category?.title ?? t('categories') };
};

const getRouteKey = (route: AppRoute) => (route.scope === 'category' ? `category:${route.categoryId}` : route.scope);
