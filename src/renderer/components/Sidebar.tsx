import type { Category, TaskScope } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface SidebarProps {
  onAddCategory: () => void;
  onAddTask: () => void;
  onEditCategory: (category: Category) => void;
  onOpenSettings: () => void;
}

const primaryItems: Array<{ scope: TaskScope; label: string; icon: string }> = [
  { scope: 'inbox', label: 'Входящие', icon: 'incoming-icon.svg' },
  { scope: 'today', label: 'Сегодня', icon: 'today-icon.svg' },
  { scope: 'week', label: 'Неделя', icon: 'week-icon.svg' },
];

export const Sidebar = ({ onAddCategory, onAddTask, onEditCategory, onOpenSettings }: SidebarProps) => {
  const activeScope = useTaskStore((state) => state.activeScope);
  const activeCategoryId = useTaskStore((state) => state.activeCategoryId);
  const categories = useTaskStore((state) => state.categories);
  const tasks = useTaskStore((state) => state.tasks);
  const setScope = useTaskStore((state) => state.setScope);
  const setActiveCategory = useTaskStore((state) => state.setActiveCategory);
  const toggleCategoryFavorite = useTaskStore((state) => state.toggleCategoryFavorite);

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
          <button type="button" aria-label="Создать категорию" onClick={onAddCategory}>
            <img src={assetUrl('add-icon.svg')} alt="" />
          </button>
        </div>
        {categories.map((category) => {
          const taskCount = tasks.filter((task) => task.categoryId === category.id).length;

          return (
            <div
              className={
                activeScope === 'category' && activeCategoryId === category.id
                  ? 'category-nav-row active'
                  : 'category-nav-row'
              }
              key={category.id}
            >
              <button className="category-nav-button" type="button" onClick={() => setActiveCategory(category.id)}>
                <span className="category-dot" style={{ backgroundColor: category.color }} />
                <span className="category-name">{category.title}</span>
                <span className="category-count">{taskCount}</span>
              </button>
              <button
                className="category-icon-button"
                type="button"
                aria-label={category.isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                onClick={() => void toggleCategoryFavorite(category.id)}
              >
                <img src={assetUrl(category.isFavorite ? 'control-bar-star.svg' : 'star-empty.svg')} alt="" />
              </button>
              <button
                className="category-icon-button"
                type="button"
                aria-label="Редактировать категорию"
                onClick={() => onEditCategory(category)}
              >
                <img src={assetUrl('add-edit-icon-container.svg')} alt="" />
              </button>
            </div>
          );
        })}
      </div>

      <button className="settings-button" type="button" onClick={onOpenSettings}>
        <img src={assetUrl('settings-icon.svg')} alt="" />
        <span>Настройки</span>
      </button>
    </aside>
  );
};
