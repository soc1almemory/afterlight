import { useEffect, useMemo, useState } from 'react';
import type { Category, Task, TaskScope } from '../../shared/types';
import type { TranslationKey } from '../i18n';
import { useTranslator } from '../i18n';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface SearchDialogProps {
  isOpen: boolean;
  onClearTaskHighlight: () => void;
  onClose: () => void;
  onOpenSection: () => void;
  onOpenTask: (taskId: string) => void;
}

interface SearchItem {
  category?: Category;
  id: string;
  icon?: string;
  kind: 'category' | 'scope' | 'task';
  label: string;
  meta?: string;
  onSelect: () => void;
}

const scopeItems: Array<{ icon: string; labelKey: TranslationKey; scope: TaskScope }> = [
  { icon: 'search-incoming-icon.svg', labelKey: 'inbox', scope: 'inbox' },
  { icon: 'seartch-today-icon.svg', labelKey: 'today', scope: 'today' },
  { icon: 'search-week-icon.svg', labelKey: 'week', scope: 'week' },
];

export const SearchDialog = ({
  isOpen,
  onClearTaskHighlight,
  onClose,
  onOpenSection,
  onOpenTask,
}: SearchDialogProps) => {
  const [query, setQuery] = useState('');
  const categories = useTaskStore((state) => state.categories);
  const profile = useTaskStore((state) => state.profile);
  const routeHistory = useTaskStore((state) => state.routeHistory);
  const setActiveCategory = useTaskStore((state) => state.setActiveCategory);
  const setScope = useTaskStore((state) => state.setScope);
  const settings = useTaskStore((state) => state.settings);
  const tasks = useTaskStore((state) => state.tasks);
  const t = useTranslator();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const searchItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');
    const allItems: SearchItem[] = [
      ...scopeItems.map((item) => ({
        id: `scope-${item.scope}`,
        icon: item.icon,
        kind: 'scope' as const,
        label: t(item.labelKey),
        meta: getScopeMeta(item.scope, tasks, settings.todayRefreshTime),
        onSelect: () => {
          onClearTaskHighlight();
          setScope(item.scope);
          onOpenSection();
          onClose();
        },
      })),
      ...categories.map((category) => ({
        category,
        id: `category-${category.id}`,
        kind: 'category' as const,
        label: category.title,
        meta: formatUpdatedAt(category.updatedAt),
        onSelect: () => {
          onClearTaskHighlight();
          setActiveCategory(category.id);
          onOpenSection();
          onClose();
        },
      })),
      ...tasks.map((task) => ({
        id: `task-${task.id}`,
        icon: settings.theme === 'dark' ? 'checkbox-icon-dt.svg' : 'checkbox-icon.svg',
        kind: 'task' as const,
        label: task.title,
        meta: formatUpdatedAt(task.updatedAt),
        onSelect: () => {
          if (task.categoryId) {
            setActiveCategory(task.categoryId);
          } else {
            setScope(task.scope === 'category' ? 'inbox' : task.scope);
          }

          onOpenTask(task.id);
          onClose();
        },
      })),
    ];

    if (!normalizedQuery) {
      return [];
    }

    return allItems.filter((item) => {
      const haystack = `${item.label} ${item.meta ?? ''}`.toLocaleLowerCase('ru-RU');
      return haystack.includes(normalizedQuery);
    });
  }, [
    categories,
    onClearTaskHighlight,
    onClose,
    onOpenSection,
    onOpenTask,
    query,
    setActiveCategory,
    setScope,
    settings.theme,
    t,
    tasks,
  ]);

  const historyItems = useMemo(
    () =>
      routeHistory
        .map((visit): SearchItem | undefined => {
          if (visit.scope === 'category') {
            const category = categories.find((item) => item.id === visit.categoryId);

            if (!category) {
              return undefined;
            }

            return {
              category,
              id: `history-category-${category.id}`,
              kind: 'category' as const,
              label: category.title,
              meta: formatUpdatedAt(visit.openedAt),
              onSelect: () => {
                onClearTaskHighlight();
                setActiveCategory(category.id);
                onOpenSection();
                onClose();
              },
            };
          }

          const scopeItem = scopeItems.find((item) => item.scope === visit.scope);

          if (!scopeItem) {
            return undefined;
          }

          return {
            id: `history-scope-${visit.scope}`,
            icon: scopeItem.icon,
            kind: 'scope' as const,
            label: t(scopeItem.labelKey),
            meta: formatUpdatedAt(visit.openedAt),
            onSelect: () => {
              onClearTaskHighlight();
              setScope(visit.scope);
              onOpenSection();
              onClose();
            },
          };
        })
        .filter(isSearchItem),
    [categories, onClearTaskHighlight, onClose, onOpenSection, routeHistory, setActiveCategory, setScope, t],
  );

  if (!isOpen) {
    return null;
  }

  const hasQuery = query.trim().length > 0;
  const recentItems = hasQuery ? searchItems.slice(0, 8) : historyItems.slice(0, 4);
  const olderHistoryItems = hasQuery ? [] : historyItems.slice(4, 12);

  return (
    <div className="search-overlay" role="presentation" onMouseDown={onClose}>
      <section className="search-dialog" aria-label={t('search')} onMouseDown={(event) => event.stopPropagation()}>
        <div className="search-input-row">
          <img src={assetUrl('popup-search-icon.svg')} alt="" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchPlaceholder', { name: profile.name })}
          />
        </div>

        <SearchGroup title={hasQuery ? t('results') : t('recent')} items={recentItems} emptyLabel={t('nothingFound')} />
        {olderHistoryItems.length > 0 ? (
          <SearchGroup isScrollable title={t('history')} items={olderHistoryItems} emptyLabel={t('nothingFound')} />
        ) : null}
      </section>
    </div>
  );
};

