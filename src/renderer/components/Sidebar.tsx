import { useMemo, useState } from 'react';
import type { Category, Task, TaskScope } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface SidebarProps {
  onAddCategory: () => void;
  onEditCategory: (category: Category) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
}

const primaryItems: Array<{ icon: string; label: string; scope: Exclude<TaskScope, 'category'> }> = [
  { scope: 'inbox', label: 'Входящие', icon: 'incoming-icon.svg' },
  { scope: 'today', label: 'Сегодня', icon: 'today-icon.svg' },
  { scope: 'week', label: 'Неделя', icon: 'week-icon.svg' },
];

export const Sidebar = ({ onAddCategory, onEditCategory, onOpenSearch, onOpenSettings }: SidebarProps) => {
  const [isFavoritesOpen, setFavoritesOpen] = useState(true);
  const [isCategoriesOpen, setCategoriesOpen] = useState(true);
  const activeScope = useTaskStore((state) => state.activeScope);
  const activeCategoryId = useTaskStore((state) => state.activeCategoryId);
  const categories = useTaskStore((state) => state.categories);
  const profile = useTaskStore((state) => state.profile);
  const tasks = useTaskStore((state) => state.tasks);
  const workspace = useTaskStore((state) => state.workspace);
  const setScope = useTaskStore((state) => state.setScope);
  const setActiveCategory = useTaskStore((state) => state.setActiveCategory);

  const favoriteCategories = useMemo(() => categories.filter((category) => category.isFavorite), [categories]);
  const regularCategories = useMemo(() => categories.filter((category) => !category.isFavorite), [categories]);

  return (
    <aside className="sidebar">
      <div className="menu-top-container">
        <div className="user-row">
          <img className="user-avatar" src={profile.avatarDataUrl ?? assetUrl('avatar.svg')} alt="" />
          <button className="user-name-button" type="button">
            <span className="user-name">{profile.name}</span>
            <span className="user-workspace">{workspace.title}</span>
            <span className="user-chevron" aria-hidden="true" />
          </button>
          <button className="create-category-button" type="button" aria-label="Создать категорию" onClick={onAddCategory}>
            <img src={assetUrl('create-icon.svg')} alt="" />
          </button>
        </div>

        <button className="search-menu-button" type="button" onClick={onOpenSearch}>
          <img src={assetUrl('search-icon.svg')} alt="" />
          <span>Поиск</span>
        </button>

        <nav className="primary-nav" aria-label="Основные разделы">
          {primaryItems.map((item) => {
            const count = getPrimaryCount(item.scope, tasks);

            return (
              <button
                className={activeScope === item.scope ? 'primary-nav-item active' : 'primary-nav-item'}
                key={item.scope}
                type="button"
                onClick={() => setScope(item.scope)}
              >
                <img src={assetUrl(item.icon)} alt="" />
                <span>{item.label}</span>
                {count > 0 ? <span className={`primary-count ${getPrimaryCountClass(count)}`}>{formatCount(count)}</span> : null}
              </button>
            );
          })}
        </nav>

        <CategorySection
          categories={favoriteCategories}
          icon="favorite-container-star.svg"
          isOpen={isFavoritesOpen}
          onAddCategory={onAddCategory}
          onEditCategory={onEditCategory}
          onToggle={() => setFavoritesOpen((value) => !value)}
          title="Избранное"
          activeCategoryId={activeCategoryId}
          activeScope={activeScope}
          tasks={tasks}
          setActiveCategory={setActiveCategory}
        />

        <CategorySection
          categories={regularCategories}
          isOpen={isCategoriesOpen}
          onAddCategory={onAddCategory}
          onEditCategory={onEditCategory}
          onToggle={() => setCategoriesOpen((value) => !value)}
          title="Категории"
          activeCategoryId={activeCategoryId}
          activeScope={activeScope}
          tasks={tasks}
          setActiveCategory={setActiveCategory}
        />
      </div>

      <div className="bottom-menu" aria-label="Быстрые действия">
        <div className="bottom-menu-group">
          <button className="bottom-menu-button" type="button" aria-label="История изменений">
            <img src={assetUrl('changelog-icon.svg')} alt="" />
          </button>
          <button className="bottom-menu-button" type="button" aria-label="Помощь">
            <img src={assetUrl('help-icon.svg')} alt="" />
          </button>
        </div>
        <div className="bottom-menu-group">
          <button className="bottom-menu-button" type="button" aria-label="Telegram">
            <img src={assetUrl('telegram-icon.svg')} alt="" />
          </button>
          <button className="bottom-menu-button" type="button" aria-label="Настройки" onClick={onOpenSettings}>
            <img src={assetUrl('settings-icon.svg')} alt="" />
          </button>
        </div>
      </div>
    </aside>
  );
};

