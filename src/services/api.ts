import {
  UserProfile,
  LoginCredentials,
  RegisterCredentials,
  AccessTokenResponse,
  RefreshResponse,
  ApiErrorResponse,
} from '../types/auth';

export const DEFAULT_API_BASE_URL = 'https://inai-col3.fishrungames.com';
export const DEFAULT_WS_URL = 'wss://inai-col3.fishrungames.com/chat/';

const STORAGE_KEY_TOKEN = 'chat_app_jwt_access_token';
const STORAGE_KEY_API_URL = 'chat_app_api_base_url';
const STORAGE_KEY_WS_URL = 'chat_app_ws_url';

export function getApiBaseUrl(): string {
  const custom = localStorage.getItem(STORAGE_KEY_API_URL);
  return custom ? custom.replace(/\/+$/, '') : DEFAULT_API_BASE_URL;
}

export function setApiBaseUrl(url: string): void {
  if (!url || !url.trim() || url.trim() === DEFAULT_API_BASE_URL) {
    localStorage.removeItem(STORAGE_KEY_API_URL);
  } else {
    localStorage.setItem(STORAGE_KEY_API_URL, url.trim().replace(/\/+$/, ''));
  }
}

export function getWebSocketUrl(): string {
  const custom = localStorage.getItem(STORAGE_KEY_WS_URL);
  return custom ? custom.trim() : DEFAULT_WS_URL;
}

export function setWebSocketUrl(url: string): void {
  if (!url || !url.trim() || url.trim() === DEFAULT_WS_URL) {
    localStorage.removeItem(STORAGE_KEY_WS_URL);
  } else {
    localStorage.setItem(STORAGE_KEY_WS_URL, url.trim());
  }
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

export function setStoredAccessToken(token: string | null): void {
  if (token) {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
  } else {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  }
}

// Token refresh mutex to prevent duplicate concurrent refresh requests
let refreshPromise: Promise<string | null> | null = null;

export async function performTokenRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/api/token/refresh/`;

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include', // Sends HttpOnly cookie with refresh_token
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        setStoredAccessToken(null);
        return null;
      }

      const data = (await response.json()) as RefreshResponse;
      if (data && data.access) {
        setStoredAccessToken(data.access);
        return data.access;
      }

      setStoredAccessToken(null);
      return null;
    } catch {
      setStoredAccessToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getStoredAccessToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  // Handle 401 Unauthorized by attempting a token refresh
  if (
    response.status === 401 &&
    retryCount === 0 &&
    !endpoint.includes('/api/token/refresh/') &&
    !endpoint.includes('/api/login/') &&
    !endpoint.includes('/api/register/')
  ) {
    const newToken = await performTokenRefresh();
    if (newToken) {
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };
      return await request<T>(
        endpoint,
        {
          ...options,
          headers: retryHeaders,
        },
        retryCount + 1
      );
    }
  }

  if (!response.ok) {
    let errorData: ApiErrorResponse = {};
    try {
      errorData = await response.json();
    } catch {
      // Non-JSON response
    }

    let message = errorData.detail || '';
    if (!message) {
      const fieldErrors: string[] = [];
      for (const [field, errors] of Object.entries(errorData)) {
        if (Array.isArray(errors)) {
          fieldErrors.push(`${field}: ${errors.join(', ')}`);
        } else if (typeof errors === 'string') {
          fieldErrors.push(`${field}: ${errors}`);
        }
      }
      if (fieldErrors.length > 0) {
        message = fieldErrors.join(' | ');
      }
    }

    if (!message) {
      message = `Ошибка сервера: ${response.status} ${response.statusText}`;
    }

    const error = new Error(message) as Error & { status: number; data: ApiErrorResponse };
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export const api = {
  // Login with credentials (receives access token and sets refresh cookie)
  async login(credentials: LoginCredentials): Promise<{ access: string; user: UserProfile }> {
    const data = await request<AccessTokenResponse>('/api/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (data.access) {
      setStoredAccessToken(data.access);
    }

    let user = data.user;
    if (!user) {
      user = await api.getProfile();
    }

    return { access: data.access, user };
  },

  // Register new account (receives access token and sets refresh cookie)
  async register(credentials: RegisterCredentials): Promise<{ access: string; user: UserProfile }> {
    const data = await request<AccessTokenResponse>('/api/register/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (data.access) {
      setStoredAccessToken(data.access);
    }

    let user = data.user;
    if (!user) {
      user = await api.getProfile();
    }

    return { access: data.access, user };
  },

  // Logout (clears refresh cookie on server and access token in client)
  async logout(): Promise<void> {
    try {
      await request('/api/logout/', {
        method: 'POST',
      });
    } finally {
      setStoredAccessToken(null);
    }
  },

  // Get current user profile
  async getProfile(): Promise<UserProfile> {
    return request<UserProfile>('/api/profile/', {
      method: 'GET',
    });
  },

  // Refresh token
  async refreshToken(): Promise<string | null> {
    return performTokenRefresh();
  },
};
