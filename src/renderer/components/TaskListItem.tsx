import type { DragEvent } from 'react';
import type { Category, LanguageCode, Task } from '../../shared/types';
import { translate, useTranslator } from '../i18n';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface TaskListItemProps {
  task: Task;
  withSeparator: boolean;
  onEditTask: (task: Task) => void;
  showCategory?: boolean;
}

export const TaskListItem = ({ task, withSeparator, onEditTask, showCategory = false }: TaskListItemProps) => {
  const categories = useTaskStore((state) => state.categories);
  const settings = useTaskStore((state) => state.settings);
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const t = useTranslator();
  const isCompleted = task.status === 'completed';
  const isExpired = isActiveOverdueTask(task, settings.todayRefreshTime);
  const category = categories.find((item) => item.id === task.categoryId);
  const dateLabel = formatDeadline(task, settings.language, settings.todayRefreshTime);

  const handleDragStart = (event: DragEvent<HTMLElement>) => {
    event.dataTransfer.setData('text/plain', task.id);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <article className={withSeparator ? 'task-row with-separator' : 'task-row'} draggable onDragStart={handleDragStart}>
      {showCategory && category ? (
        <div className="task-category-label">
          <CategoryMarker category={category} />
          <span>{category.title}</span>
        </div>
      ) : null}
      <div className="task-line">
        <button
          className={isCompleted ? 'checkbox-button checked' : 'checkbox-button'}
          type="button"
          aria-label={isCompleted ? t('taskRestore') : t('taskComplete')}
          onClick={() => void toggleTask(task.id)}
        >
          {isCompleted ? <img className="preserve-icon-color" src={assetUrl('checkbox-checked.svg')} alt="" /> : null}
        </button>
        <span className={`priority priority-${isCompleted ? 'checked' : task.priority}`} />
        {isExpired ? <span className="expired-label">{t('expired')}</span> : null}
        <button className="task-title-button" type="button" onClick={() => onEditTask(task)}>
          <strong className={isCompleted ? 'task-title completed' : 'task-title'}>{task.title}</strong>
        </button>
        <button className="task-edit-button" type="button" aria-label={t('editTask')} onClick={() => onEditTask(task)}>
          <img src={assetUrl('edit-icon.svg')} alt="" />
        </button>
      </div>

      {(task.description || dateLabel) && (
        <div className="task-meta">
          {task.description ? <span className={isCompleted ? 'task-description completed' : 'task-description'}>{task.description}</span> : null}
          {dateLabel ? <time className={isCompleted ? 'completed' : undefined}>{dateLabel}</time> : null}
        </div>
      )}
    </article>
  );
};

const CategoryMarker = ({ category }: { category: Category }) => {
  if (category.iconMode === 'emoji' && category.emoji) {
    return <span className="task-category-emoji">{category.emoji}</span>;
  }

  if (category.iconMode === 'color') {
    return <span className="task-category-dot" style={{ backgroundColor: category.color }} />;
  }

  return <span className="task-category-hash">#</span>;
};

const isActiveOverdueTask = (task: Task, refreshTime?: string) =>
  task.status === 'active' && Boolean(task.dueDate && task.dueDate < getTodayDate(refreshTime));

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

const formatDeadline = (task: Task, language: LanguageCode, refreshTime?: string) => {
  const dueTime = normalizeDueTime(task.dueLabel);

  if (!task.dueDate) {
    return dueTime;
  }

  const formattedDate = formatTaskDate(task.dueDate);
  const today = getTodayDate(refreshTime);
  const tomorrow = getRelativeDate(today, 1);

  if (task.dueDate === today) {
    return [translate(language, 'today'), dueTime, formattedDate].filter(Boolean).join(', ');
  }

  if (task.dueDate === tomorrow) {
    return [translate(language, 'tomorrow'), dueTime, formattedDate].filter(Boolean).join(', ');
  }

  return [dueTime, formattedDate].filter(Boolean).join(', ');
};

const normalizeDueTime = (value: string | undefined) => {
  const cleanValue = value?.trim();
  return cleanValue && /^\d{2}:\d{2}$/.test(cleanValue) ? cleanValue : undefined;
};

const getRelativeDate = (dateValue: string, offsetDays: number) => {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTaskDate = (dateValue: string) => {
  if (!dateValue) {
    return undefined;
  }

  const [year, month, day] = dateValue.split('-');
  return `${day}.${month}.${year}`;
};
