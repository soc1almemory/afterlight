import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { assetUrl } from '../lib/assets';
import { useTaskStore } from '../store/useTaskStore';

export const ProfileSetup = () => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const completeProfileSetup = useTaskStore((state) => state.completeProfileSetup);
  const error = useTaskStore((state) => state.error);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceTitle, setWorkspaceTitle] = useState('');
  const [isSaving, setSaving] = useState(false);
  const controls = window.afterlightWindow;
  const canSubmit = Boolean(name.trim() && workspaceTitle.trim() && email.trim() && password.trim());

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        setAvatarDataUrl(reader.result);
      }
    });
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setSaving(true);
    try {
      await completeProfileSetup({
        avatarDataUrl,
        email,
        name,
        password,
        workspaceTitle,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="setup-shell">
      <header className="setup-titlebar">
        <div className="setup-brand">
          <img src={assetUrl('afterlight-icon.svg')} alt="" />
          <span>Afterlight</span>
        </div>
        <div className="drag-region" />
        <div className="window-actions">
          <button type="button" aria-label="Свернуть" onClick={() => void controls?.minimize()}>
            <img src={assetUrl('Minimize.svg')} alt="" />
          </button>
          <button type="button" aria-label="Развернуть" onClick={() => void controls?.toggleMaximize()}>
            <img src={assetUrl('Maximize.svg')} alt="" />
          </button>
          <button type="button" aria-label="Закрыть" onClick={() => void controls?.close()}>
            <img src={assetUrl('Close.svg')} alt="" />
          </button>
        </div>
      </header>

      <main className="setup-workspace">
        <form className="setup-panel" onSubmit={handleSubmit}>
          <div className="setup-heading">
            <h1>Настройте профиль</h1>
            <p>Создайте локальный профиль и рабочее пространство для задач.</p>
          </div>

          <div className="setup-avatar-block">
            <img
              className="setup-avatar"
              src={avatarDataUrl ?? assetUrl('default-avatar-light.png')}
              alt=""
            />
            <input
              ref={avatarInputRef}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="visually-hidden"
              type="file"
              onChange={handleAvatarChange}
            />
            <button className="outline-accent-button" type="button" onClick={() => avatarInputRef.current?.click()}>
              Загрузить аватар
            </button>
          </div>

          <div className="setup-fields">
            <label className="form-field">
              <span>Имя пользователя</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Username" />
            </label>
            <label className="form-field">
              <span>Рабочее пространство</span>
              <input
                value={workspaceTitle}
                onChange={(event) => setWorkspaceTitle(event.target.value)}
                placeholder="Личное пространство"
              />
            </label>
            <label className="form-field">
              <span>Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="username@gmail.com" />
            </label>
            <label className="form-field">
              <span>Пароль</span>
              <input
                value={password}
                type="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Введите пароль"
              />
            </label>
          </div>

          {error ? <div className="app-error">{error}</div> : null}

          <button className="setup-submit" type="submit" disabled={!canSubmit || isSaving}>
            {isSaving ? 'Сохранение...' : 'Начать работу'}
          </button>
        </form>
      </main>
    </div>
  );
};
