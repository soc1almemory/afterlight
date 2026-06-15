import { useEffect, useMemo, useState } from 'react';
import type { Category, Task, TaskScope, TelegramBotStatus } from '../../shared/types';
import type { TranslationKey } from '../i18n';
import { useTranslator } from '../i18n';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface SidebarProps {
  onAddCategory: (isFavorite?: boolean) => void;
  onClearTaskHighlight: () => void;
  onEditCategory: (category: Category) => void;
  onMouseEnter?: () => void;
  onOpenInfo: (kind: 'changelog' | 'help') => void;
  onOpenSearch: () => void;
  onOpenSection: () => void;
  onOpenSettings: () => void;
  onOpenTelegramSettings: () => void;
}

const primaryItems: Array<{ icon: string; labelKey: TranslationKey; scope: Exclude<TaskScope, 'category'> }> = [
  { scope: 'inbox', labelKey: 'inbox', icon: 'incoming-icon.svg' },
  { scope: 'today', labelKey: 'today', icon: 'today-icon.svg' },
  { scope: 'week', labelKey: 'week', icon: 'week-icon.svg' },
];

export const Sidebar = ({
  onAddCategory,
  onClearTaskHighlight,
  onEditCategory,
  onMouseEnter,
  onOpenInfo,
  onOpenSearch,
  onOpenSection,
  onOpenSettings,
  onOpenTelegramSettings,
}: SidebarProps) => {
  const [isFavoritesOpen, setFavoritesOpen] = useState(true);
  const [isCategoriesOpen, setCategoriesOpen] = useState(true);
  const [telegramStatus, setTelegramStatus] = useState<TelegramBotStatus | undefined>();
  const activeScope = useTaskStore((state) => state.activeScope);
  const activeCategoryId = useTaskStore((state) => state.activeCategoryId);
  const categories = useTaskStore((state) => state.categories);
  const profile = useTaskStore((state) => state.profile);
  const settings = useTaskStore((state) => state.settings);
  const tasks = useTaskStore((state) => state.tasks);
  const workspace = useTaskStore((state) => state.workspace);
  const setScope = useTaskStore((state) => state.setScope);
  const setActiveCategory = useTaskStore((state) => state.setActiveCategory);
  const t = useTranslator();

  const sortedCategories = useMemo(() => sortCategories(categories, settings.categorySortMode), [categories, settings.categorySortMode]);
  const favoriteCategories = useMemo(() => sortedCategories.filter((category) => category.isFavorite), [sortedCategories]);
  const regularCategories = useMemo(() => sortedCategories.filter((category) => !category.isFavorite), [sortedCategories]);
  const defaultAvatar = assetUrl(settings.theme === 'dark' ? 'default-avatar-dark.png' : 'default-avatar-light.png');
  const hasAuthorizedTelegramChat = telegramStatus?.botMode === 'afterlight'
    ? Boolean(telegramStatus.authorizedChatCount)
    : Boolean(telegramStatus?.chatId);
  const isTelegramConnected = Boolean(telegramStatus?.isRunning && hasAuthorizedTelegramChat);

  useEffect(() => {
    let isMounted = true;

    const loadTelegramStatus = async () => {
      try {
        const status = await window.afterlightApi?.getTelegramStatus();

        if (isMounted && status) {
          setTelegramStatus(status);
        }
      } catch {
        // The bottom menu should stay usable even when Telegram status is unavailable.
      }
    };

    void loadTelegramStatus();
    const intervalId = window.setInterval(loadTelegramStatus, 3000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <aside className="sidebar" onMouseEnter={onMouseEnter}>
      <div className="menu-top-container">
        <div className="user-row">
          <button className="user-profile-button" type="button" onClick={onOpenSettings}>
            <img className="user-avatar" src={profile.avatarDataUrl ?? defaultAvatar} alt="" />
            <span className="user-name-button">
              <span className="user-name">{profile.name}</span>
              <span className="user-workspace">{workspace.title}</span>
            </span>
          </button>
          <button className="create-category-button" type="button" aria-label={t('createCategory')} onClick={() => onAddCategory(false)}>
            <img className="preserve-icon-color" src={assetUrl('create-icon.svg')} alt="" />
          </button>
        </div>

        <button className="search-menu-button" type="button" onClick={onOpenSearch}>
          <img src={assetUrl('search-icon.svg')} alt="" />
          <span>{t('search')}</span>
        </button>

        <nav className="primary-nav" aria-label={t('categories')}>
          {primaryItems.map((item) => {
            const count = getPrimaryCount(item.scope, tasks, settings);

            return (
              <button
                className={activeScope === item.scope ? 'primary-nav-item active' : 'primary-nav-item'}
                key={item.scope}
                type="button"
                onClick={() => {
                  onClearTaskHighlight();
                  setScope(item.scope);
                }}
                onDoubleClick={onOpenSection}
              >
                <img src={assetUrl(item.icon)} alt="" />
                <span>{t(item.labelKey)}</span>
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
          onAddCategory={() => onAddCategory(true)}
          onClearTaskHighlight={onClearTaskHighlight}
          onEditCategory={onEditCategory}
          onOpenSection={onOpenSection}
          onToggle={() => setFavoritesOpen((value) => !value)}
          title={t('favorite')}
          activeCategoryId={activeCategoryId}
          activeScope={activeScope}
          tasks={tasks}
          settings={settings}
          setActiveCategory={setActiveCategory}
        />

        <CategorySection
          categories={regularCategories}
          isOpen={isCategoriesOpen}
          onAddCategory={() => onAddCategory(false)}
          onClearTaskHighlight={onClearTaskHighlight}
          onEditCategory={onEditCategory}
          onOpenSection={onOpenSection}
          onToggle={() => setCategoriesOpen((value) => !value)}
          title={t('categories')}
          activeCategoryId={activeCategoryId}
          activeScope={activeScope}
          tasks={tasks}
          settings={settings}
          setActiveCategory={setActiveCategory}
        />
      </div>

      <div className="bottom-menu" aria-label={t('quickActions')}>
        <div className="bottom-menu-group">
          <button
            className="bottom-menu-button"
            type="button"
            aria-label={t('changelog')}
            onClick={() => onOpenInfo('changelog')}
          >
            <img
              className="preserve-icon-color"
              src={assetUrl(settings.theme === 'dark' ? 'changelog-icon-default-dt.svg' : 'changelog-icon-default.svg')}
              alt=""
            />
          </button>
          <button className="bottom-menu-button" type="button" aria-label={t('help')} onClick={() => onOpenInfo('help')}>
            <img
              className="preserve-icon-color"
              src={assetUrl(settings.theme === 'dark' ? 'help-icon-dt.svg' : 'help-icon.svg')}
              alt=""
            />
          </button>
        </div>
        <div className="bottom-menu-group">
          <button className="bottom-menu-button" type="button" aria-label="Telegram" onClick={onOpenTelegramSettings}>
            <img
              className="preserve-icon-color"
              src={assetUrl(
                isTelegramConnected
                  ? settings.theme === 'dark'
                    ? 'telegram-icon-connected.svg'
                    : 'telegram-icon-connected-light.svg'
                  : settings.theme === 'dark'
                    ? 'telegram-icon-dt.svg'
                    : 'telegram-icon.svg',
              )}
              alt=""
            />
          </button>
          <button className="bottom-menu-button" type="button" aria-label={t('settings')} onClick={onOpenSettings}>
            <img
              className="preserve-icon-color"
              src={assetUrl(settings.theme === 'dark' ? 'settings-icon-dt.svg' : 'settings-icon.svg')}
              alt=""
            />
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
  onClearTaskHighlight,
  onEditCategory,
  onOpenSection,
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
  onClearTaskHighlight: () => void;
  onEditCategory: (category: Category) => void;
  onOpenSection: () => void;
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
          <img src={assetUrl('drop-down-icon.svg')} alt="" />
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
              <button
                className="category-nav-button"
                type="button"
                onClick={() => {
                  onClearTaskHighlight();
                  setActiveCategory(category.id);
                }}
                onDoubleClick={onOpenSection}
              >
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
                <img src={assetUrl('edit-icon.svg')} alt="" />
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
    return countableTasks.filter((task) =>
      task.dueDate ? weekDates.includes(task.dueDate) : task.scope === 'inbox' || task.scope === 'week',
    ).length;
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
