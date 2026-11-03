import type { AnonymousLoginResult, RedeemAccessLinkResult, SendTokenResult, Session } from '../types/auth';

/** Authentication & session endpoints. */
export interface IAuthApi {
  /**
   * Request a one-time login token for `email`. Always succeeds (no user
   * enumeration). For test users the token is returned in the body; otherwise
   * `{}` and the token is sent by email. A user has at most three unexpired
   * tokens (each lasts 30 minutes): beyond that no email is sent, though the
   * call still succeeds. Logging in with a token uses it up.
   */
  sendToken(email: string): Promise<SendTokenResult>;

  /**
   * Exchange a one-time token for a session. On success the session cookie is
   * captured automatically and replayed on later requests.
   */
  login(email: string, token: string): Promise<void>;

  /**
   * Create a new anonymous principal and start a session for it
   * (`Authorization: X-Anonymous`). Always creates a new principal, even when
   * the client already carries an anonymous session — check {@link session}
   * first. A lost response can't be retried: a retry creates another
   * principal.
   *
   * @returns The new principal's id and its recovery token. Store the token:
   * it is returned only here and is the only way back to this identity.
   */
  loginAnonymous(): Promise<AnonymousLoginResult>;

  /**
   * Start another session for an existing anonymous principal, on any device
   * (`Authorization: X-Anonymous <token>`). A token no principal holds
   * (deleted, or unused for the inactivity period) yields a 401 `ApiError`.
   *
   * @param token The recovery token from {@link loginAnonymous}.
   */
  loginWithRecoveryToken(token: string): Promise<void>;

  /** Convenience: request a token (test users only) and log in with it. */
  loginWithTestToken(email: string): Promise<void>;

  /** Terminate the current session and clear the session cookie. */
  logout(): Promise<void>;

  /**
   * Report the current session, or throw `ApiError` (401) if none is active.
   * `principalType` tells a user's session from an anonymous principal's; the
   * latter has no `email`, `firstName`, or `lastName`.
   */
  session(): Promise<Session>;

  /**
   * Redeem the code of an access link into the session's principal (a user or
   * an anonymous principal): it gets the link's permissions and follows the
   * link's repository. A visitor without a session should call
   * {@link loginAnonymous} first. Redeeming again is a no-op
   * (`newGrant: false`). An unusable code (unknown, malformed, expired,
   * deactivated, deleted, or with no folders left) yields a 404 `ApiError`
   * (`ErrorType.AccessLinkUnavailable`).
   *
   * @param code The access link's code (43 characters).
   * @returns The link's repository and folders, each with a `published` link
   * to its default publication revision when it has one.
   */
  redeemAccessLink(code: string): Promise<RedeemAccessLinkResult>;

  /**
   * Move the access of an anonymous principal (its access link grants and
   * follows) to the session's registered user. The anonymous principal is
   * then deleted with its sessions, so its token stops working. Works from
   * another device too: the recovery token is the only proof needed. A
   * non-user session yields a 403 `ApiError`
   * (`ErrorType.RegisteredUserRequired`).
   *
   * @param token The anonymous principal's recovery token.
   */
  transferAnonymousAccess(token: string): Promise<void>;
}
