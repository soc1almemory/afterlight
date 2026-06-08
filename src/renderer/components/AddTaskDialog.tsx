import { FormEvent, useState } from 'react';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface AddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTaskDialog = ({ isOpen, onClose }: AddTaskDialogProps) => {
  const [title, setTitle] = useState('');
  const addTask = useTaskStore((state) => state.addTask);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      return;
    }

    addTask(cleanTitle);
    setTitle('');
    onClose();
  };

  return (
    <div className="dialog-overlay" role="presentation" onMouseDown={onClose}>
      <form className="add-task-dialog" aria-label="Добавить задачу" onSubmit={handleSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading">
          <h2>Новая задача</h2>
          <button type="button" aria-label="Закрыть" onClick={onClose}>
            <img src={assetUrl('close-icon.svg')} alt="" />
          </button>
        </div>

        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Что нужно сделать?"
        />

        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Отмена
          </button>
          <button type="submit">Добавить</button>
        </div>
      </form>
    </div>
  );
};
