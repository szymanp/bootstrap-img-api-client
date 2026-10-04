import { parseJson, parseVoid, Transport } from '../http/transport';
import type { LinksProvider } from '../links';
import type { EmailLanguageOptions, RegisterUserInput, UpdateUserInput, User, UserSettings } from '../types/users';
import type { IUsersApi } from './users.api';

/** User registration, verification & profile endpoints. */
export class UsersApi implements IUsersApi {
  constructor(
    private readonly transport: Transport,
    private readonly links: LinksProvider,
  ) {}

  /** Register a new user and send a verification email. Always returns 204. */
  async register(input: RegisterUserInput, options: EmailLanguageOptions = {}): Promise<void> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).createUser().href,
      acceptLanguage: options.acceptLanguage,
      body: { kind: 'json', value: { email: input.email, firstName: input.firstName, lastName: input.lastName } },
      parse: parseVoid,
    });
  }

  /** Update a user's first and/or last name. `userIdOrEmail` is a UUID or an email. */
  async update(userIdOrEmail: string, changes: UpdateUserInput): Promise<User> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).updateUser(userIdOrEmail).href,
      body: { kind: 'json', value: changes },
      parse: parseJson<User>,
    });
  }

  /** Read the user's client-owned settings object (`{}` if never stored). */
  async getSettings<T extends object = UserSettings>(userIdOrEmail: string): Promise<T> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).readUserSettings(userIdOrEmail).href,
      parse: parseJson<T>,
    });
  }

  /** Replace the user's settings object wholesale (last write wins). */
  async putSettings(userIdOrEmail: string, settings: object): Promise<void> {
    return this.transport.request({
      method: 'PUT',
      path: (await this.links()).updateUserSettings(userIdOrEmail).href,
      body: { kind: 'json', value: settings },
      parse: parseVoid,
    });
  }

  /** Resend the verification email. `userIdOrEmail` is a UUID or an email. */
  async resendVerification(userIdOrEmail: string, options: EmailLanguageOptions = {}): Promise<void> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).resendVerificationToken(userIdOrEmail).href,
      acceptLanguage: options.acceptLanguage,
      parse: parseVoid,
    });
  }

  /**
   * Confirm email ownership with the token from the verification email. Also
   * starts a session; the session cookie is captured automatically.
   */
  async verify(userIdOrEmail: string, token: string): Promise<void> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).verifyUser(userIdOrEmail).href,
      body: { kind: 'json', value: { token } },
      parse: parseVoid,
    });
  }
}