const SearchGroup = ({
  emptyLabel,
  isScrollable = false,
  items,
  title,
}: {
  emptyLabel: string;
  isScrollable?: boolean;
  items: SearchItem[];
  title: string;
}) => (
  <div className={isScrollable ? 'search-group history' : 'search-group'}>
    <div className="search-group-title">{title}</div>
    {items.length > 0 ? (
      items.map((item) => <SearchResultButton item={item} key={item.id} />)
    ) : (
      <div className="search-empty">{emptyLabel}</div>
    )}
  </div>
);

const isSearchItem = (item: SearchItem | undefined): item is SearchItem => Boolean(item);

const SearchResultButton = ({ item }: { item: SearchItem }) => (
  <button className="search-result" type="button" onClick={item.onSelect}>
    <span className="search-result-title">
      <SearchResultIcon item={item} />
      <span>{item.label}</span>
    </span>
    {item.meta ? <span className="search-result-meta">{item.meta}</span> : null}
  </button>
);

const SearchResultIcon = ({ item }: { item: SearchItem }) => {
  if (item.icon) {
    const shouldPreserveIconColor = item.icon === 'checkbox-icon-dt.svg';
    return <img className={shouldPreserveIconColor ? 'preserve-icon-color' : undefined} src={assetUrl(item.icon)} alt="" />;
  }

  if (item.category?.iconMode === 'emoji' && item.category.emoji) {
    return <span className="search-emoji">{item.category.emoji}</span>;
  }

  if (item.category?.iconMode === 'color') {
    return <span className="search-category-dot" style={{ backgroundColor: item.category.color }} />;
  }

  return <span className="search-hash">#</span>;
};

const getScopeMeta = (scope: TaskScope, tasks: Task[], todayRefreshTime?: string) => {
  const scopeTasks = tasks.filter((task) => task.scope === scope || (scope === 'today' && task.dueDate === getTodayDate(todayRefreshTime)));
  const latestUpdatedAt = scopeTasks
    .map((task) => task.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return formatUpdatedAt(latestUpdatedAt);
};

const formatUpdatedAt = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(toDateTimeInput(value));

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

const toDateTimeInput = (value: string) => {
  if (value.includes('T')) {
    return value;
  }

  return `${value.replace(' ', 'T')}Z`;
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

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
