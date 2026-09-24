import type { Localized, Principal } from './common';

/** A repository as returned in a resource envelope's `data`. */
export interface Repository {
  id: string;
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
  [key: string]: unknown;
}

/** Body for `POST /repos`. */
export interface CreateRepositoryInput {
  name: string;
  title: string;
}

/** Mutable fields for `POST /repos/{repoId}` (all optional — partial update; omitted fields are left unchanged). */
export interface UpdateRepositoryInput {
  name?: string;
  title?: Localized;
  owners?: Principal[];
  editors?: Principal[];
  [key: string]: unknown;
}
