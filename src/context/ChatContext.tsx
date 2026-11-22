import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatMessage,
  ConnectionStatus,
  IncomingWebSocketMessage,
  ClientAuthMessage,
  ClientChatMessage,
} from '../types/chat';
import { useAuth } from './AuthContext';
import { getWebSocketUrl } from '../services/api';
import { playMessageSound } from '../services/sound';

interface ChatContextType {
  messages: ChatMessage[];
  connectionStatus: ConnectionStatus;
  sendMessage: (text: string) => boolean;
  clearMessages: () => void;
  reconnect: () => void;
  isMuted: boolean;
  toggleMute: () => void;
}

const STORAGE_KEY_MESSAGES = 'chat_app_cached_messages';
const STORAGE_KEY_MUTED = 'chat_app_is_muted';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, isAuthenticated, refreshSession } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (saved) {
        return JSON.parse(saved) as ChatMessage[];
      }
    } catch {
      // Ignore cache parse error
    }
    return [
      {
        id: 'welcome-0',
        sender: 'Система',
        text: 'Добро пожаловать в групповой чат! Авторизуйтесь через JWT для отправки сообщений.',
        timestamp: Date.now(),
        isSystem: true,
        systemType: 'info',
      },
    ];
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isIntentionalCloseRef = useRef<boolean>(false);

  // Save messages to cache whenever messages change (max 150 items)
  useEffect(() => {
    try {
      const slice = messages.slice(-150);
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(slice));
    } catch {
      // Storage quota or disabled
    }
  }, [messages]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY_MUTED, String(next));
      return next;
    });
  }, []);

  const clearMessages = useCallback(() => {
    const defaultMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      sender: 'Система',
      text: 'История сообщений очищена на этом устройстве.',
      timestamp: Date.now(),
      isSystem: true,
      systemType: 'info',
    };
    setMessages([defaultMsg]);
    try {
      localStorage.removeItem(STORAGE_KEY_MESSAGES);
    } catch {
      // Ignore
    }
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const connectWebSocket = useCallback(
    (currentToken: string) => {
      // Clear existing socket if open
      if (wsRef.current) {
        isIntentionalCloseRef.current = true;
        wsRef.current.close();
        wsRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      isIntentionalCloseRef.current = false;
      const wsUrl = getWebSocketUrl();

      setConnectionStatus('connecting');

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnectionStatus('authenticating');

          // Send AUTH message with access token immediately upon connection
          const authMsg: ClientAuthMessage = {
            type: 'AUTH',
            payload: {
              token: currentToken,
            },
          };
          ws.send(JSON.stringify(authMsg));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as IncomingWebSocketMessage;

            if (data.type === 'AUTH_SUCCESS') {
              setConnectionStatus('connected');
              reconnectAttemptsRef.current = 0;
              addMessage({
                id: `auth-success-${Date.now()}`,
                sender: 'Система',
                text: `Вы успешно вошли в чат как ${data.payload.username} 🚀`,
                timestamp: Date.now(),
                isSystem: true,
                systemType: 'success',
              });
            } else if (data.type === 'NEW_MESSAGE') {
              const { sender, text, timestamp } = data.payload;
              const isOtherUser = !user || sender !== user.username;

              if (isOtherUser && !isMuted) {
                playMessageSound();
              }

              addMessage({
                id: `msg-${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
                sender,
                text,
                timestamp: timestamp || Date.now(),
              });
            }
          } catch {
            // Failed to parse JSON message
          }
        };

        ws.onclose = async (event) => {
          if (isIntentionalCloseRef.current) {
            setConnectionStatus('disconnected');
            return;
          }

          // If closed due to invalid token (code 4003 or message Invalid Token)
          if (event.code === 4003 || event.reason.toLowerCase().includes('token')) {
            addMessage({
              id: `token-expired-${Date.now()}`,
              sender: 'Система',
              text: 'Срок действия JWT токена истек. Обновление токена...',
              timestamp: Date.now(),
              isSystem: true,
              systemType: 'warning',
            });

            // Attempt to refresh access token
            const newToken = await refreshSession();
            if (newToken) {
              addMessage({
                id: `token-refreshed-${Date.now()}`,
                sender: 'Система',
                text: 'Токен успешно обновлен! Повторное подключение к чату...',
                timestamp: Date.now(),
                isSystem: true,
                systemType: 'info',
              });
              connectWebSocket(newToken);
              return;
            } else {
              setConnectionStatus('error');
              addMessage({
                id: `auth-failed-${Date.now()}`,
                sender: 'Система',
                text: 'Не удалось обновить авторизацию. Пожалуйста, выполните вход заново.',
                timestamp: Date.now(),
                isSystem: true,
                systemType: 'error',
              });
              return;
            }
          }

          // Normal unexpected disconnection -> schedule reconnect
          setConnectionStatus('disconnected');
          const attempts = reconnectAttemptsRef.current;
          const delay = Math.min(1000 * Math.pow(1.5, attempts), 10000);
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = window.setTimeout(() => {
            if (isAuthenticated && token) {
              connectWebSocket(token);
            }
          }, delay);
        };

        ws.onerror = () => {
          setConnectionStatus('error');
        };
      } catch {
        setConnectionStatus('error');
      }
    },
    [addMessage, isMuted, refreshSession, isAuthenticated, token, user]
  );

  // Connect when authenticated and token is available; disconnect when logged out
  useEffect(() => {
    if (isAuthenticated && token) {
      connectWebSocket(token);
    } else {
      if (wsRef.current) {
        isIntentionalCloseRef.current = true;
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnectionStatus('disconnected');
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        isIntentionalCloseRef.current = true;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, token, connectWebSocket]);

  const sendMessage = useCallback(
    (text: string): boolean => {
      const trimmed = text.trim();
      if (!trimmed) return false;

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        addMessage({
          id: `err-${Date.now()}`,
          sender: 'Система',
          text: 'Не удается отправить сообщение: соединение с сервером не установлено.',
          timestamp: Date.now(),
          isSystem: true,
          systemType: 'error',
        });
        return false;
      }

      if (connectionStatus !== 'connected') {
        addMessage({
          id: `err-${Date.now()}`,
          sender: 'Система',
          text: 'Вы еще не авторизованы на сервере чата.',
          timestamp: Date.now(),
          isSystem: true,
          systemType: 'warning',
        });
        return false;
      }

      const msg: ClientChatMessage = {
        type: 'CHAT_MESSAGE',
        payload: {
          text: trimmed,
        },
      };

      wsRef.current.send(JSON.stringify(msg));
      return true;
    },
    [connectionStatus, addMessage]
  );

  const reconnect = useCallback(() => {
    if (token) {
      reconnectAttemptsRef.current = 0;
      connectWebSocket(token);
    }
  }, [token, connectWebSocket]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        connectionStatus,
        sendMessage,
        clearMessages,
        reconnect,
        isMuted,
        toggleMute,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
