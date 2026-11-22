export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'authenticating'
  | 'connected'
  | 'error';

// Messages sent from client to WebSocket server
export interface ClientAuthMessage {
  type: 'AUTH';
  payload: {
    token: string;
  };
}

export interface ClientChatMessage {
  type: 'CHAT_MESSAGE';
  payload: {
    text: string;
  };
}

export type OutgoingWebSocketMessage = ClientAuthMessage | ClientChatMessage;

// Messages received from WebSocket server
export interface ServerAuthSuccessMessage {
  type: 'AUTH_SUCCESS';
  payload: {
    username: string;
  };
}

export interface ServerNewMessageMessage {
  type: 'NEW_MESSAGE';
  payload: {
    sender: string;
    text: string;
    timestamp: number;
  };
}

export type IncomingWebSocketMessage = ServerAuthSuccessMessage | ServerNewMessageMessage;

// Internal representation for display in UI
export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  systemType?: 'info' | 'success' | 'warning' | 'error';
}
