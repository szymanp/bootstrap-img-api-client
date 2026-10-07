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
   * When present, wholesale-replaces the set of owners. Must not be empty —
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
