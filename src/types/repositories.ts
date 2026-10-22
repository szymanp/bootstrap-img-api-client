import type { Localized, Principal, UuidString } from './common';

/** The identifier of a repository. */
export type RepositoryId = UuidString;

/** A repository as returned in a resource envelope's `data`. */
export interface Repository {
  id: RepositoryId;
  name?: string;
  /** Single string in `standard` representation; all-languages object in `original`. */
  title?: Localized;
  /**
   * When present, wholesale-replaces the set of owners. Only users hold
   * repository roles (any other principal is a `422`). Must not be empty —
   * `[]` is rejected with `422` (`ErrorType.RepositoryWouldHaveNoOwners`) and
   * nothing in the request is applied.
   */
  owners?: Principal[];
  /** When present, wholesale-replaces the set of editors; `[]` clears them. */
  editors?: Principal[];
  /**
   * Name of the repository's organization; absent if it has none. Returned
   * by default (and selectable with `fields`).
   */
  organizationName?: string;
  [key: string]: unknown;
}

/** How the caller relates to a repository, as a `POST /repos;query` filter. */
export type RepositoryRelationshipKind = 'owner' | 'editor' | 'follower';

/** A repository role. */
export type RepositoryRole = 'owner' | 'editor';

/**
 * `meta.relationship` of a repository resource read with a session: how the
 * caller relates to the repository.
 */
export interface RepositoryRelationship {
  /** The caller's repository roles (at most one today); empty without a role. */
  roles: RepositoryRole[];
  /** Whether the caller follows the repository. */
  following: boolean;
}

/** Body for `POST /repos`. */
export interface CreateRepositoryInput {
  name: string;
  title: string;
  /**
   * Name of the organization to create the repository in; the caller must be
   * a member (or owner) of it. Omit for a repository with no organization.
   */
  organization?: string;
}

/** Mutable fields for `POST /repos/{repoId}` (all optional — partial update; omitted fields are left unchanged). */
export interface UpdateRepositoryInput {
  name?: string;
  title?: Localized;
  /**
   * Moves the repository into that organization; the caller must be a member
   * (or owner) of it. A repository cannot be taken out of an organization.
   */
  organizationName?: string;
  owners?: Principal[];
  editors?: Principal[];
  [key: string]: unknown;
}
