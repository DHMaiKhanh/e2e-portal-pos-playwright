/** Shared API response shapes. Extend per Portal POS endpoint contracts. */

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}
