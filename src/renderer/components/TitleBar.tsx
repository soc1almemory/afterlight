import { assetUrl } from '../lib/assets';

export const TitleBar = () => {
  const controls = window.afterlightWindow;

  return (
    <header className="app-titlebar">
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
  );
};
