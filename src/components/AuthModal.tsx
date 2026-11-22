import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IconClose, IconEye, IconEyeOff, IconLock, IconUser, IconLogIn, IconCheck } from './Icons';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    closeAuthModal,
    openLoginModal,
    openRegisterModal,
    login,
    register,
  } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const isLogin = authModalMode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('Пожалуйста, введите имя пользователя');
      return;
    }

    if (!password) {
      setErrorMessage('Пожалуйста, введите пароль');
      return;
    }

    if (!isLogin) {
      // Username validation according to backend OpenAPI: ^[\w.@+-]+$
      const usernameRegex = /^[\w.@+-]+$/;
      if (!usernameRegex.test(cleanUsername)) {
        setErrorMessage('Логин может содержать только буквы, цифры и символы @ . + - _');
        return;
      }

      if (password.length < 6) {
        setErrorMessage('Пароль должен содержать не менее 6 символов');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('Введенные пароли не совпадают');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isLogin) {
        await login({ username: cleanUsername, password });
      } else {
        await register({ username: cleanUsername, password });
      }
      // Reset form
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setErrorMessage('');
    } catch (err: unknown) {
      const errObj = err as Error;
      setErrorMessage(errObj.message || 'Ошибка авторизации. Проверьте введенные данные.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeAuthModal}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="modal-close-btn"
          onClick={closeAuthModal}
          title="Закрыть"
        >
          <IconClose size={20} />
        </button>

        {/* Modal Tabs */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab ${isLogin ? 'active' : ''}`}
            onClick={() => {
              setErrorMessage('');
              openLoginModal();
            }}
          >
            <IconLogIn size={16} />
            <span>Вход</span>
          </button>
          <button
            type="button"
            className={`modal-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => {
              setErrorMessage('');
              openRegisterModal();
            }}
          >
            <IconCheck size={16} />
            <span>Регистрация</span>
          </button>
        </div>

        <div className="modal-header">
          <h2 className="modal-title">
            {isLogin ? 'Вход в групповой чат' : 'Регистрация аккаунта'}
          </h2>
          <p className="modal-description">
            {isLogin
              ? 'Авторизуйтесь, чтобы подключиться к WebSocket и отправлять сообщения'
              : 'Создайте учетную запись для мгновенного доступа к чату'}
          </p>
        </div>

        {errorMessage && (
          <div className="modal-error-alert">
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label" htmlFor="auth-username">
              Имя пользователя (Логин)
            </label>
            <div className="input-with-icon">
              <IconUser size={18} className="field-icon" />
              <input
                id="auth-username"
                type="text"
                autoComplete="username"
                placeholder="Например: ivan_ivanov"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={150}
                required
                className="form-input"
              />
            </div>
            {!isLogin && (
              <span className="field-hint">
                До 150 символов (буквы, цифры, @ . + - _)
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">
              Пароль
            </label>
            <div className="input-with-icon">
              <IconLock size={18} className="field-icon" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-confirm-password">
                Повторите пароль
              </label>
              <div className="input-with-icon">
                <IconLock size={18} className="field-icon" />
                <input
                  id="auth-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Повторите пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-submit-auth"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="loading-spinner-small" />
            ) : isLogin ? (
              'Войти и подключиться к чату'
            ) : (
              'Зарегистрироваться и войти'
            )}
          </button>
        </form>

        <div className="modal-footer-switch">
          {isLogin ? (
            <p>
              Впервые здесь?{' '}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setErrorMessage('');
                  openRegisterModal();
                }}
              >
                Создать аккаунт
              </button>
            </p>
          ) : (
            <p>
              Уже есть аккаунт?{' '}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setErrorMessage('');
                  openLoginModal();
                }}
              >
                Войти в систему
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
