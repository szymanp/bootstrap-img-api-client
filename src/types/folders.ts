import type { Effect, Localized, Permission, Principal, UuidString } from './common';
import type { Resource } from './envelope';
import type { MediaItemId } from './media';

/** Folder content kinds. */
export type FolderType = 'root' | 'albums' | 'album' | 'document' | 'tag' | 'media' | 'media-source' | 'picture';

/** A reference to a folder used inside JSON request bodies. */
export type FolderReference = { id: FolderId } | { path: string };

/** An identifier of a folder. */
export type FolderId = UuidString;

/** A folder as returned in a resource envelope's `data`. */
export interface Folder {
  id: FolderId;
  name?: string;
  path?: string;
  type?: FolderType;
  /** Single string in `standard`; all-languages object in `original`. */
  title?: Localized;
  /**
   * Arbitrary typed content JSON; shape depends on `type`. A reserved `text`
   * key, present on any folder type, carries the folder's associated object
   * data for markdown embeds (see `docs/folder_text.md#associated-object-data`).
   */
  data?: Record<string, unknown>;
  /** First 250 chars of the localized markdown body (standard representation only). */
  textPreview?: string;
  [key: string]: unknown;
}

/** Ancestor chain attached to single-folder responses (root down to parent). */
export interface FolderRelated {
  ancestors?: Resource<Folder>[];
}

/** Body for `POST /folders/{repoId}` (create). */
export interface CreateFolderInput {
  /**
   * The ID of the folder to be created.
   * 
   * If not specified, an ID will be assigned by the server.
   */
  id?: FolderId;
  parent: FolderReference;
  name: string;
  /**
   * A bare string is stored under `Content-Language`; an object carries every
   * translation at once (`{}` creates a folder with no title).
   */
  title: Localized;
  type: FolderType;
  /** Optional typed content; defaults to `{}` when omitted. */
  data?: Record<string, unknown>;
}

/** Mutable fields for `POST /folders/{repoId}/{folderVar}` (update). All optional. */
export interface UpdateFolderInput {
  name?: string;
  parent?: FolderReference;
  /** Bare string merges under Content-Language; object replaces all translations. */
  title?: Localized;
  /**
   * Replaces typed content wholesale (no key-level merge), including the
   * reserved `text` key; omit to leave unchanged. Every key is stored as
   * given, so strip the `type`/`title` keys a metadata snapshot adds.
   */
  data?: Record<string, unknown>;
}

/** A permission change sent to `PATCH .../permissions`. */
export interface PermissionRecord {
  principal: Principal;
  permission: Permission;
  /**
   * `grant` adds the permission on this folder (a no-op if already granted
   * here); `default` removes the grant stored on this folder, if any (a grant
   * inherited from an ancestor still applies).
   */
  effect: Effect;
}

/**
 * An effective grant as returned by `GET .../permissions` (and in metadata
 * snapshots): one per (principal, permission) pair, taken from the nearest
 * folder that grants it.
 */
export interface EffectivePermission {
  principal: Principal;
  /**
   * The folder the grant is stored on — the folder itself for a direct grant,
   * an ancestor for an inherited one.
   */
  folder: FolderId;
  permission: Permission;
}

/** A direct media-item membership entry on a folder. */
export interface MediaMembership {
  id: MediaItemId;
  filename: string;
}

/** Ordering for a media-membership query. */
export interface MediaMembershipOrderBy {
  /**
   * - `"filename"`, `"creationTime"`
   * - `"captureTime"` — the item's effective capture time, once metadata
   *   extraction has populated it (see `docs/media_metadata.md`); items with
   *   no extracted capture time sort last regardless of `order`
   * - `"custom"` — the folder's persisted, user-arrangeable order (see the
   *   `move` op on {@link MediaMembershipPatch})
   */
  property: 'filename' | 'creationTime' | 'captureTime' | 'custom';
  order: 'ascending' | 'descending';
}

/** Query body for `POST /folders/{repoId}/{folderVar}/media;query`. */
export interface MediaMembershipQuery {
  /** Paging offset. */
  offset?: number;
  /** Paging limit. */
  limit?: number;
  /** Wildcard to filter filenames on, e.g. `*.jpg`. */
  filename?: string;
  /** Defaults to `{ property: 'custom', order: 'ascending' }` when omitted. */
  orderBy?: MediaMembershipOrderBy;
  /** Field selector applied to `related.mediaitem` entries. */
  fields?: string | string[];
}

/** A patch op applied to a folder's direct media membership. */
export type MediaMembershipPatch =
  | { op: 'add'; id: MediaItemId; filename: string }
  | { op: 'remove'; filename: string }
  | {
      op: 'move';
      filename: string;
      /** Moves after this filename's link, or to the front when `null`/omitted. */
      afterFilename?: string | null;
    };

/** A single reference recorded from a folder's text body / associated object data. */
export interface TextMediaRecord {
  /** The original `scheme:target` reference text, e.g. `folder-path:../My album` or `media:<uuid>`. */
  url: string;
  /** Where the reference was found, e.g. `"text"` (more locations may be added later). */
  sourceLocation: string;
  targetKind: 'folder' | 'media';
  targetId: FolderId | MediaItemId;
  addressKind: 'by-id' | 'by-path';
  /** Whether the target currently exists, independent of the caller's read permissions. */
  status: 'resolved' | 'missing' | 'malformed';
}

/** Query for `action;tree`. */
export interface TreeQuery {
  depth?: number;
}
