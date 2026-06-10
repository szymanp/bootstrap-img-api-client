/** Authentication & session types. */

/** Body returned by `send-token` for test users (real users get it by email). */
export interface SendTokenResult {
  /** Present only for test users; otherwise the call returns 204 with no body. */
  token?: string;
}

/** Result of `GET /auth/session`. */
export interface Session {
  principal: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}
