import type { Localized, Principal } from './common.js';

/** A repository as returned in a resource envelope's `data`. */
export interface Repository {
  id: string;
  name?: string;
  /** Single string in `standard` representation; all-languages object in `original`. */
  title?: Localized;
  owners?: Principal[];
  editors?: Principal[];
  [key: string]: unknown;
}

/** Body for `POST /repos`. */
export interface CreateRepositoryInput {
  name: string;
  title: string;
}

/** Mutable fields for `POST /repos/{repoId}` (all optional — partial update). */
export interface UpdateRepositoryInput {
  name?: string;
  title?: Localized;
  owners?: Principal[];
  editors?: Principal[];
  [key: string]: unknown;
}
