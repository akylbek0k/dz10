import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, LoginCredentials, RegisterCredentials } from '../types/auth';
import {
  api,
  getStoredAccessToken,
  setStoredAccessToken,
} from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openLoginModal: () => void;
  openRegisterModal: () => void;
  closeAuthModal: () => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(getStoredAccessToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const openLoginModal = useCallback(() => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  }, []);

  const openRegisterModal = useCallback(() => {
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    try {
      const newToken = await api.refreshToken();
      if (newToken) {
        setToken(newToken);
        try {
          const profile = await api.getProfile();
          setUser(profile);
        } catch {
          // If profile fails, keep token
        }
        return newToken;
      } else {
        setToken(null);
        setUser(null);
        return null;
      }
    } catch {
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  // Initial check on page load
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const stored = getStoredAccessToken();
      if (!stored) {
        // Try refresh token via HttpOnly cookie
        try {
          const refreshedToken = await api.refreshToken();
          if (refreshedToken && isMounted) {
            setToken(refreshedToken);
            const profile = await api.getProfile();
            if (isMounted) setUser(profile);
          }
        } catch {
          // No active session
        }
        if (isMounted) setIsLoading(false);
        return;
      }

      // We have stored token, try to load user profile
      try {
        const profile = await api.getProfile();
        if (isMounted) {
          setUser(profile);
          setToken(stored);
        }
      } catch (err: unknown) {
        // Token might be expired, try refreshing
        try {
          const refreshedToken = await api.refreshToken();
          if (refreshedToken && isMounted) {
            setToken(refreshedToken);
            const profile = await api.getProfile();
            if (isMounted) setUser(profile);
          } else if (isMounted) {
            setStoredAccessToken(null);
            setToken(null);
            setUser(null);
          }
        } catch {
          if (isMounted) {
            setStoredAccessToken(null);
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const res = await api.login(credentials);
    setToken(res.access);
    setUser(res.user);
    setIsAuthModalOpen(false);
  };

  const register = async (credentials: RegisterCredentials) => {
    const res = await api.register(credentials);
    setToken(res.access);
    setUser(res.user);
    setIsAuthModalOpen(false);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors, still clear local session
    } finally {
      setStoredAccessToken(null);
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        openLoginModal,
        openRegisterModal,
        closeAuthModal,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
