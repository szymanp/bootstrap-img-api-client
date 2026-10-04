import type { EmailLanguageOptions, RegisterUserInput, UpdateUserInput, User, UserSettings } from '../types/users';

/** User registration, verification & profile endpoints. */
export interface IUsersApi {
  /**
   * Register a new user and send a verification email. Always returns 204.
   * Throws `ApiError` (`ErrorType.ValidationFailed`) for a missing, blank,
   * or too-long (> 255 chars) `firstName`/`lastName`. `options.acceptLanguage`
   * selects the language of the verification email.
   */
  register(input: RegisterUserInput, options?: EmailLanguageOptions): Promise<void>;

  /**
   * Update a user's first and/or last name; omitted fields are left unchanged.
   * `userIdOrEmail` is a UUID or an email. Requires that user's own session
   * (403 otherwise).
   */
  update(userIdOrEmail: string, changes: UpdateUserInput): Promise<User>;

  /**
   * Read the user's settings: an arbitrary JSON object owned by the client,
   * stored verbatim by the server. A user who has never stored settings gets
   * `{}`. Requires that user's own session (403 otherwise).
   *
   * @typeParam T The client's settings shape; not validated — the server may
   * return anything previously stored, or `{}`.
   */
  getSettings<T extends object = UserSettings>(userIdOrEmail: string): Promise<T>;

  /**
   * Replace the user's settings object wholesale (no key-level merge, no
   * revision check — last write wins). `settings` must be a plain JSON object;
   * arrays and scalars are rejected with `ErrorType.ValidationFailed`.
   * Requires that user's own session (403 otherwise).
   */
  putSettings(userIdOrEmail: string, settings: object): Promise<void>;

  /**
   * Resend the verification email. `userIdOrEmail` is a UUID or an email.
   * `options.acceptLanguage` selects the language of the email.
   */
  resendVerification(userIdOrEmail: string, options?: EmailLanguageOptions): Promise<void>;

  /**
   * Confirm email ownership with the token from the verification email,
   * activating the account and logging the user in: like `IAuthApi.login`, it
   * starts a session, whose cookie is captured automatically, so no separate
   * token login is needed after registration. Throws `ApiError` 404 (no such
   * user), 409 (`ErrorType.UserAlreadyVerified`), or 422 (wrong or expired
   * token, or no pending verification).
   */
  verify(userIdOrEmail: string, token: string): Promise<void>;
}
