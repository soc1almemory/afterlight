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

const priorityOptions: Array<{ value: TaskPriority; color: string }> = [
  { value: 1, color: '#ff3f3f' },
  { value: 2, color: '#ffc23f' },
  { value: 3, color: '#5eff71' },
  { value: 4, color: '#76b9ff' },
];

const taskDialogCopy = {
  ru: {
    addLabel: 'Добавить задачу',
    cancel: 'Отмена',
    category: 'Категория',
    close: 'Закрыть',
    confirmDelete: 'Подтвердить удаление',
    delete: 'Удалить',
    description: 'Описание',
    descriptionPlaceholder: 'Добавьте детали задачи',
    dueDate: 'Дата дедлайна',
    dueTime: 'Время дедлайна',
    editLabel: 'Редактировать задачу',
    newTitle: 'Новая задача',
    noCategory: 'Без категории',
    priority: 'Приоритет',
    priorityLabels: {
      1: 'Высокий',
      2: 'Средний',
      3: 'Низкий',
      4: 'Без приоритета',
    },
    save: 'Сохранить',
    title: 'Название',
    titlePlaceholder: 'Что нужно сделать?',
  },
  en: {
    addLabel: 'Add task',
    cancel: 'Cancel',
    category: 'Category',
    close: 'Close',
    confirmDelete: 'Confirm deletion',
    delete: 'Delete',
    description: 'Description',
    descriptionPlaceholder: 'Add task details',
    dueDate: 'Deadline date',
    dueTime: 'Deadline time',
    editLabel: 'Edit task',
    newTitle: 'New task',
    noCategory: 'No category',
    priority: 'Priority',
    priorityLabels: {
      1: 'High',
      2: 'Medium',
      3: 'Low',
      4: 'No priority',
    },
    save: 'Save',
    title: 'Title',
    titlePlaceholder: 'What needs to be done?',
  },
} as const;

export const TaskDialog = ({ initialDueDate, isOpen, task, onClose }: TaskDialogProps) => {
  const activeScope = useTaskStore((state) => state.activeScope);
  const activeCategoryId = useTaskStore((state) => state.activeCategoryId);
  const categories = useTaskStore((state) => state.categories);
  const createTask = useTaskStore((state) => state.createTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const settings = useTaskStore((state) => state.settings);
  const updateTask = useTaskStore((state) => state.updateTask);
  const copy = taskDialogCopy[settings.language];
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
    setDueDate(task?.dueDate ?? initialDueDate ?? (activeScope === 'today' ? getTodayDate(settings.todayRefreshTime) : ''));
    setDueLabel(normalizeDueTime(task?.dueLabel));
    setPriority(task?.priority ?? 4);
    setCategoryId(task?.categoryId ?? (activeScope === 'category' ? activeCategoryId : ''));
    setConfirmingDelete(false);
  }, [activeCategoryId, activeScope, initialDueDate, isOpen, settings.todayRefreshTime, task]);

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
        aria-label={task ? copy.editLabel : copy.addLabel}
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <h2>{task ? copy.editLabel : copy.newTitle}</h2>
          <button type="button" aria-label={copy.close} onClick={onClose}>
            <img src={assetUrl('popup-close-icon.svg')} alt="" />
          </button>
        </div>

        <label className="form-field">
          <span>{copy.title}</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={copy.titlePlaceholder}
          />
        </label>

        <label className="form-field">
          <span>{copy.description}</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={copy.descriptionPlaceholder}
          />
        </label>

        <div className="form-grid">
          <label className="form-field">
            <span>{copy.dueDate}</span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>

          <label className="form-field">
            <span>{copy.dueTime}</span>
            <input type="time" value={dueLabel} onChange={(event) => setDueLabel(event.target.value)} />
          </label>
        </div>

        <fieldset className="priority-picker">
          <legend>{copy.priority}</legend>
          <div className="priority-options">
            {priorityOptions.map((option) => (
              <button
                className={priority === option.value ? 'priority-option active' : 'priority-option'}
                key={option.value}
                type="button"
                onClick={() => setPriority(option.value)}
              >
                <span className="priority-option-dot" style={{ backgroundColor: option.color }} />
                <span>{copy.priorityLabels[option.value]}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="form-field">
          <span>{copy.category}</span>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">{copy.noCategory}</option>
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
              {settings.confirmTaskDelete && isConfirmingDelete ? copy.confirmDelete : copy.delete}
            </button>
          ) : null}
          <button type="button" onClick={isConfirmingDelete ? () => setConfirmingDelete(false) : onClose}>
            {copy.cancel}
          </button>
          <button type="submit">{copy.save}</button>
        </div>
      </form>
    </div>
  );
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

const normalizeDueTime = (value: string | undefined) => {
  const cleanValue = value?.trim();
  return cleanValue && /^\d{2}:\d{2}$/.test(cleanValue) ? cleanValue : '';
};
