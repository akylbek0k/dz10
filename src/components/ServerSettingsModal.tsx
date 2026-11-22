import React, { useState } from 'react';
import {
  DEFAULT_API_BASE_URL,
  DEFAULT_WS_URL,
  getApiBaseUrl,
  setApiBaseUrl,
  getWebSocketUrl,
  setWebSocketUrl,
} from '../services/api';
import { IconClose, IconSettings, IconRefresh } from './Icons';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [apiUrl, setApiUrlState] = useState(getApiBaseUrl());
  const [wsUrl, setWsUrlState] = useState(getWebSocketUrl());
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(apiUrl);
    setWebSocketUrl(wsUrl);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
      window.location.reload();
    }, 600);
  };

  const handleReset = () => {
    setApiUrlState(DEFAULT_API_BASE_URL);
    setWsUrlState(DEFAULT_WS_URL);
    setApiBaseUrl('');
    setWebSocketUrl('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-settings"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <button className="modal-close-btn" onClick={onClose} title="Закрыть">
          <IconClose size={20} />
        </button>

        <div className="modal-header">
          <div className="settings-header-icon">
            <IconSettings size={22} />
          </div>
          <h2 className="modal-title">Настройки подключения</h2>
          <p className="modal-description">
            Параметры REST API и WebSocket сервера
          </p>
        </div>

        <form onSubmit={handleSave} className="modal-form">
          <div className="form-group">
            <label className="form-label">REST API Base URL (Авторизация)</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrlState(e.target.value)}
              className="form-input monospace"
              placeholder={DEFAULT_API_BASE_URL}
              required
            />
            <span className="field-hint">
              Swagger документация:{' '}
              <a
                href="https://inai-col3.fishrungames.com/api/docs/"
                target="_blank"
                rel="noreferrer"
                className="docs-link"
              >
                /api/docs/ ↗
              </a>
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">WebSocket URL (Чат)</label>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrlState(e.target.value)}
              className="form-input monospace"
              placeholder={DEFAULT_WS_URL}
              required
            />
            <span className="field-hint">
              Адрес WebSocket шлюза: wss://inai-col3.fishrungames.com/chat/
            </span>
          </div>

          {/* Quick protocol documentation */}
          <div className="protocol-info-box">
            <h4>📋 Протокол обмена WebSocket:</h4>
            <ul>
              <li>
                <strong>1. Handshake AUTH:</strong> <code>{`{"type": "AUTH", "payload": {"token": "..."}}`}</code>
              </li>
              <li>
                <strong>2. Server ACK:</strong> <code>{`{"type": "AUTH_SUCCESS", "payload": {"username": "..."}}`}</code>
              </li>
              <li>
                <strong>3. Отправка сообщения:</strong> <code>{`{"type": "CHAT_MESSAGE", "payload": {"text": "..."}}`}</code>
              </li>
              <li>
                <strong>4. Входящие сообщения:</strong> <code>{`{"type": "NEW_MESSAGE", "payload": {"sender": "...", "text": "...", "timestamp": ...}}`}</code>
              </li>
            </ul>
          </div>

          <div className="settings-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleReset}
              title="Восстановить исходные адреса"
            >
              <IconRefresh size={15} />
              <span>Сбросить</span>
            </button>

            <button type="submit" className="btn-primary" disabled={isSaved}>
              {isSaved ? 'Сохранено! Перезагрузка...' : 'Сохранить и применить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
