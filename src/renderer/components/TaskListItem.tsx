import type { DragEvent } from 'react';
import type { Task } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface TaskListItemProps {
  task: Task;
  withSeparator: boolean;
  onEditTask: (task: Task) => void;
}

export const TaskListItem = ({ task, withSeparator, onEditTask }: TaskListItemProps) => {
  const toggleTask = useTaskStore((state) => state.toggleTask);
  const isCompleted = task.status === 'completed';
  const isExpired = task.isExpired || isActiveOverdueTask(task);
  const dateLabel = task.dueLabel || formatTaskDate(task.dueDate);

  const handleDragStart = (event: DragEvent<HTMLElement>) => {
    event.dataTransfer.setData('text/plain', task.id);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <article className={withSeparator ? 'task-row with-separator' : 'task-row'} draggable onDragStart={handleDragStart}>
      <div className="task-line">
        <button
          className={isCompleted ? 'checkbox-button checked' : 'checkbox-button'}
          type="button"
          aria-label={isCompleted ? 'Вернуть задачу' : 'Завершить задачу'}
          onClick={() => void toggleTask(task.id)}
        >
          {isCompleted ? <img src={assetUrl('checkbox-checked.svg')} alt="" /> : null}
        </button>
        <span className={`priority priority-${isCompleted ? 'checked' : task.priority}`} />
        {isExpired ? <span className="expired-label">Просрочено</span> : null}
        <button className="task-title-button" type="button" onClick={() => onEditTask(task)}>
          <strong className={isCompleted ? 'task-title completed' : 'task-title'}>{task.title}</strong>
        </button>
        <button className="task-edit-button" type="button" aria-label="Редактировать задачу" onClick={() => onEditTask(task)}>
          <img src={assetUrl('edit-icon.svg')} alt="" />
        </button>
      </div>

      {(task.description || dateLabel) && (
        <div className="task-meta">
          {task.description ? <span>{task.description}</span> : null}
          {dateLabel ? <time>{dateLabel}</time> : null}
        </div>
      )}
    </article>
  );
};

const isActiveOverdueTask = (task: Task) =>
  task.status === 'active' && Boolean(task.dueDate && task.dueDate < getTodayDate());

const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTaskDate = (dateValue: string | undefined) => {
  if (!dateValue) {
    return undefined;
  }

  const [year, month, day] = dateValue.split('-');
  return `${day}.${month}.${year}`;
};
