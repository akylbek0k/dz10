import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import {
  formatMessageTime,
  formatDateSeparator,
  getAvatarGradient,
  getInitials,
} from '../utils/format';
import { IconArrowDown, IconSearch, IconTrash, IconClose } from './Icons';
import { ChatMessage } from '../types/chat';

export const ChatWindow: React.FC = () => {
  const { user } = useAuth();
  const { messages, clearMessages } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);

  // Filter messages by search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase().trim();
    return messages.filter(
      (m) =>
        m.text.toLowerCase().includes(query) ||
        m.sender.toLowerCase().includes(query)
    );
  }, [messages, searchQuery]);

  // Check scroll position to decide whether to auto-scroll or show "scroll to bottom" button
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isAtBottom = distanceFromBottom < 80;
    isNearBottomRef.current = isAtBottom;

    if (isAtBottom) {
      setShowScrollBottom(false);
      setUnreadCount(0);
    } else {
      setShowScrollBottom(true);
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      });
      setUnreadCount(0);
      setShowScrollBottom(false);
    }
  };

  // Auto-scroll when new messages arrive if user is already near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom(true);
    } else {
      setUnreadCount((c) => c + 1);
    }
  }, [messages]);

  // Group messages for clean rendering
  const renderMessageGroups = () => {
    let lastDateStr = '';

    return filteredMessages.map((msg: ChatMessage, index: number) => {
      const isSelf = user ? msg.sender.toLowerCase() === user.username.toLowerCase() : false;
      const dateStr = formatDateSeparator(msg.timestamp);
      const showDateHeader = dateStr !== lastDateStr;
      lastDateStr = dateStr;

      // Grouping check: same sender, same date, within 2 minutes
      const prevMsg = index > 0 ? filteredMessages[index - 1] : null;
      const isSameSender =
        prevMsg &&
        !prevMsg.isSystem &&
        !msg.isSystem &&
        prevMsg.sender.toLowerCase() === msg.sender.toLowerCase() &&
        Math.abs(msg.timestamp - prevMsg.timestamp) < 120000;

      if (msg.isSystem) {
        return (
          <React.Fragment key={msg.id}>
            {showDateHeader && (
              <div className="date-separator">
                <span>{dateStr}</span>
              </div>
            )}
            <div className={`system-message system-${msg.systemType || 'info'}`}>
              <span className="system-text">{msg.text}</span>
            </div>
          </React.Fragment>
        );
      }

      return (
        <React.Fragment key={msg.id}>
          {showDateHeader && (
            <div className="date-separator">
              <span>{dateStr}</span>
            </div>
          )}

          <div
            className={`message-row ${isSelf ? 'message-self' : 'message-other'} ${
              isSameSender ? 'grouped-message' : ''
            }`}
          >
            {!isSelf && (
              <div
                className="message-avatar"
                style={{
                  background: getAvatarGradient(msg.sender),
                  visibility: isSameSender ? 'hidden' : 'visible',
                }}
                title={msg.sender}
              >
                {getInitials(msg.sender)}
              </div>
            )}

            <div className="message-content">
              {!isSelf && !isSameSender && (
                <div className="message-sender-name">
                  <span>{msg.sender}</span>
                </div>
              )}

              <div className="message-bubble">
                <p className="message-text">{msg.text}</p>
                <div className="message-meta">
                  <span className="message-time">
                    {formatMessageTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  return (
    <div className="chat-window-container">
      {/* Subheader / Toolbar */}
      <div className="chat-toolbar">
        <div className="toolbar-info">
          <span className="chat-room-title"># Общий канал</span>
          <span className="chat-msg-count">
            {messages.filter((m) => !m.isSystem).length} сообщ.
          </span>
        </div>

        <div className="toolbar-actions">
          {showSearch ? (
            <div className="search-input-wrapper">
              <IconSearch size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Поиск по чату..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="search-input"
              />
              <button
                className="btn-clear-search"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearch(false);
                }}
              >
                <IconClose size={14} />
              </button>
            </div>
          ) : (
            <button
              className="icon-btn-sm"
              onClick={() => setShowSearch(true)}
              title="Поиск сообщений"
            >
              <IconSearch size={16} />
            </button>
          )}

          <button
            className="icon-btn-sm"
            onClick={clearMessages}
            title="Очистить историю сообщений на этом устройстве"
          >
            <IconTrash size={16} />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div
        className="chat-messages-stream"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {filteredMessages.length === 0 ? (
          <div className="empty-messages-state">
            <p>Сообщений не найдено</p>
          </div>
        ) : (
          renderMessageGroups()
        )}
        <div ref={messagesEndRef} style={{ height: 1 }} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          className="scroll-bottom-floating-btn"
          onClick={() => scrollToBottom(true)}
          title="Прокрутить к новым сообщениям"
        >
          <IconArrowDown size={18} />
          {unreadCount > 0 && (
            <span className="unread-counter-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};
