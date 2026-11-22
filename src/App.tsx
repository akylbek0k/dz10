import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { Navbar } from './components/Navbar';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { AuthModal } from './components/AuthModal';
import { ServerSettingsModal } from './components/ServerSettingsModal';
import './styles/chat.css';

const MainChatApp: React.FC = () => {
  const { isLoading } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="loading-spinner-small" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Загрузка чата...
          </span>
        </div>
      </div>
    );
  }

  return (
    <ChatProvider>
      <div className="app-container">
        <Navbar onOpenSettings={() => setIsSettingsOpen(true)} />
        <ChatWindow />
        <ChatInput />

        {/* Modals */}
        <AuthModal />
        <ServerSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </ChatProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainChatApp />
    </AuthProvider>
  );
}
