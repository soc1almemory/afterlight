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

  return (
    <article className={withSeparator ? 'task-row with-separator' : 'task-row'}>
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
        {task.isExpired ? <span className="expired-label">Просрочено</span> : null}
        <button className="task-title-button" type="button" onClick={() => onEditTask(task)}>
          <strong className={isCompleted ? 'task-title completed' : 'task-title'}>{task.title}</strong>
        </button>
        <button className="task-edit-button" type="button" aria-label="Редактировать задачу" onClick={() => onEditTask(task)}>
          <img src={assetUrl('add-edit-icon-container.svg')} alt="" />
        </button>
      </div>

      {(task.description || task.dueLabel) && (
        <div className="task-meta">
          {task.description ? <span>{task.description}</span> : null}
          {task.dueLabel ? <time>{task.dueLabel}</time> : null}
        </div>
      )}
    </article>
  );
};
