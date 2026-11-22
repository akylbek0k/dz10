import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { IconSend, IconLock, IconLogIn, IconSmile, IconRefresh } from './Icons';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🚀', '👏', '✨'];

export const ChatInput: React.FC = () => {
  const { isAuthenticated, openLoginModal, openRegisterModal } = useAuth();
  const { connectionStatus, sendMessage, reconnect } = useChat();

  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const handleSend = () => {
    if (!text.trim()) return;
    const ok = sendMessage(text);
    if (ok) {
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // If user is NOT authenticated: show lock banner with Login / Register buttons
  if (!isAuthenticated) {
    return (
      <div className="chat-input-locked">
        <div className="locked-info">
          <div className="locked-icon">
            <IconLock size={20} />
          </div>
          <div className="locked-text">
            <strong>Только авторизованные пользователи могут отправлять сообщения</strong>
            <span>Войдите через аккаунт с JWT токеном или создайте новый за пару секунд.</span>
          </div>
        </div>
        <div className="locked-actions">
          <button className="btn-locked-login" onClick={openLoginModal}>
            <IconLogIn size={16} />
            <span>Войти</span>
          </button>
          <button className="btn-locked-register" onClick={openRegisterModal}>
            <span>Регистрация</span>
          </button>
        </div>
      </div>
    );
  }

  // If user is authenticated but connection is lost or not connected yet
  const isReady = connectionStatus === 'connected';

  return (
    <div className="chat-input-wrapper">
      {/* Reconnect notice if disconnected */}
      {!isReady && (
        <div className="connection-warning-strip">
          <span>
            {connectionStatus === 'authenticating'
              ? 'Проверка JWT токена на WebSocket сервере...'
              : connectionStatus === 'connecting'
              ? 'Подключение к WebSocket серверу...'
              : 'Соединение с сервером прервано.'}
          </span>
          {connectionStatus !== 'connecting' && connectionStatus !== 'authenticating' && (
            <button className="btn-reconnect-inline" onClick={reconnect}>
              <IconRefresh size={13} />
              <span>Переподключиться</span>
            </button>
          )}
        </div>
      )}

      {/* Quick emoji drawer */}
      {showEmojiPicker && (
        <div className="emoji-quick-bar">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emoji-pill"
              onClick={() => handleEmojiClick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-bar">
        <button
          type="button"
          className={`btn-emoji-toggle ${showEmojiPicker ? 'active' : ''}`}
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          title="Быстрые реакции и эмодзи"
        >
          <IconSmile size={20} />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isReady ? 'Напишите сообщение... (Enter для отправки)' : 'Ожидание подключения к чату...'}
          disabled={!isReady}
          rows={1}
          maxLength={1000}
          className="chat-textarea"
        />

        <div className="chat-input-actions">
          {text.length > 50 && (
            <span className="char-count">{text.length}/1000</span>
          )}
          <button
            type="button"
            className="btn-send"
            onClick={handleSend}
            disabled={!isReady || !text.trim()}
            title="Отправить сообщение (Enter)"
          >
            <IconSend size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
