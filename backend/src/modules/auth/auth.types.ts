export interface TelegramInitDataPayload {
  query_id?: string;
  user?: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
  };
  auth_date: string;
  hash: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  jwt: string;
  user: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
  activeMatchId?: string | null;
}

