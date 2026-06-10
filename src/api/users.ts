import { parseVoid, Transport } from '../http/transport.js';

/** User registration & verification endpoints. */
export class UsersApi {
  constructor(private readonly transport: Transport) {}

  /** Register a new user and send a verification email. Always returns 204. */
  async register(email: string): Promise<void> {
    return this.transport.request({
      method: 'POST',
      path: '/users',
      body: { kind: 'json', value: { email } },
      parse: parseVoid,
    });
  }

  /** Resend the verification email. `userIdOrEmail` is a UUID or an email. */
  async resendVerification(userIdOrEmail: string): Promise<void> {
    return this.transport.request({
      method: 'POST',
      path: `/users/${encodeURIComponent(userIdOrEmail)}/action;resend-verification-token`,
      parse: parseVoid,
    });
  }

  /** Confirm email ownership with the token from the verification email. */
  async verify(userIdOrEmail: string, token: string): Promise<void> {
    return this.transport.request({
      method: 'POST',
      path: `/users/${encodeURIComponent(userIdOrEmail)}/action;verify-user`,
      body: { kind: 'json', value: { token } },
      parse: parseVoid,
    });
  }
}
