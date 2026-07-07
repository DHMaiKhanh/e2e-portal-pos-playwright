import { APIRequestContext, APIResponse, request as pwRequest } from '@playwright/test';
import { env } from '@configs/env/loadEnv';
import { Logger } from '@utils/logger';

export interface ApiClientOptions {
  baseURL?: string;
  token?: string;
  extraHeaders?: Record<string, string>;
  timeout?: number;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
  timeout?: number;
  failOnStatusCode?: boolean;
}

/**
 * Thin wrapper around Playwright's APIRequestContext.
 * Centralises auth headers, base URL, logging and retry semantics.
 */
export class BaseApiClient {
  protected ctx!: APIRequestContext;
  protected readonly baseURL: string;
  protected readonly defaultHeaders: Record<string, string>;
  protected readonly timeout: number;
  protected readonly logger = Logger.child({ module: 'api' });

  constructor(options: ApiClientOptions = {}) {
    this.baseURL = options.baseURL ?? env.API_URL;
    this.timeout = options.timeout ?? env.API_TIMEOUT;
    this.defaultHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.extraHeaders,
    };
  }

  async init(existing?: APIRequestContext): Promise<void> {
    this.ctx =
      existing ??
      (await pwRequest.newContext({
        baseURL: this.baseURL,
        extraHTTPHeaders: this.defaultHeaders,
        timeout: this.timeout,
        ignoreHTTPSErrors: true,
      }));
  }

  setToken(token: string): void {
    this.defaultHeaders.Authorization = `Bearer ${token}`;
  }

  async dispose(): Promise<void> {
    await this.ctx?.dispose();
  }

  private buildUrl(path: string, params?: RequestOptions['params']): string {
    if (!params) return path;
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return qs ? `${path}?${qs}` : path;
  }

  async get(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    const url = this.buildUrl(path, opts.params);
    this.logger.debug(`GET ${url}`);
    return this.ctx.get(url, {
      headers: { ...this.defaultHeaders, ...opts.headers },
      timeout: opts.timeout ?? this.timeout,
      failOnStatusCode: opts.failOnStatusCode ?? false,
    });
  }

  async post(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    const url = this.buildUrl(path, opts.params);
    this.logger.debug(`POST ${url}`);
    return this.ctx.post(url, {
      headers: { ...this.defaultHeaders, ...opts.headers },
      data: opts.data,
      timeout: opts.timeout ?? this.timeout,
      failOnStatusCode: opts.failOnStatusCode ?? false,
    });
  }

  async put(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    const url = this.buildUrl(path, opts.params);
    this.logger.debug(`PUT ${url}`);
    return this.ctx.put(url, {
      headers: { ...this.defaultHeaders, ...opts.headers },
      data: opts.data,
      timeout: opts.timeout ?? this.timeout,
      failOnStatusCode: opts.failOnStatusCode ?? false,
    });
  }

  async patch(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    const url = this.buildUrl(path, opts.params);
    this.logger.debug(`PATCH ${url}`);
    return this.ctx.patch(url, {
      headers: { ...this.defaultHeaders, ...opts.headers },
      data: opts.data,
      timeout: opts.timeout ?? this.timeout,
      failOnStatusCode: opts.failOnStatusCode ?? false,
    });
  }

  async delete(path: string, opts: RequestOptions = {}): Promise<APIResponse> {
    const url = this.buildUrl(path, opts.params);
    this.logger.debug(`DELETE ${url}`);
    return this.ctx.delete(url, {
      headers: { ...this.defaultHeaders, ...opts.headers },
      timeout: opts.timeout ?? this.timeout,
      failOnStatusCode: opts.failOnStatusCode ?? false,
    });
  }
}
