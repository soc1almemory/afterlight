import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

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

const AccountSettings = () => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const profile = useTaskStore((state) => state.profile);
  const updateProfile = useTaskStore((state) => state.updateProfile);
  const updateWorkspace = useTaskStore((state) => state.updateWorkspace);
  const workspace = useTaskStore((state) => state.workspace);
  const [avatarDataUrl, setAvatarDataUrl] = useState(profile.avatarDataUrl);
  const [email, setEmail] = useState(profile.email ?? '');
  const [name, setName] = useState(profile.name);
  const [workspaceTitle, setWorkspaceTitle] = useState(workspace.title);
  const canSave = Boolean(name.trim() && workspaceTitle.trim());

  useEffect(() => {
    setAvatarDataUrl(profile.avatarDataUrl);
    setEmail(profile.email ?? '');
    setName(profile.name);
  }, [profile]);

  useEffect(() => {
    setWorkspaceTitle(workspace.title);
  }, [workspace]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const result = typeof reader.result === 'string' ? reader.result : undefined;

      if (!result) {
        return;
      }

      setAvatarDataUrl(result);
      void updateProfile({ ...profile, avatarDataUrl: result, email, name: name.trim() || profile.name });
    });
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    void updateProfile({ ...profile, avatarDataUrl, email, name });
    void updateWorkspace({ ...workspace, title: workspaceTitle });
  };

  return (
    <div className="settings-page">
      <form className="settings-form" onSubmit={handleSubmit}>
        <section className="settings-section">
          <h3>Профиль</h3>
          <div className="settings-divider" />
          <div className="profile-settings">
            <div className="profile-avatar-block">
              <img className="profile-avatar" src={avatarDataUrl ?? assetUrl('settings-avatar-image.svg')} alt="" />
              <input
                ref={avatarInputRef}
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="visually-hidden"
                type="file"
                onChange={handleAvatarChange}
              />
              <button className="outline-accent-button" type="button" onClick={() => avatarInputRef.current?.click()}>
                Загрузить фото
              </button>
            </div>
            <div className="settings-field-stack">
              <label className="settings-field">
                <span>Введите имя</span>
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="settings-field">
                <span>Email</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>Рабочее пространство</h3>
          <div className="settings-divider" />
          <label className="settings-field workspace-settings-field">
            <span>Название пространства</span>
            <input value={workspaceTitle} onChange={(event) => setWorkspaceTitle(event.target.value)} />
          </label>
          <p className="settings-hint">
            Задачи, категории и заметки сохраняются внутри активного локального пространства.
          </p>
          <div className="settings-save-row">
            <button className="settings-save-button" type="submit" disabled={!canSave}>
              Сохранить изменения
            </button>
          </div>
        </section>
      </form>

      <section className="settings-section">
        <h3>Безопасность</h3>
        <div className="settings-divider" />
        <SettingsAction title="Email" description={email || 'Email не указан'} action="Изменить Email" />
        <SettingsAction title="Пароль" description="Локальный профиль пока не использует пароль для входа." action="Добавить пароль" />
        <SettingsAction
          title="Двухфакторная аутентификация (2FA)"
          description="Раздел подготовлен для будущей синхронизации и внешнего аккаунта."
          action="Настроить позже"
        />
        <div className="settings-divider" />
        <SettingsAction
          danger
          title="Удаление аккаунта"
          description="Удаление локального профиля будет добавлено после реализации резервных копий."
          action="Недоступно"
        />
      </section>
    </div>
  );
};

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
