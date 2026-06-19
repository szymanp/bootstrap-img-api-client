import type { SendTokenResult, Session } from '../types/auth';

/** Authentication & session endpoints. */
export interface IAuthApi {
  /**
   * Request a one-time login token for `email`. Always succeeds (no user
   * enumeration). For test users the token is returned in the body; otherwise
   * `{}` and the token is sent by email.
   */
  sendToken(email: string): Promise<SendTokenResult>;

  /**
   * Exchange a one-time token for a session. On success the session cookie is
   * captured automatically and replayed on later requests.
   */
  login(email: string, token: string): Promise<void>;

  /** Convenience: request a token (test users only) and log in with it. */
  loginWithTestToken(email: string): Promise<void>;

  /** Terminate the current session and clear the session cookie. */
  logout(): Promise<void>;

  /** Report the current session, or throw `ApiError` (401) if none is active. */
  session(): Promise<Session>;
}
