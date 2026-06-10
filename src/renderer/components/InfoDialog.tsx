import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

interface InfoDialogProps {
  kind: 'changelog' | 'help' | 'telegram';
  onClose: () => void;
}

const dialogContent = {
  ru: {
    close: 'Закрыть',
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
  },
  en: {
    close: 'Close',
    changelog: {
      title: 'Changelog',
      intro: 'Current update of the Afterlight working prototype.',
      items: [
        'Added Windows system settings: startup, tray, close behavior, notifications, and backups.',
        'Prepared Russian and English interface localization.',
        'Added smooth automatic sidebar collapse.',
        'Added export, import, data folder opening, and SQLite database opening.',
        'Added page action menu, help popup, and Telegram integration placeholder.',
      ],
    },
    help: {
      title: 'Help',
      intro: 'Core workspace navigation.',
      items: [
        'Inbox keeps tasks without a dedicated day or week scenario.',
        'Today shows current-day tasks and overdue tasks when enabled in settings.',
        'Week lets you distribute tasks by dragging them or adding them directly to a day.',
        'Categories separate tasks by context; favorite categories are shown in a separate group.',
        'The three-dot menu at the top of a page opens actions for the current section.',
      ],
    },
    telegram: {
      title: 'Telegram',
      intro: 'Telegram integration is currently a placeholder.',
      items: [
        'Bot connection, task sending, and reminders will appear here later.',
        'The entry already exists so the menu and settings structure are ready in advance.',
      ],
    },
  },
};

export const InfoDialog = ({ kind, onClose }: InfoDialogProps) => {
  const language = useTaskStore((state) => state.settings.language);
  const content = dialogContent[language][kind];

  return (
    <div className="dialog-overlay info-overlay" role="presentation" onMouseDown={onClose}>
      <section className="info-dialog" aria-label={content.title} onMouseDown={(event) => event.stopPropagation()}>
        <header className="dialog-heading">
          <div>
            <h2>{content.title}</h2>
            <p>{content.intro}</p>
          </div>
          <button type="button" aria-label={dialogContent[language].close} onClick={onClose}>
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
