import type { EmailLanguageOptions, RegisterUserInput, UpdateUserInput, User, UserSettings } from '../types/users';

/**
 * Format of a verification token: 32 random bytes as unpadded base64url (43
 * case-sensitive characters, the last carrying two zero bits).
 */
export const VERIFICATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;

/**
 * Whether `token` (after trimming surrounding whitespace) has the format of a
 * verification token. Only a help for the user: the server answers every
 * wrong token with the same 422.
 */
export function isVerificationToken(token: string): boolean {
  return VERIFICATION_TOKEN_PATTERN.test(token.trim());
}

/** User registration, verification & profile endpoints. */
export interface IUsersApi {
  /**
   * Register a new user and send a verification email. Always returns 204,
   * whether or not the address already has an account; its owner learns that
   * by email instead (a verification code for a new or unverified user, unless
   * one was sent less than 3 minutes ago; a login token for `IAuthApi.login`
   * for a verified one). An existing user is never changed. A client should
   * therefore show the same "check your email" step after every registration,
   * accepting both a verification code (`verify`) and a login token. Throws `ApiError` (`ErrorType.ValidationFailed`) for a missing, blank,
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
   * Resend the email of `register`: a new verification code to an unverified
   * user (unless one was sent less than 3 minutes ago), a login token to a
   * verified one, nothing to an unknown user. Always returns 204.
   * `userIdOrEmail` is a UUID or an email. `options.acceptLanguage` selects the
   * language of the email.
   */
  resendVerification(userIdOrEmail: string, options?: EmailLanguageOptions): Promise<void>;

  /**
   * Confirm email ownership with the token from the verification email,
   * activating the account and logging the user in: like `IAuthApi.login`, it
   * starts a session, whose cookie is captured automatically, so no separate
   * token login is needed after registration. Surrounding whitespace is
   * trimmed from `token` (the server compares it exactly);
   * {@link isVerificationToken} checks its format before sending. Throws
   * `ApiError` 422 (`ErrorType.InvalidToken`) for every failure alike: a wrong
   * or expired token (tokens last 30 minutes), no pending token, an unknown
   * user, or one already verified.
   */
  verify(userIdOrEmail: string, token: string): Promise<void>;
}
