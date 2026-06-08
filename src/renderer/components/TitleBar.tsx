import type { TaskScope } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface TitleBarProps {
  onAddCategory: () => void;
}

const systemTabs: Array<{ icon: string; label: string; scope: Exclude<TaskScope, 'category'> }> = [
  { icon: 'incoming-icon.svg', label: 'Входящие', scope: 'inbox' },
  { icon: 'today-icon.svg', label: 'Сегодня', scope: 'today' },
  { icon: 'week-icon.svg', label: 'Неделя', scope: 'week' },
];

export const TitleBar = ({ onAddCategory }: TitleBarProps) => {
  const controls = window.afterlightWindow;
  const activeCategoryId = useTaskStore((state) => state.activeCategoryId);
  const activeScope = useTaskStore((state) => state.activeScope);
  const canGoBack = useTaskStore((state) => state.canGoBack);
  const canGoForward = useTaskStore((state) => state.canGoForward);
  const categories = useTaskStore((state) => state.categories);
  const goBack = useTaskStore((state) => state.goBack);
  const goForward = useTaskStore((state) => state.goForward);
  const setScope = useTaskStore((state) => state.setScope);
  const activeCategory = categories.find((category) => category.id === activeCategoryId);

  return (
    <header className="app-titlebar">
      <div className="titlebar-sidebar-tools">
        <img src={assetUrl('afterlight-icon.svg')} alt="" />
        <span className="titlebar-sidebar-toggle" aria-hidden="true" />
      </div>

      <div className="tab-navigation">
        <div className="nav-arrows">
          <button type="button" aria-label="Назад" disabled={!canGoBack} onClick={goBack}>
            <img src={assetUrl('left-nav-arrow.svg')} alt="" />
          </button>
          <button type="button" aria-label="Вперёд" disabled={!canGoForward} onClick={goForward}>
            <img src={assetUrl('right-nav-arrow.svg')} alt="" />
          </button>
        </div>

        <div className="tabs-group" role="tablist" aria-label="Открытые разделы">
          {systemTabs.map((tab) => (
            <button
              className={activeScope === tab.scope ? 'app-tab active' : 'app-tab'}
              key={tab.scope}
              type="button"
              role="tab"
              aria-selected={activeScope === tab.scope}
              onClick={() => setScope(tab.scope)}
            >
              <span className="tab-title">
                <img src={assetUrl(tab.icon)} alt="" />
                <span>{tab.label}</span>
              </span>
              <img className="tab-close-icon" src={assetUrl('close-icon.svg')} alt="" />
            </button>
          ))}

          {activeScope === 'category' && activeCategory ? (
            <button className="app-tab active" type="button" role="tab" aria-selected="true">
              <span className="tab-title">
                <span className="tab-hash">#</span>
                <span>{activeCategory.title}</span>
              </span>
              <img className="tab-close-icon" src={assetUrl('close-icon.svg')} alt="" />
            </button>
          ) : null}
        </div>

        <button className="add-tab-button" type="button" aria-label="Создать категорию" onClick={onAddCategory}>
          <img src={assetUrl('add-icon.svg')} alt="" />
        </button>
      </div>

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
