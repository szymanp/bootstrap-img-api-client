import type { RegisterUserInput, UpdateUserInput, User } from '../types/users';

/** User registration, verification & profile endpoints. */
export interface IUsersApi {
  /**
   * Register a new user and send a verification email. Always returns 204.
   * Throws `ApiError` (`ErrorType.ValidationFailed`) for a missing, blank,
   * or too-long (> 255 chars) `firstName`/`lastName`.
   */
  register(input: RegisterUserInput): Promise<void>;

  /**
   * Update a user's first and/or last name; omitted fields are left unchanged.
   * `userIdOrEmail` is a UUID or an email. Requires that user's own session
   * (403 otherwise).
   */
  update(userIdOrEmail: string, changes: UpdateUserInput): Promise<User>;

  /** Resend the verification email. `userIdOrEmail` is a UUID or an email. */
  resendVerification(userIdOrEmail: string): Promise<void>;

  /** Confirm email ownership with the token from the verification email. */
  verify(userIdOrEmail: string, token: string): Promise<void>;
}