const CategorySection = ({
  activeCategoryId,
  activeScope,
  categories,
  icon,
  isOpen,
  onAddCategory,
  onEditCategory,
  onToggle,
  setActiveCategory,
  tasks,
  title,
}: {
  activeCategoryId: string;
  activeScope: TaskScope;
  categories: Category[];
  icon?: string;
  isOpen: boolean;
  onAddCategory: () => void;
  onEditCategory: (category: Category) => void;
  onToggle: () => void;
  setActiveCategory: (categoryId: string) => void;
  tasks: Task[];
  title: string;
}) => (
  <section className="menu-category-section">
    <div className="menu-section-heading">
      <button className="menu-section-title" type="button" onClick={onToggle} aria-expanded={isOpen}>
        {icon ? <img src={assetUrl(icon)} alt="" /> : null}
        <span>{title}</span>
      </button>
      <div className="menu-section-actions">
        <button className={isOpen ? 'section-toggle open' : 'section-toggle'} type="button" aria-label="Свернуть раздел" onClick={onToggle}>
          <span aria-hidden="true" />
        </button>
        <button type="button" aria-label="Создать категорию" onClick={onAddCategory}>
          <img src={assetUrl('add-icon.svg')} alt="" />
        </button>
      </div>
    </div>

    {isOpen ? (
      <div className="category-list">
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
                <CategoryMarker category={category} />
                <span className="category-name">{category.title}</span>
                <span className="category-count">{taskCount}</span>
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
    ) : null}
  </section>
);

const CategoryMarker = ({ category }: { category: Category }) => {
  if (category.iconMode === 'emoji' && category.emoji) {
    return <span className="category-emoji">{category.emoji}</span>;
  }

  if (category.iconMode === 'hash') {
    return <span className="category-hash">#</span>;
  }

  return <span className="category-dot" style={{ backgroundColor: category.color }} />;
};

const getPrimaryCount = (scope: Exclude<TaskScope, 'category'>, tasks: Task[]) => {
  if (scope === 'today') {
    return tasks.filter((task) => task.dueDate === getTodayDate() || isActiveOverdueTask(task) || task.scope === 'today').length;
  }

  if (scope === 'week') {
    const weekDates = getCurrentWeekDates();
    return tasks.filter((task) => task.scope === 'week' || Boolean(task.dueDate && weekDates.includes(task.dueDate))).length;
  }

  return tasks.filter((task) => task.scope === 'inbox').length;
};

const getPrimaryCountClass = (count: number) => {
  if (count >= 31) {
    return 'critical';
  }

  if (count >= 16) {
    return 'high';
  }

  if (count >= 6) {
    return 'medium';
  }

  return 'low';
};

const formatCount = (count: number) => (count > 99 ? '99+' : String(count));

const isActiveOverdueTask = (task: Task) =>
  task.status === 'active' && Boolean(task.dueDate && task.dueDate < getTodayDate());

const getCurrentWeekDates = () => {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_item, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return getDateInputValue(date);
  });
};

const getTodayDate = () => getDateInputValue(new Date());

const getDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
