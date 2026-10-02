/** Authentication & session types. */

import type { UuidString } from "./common";

/** Body returned by `send-token` for test users (real users get it by email). */
export interface SendTokenResult {
  /** Present only for test users; otherwise the call returns 204 with no body. */
  token?: string;
}

/**
 * The identifier of the principal within the system - a UUID.
 * 
 * 
 * A principal can be:
 * - an authenticated user,
 * - a user accessing the system via a link that grants certain access,
 * - an anonymous user.
 */
export type PrincipalId = UuidString;

/** Result of `GET /auth/session`. */
export interface Session {
  /**
   * The principal associated with this session.
   * The principal will always be an authenticated user.
   */
  principal: PrincipalId;

  /**
   * The email of the user.
   */
  email: string;

  /**
   * The first name of the user.
   */
  firstName: string;

  /**
   * The last name of the user.
   */
  lastName: string;

  /**
   * The date and time when the session was started.
   * 
   * The format is: 2026-01-01T00:00:00Z
   */
  createdAt: string;

  /**
   * The date and time when the session expires.
   * 
   * The format is: 2026-01-01T00:00:00Z
   */
  expiresAt: string;
}
