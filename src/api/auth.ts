import { parseJson, parseVoid, Transport } from '../http/transport.js';
import type { SendTokenResult, Session } from '../types/auth.js';

/** Authentication & session endpoints. */
export class AuthApi {
  constructor(private readonly transport: Transport) {}

  /**
   * Request a one-time login token for `email`. Always succeeds (no user
   * enumeration). For test users the token is returned in the body; otherwise
   * `{}` and the token is sent by email.
   */
  async sendToken(email: string): Promise<SendTokenResult> {
    return this.transport.request({
      method: 'POST',
      path: '/auth/action;send-token',
      body: { kind: 'json', value: { email } },
      // 204 (real user) returns no body; 200 (test user) returns the token.
      parse: async (res) => (res.status === 204 ? {} : ((await res.json()) as SendTokenResult)),
    });
  }

  /**
   * Exchange a one-time token for a session. On success the session cookie is
   * captured automatically and replayed on later requests.
   */
  async login(email: string, token: string): Promise<void> {
    return this.transport.request({
      method: 'POST',
      path: '/auth',
      headers: { authorization: `X-Token ${email}:${token}` },
      parse: parseVoid,
    });
  }

  /** Convenience: request a token (test users only) and log in with it. */
  async loginWithTestToken(email: string): Promise<void> {
    const { token } = await this.sendToken(email);
    if (!token) {
      throw new Error(`No token returned for ${email}; loginWithTestToken only works for test users.`);
    }
    await this.login(email, token);
  }

  /** Terminate the current session and clear the session cookie. */
  async logout(): Promise<void> {
    return this.transport.request({
      method: 'POST',
      path: '/auth/action;logout',
      parse: parseVoid,
    });
  }

  /** Report the current session, or throw `ApiError` (401) if none is active. */
  async session(): Promise<Session> {
    return this.transport.request({
      method: 'GET',
      path: '/auth/session',
      parse: parseJson<Session>,
    });
  }
}
