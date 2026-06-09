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
  const settings = useTaskStore((state) => state.settings);
  const tasks = useTaskStore((state) => state.tasks);
  const workspace = useTaskStore((state) => state.workspace);
  const setScope = useTaskStore((state) => state.setScope);
  const setActiveCategory = useTaskStore((state) => state.setActiveCategory);

  const sortedCategories = useMemo(() => sortCategories(categories, settings.categorySortMode), [categories, settings.categorySortMode]);
  const favoriteCategories = useMemo(() => sortedCategories.filter((category) => category.isFavorite), [sortedCategories]);
  const regularCategories = useMemo(() => sortedCategories.filter((category) => !category.isFavorite), [sortedCategories]);

  return (
    <aside className="sidebar">
      <div className="menu-top-container">
        <div className="user-row">
          <img className="user-avatar" src={profile.avatarDataUrl ?? assetUrl('default-avatar-light.png')} alt="" />
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
            const count = getPrimaryCount(item.scope, tasks, settings);

            return (
              <button
                className={activeScope === item.scope ? 'primary-nav-item active' : 'primary-nav-item'}
                key={item.scope}
                type="button"
                onClick={() => setScope(item.scope)}
              >
                <img src={assetUrl(item.icon)} alt="" />
                <span>{item.label}</span>
                {settings.showSidebarCounts && count > 0 ? (
                  <span className={`primary-count ${getPrimaryCountClass(count, settings)}`}>{formatCount(count)}</span>
                ) : null}
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
          settings={settings}
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
          settings={settings}
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
  settings,
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
  settings: ReturnType<typeof useTaskStore.getState>['settings'];
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
          const taskCount = tasks.filter((task) =>
            task.categoryId === category.id && (settings.countCompletedTasks || task.status !== 'completed'),
          ).length;

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
                {settings.showCategoryCounts ? <span className="category-count">{taskCount}</span> : null}
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

const getPrimaryCount = (
  scope: Exclude<TaskScope, 'category'>,
  tasks: Task[],
  settings: ReturnType<typeof useTaskStore.getState>['settings'],
) => {
  const countableTasks = settings.countCompletedTasks ? tasks : tasks.filter((task) => task.status !== 'completed');

  if (scope === 'today') {
    return countableTasks.filter((task) =>
      (settings.includeTodayDueTasks && task.dueDate === getTodayDate(settings.todayRefreshTime)) ||
      isActiveOverdueTask(task, settings) ||
      task.scope === 'today',
    ).length;
  }

  if (scope === 'week') {
    const weekDates = getCurrentWeekDates();
    return countableTasks.filter((task) => task.scope === 'week' || Boolean(task.dueDate && weekDates.includes(task.dueDate))).length;
  }

  return countableTasks.filter((task) => task.scope === 'inbox').length;
};

const getPrimaryCountClass = (count: number, settings: ReturnType<typeof useTaskStore.getState>['settings']) => {
  if (count >= settings.counterCriticalAt) {
    return 'critical';
  }

  if (count >= settings.counterHighAt) {
    return 'high';
  }

  if (count >= settings.counterMediumAt) {
    return 'medium';
  }

  return 'low';
};

const formatCount = (count: number) => (count > 99 ? '99+' : String(count));

const sortCategories = (
  categories: Category[],
  mode: ReturnType<typeof useTaskStore.getState>['settings']['categorySortMode'],
) => {
  if (mode === 'alphabetical') {
    return [...categories].sort((first, second) => first.title.localeCompare(second.title, 'ru-RU'));
  }

  if (mode === 'favorites') {
    return [...categories].sort((first, second) => Number(second.isFavorite) - Number(first.isFavorite));
  }

  return categories;
};

const isActiveOverdueTask = (task: Task, settings: ReturnType<typeof useTaskStore.getState>['settings']) =>
  task.status === 'active' && Boolean(task.dueDate && task.dueDate < getTodayDate(settings.todayRefreshTime));

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

const getTodayDate = (refreshTime?: string) => {
  const date = new Date();

  if (refreshTime) {
    const [hours, minutes] = refreshTime.split(':').map((part) => Number.parseInt(part, 10));
    const refreshMoment = new Date(date);
    refreshMoment.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);

    if (date.getTime() < refreshMoment.getTime()) {
      date.setDate(date.getDate() - 1);
    }
  }

  return getDateInputValue(date);
};

const getDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
