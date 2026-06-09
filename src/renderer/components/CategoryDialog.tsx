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
const emojiOptions = [
  '📚',
  '🏠',
  '💼',
  '🧹',
  '🛠️',
  '🌱',
  '🎓',
  '💡',
  '📝',
  '📌',
  '🎯',
  '💻',
  '📅',
  '✨',
  '❤️',
  '⚡',
  '🎨',
  '🏃',
  '🍽️',
  '🧾',
  '🔒',
  '📦',
  '🚗',
  '🎧',
];

export const CategoryDialog = ({ category, isOpen, onClose }: CategoryDialogProps) => {
  const createCategory = useTaskStore((state) => state.createCategory);
  const deleteCategory = useTaskStore((state) => state.deleteCategory);
  const settings = useTaskStore((state) => state.settings);
  const updateCategory = useTaskStore((state) => state.updateCategory);
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(colorOptions[0]);
  const [emoji, setEmoji] = useState('');
  const [iconMode, setIconMode] = useState<CategoryIconMode>('color');
  const [isFavorite, setFavorite] = useState(false);
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle(category?.title ?? '');
    setColor(category?.color ?? colorOptions[0]);
    setEmoji(category?.emoji ?? '');
    setIconMode(category?.iconMode ?? 'color');
    setFavorite(category?.isFavorite ?? false);
    setConfirmingDelete(false);
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
        isFavorite: false,
      });
    }

    onClose();
  };

  const handleDelete = async () => {
    if (!category) {
      return;
    }

    if (settings.confirmCategoryDelete && !isConfirmingDelete) {
      setConfirmingDelete(true);
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
          <div className="emoji-picker">
            <div className="emoji-picker-header">
              <span>Emoji</span>
              <button type="button" onClick={() => setEmoji('')}>
                Убрать
              </button>
            </div>
            <div className="emoji-picker-grid" aria-label="Выбор emoji">
              {emojiOptions.map((option) => (
                <button
                  className={emoji === option ? 'emoji-option active' : 'emoji-option'}
                  key={option}
                  type="button"
                  onClick={() => setEmoji(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className={category ? 'dialog-actions split' : 'dialog-actions'}>
          {category ? (
            <button className="danger-button" type="button" onClick={() => void handleDelete()}>
              {settings.confirmCategoryDelete && isConfirmingDelete ? 'Подтвердить удаление' : 'Удалить'}
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
