import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { getAvatarGradient, getInitials } from '../utils/format';
import {
  IconChat,
  IconLogIn,
  IconLogOut,
  IconBell,
  IconBellOff,
  IconSettings,
  IconRefresh,
} from './Icons';

interface NavbarProps {
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings }) => {
  const { user, isAuthenticated, openLoginModal, logout } = useAuth();
  const { connectionStatus, isMuted, toggleMute, reconnect } = useChat();

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return { label: 'В сети', colorClass: 'status-connected' };
      case 'authenticating':
        return { label: 'Авторизация...', colorClass: 'status-connecting' };
      case 'connecting':
        return { label: 'Подключение...', colorClass: 'status-connecting' };
      case 'error':
        return { label: 'Ошибка связи', colorClass: 'status-error' };
      case 'disconnected':
      default:
        return {
          label: isAuthenticated ? 'Отключено' : 'Гость',
          colorClass: 'status-disconnected',
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <div className="brand-icon">
            <IconChat size={22} />
          </div>
          <div className="brand-text">
            <h1 className="brand-title">Групповой Чат</h1>
            <span className="brand-subtitle">WebSocket + JWT</span>
          </div>
        </div>

        {/* Connection status badge */}
        <div
          className={`connection-badge ${statusInfo.colorClass}`}
          title={`Статус соединения WebSocket: ${statusInfo.label}`}
        >
          <span className="status-dot" />
          <span className="status-text">{statusInfo.label}</span>
          {(connectionStatus === 'disconnected' || connectionStatus === 'error') && isAuthenticated && (
            <button
              className="badge-reconnect-btn"
              onClick={reconnect}
              title="Переподключиться к серверу"
            >
              <IconRefresh size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="navbar-right">
        {/* Mute button */}
        <button
          className={`icon-btn ${isMuted ? 'btn-active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Включить звук сообщений' : 'Выключить звук сообщений'}
        >
          {isMuted ? <IconBellOff size={18} /> : <IconBell size={18} />}
        </button>

        {/* Settings button */}
        <button
          className="icon-btn"
          onClick={onOpenSettings}
          title="Настройки сервера / Swagger API"
        >
          <IconSettings size={18} />
        </button>

        {/* Auth profile / login button */}
        {isAuthenticated && user ? (
          <div className="user-profile-menu">
            <div
              className="user-avatar"
              style={{ background: getAvatarGradient(user.username) }}
              title={`Пользователь: ${user.username}`}
            >
              {getInitials(user.username)}
            </div>
            <div className="user-details">
              <span className="user-name">{user.username}</span>
              <span className="user-role">Авторизован</span>
            </div>
            <button
              className="btn-logout"
              onClick={logout}
              title="Выйти из аккаунта (Logout)"
            >
              <IconLogOut size={16} />
              <span className="btn-text">Выйти</span>
            </button>
          </div>
        ) : (
          <button
            className="btn-login-header"
            onClick={openLoginModal}
            title="Войти или зарегистрироваться"
          >
            <IconLogIn size={16} />
            <span>Войти в чат</span>
          </button>
        )}
      </div>
    </header>
  );
};
