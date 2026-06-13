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
  '📖',
  '📔',
  '📂',
  '🗂️',
  '🗒️',
  '✏️',
  '🖊️',
  '🧠',
  '🔍',
  '🔔',
  '⏰',
  '⏳',
  '🕒',
  '✅',
  '☑️',
  '❌',
  '⭐',
  '🔥',
  '🚀',
  '🏆',
  '💰',
  '💳',
  '🛒',
  '🎁',
  '📊',
  '📈',
  '📉',
  '🧮',
  '🧪',
  '🔬',
  '⚙️',
  '🔧',
  '🔨',
  '🧰',
  '🖥️',
  '⌨️',
  '🖱️',
  '📱',
  '🎮',
  '🎬',
  '🎵',
  '🎤',
  '📷',
  '🖼️',
  '🧩',
  '🧘',
  '💪',
  '🚴',
  '🏋️',
  '🛏️',
  '🛋️',
  '🧼',
  '🧴',
  '🧺',
  '🧽',
  '🍎',
  '🥗',
  '☕',
  '💧',
  '🌙',
  '☀️',
  '🌍',
  '✈️',
  '🚌',
  '🚆',
  '🏥',
  '💊',
  '🩺',
  '🔑',
  '🚪',
  '🧱',
  '🏗️',
  '🌲',
  '🌊',
  '🐾',
  '💬',
  '📩',
  '📞',
  '🗓️',
  '📍',
];

const categoryDialogCopy = {
  ru: {
    cancel: 'Отмена',
    close: 'Закрыть',
    color: 'Цвет',
    confirmDelete: 'Подтвердить удаление',
    createLabel: 'Создать категорию',
    delete: 'Удалить',
    display: 'Отображение',
    editLabel: 'Редактировать категорию',
    emoji: 'Emoji',
    emojiPicker: 'Выбор emoji',
    name: 'Название',
    newTitle: 'Новая категория',
    placeholder: 'Например, Учёба',
    remove: 'Убрать',
    save: 'Сохранить',
    selectColor: 'Выбрать цвет {color}',
  },
  en: {
    cancel: 'Cancel',
    close: 'Close',
    color: 'Color',
    confirmDelete: 'Confirm deletion',
    createLabel: 'Create category',
    delete: 'Delete',
    display: 'Display',
    editLabel: 'Edit category',
    emoji: 'Emoji',
    emojiPicker: 'Emoji picker',
    name: 'Name',
    newTitle: 'New category',
    placeholder: 'For example, Study',
    remove: 'Remove',
    save: 'Save',
    selectColor: 'Select color {color}',
  },
} as const;

export const CategoryDialog = ({ category, isOpen, onClose }: CategoryDialogProps) => {
  const createCategory = useTaskStore((state) => state.createCategory);
  const deleteCategory = useTaskStore((state) => state.deleteCategory);
  const settings = useTaskStore((state) => state.settings);
  const updateCategory = useTaskStore((state) => state.updateCategory);
  const copy = categoryDialogCopy[settings.language];
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
        aria-label={category ? copy.editLabel : copy.createLabel}
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <h2>{category ? copy.editLabel : copy.newTitle}</h2>
          <button type="button" aria-label={copy.close} onClick={onClose}>
            <img src={assetUrl('popup-close-icon.svg')} alt="" />
          </button>
        </div>

        <label className="form-field">
          <span>{copy.name}</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={copy.placeholder}
          />
        </label>

        <fieldset className="color-field">
          <legend>{copy.display}</legend>
          <div className="category-icon-mode">
            <button
              className={iconMode === 'color' ? 'active' : ''}
              type="button"
              onClick={() => setIconMode('color')}
            >
              {copy.color}
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
                aria-label={copy.selectColor.replace('{color}', option)}
                onClick={() => setColor(option)}
              />
            ))}
          </div>
        </fieldset>

        {iconMode === 'emoji' ? (
          <div className="emoji-picker">
            <div className="emoji-picker-header">
              <span>{copy.emoji}</span>
              <button type="button" onClick={() => setEmoji('')}>
                {copy.remove}
              </button>
            </div>
            <div className="emoji-picker-grid" aria-label={copy.emojiPicker}>
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
              {settings.confirmCategoryDelete && isConfirmingDelete ? copy.confirmDelete : copy.delete}
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
