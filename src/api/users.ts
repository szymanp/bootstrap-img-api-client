import { parseVoid, Transport } from '../http/transport';
import type { LinksProvider } from '../links';
import type { IUsersApi } from './users.api';

/** User registration & verification endpoints. */
export class UsersApi implements IUsersApi {
  constructor(
    private readonly transport: Transport,
    private readonly links: LinksProvider,
  ) {}

  /** Register a new user and send a verification email. Always returns 204. */
  async register(email: string): Promise<void> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).createUser().href,
      body: { kind: 'json', value: { email } },
      parse: parseVoid,
    });
  }

  /** Resend the verification email. `userIdOrEmail` is a UUID or an email. */
  async resendVerification(userIdOrEmail: string): Promise<void> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).resendVerificationToken(userIdOrEmail).href,
      parse: parseVoid,
    });
  }

  /** Confirm email ownership with the token from the verification email. */
  async verify(userIdOrEmail: string, token: string): Promise<void> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).verifyUser(userIdOrEmail).href,
      body: { kind: 'json', value: { token } },
      parse: parseVoid,
    });
  }
}
