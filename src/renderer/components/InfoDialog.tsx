import { assetUrl } from '../lib/assets';

interface InfoDialogProps {
  kind: 'changelog' | 'help' | 'telegram';
  onClose: () => void;
}

const dialogContent = {
  changelog: {
    title: 'История изменений',
    intro: 'Текущее обновление рабочего прототипа Afterlight.',
    items: [
      'Добавлены системные настройки Windows: автозапуск, трей, поведение закрытия, уведомления и резервные копии.',
      'Подготовлена локализация интерфейса на русский и английский языки.',
      'Добавлено автосворачивание боковой панели с плавной анимацией.',
      'Добавлены экспорт, импорт, открытие папки данных и открытие базы SQLite.',
      'Добавлены меню действий страницы, справка и placeholder Telegram-интеграции.',
    ],
  },
  help: {
    title: 'Помощь',
    intro: 'Основная навигация по рабочему пространству.',
    items: [
      'Входящие хранит задачи без отдельного сценария дня или недели.',
      'Сегодня показывает задачи текущего дня и просроченные задачи, если это включено в настройках.',
      'Неделя позволяет распределять задачи по дням перетаскиванием или добавлением сразу в нужный день.',
      'Категории отделяют задачи по контекстам; избранные категории отображаются отдельным блоком.',
      'Меню с тремя точками вверху страницы открывает действия для текущего раздела.',
    ],
  },
  telegram: {
    title: 'Telegram',
    intro: 'Интеграция Telegram пока находится в заготовке.',
    items: [
      'Позже здесь появится подключение бота, отправка задач и получение напоминаний.',
      'Пункт уже вынесен в интерфейс, чтобы структура настроек и меню была готова заранее.',
    ],
  },
};

export const InfoDialog = ({ kind, onClose }: InfoDialogProps) => {
  const content = dialogContent[kind];

  return (
    <div className="dialog-overlay info-overlay" role="presentation" onMouseDown={onClose}>
      <section className="info-dialog" aria-label={content.title} onMouseDown={(event) => event.stopPropagation()}>
        <header className="dialog-heading">
          <div>
            <h2>{content.title}</h2>
            <p>{content.intro}</p>
          </div>
          <button type="button" aria-label="Закрыть" onClick={onClose}>
            <img src={assetUrl('settings-close-icon.svg')} alt="" />
          </button>
        </header>
        <div className="info-dialog-list">
          {content.items.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>
    </div>
  );
};
