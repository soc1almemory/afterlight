import { FormEvent, useEffect, useState } from 'react';
import type { Category, CategoryIconMode } from '../../shared/types';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface CategoryDialogProps {
  category?: Category;
  isOpen: boolean;
  onClose: () => void;
}

const colorOptions = ['#7c65ff', '#00a878', '#ff9f1c', '#ff3f3f', '#76b9ff', '#5eff71'];

export const CategoryDialog = ({ category, isOpen, onClose }: CategoryDialogProps) => {
  const createCategory = useTaskStore((state) => state.createCategory);
  const deleteCategory = useTaskStore((state) => state.deleteCategory);
  const updateCategory = useTaskStore((state) => state.updateCategory);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(colorOptions[0]);
  const [emoji, setEmoji] = useState('');
  const [iconMode, setIconMode] = useState<CategoryIconMode>('color');
  const [isFavorite, setFavorite] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle(category?.title ?? '');
    setColor(category?.color ?? colorOptions[0]);
    setEmoji(category?.emoji ?? '');
    setIconMode(category?.iconMode ?? 'color');
    setFavorite(category?.isFavorite ?? false);
  }, [category, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      return;
    }

    if (category) {
      await updateCategory({
        id: category.id,
        title: cleanTitle,
        color,
        emoji,
        iconMode,
        isFavorite,
      });
    } else {
      await createCategory({
        title: cleanTitle,
        color,
        emoji,
        iconMode,
        isFavorite,
      });
    }

    onClose();
  };

  const handleDelete = async () => {
    if (!category) {
      return;
    }

    await deleteCategory(category.id);
    onClose();
  };

  return (
    <div className="dialog-overlay" role="presentation" onMouseDown={onClose}>
      <form
        className="category-dialog"
        aria-label={category ? 'Редактировать категорию' : 'Создать категорию'}
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <h2>{category ? 'Редактировать категорию' : 'Новая категория'}</h2>
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
            placeholder="Например, Диплом"
          />
        </label>

        <fieldset className="color-field">
          <legend>Отображение</legend>
          <div className="category-icon-mode">
            <button
              className={iconMode === 'color' ? 'active' : ''}
              type="button"
              onClick={() => setIconMode('color')}
            >
              Цвет
            </button>
            <button
              className={iconMode === 'emoji' ? 'active' : ''}
              type="button"
              onClick={() => setIconMode('emoji')}
            >
              Emoji
            </button>
            <button className={iconMode === 'hash' ? 'active' : ''} type="button" onClick={() => setIconMode('hash')}>
              #
            </button>
          </div>
          <div className="color-swatches">
            {colorOptions.map((option) => (
              <button
                className={color === option ? 'color-swatch active' : 'color-swatch'}
                key={option}
                style={{ backgroundColor: option }}
                type="button"
                aria-label={`Выбрать цвет ${option}`}
                onClick={() => setColor(option)}
              />
            ))}
          </div>
        </fieldset>

        {iconMode === 'emoji' ? (
          <label className="form-field compact">
            <span>Emoji</span>
            <input maxLength={4} value={emoji} onChange={(event) => setEmoji(event.target.value)} placeholder="Например, 📚" />
          </label>
        ) : null}

        <label className="checkbox-field">
          <input checked={isFavorite} type="checkbox" onChange={(event) => setFavorite(event.target.checked)} />
          <span>Показывать выше остальных</span>
        </label>

        <div className={category ? 'dialog-actions split' : 'dialog-actions'}>
          {category ? (
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
