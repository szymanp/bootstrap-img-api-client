import type { LanguageTag, Localized, Principal } from './common';
import type {
  FolderCoverInput,
  FolderDateRangeInput,
  FolderId,
  FolderReference,
  FolderType,
  MediaMembershipPatch,
  PermissionRecord,
} from './folders';

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
  /** A bare string is stored under the sync request's `Content-Language` (or the server default). */
  title?: Localized;
  /** Moves the repository into that organization (the caller must be a member); it cannot be taken out of one. */
  organizationName?: string;
  /** Wholesale-replaces the owners; `[]` fails the whole plan with `422` (`ErrorType.RepositoryWouldHaveNoOwners`). */
  owners?: Principal[];
  /** Wholesale-replaces the editors; `[]` clears them. */
  editors?: Principal[];
}

/** `folder.create` — mirrors `POST /folders/{repoId}`. */
export interface FolderCreateOperation {
  op: 'folder.create';
  /** Required here, unlike `POST /folders/{repoId}` — lets other operations in the same plan reference it. */
  id: FolderId;
  /**
   * `{ id }` may name another `folder.create` in the same plan. A `{ path }`
   * is resolved against the repository as it was *before* the plan, so it
   * cannot name a folder the plan creates.
   */
  parent: FolderReference;
  name: string;
  /**
   * A bare string is stored under the sync request's `Content-Language` (or
   * the server default); an object sets specific languages (`{}` allowed).
   */
  title: Localized;
  type: FolderType;
  data?: Record<string, unknown>;
  /** Markdown body per language, as a snapshot folder record's `texts`. */
  texts?: Record<LanguageTag, string>;
  /** Same patch array as `PATCH .../permissions`; requires the repository owner role. */
  permissions?: PermissionRecord[];
  /** Same patch array as `PATCH .../media`, applied in array order. */
  media?: MediaMembershipPatch[];
  /** Explicit date range, as on `POST /folders/{repoId}`; `null`/omitted means automatic. */
  dateRange?: FolderDateRangeInput | null;
  /**
   * Explicit cover, as on `POST /folders/{repoId}`. Unlike there, it can be
   * valid: it is checked after this operation's `media` patches, so the plan
   * can link an item into the new folder and make it the cover.
   */
  cover?: FolderCoverInput | null;
}

/**
 * `folder.update` — mirrors `POST /folders/{repoId}/{folderIdOrPath}` plus
 * its `text`/`permissions`/`media` subresources.
 */
export interface FolderUpdateOperation {
  op: 'folder.update';
  /**
   * Bare folder UUID (not a `{ id }`/`{ path }` reference). At most one
   * `folder.update`/`folder.delete` per folder per plan, and never a folder
   * created in the same plan.
   */
  folder: FolderId;
  expectedRevision: string;
  changes: FolderUpdateChanges;
}

/** `folder.delete` — mirrors `DELETE /folders/{repoId}/{folderIdOrPath}`. */
export interface FolderDeleteOperation {
  op: 'folder.delete';
  /**
   * Bare folder UUID (not a `{ id }`/`{ path }` reference). Deletes the whole
   * subtree; no `folder.create`/`folder.update` in the same plan may place a
   * folder anywhere inside it (move folders out of it first).
   */
  folder: FolderId;
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
  /** Same forms and resolution rules as {@link FolderCreateOperation.parent}. */
  parent?: FolderReference;
  /** A bare string merges under the sync request's `Content-Language`; an object replaces all translations. */
  title?: Localized;
  /** Replaces typed content wholesale; strip a snapshot's added `type`/`title` keys first. */
  data?: Record<string, unknown>;
  texts?: MetadataSyncTextChanges;
  /**
   * A `permissions` change requires the caller to hold the repository's
   * owner role, matching `PATCH .../permissions`.
   */
  permissions?: PermissionRecord[];
  media?: MediaMembershipPatch[];
  /** As on `POST /folders/{repoId}/{folderVar}`; `null` returns to the automatic range. */
  dateRange?: FolderDateRangeInput | null;
  /**
   * As on `POST /folders/{repoId}/{folderVar}`; `null` returns to the
   * automatic cover. Applied last, after `media`, so it can name an item the
   * same operation links into the folder.
   */
  cover?: FolderCoverInput | null;
}
