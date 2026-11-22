export interface UserProfile {
  id: number;
  username: string;
  profile?: {
    first_name?: string;
    specialization?: string;
    specialization_display?: string;
    bio?: string;
    fee?: string;
  };
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  password: string;
}

export interface AccessTokenResponse {
  access: string;
  user?: UserProfile;
}

export interface RefreshResponse {
  access: string;
}

export interface ApiErrorResponse {
  detail?: string;
  username?: string[];
  password?: string[];
  [key: string]: unknown;
}
