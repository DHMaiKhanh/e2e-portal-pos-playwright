import { BaseApiClient } from '@api/clients/BaseApiClient';
import type { AuthToken } from '@api/models/Common';

/**
 * Auth API service — example of a domain service built on BaseApiClient.
 * Use it to obtain a token for API tests, or to seed a session faster than the UI.
 */
export class AuthService {
  constructor(private readonly client: BaseApiClient) {}

  async login(username: string, password: string): Promise<AuthToken> {
    const res = await this.client.post('/auth/login', {
      data: { username, password },
      failOnStatusCode: true,
    });
    return (await res.json()) as AuthToken;
  }
}
