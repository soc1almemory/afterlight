import type { TaskScope } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface SidebarProps {
  onAddTask: () => void;
}

const primaryItems: Array<{ scope: TaskScope; label: string; icon: string }> = [
  { scope: 'inbox', label: 'Входящие', icon: 'incoming-icon.svg' },
  { scope: 'today', label: 'Сегодня', icon: 'today-icon.svg' },
  { scope: 'week', label: 'Неделя', icon: 'week-icon.svg' },
];

export const Sidebar = ({ onAddTask }: SidebarProps) => {
  const activeScope = useTaskStore((state) => state.activeScope);
  const activeCategoryId = useTaskStore((state) => state.activeCategoryId);
  const categories = useTaskStore((state) => state.categories);
  const setScope = useTaskStore((state) => state.setScope);
  const setActiveCategory = useTaskStore((state) => state.setActiveCategory);

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src={assetUrl('afterlight-icon.svg')} alt="" />
        <span>Afterlight</span>
      </div>

      <button className="create-task-button" type="button" onClick={onAddTask}>
        <img src={assetUrl('add-task-icon.svg')} alt="" />
        <span>Добавить задачу</span>
      </button>

      <nav className="nav-section" aria-label="Основные разделы">
        {primaryItems.map((item) => (
          <button
            className={activeScope === item.scope ? 'nav-item active' : 'nav-item'}
            key={item.scope}
            type="button"
            onClick={() => setScope(item.scope)}
          >
            <img src={assetUrl(item.icon)} alt="" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="category-section">
        <div className="section-heading">
          <span>Категории</span>
          <button type="button" aria-label="Создать категорию">
            <img src={assetUrl('add-icon.svg')} alt="" />
          </button>
        </div>
        {categories.map((category) => (
          <button
            className={activeScope === 'category' && activeCategoryId === category.id ? 'nav-item active' : 'nav-item'}
            key={category.id}
            type="button"
            onClick={() => setActiveCategory(category.id)}
          >
            <span className="category-dot" style={{ backgroundColor: category.color }} />
            <span>{category.title}</span>
            {category.isFavorite ? <img className="favorite-icon" src={assetUrl('star-empty.svg')} alt="" /> : null}
          </button>
        ))}
      </div>

      <button className="settings-button" type="button">
        <img src={assetUrl('settings-icon.svg')} alt="" />
        <span>Настройки</span>
      </button>
    </aside>
  );
};
