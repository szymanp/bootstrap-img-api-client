import type {
  AnonymousLoginResult,
  RedeemAccessLinkResult,
  SendTokenOptions,
  SendTokenResult,
  Session,
} from '../types/auth';

/**
 * Format of a sign-in request id: 32 random bytes as unpadded base64url (43
 * case-sensitive characters, the last carrying two zero bits).
 */
export const LOGIN_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;

/** Format of a sign-in code once spaces and hyphens are removed: 10 digits. */
export const LOGIN_CODE_PATTERN = /^[0-9]{10}$/;

/**
 * Generate a new sign-in request id for `IAuthApi.sendToken`: 32 bytes from
 * `crypto.getRandomValues`, as unpadded base64url (43 characters). Generate a
 * new one for each request.
 */
export function generateLoginRequestId(): string {
  const crypto = globalThis.crypto;
  if (!crypto?.getRandomValues) throw new Error('Web Crypto (crypto.getRandomValues) is not available.');
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Whether `requestId` has the format of a sign-in request id. */
export function isLoginRequestId(requestId: string): boolean {
  return LOGIN_REQUEST_ID_PATTERN.test(requestId);
}

/**
 * Whether `code` has the format of a sign-in code (10 digits; spaces and
 * hyphens, as in `123 456 7890`, are ignored). Only a help for the user: the
 * server answers every failed code with the same 401.
 */
export function isLoginCode(code: string): boolean {
  return LOGIN_CODE_PATTERN.test(code.replace(/[\s-]/g, ''));
}

/** Authentication & session endpoints. */
export interface IAuthApi {
  /**
   * Request a one-time login token for `email`. Always succeeds (no user
   * enumeration). For test users the token is returned in the body; otherwise
   * `{}` and the token is sent by email. A user has at most three unexpired
   * tokens (each lasts 30 minutes): beyond that no email is sent, though the
   * call still succeeds. Logging in with a token uses it up.
   *
   * With `options.requestId` (see {@link generateLoginRequestId}) the email
   * also carries a 10-digit sign-in code for {@link loginWithCode}, and test
   * users get it as `code`. The code works for 15 minutes and 5 attempts;
   * signing in with either the code or the token uses up both. An id another
   * token already uses gets no code. A malformed `requestId` yields a 400
   * `ApiError` (`ErrorType.ValidationFailed`).
   */
  sendToken(email: string, options?: SendTokenOptions): Promise<SendTokenResult>;

  /**
   * Exchange a one-time token for a session. On success the session cookie is
   * captured automatically and replayed on later requests.
   */
  login(email: string, token: string): Promise<void>;

  /**
   * Exchange an emailed sign-in code for a session
   * (`Authorization: X-Code <requestId>:<code>`). The session cookie is
   * captured as with {@link login}. Spaces and hyphens in `code` are ignored.
   * A wrong, expired, or used-up code, or a `requestId` with no code, yields a
   * 401 `ApiError` (the same for every failure); a malformed `requestId` a 400.
   *
   * @param requestId The id passed to {@link sendToken}.
   * @param code The code the user typed.
   */
  loginWithCode(requestId: string, code: string): Promise<void>;

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
