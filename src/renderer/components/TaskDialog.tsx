import { FormEvent, useEffect, useState } from 'react';
import type { Task, TaskPriority } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface TaskDialogProps {
  initialDueDate?: string;
  isOpen: boolean;
  task?: Task;
  onClose: () => void;
}

const priorityOptions: Array<{ value: TaskPriority; label: string; color: string }> = [
  { value: 1, label: 'Высокий', color: '#ff3f3f' },
  { value: 2, label: 'Средний', color: '#ffc23f' },
  { value: 3, label: 'Низкий', color: '#5eff71' },
  { value: 4, label: 'Без приоритета', color: '#76b9ff' },
];

export const TaskDialog = ({ initialDueDate, isOpen, task, onClose }: TaskDialogProps) => {
  const activeScope = useTaskStore((state) => state.activeScope);
  const activeCategoryId = useTaskStore((state) => state.activeCategoryId);
  const categories = useTaskStore((state) => state.categories);
  const createTask = useTaskStore((state) => state.createTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const settings = useTaskStore((state) => state.settings);
  const updateTask = useTaskStore((state) => state.updateTask);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueLabel, setDueLabel] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(4);
  const [categoryId, setCategoryId] = useState('');
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setDueDate(task?.dueDate ?? initialDueDate ?? (activeScope === 'today' ? getTodayDate() : ''));
    setDueLabel(normalizeDueTime(task?.dueLabel));
    setPriority(task?.priority ?? 4);
    setCategoryId(task?.categoryId ?? (activeScope === 'category' ? activeCategoryId : ''));
    setConfirmingDelete(false);
  }, [activeCategoryId, activeScope, initialDueDate, isOpen, task]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      return;
    }

    const taskPayload = {
      title: cleanTitle,
      description,
      dueDate,
      dueLabel,
      priority,
      categoryId,
    };

    if (task) {
      await updateTask({
        id: task.id,
        ...taskPayload,
      });
    } else {
      await createTask(taskPayload);
    }

    onClose();
  };

  const handleDelete = async () => {
    if (!task) {
      return;
    }

    if (settings.confirmTaskDelete && !isConfirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    await deleteTask(task.id);
    onClose();
  };

  return (
    <div className="dialog-overlay" role="presentation" onMouseDown={onClose}>
      <form
        className="task-dialog"
        aria-label={task ? 'Редактировать задачу' : 'Добавить задачу'}
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <h2>{task ? 'Редактировать задачу' : 'Новая задача'}</h2>
          <button type="button" aria-label="Закрыть" onClick={onClose}>
            <img src={assetUrl('close-icon.svg')} alt="" />
          </button>
        </div>

        <label className="form-field">
          <span>Название</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Что нужно сделать?"
          />
        </label>

        <label className="form-field">
          <span>Описание</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Добавьте детали задачи"
          />
        </label>

        <div className="form-grid">
          <label className="form-field">
            <span>Дата дедлайна</span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>

          <label className="form-field">
            <span>Время дедлайна</span>
            <input type="time" value={dueLabel} onChange={(event) => setDueLabel(event.target.value)} />
          </label>
        </div>

        <fieldset className="priority-picker">
          <legend>Приоритет</legend>
          <div className="priority-options">
            {priorityOptions.map((option) => (
              <button
                className={priority === option.value ? 'priority-option active' : 'priority-option'}
                key={option.value}
                type="button"
                onClick={() => setPriority(option.value)}
              >
                <span className="priority-option-dot" style={{ backgroundColor: option.color }} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="form-field">
          <span>Категория</span>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Без категории</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </select>
        </label>

        <div className={task ? 'dialog-actions split' : 'dialog-actions'}>
          {task ? (
            <button className="danger-button" type="button" onClick={() => void handleDelete()}>
              {settings.confirmTaskDelete && isConfirmingDelete ? 'Подтвердить удаление' : 'Удалить'}
            </button>
          ) : null}
          <button type="button" onClick={isConfirmingDelete ? () => setConfirmingDelete(false) : onClose}>
            Отмена
          </button>
          <button type="submit">Сохранить</button>
        </div>
      </form>
    </div>
  );
};

const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDueTime = (value: string | undefined) => {
  const cleanValue = value?.trim();
  return cleanValue && /^\d{2}:\d{2}$/.test(cleanValue) ? cleanValue : '';
};
