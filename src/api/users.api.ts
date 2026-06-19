/** User registration & verification endpoints. */
export interface IUsersApi {
  /** Register a new user and send a verification email. Always returns 204. */
  register(email: string): Promise<void>;

  /** Resend the verification email. `userIdOrEmail` is a UUID or an email. */
  resendVerification(userIdOrEmail: string): Promise<void>;

  /** Confirm email ownership with the token from the verification email. */
  verify(userIdOrEmail: string, token: string): Promise<void>;
}
