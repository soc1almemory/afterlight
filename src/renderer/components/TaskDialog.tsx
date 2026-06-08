import { FormEvent, useEffect, useState } from 'react';
import type { Task, TaskPriority } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface TaskDialogProps {
  isOpen: boolean;
  task?: Task;
  onClose: () => void;
}

const priorityOptions: Array<{ value: TaskPriority; label: string }> = [
  { value: 1, label: 'Высокий' },
  { value: 2, label: 'Средний' },
  { value: 3, label: 'Низкий' },
  { value: 4, label: 'Без приоритета' },
];

export const TaskDialog = ({ isOpen, task, onClose }: TaskDialogProps) => {
  const activeScope = useTaskStore((state) => state.activeScope);
  const activeCategoryId = useTaskStore((state) => state.activeCategoryId);
  const categories = useTaskStore((state) => state.categories);
  const createTask = useTaskStore((state) => state.createTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const updateTask = useTaskStore((state) => state.updateTask);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueLabel, setDueLabel] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(4);
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setDueDate(task?.dueDate ?? '');
    setDueLabel(task?.dueLabel ?? '');
    setPriority(task?.priority ?? 4);
    setCategoryId(task?.categoryId ?? (activeScope === 'category' ? activeCategoryId : ''));
  }, [activeCategoryId, activeScope, isOpen, task]);

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
            <span>Дата</span>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>

          <label className="form-field">
            <span>Приоритет</span>
            <select value={priority} onChange={(event) => setPriority(Number(event.target.value) as TaskPriority)}>
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="form-field">
          <span>Подпись срока</span>
          <input value={dueLabel} onChange={(event) => setDueLabel(event.target.value)} placeholder="Сегодня, 17:00" />
        </label>

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
              Удалить
            </button>
          ) : null}
          <button type="button" onClick={onClose}>
            Отмена
          </button>
          <button type="submit">Сохранить</button>
        </div>
      </form>
    </div>
  );
};
