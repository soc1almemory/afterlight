import { useEffect, useMemo, useState } from 'react';
import type { Task, TaskScope } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEditTask: (task: Task) => void;
}

interface SearchItem {
  id: string;
  icon?: string;
  kind: 'category' | 'scope' | 'task';
  label: string;
  meta?: string;
  onSelect: () => void;
}

const scopeItems: Array<{ icon: string; label: string; scope: TaskScope }> = [
  { icon: 'search-incoming-icon.svg', label: 'Входящие', scope: 'inbox' },
  { icon: 'seartch-today-icon.svg', label: 'Сегодня', scope: 'today' },
  { icon: 'search-week-icon.svg', label: 'Неделя', scope: 'week' },
];

export const SearchDialog = ({ isOpen, onClose, onEditTask }: SearchDialogProps) => {
  const [query, setQuery] = useState('');
  const categories = useTaskStore((state) => state.categories);
  const setActiveCategory = useTaskStore((state) => state.setActiveCategory);
  const setScope = useTaskStore((state) => state.setScope);
  const tasks = useTaskStore((state) => state.tasks);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');
    const allItems: SearchItem[] = [
      ...scopeItems.map((item) => ({
        id: `scope-${item.scope}`,
        icon: item.icon,
        kind: 'scope' as const,
        label: item.label,
        onSelect: () => {
          setScope(item.scope);
          onClose();
        },
      })),
      ...categories.map((category) => ({
        id: `category-${category.id}`,
        kind: 'category' as const,
        label: category.title,
        meta: category.isFavorite ? 'Избранное' : undefined,
        onSelect: () => {
          setActiveCategory(category.id);
          onClose();
        },
      })),
      ...tasks.map((task) => ({
        id: `task-${task.id}`,
        kind: 'task' as const,
        label: task.title,
        meta: task.description || task.dueLabel || formatTaskDate(task.dueDate),
        onSelect: () => {
          onEditTask(task);
          onClose();
        },
      })),
    ];

    if (!normalizedQuery) {
      return allItems;
    }

    return allItems.filter((item) => {
      const haystack = `${item.label} ${item.meta ?? ''}`.toLocaleLowerCase('ru-RU');
      return haystack.includes(normalizedQuery);
    });
  }, [categories, onClose, onEditTask, query, setActiveCategory, setScope, tasks]);

  if (!isOpen) {
    return null;
  }

  const recentItems = items.slice(0, 4);
  const historyItems = items.slice(4, 10);

  return (
    <div className="search-overlay" role="presentation" onMouseDown={onClose}>
      <section className="search-dialog" aria-label="Поиск" onMouseDown={(event) => event.stopPropagation()}>
        <div className="search-input-row">
          <img src={assetUrl('popup-search-icon.svg')} alt="" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск в рабочем пространстве Username..."
          />
        </div>

        <SearchGroup title={query ? 'Результаты' : 'Недавно открытые'} items={recentItems} />
        {historyItems.length > 0 ? <SearchGroup title="История" items={historyItems} /> : null}
      </section>
    </div>
  );
};

const SearchGroup = ({ items, title }: { items: SearchItem[]; title: string }) => (
  <div className="search-group">
    <div className="search-group-title">{title}</div>
    {items.length > 0 ? (
      items.map((item) => <SearchResultButton item={item} key={item.id} />)
    ) : (
      <div className="search-empty">Ничего не найдено</div>
    )}
  </div>
);

const SearchResultButton = ({ item }: { item: SearchItem }) => (
  <button className="search-result" type="button" onClick={item.onSelect}>
    <span className="search-result-title">
      {item.icon ? <img src={assetUrl(item.icon)} alt="" /> : <span className="search-hash">#</span>}
      <span>{item.label}</span>
    </span>
    {item.meta ? <span className="search-result-meta">{item.meta}</span> : null}
  </button>
);

const formatTaskDate = (dateValue: string | undefined) => {
  if (!dateValue) {
    return undefined;
  }

  const [_year, month, day] = dateValue.split('-');
  return `${day}.${month}`;
};
