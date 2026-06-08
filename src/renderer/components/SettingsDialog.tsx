import { useEffect, useState } from 'react';
import { assetUrl } from '../lib/assets';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsPage =
  | 'account'
  | 'main'
  | 'language'
  | 'theme'
  | 'sidebar'
  | 'reminders'
  | 'notifications'
  | 'telegram'
  | 'backups';

const settingsItems: Array<{ id: SettingsPage; icon: string; label: string }> = [
  { id: 'account', icon: 'settings-account-icon.svg', label: 'Аккаунт' },
  { id: 'main', icon: 'settings-main-icon.svg', label: 'Основное' },
  { id: 'language', icon: 'settings-language-icon.svg', label: 'Язык' },
  { id: 'theme', icon: 'settigns-theme-icon.svg', label: 'Тема' },
  { id: 'sidebar', icon: 'settigns-sidebar-icon.svg', label: 'Боковая панель' },
  { id: 'reminders', icon: 'settings-reminders-icon.svg', label: 'Напоминания' },
  { id: 'notifications', icon: 'settings-notifications-icon.svg', label: 'Уведомления' },
  { id: 'telegram', icon: 'settigns-telegram-icon.svg', label: 'Интеграция Telegram' },
  { id: 'backups', icon: 'settigns-copies-icon.svg', label: 'Резервные копии' },
];

export const SettingsDialog = ({ isOpen, onClose }: SettingsDialogProps) => {
  const [activePage, setActivePage] = useState<SettingsPage>('account');

  useEffect(() => {
    if (isOpen) {
      setActivePage('account');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const activeItem = settingsItems.find((item) => item.id === activePage);

  return (
    <div className="settings-overlay" role="presentation" onMouseDown={onClose}>
      <section className="settings-dialog" aria-label="Настройки" onMouseDown={(event) => event.stopPropagation()}>
        <aside className="settings-nav">
          <h2>Настройки</h2>
          <nav aria-label="Разделы настроек">
            {settingsItems.map((item) => (
              <button
                className={activePage === item.id ? 'settings-nav-item active' : 'settings-nav-item'}
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
              >
                <img src={assetUrl(item.icon)} alt="" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="settings-content">
          <button className="settings-close-button" type="button" aria-label="Закрыть настройки" onClick={onClose}>
            <img src={assetUrl('settings-close-icon.svg')} alt="" />
          </button>
          {activePage === 'account' ? <AccountSettings /> : <SettingsPlaceholder title={activeItem?.label ?? 'Раздел'} />}
        </main>
      </section>
    </div>
  );
};

const AccountSettings = () => (
  <div className="settings-page">
    <section className="settings-section">
      <h3>Профиль</h3>
      <div className="settings-divider" />
      <div className="profile-settings">
        <div className="profile-avatar-block">
          <img className="profile-avatar" src={assetUrl('settings-avatar-image.svg')} alt="" />
          <button className="outline-accent-button" type="button">
            Загрузить фото
          </button>
        </div>
        <label className="settings-field">
          <span>Введите имя</span>
          <input value="Username" readOnly />
        </label>
      </div>
    </section>

    <section className="settings-section">
      <h3>Безопасность</h3>
      <div className="settings-divider" />
      <SettingsAction title="Email" description="username@gmail.com" action="Изменить Email" />
      <SettingsAction title="Пароль" description="Установите или измените пароль для входа в аккаунт" action="Изменить пароль" />
      <SettingsAction
        title="Двухфакторная аутентификация (2FA)"
        description="Установите двухфакторную аутентификацию, чтобы подтверждать входы в аккаунт дополнительным кодом"
        action="Установить метод верификации"
      />
      <div className="settings-divider" />
      <SettingsAction
        danger
        title="Удаление аккаунта"
        description="Навсегда удалить аккаунт без возможности восстановления"
        action="Удалить аккаунт"
      />
    </section>
  </div>
);

const SettingsAction = ({
  action,
  danger = false,
  description,
  title,
}: {
  action: string;
  danger?: boolean;
  description: string;
  title: string;
}) => (
  <div className={danger ? 'settings-action danger' : 'settings-action'}>
    <div>
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
    <button type="button">{action}</button>
  </div>
);

const SettingsPlaceholder = ({ title }: { title: string }) => (
  <div className="settings-page">
    <section className="settings-section">
      <h3>{title}</h3>
      <div className="settings-divider" />
      <div className="settings-placeholder">
        <p>Раздел подготовлен. Наполнение и поведение будут добавлены на следующем этапе.</p>
      </div>
    </section>
  </div>
);
