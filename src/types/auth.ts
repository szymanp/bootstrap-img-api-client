/** Authentication & session types. */

import type { LinkSet } from "./envelope";
import type { FolderId } from "./folders";
import type { RepositoryId } from "./repositories";
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
 * - a registered user,
 * - an anonymous principal: an individual identity without an account, which
 *   can hold permissions and outlives its sessions.
 */
export type PrincipalId = UuidString;

/** The kind of principal a session belongs to. */
export type PrincipalType = 'user' | 'anonymous';

/** Result of `GET /auth/session`. */
export interface Session {
  /** The principal associated with this session. */
  principal: PrincipalId;

  /** Whether the session is a registered user's or an anonymous principal's. */
  principalType: PrincipalType;

  /** The email of the user; absent for an anonymous principal. */
  email?: string;

  /** The first name of the user; absent for an anonymous principal. */
  firstName?: string;

  /** The last name of the user; absent for an anonymous principal. */
  lastName?: string;

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

/**
 * Result of creating an anonymous principal (`POST /auth` with a bare
 * `X-Anonymous`).
 */
export interface AnonymousLoginResult {
  /** The new anonymous principal. */
  principal: PrincipalId;
  /**
   * The recovery token (43 base64url characters). It is returned only here,
   * and the server keeps only its SHA-256: a client that loses it can't
   * recover the identity. Whoever holds it can act as the principal.
   */
  token: string;
}

/** A folder of a redeemed access link. */
export interface RedeemedAccessLinkFolder {
  id: FolderId;
  /**
   * `published` leads to the folder's default publication revision; absent
   * when it has none ("Nothing published yet").
   */
  links: LinkSet;
}

/** Result of `POST /auth/action;redeem-access-link`. */
export interface RedeemAccessLinkResult {
  data: {
    repository: RepositoryId;
    /** `false` when the principal had redeemed the link already (a no-op). */
    newGrant: boolean;
    /** The folders of the link. */
    folders: RedeemedAccessLinkFolder[];
  };
  /** Has `published:discover` for the repository. */
  links: LinkSet;
}
