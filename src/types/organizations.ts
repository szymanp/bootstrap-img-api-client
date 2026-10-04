/** Organization types. */

import type { Localized, UuidString } from './common';

/**
 * An organization's name: a URL-safe slug (letters, digits, and hyphens, not
 * starting or ending with a hyphen, at most 60 characters). Case-insensitive;
 * the server stores and returns it in lowercase. Immutable after creation.
 */
export type OrganizationName = string;

/** An organization as returned in a resource envelope's `data`. */
export interface Organization {
  id: UuidString;
  name: OrganizationName;
  /** Single string in `standard` representation; all-languages object in `original`. */
  title?: Localized;
  [key: string]: unknown;
}

/** Body for `POST /orgs`. */
export interface CreateOrganizationInput {
  name: OrganizationName;
  /** A bare string is stored under `Content-Language`; an object sets every translation. */
  title: Localized;
}

/** Mutable fields for `POST /orgs/{orgName}` (omitted fields are left unchanged). */
export interface UpdateOrganizationInput {
  /**
   * A bare string is merged into the existing translations under
   * `Content-Language`; an object replaces every translation.
   */
  title?: Localized;
}

/** A user's role in an organization. An owner is also a member. */
export type OrganizationRole = 'owner' | 'member';

/** One entry of `GET /orgs/{orgName}/members`. */
export interface OrganizationMember {
  email: string;
  role: OrganizationRole;
}

/**
 * One operation of `PATCH /orgs/{orgName}/members`.
 * - `add` gives the user `role` (default `member`), adding them or changing the role they hold.
 * - `remove` removes the user; a no-op if they are not a member.
 */
export type OrganizationMemberPatch =
  | { op: 'add'; email: string; role?: OrganizationRole }
  | { op: 'remove'; email: string };
