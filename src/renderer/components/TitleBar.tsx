import type { KeyboardEvent } from 'react';
import type { Category, TaskScope } from '../../shared/types';
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

const systemTabMeta: Record<Exclude<TaskScope, 'category'>, { icon: string; label: string }> = {
  inbox: { icon: 'incoming-icon.svg', label: 'Входящие' },
  today: { icon: 'today-icon.svg', label: 'Сегодня' },
  week: { icon: 'week-icon.svg', label: 'Неделя' },
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
          aria-label={isSidebarCollapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'}
          aria-pressed={isSidebarCollapsed}
          onClick={onToggleSidebar}
        >
          <span aria-hidden="true" />
        </button>
      </div>

      {settings.showTabBar ? <div className="tab-navigation">
        <div className="nav-arrows">
          <button type="button" aria-label="Назад" disabled={!canGoBack} onClick={goBack}>
            <img src={assetUrl('left-nav-arrow.svg')} alt="" />
          </button>
          <button type="button" aria-label="Вперёд" disabled={!canGoForward} onClick={goForward}>
            <img src={assetUrl('right-nav-arrow.svg')} alt="" />
          </button>
        </div>

        <div className="tabs-group" role="tablist" aria-label="Открытые вкладки">
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
            />
          ))}
        </div>

        <button className="add-tab-button" type="button" aria-label="Создать категорию" onClick={onAddCategory}>
          <img src={assetUrl('add-icon.svg')} alt="" />
        </button>
      </div> : null}

      <div className="drag-region" />
      <div className="window-actions">
        <button type="button" aria-label="Свернуть" onClick={() => void controls?.minimize()}>
          <img src={assetUrl('Minimize.svg')} alt="" />
        </button>
        <button type="button" aria-label="Развернуть" onClick={() => void controls?.toggleMaximize()}>
          <img src={assetUrl('Maximize.svg')} alt="" />
        </button>
        <button type="button" aria-label="Закрыть" onClick={() => void controls?.close()}>
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
}: {
  activeCategoryId: string;
  activeScope: TaskScope;
  categories: Category[];
  onActivate: (route: AppRoute) => void;
  onClose: (route: AppRoute) => void;
  onMove: (sourceKey: string, targetKey: string) => void;
  route: AppRoute;
}) => {
  const tab = getTabDisplay(route, categories);
  const routeKey = getRouteKey(route);
  const isActive =
    activeScope === route.scope && (route.scope !== 'category' || activeCategoryId === route.categoryId);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate(route);
    }
  };

  return (
    <div
      className={isActive ? 'app-tab active' : 'app-tab'}
      draggable
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
        aria-label={`Закрыть вкладку ${tab.label}`}
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

const getTabDisplay = (route: AppRoute, categories: Category[]) => {
  if (route.scope !== 'category') {
    return systemTabMeta[route.scope];
  }

  const category = categories.find((item) => item.id === route.categoryId);
  return { icon: undefined, label: category?.title ?? 'Категория' };
};

const getRouteKey = (route: AppRoute) => (route.scope === 'category' ? `category:${route.categoryId}` : route.scope);
