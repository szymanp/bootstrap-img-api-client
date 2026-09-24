import type { LanguageTag, Localized, Principal } from './common';
import type { FolderReference, FolderType, MediaMembershipPatch, PermissionRecord } from './folders';

/** Body for `POST /repos/{repoId}/metadata-sync`'s `operations`. */
export interface MetadataSyncPlan {
  operations: MetadataSyncOperation[];
}

/**
 * The possible metadata sync operations.
 */
export type MetadataSyncOperation =
  | RepositoryUpdateOperation
  | FolderCreateOperation
  | FolderUpdateOperation
  | FolderDeleteOperation;

/** `repository.update` — mirrors `POST /repos/{repoId}`. */
export interface RepositoryUpdateOperation {
  op: 'repository.update';
  /** The repository's current revision. */
  expectedRevision: string;
  name?: string;
  title?: Localized;
  /** Wholesale-replaces the owners; `[]` fails the whole plan with `422` (`ErrorType.RepositoryWouldHaveNoOwners`). */
  owners?: Principal[];
  /** Wholesale-replaces the editors; `[]` clears them. */
  editors?: Principal[];
}

/** `folder.create` — mirrors `POST /folders/{repoId}`. */
export interface FolderCreateOperation {
  op: 'folder.create';
  /** Required here, unlike `POST /folders/{repoId}` — lets other operations in the same plan reference it. */
  id: string;
  parent: FolderReference;
  name: string;
  title: string;
  type: FolderType;
  data?: Record<string, unknown>;
}

/**
 * `folder.update` — mirrors `POST /folders/{repoId}/{folderIdOrPath}` plus
 * its `text`/`permissions`/`media` subresources.
 */
export interface FolderUpdateOperation {
  op: 'folder.update';
  folder: FolderReference;
  expectedRevision: string;
  changes: FolderUpdateChanges;
}

/** `folder.delete` — mirrors `DELETE /folders/{repoId}/{folderIdOrPath}`. */
export interface FolderDeleteOperation {
  op: 'folder.delete';
  folder: FolderReference;
  expectedRevision: string;
}

/**
 * `folder.update`'s markdown-text change: `put` stores/replaces the body for
 * each named language (merged into the folder's existing translations, like
 * `PUT .../text`); `delete` removes a stored language entirely (no
 * single-resource equivalent exists for this).
 */
export interface MetadataSyncTextChanges {
  put?: Record<LanguageTag, string>;
  delete?: LanguageTag[];
}

/** The fields a `folder.update` operation actually modifies. */
export interface FolderUpdateChanges {
  name?: string;
  parent?: FolderReference;
  title?: Localized;
  data?: Record<string, unknown>;
  texts?: MetadataSyncTextChanges;
  /**
   * A `permissions` change requires the caller to hold the repository's
   * owner role, matching `PATCH .../permissions`.
   */
  permissions?: PermissionRecord[];
  media?: MediaMembershipPatch[];
}
