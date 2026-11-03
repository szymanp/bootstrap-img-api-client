import type { Effect, Localized, Permission, Principal, UuidString } from './common';
import type { PageCursor, PageQuery, Resource } from './envelope';
import type { MediaItemId, SortOrder } from './media';
import type { FolderPublicationStatus } from './publishing';

/**
 * Folder content kinds. `root`, `albums`, `home` (the repository's home
 * page), and `media` are built-in: every repository has exactly one of each
 * (`/`, `/albums`, `/home`, `/media`), no other folder of these types can be
 * created, and they cannot be renamed, moved, or deleted (422, title
 * `Built-in Folder`).
 *
 * A `page` must be in an `album`, a `page`, or `home`, and can contain only
 * pages; creating or moving a folder that breaks either rule fails with 422
 * (`ErrorType.ValidationFailed`, title `Invalid Folder Placement`).
 */
export type FolderType =
  | 'root'
  | 'albums'
  | 'home'
  | 'album'
  /** A folder which may contain other "album-collection"s and "album"s. */
  | 'album-collection'
  /**
   * Part of an album or of `/home`: a story, a gallery, or both (Markdown and
   * media items), and a container for child pages, nested to any depth. Its
   * `data` may carry the client's preferred rendering, which the server
   * doesn't interpret. Published with its album or `/home`, never on its own.
   */
  | 'page'
  | 'tag'
  | 'media'
  | 'media-source';

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
  /**
   * The folder's cover image. `standard`: a {@link FolderCover} (explicit or
   * automatic), absent when no item qualifies. `original`: the explicit
   * `{ id }` only, `null` when automatic.
   */
  cover?: FolderCover | FolderCoverInput | null;
  /**
   * The folder's date range. `standard`: a {@link FolderDateRange} (explicit
   * or automatic), absent when neither exists. `original`: the explicit
   * `{ start, end }` only, `null` when automatic.
   */
  dateRange?: FolderDateRange | FolderDateRangeInput | null;
  /**
   * The folder's {@link FolderTag}s, normalized and sorted by code point. Also
   * present in `original` and on `related.ancestors` entries.
   */
  tags?: FolderTag[];
  /**
   * Whether the folder is a page of the publications that include it (its
   * ancestors' publications); `true` unless set otherwise. A folder with
   * `false` has no page of its own, but its media still count towards its
   * ancestors' pages. No effect on a publication of the folder itself. Also
   * present in `original` and on `related.ancestors` entries.
   */
  includeInPublication?: boolean;
  /**
   * The folder's publication status, present once it has a public key or has
   * been published. Not in `original`, nor on `related.ancestors` entries.
   */
  publication?: FolderPublicationStatus;
  /**
   * Number of distinct media items the folder exposes (its own and all its
   * subfolders'), of any type or visibility. Omitted in `original`.
   */
  itemCount?: number;
  [key: string]: unknown;
}

/** Whether a folder summary value was chosen by the user or computed by the server. */
export type FolderSummarySelection = 'explicit' | 'auto';

/** A folder's cover image, as returned in the `standard` representation. */
export interface FolderCover {
  id: MediaItemId;
  selection: FolderSummarySelection;
}

/** A folder's date range, as returned in the `standard` representation. Dates are `YYYY-MM-DD`, inclusive. */
export interface FolderDateRange {
  start: string;
  end: string;
  selection: FolderSummarySelection;
}

/**
 * An explicit cover, as written on create/update. The item must be an image
 * with `normal` visibility that the folder or one of its subfolders contains.
 */
export interface FolderCoverInput {
  id: MediaItemId;
}

/** An explicit date range (`YYYY-MM-DD`, both required, inclusive), as written on create/update. */
export interface FolderDateRangeInput {
  start: string;
  end: string;
}

/**
 * A folder tag. Tags belong to the repository (a tag exists while a folder uses
 * it) and apply only to the folder they're assigned to, not its descendants.
 *
 * The server normalizes every tag it receives: NFC, locale-independent
 * lowercase, NFC again, then a `system:` prefix is split off. The remaining
 * name must be 1–100 code points, each a Unicode letter or number, `_`, `-`,
 * or a combining mark following one of those; anything else (spaces, other
 * punctuation, symbols) fails the whole request with a 400
 * (`ErrorType.ValidationFailed`). Accents are significant.
 *
 * A `system:<name>` tag (e.g. `system:favorite`) behaves like any other, but
 * clients treat it specially and `GET /repos/{repoId}/tags` doesn't list it.
 */
export type FolderTag = string;

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
  /** Not one of the built-in types (`root`/`albums`/`home`/`media`): that is a 422. */
  type: FolderType;
  /** Optional typed content; defaults to `{}` when omitted. */
  data?: Record<string, unknown>;
  /**
   * Accepted as on update, but a new folder contains no media, so a `cover`
   * is always rejected here (422); it is useful in a metadata-sync
   * `folder.create`, which can add the media in the same operation.
   */
  cover?: FolderCoverInput | null;
  /** Explicit date range; `null`/omitted means automatic. `start` after `end` is a 400. */
  dateRange?: FolderDateRangeInput | null;
  /** The new folder's {@link FolderTag}s; an invalid tag is a 400. */
  tags?: FolderTag[];
  /** The folder's {@link Folder.includeInPublication}; `true` when omitted. */
  includeInPublication?: boolean;
}

/** Mutable fields for `POST /folders/{repoId}/{folderVar}` (update). All optional. */
export interface UpdateFolderInput {
  name?: string;
  /** Moves the folder; needs `write` on the new parent (naming the current parent is not a move). */
  parent?: FolderReference;
  /** Bare string merges under Content-Language; object replaces all translations. */
  title?: Localized;
  /**
   * Replaces typed content wholesale (no key-level merge), including the
   * reserved `text` key; omit to leave unchanged. Every key is stored as
   * given, so strip the `type`/`title` keys a metadata snapshot adds.
   */
  data?: Record<string, unknown>;
  /**
   * Sets the explicit cover; `null` returns to the automatic cover. The item
   * must be an image with `normal` visibility that the folder or one of its
   * subfolders contains (checked after any move in the same request);
   * otherwise a 422 (`Invalid Folder Cover`), or a 404
   * (`ErrorType.MediaItemNotFound`) for a nonexistent item.
   */
  cover?: FolderCoverInput | null;
  /**
   * Sets the explicit date range; `null` returns to the automatic range. Not
   * checked against the folder's media. `start` after `end` is a 400.
   */
  dateRange?: FolderDateRangeInput | null;
  /**
   * Sets the folder's {@link FolderTag}s to exactly these; `[]` removes them
   * all. A tag repeated after normalization counts once. An invalid tag is a
   * 400 (`null` is not accepted). Bumps the revision when the set changes.
   */
  tags?: FolderTag[];
  /** Sets the folder's {@link Folder.includeInPublication} (`null` is a 400). Bumps the revision. */
  includeInPublication?: boolean;
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
  order: SortOrder;
}

/**
 * Query-form body for `POST /folders/{repoId}/{folderVar}/media;query`:
 * filters, order, and where the page starts. Entries are links, so an item
 * linked under two filenames is two entries.
 */
export interface MediaMembershipFilterQuery {
  /** Entry to count `offset` from; a 404 `media-item-not-in-list` when there's no such (matching) filename. */
  relativeTo?: { filename: string };
  /**
   * Entries to skip from the start of the list (`>= 0`), or, with
   * `relativeTo`, the position relative to that entry (`0` starts with it,
   * `-10` with the ten before it, `1` with the one after it). Defaults to `0`.
   */
  offset?: number;
  /** Page size (`>= 1`); without it, every entry is returned. */
  limit?: number;
  /** Wildcard to filter filenames on, e.g. `*.jpg`. */
  filename?: string;
  /** Defaults to `{ property: 'custom', order: 'ascending' }` when omitted. */
  orderBy?: MediaMembershipOrderBy;
  /** Field selector applied to `related.mediaitem` entries. */
  fields?: string | string[];
  cursor?: never;
}

/**
 * Cursor-form body for `POST /folders/{repoId}/{folderVar}/media;query`:
 * continues from a previous response's `meta.prev`/`meta.next`. The cursor
 * carries the filter and order, so they can't be sent alongside it.
 */
export interface MediaMembershipCursorQuery {
  cursor: PageCursor;
  /** Page size (`>= 1`); any size works with any cursor. */
  limit?: number;
  /** Field selector applied to `related.mediaitem` entries. */
  fields?: string | string[];
  relativeTo?: never;
  offset?: never;
  filename?: never;
  orderBy?: never;
}

/** Query body for `POST /folders/{repoId}/{folderVar}/media;query` (see "Paging media lists" in the API docs). */
export type MediaMembershipQuery = MediaMembershipFilterQuery | MediaMembershipCursorQuery;

/** A patch op applied to a folder's direct media membership. */
export type MediaMembershipPatch =
  | {
    op: 'add';
    id: MediaItemId;
    /**
     * Defaults to the item's `originalFilename`, or `<id>.<ext>` when it has
     * none.
     */
    filename?: string;
    /**
     * When the name is already linked in the folder: `fail` with a `409`
     * (default when `filename` is given), or `rename` to the first free
     * `name (2).ext`, `name (3).ext`, … (default when `filename` is omitted).
     */
    onConflict?: 'fail' | 'rename';
  }
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
  /** Levels below the folder to include (`>= 1`; `1` = direct children only); the whole subtree when omitted. */
  depth?: number;
}

/** Query for a folder's `action;list`: a flat list of its subfolders, by path unless `orderBy` says otherwise. */
export interface FolderListQuery extends PageQuery {
  /**
   * Levels below the folder to include (`>= 1`; `1` = direct children only),
   * or `null` for the whole subtree. Defaults to `1`.
   */
  depth?: number | null;
  /**
   * Non-empty list of folder types to list. Filters the listed folders, not the
   * walk: a folder of another type is left out, but its descendants within
   * `depth` are still listed. Every type when omitted. Paging applies after it.
   */
  folderType?: FolderType[];
  /**
   * Lists only folders having at least one of these {@link FolderTag}s
   * (unknown tags match nothing). Not filtered by tag when omitted or empty.
   * Paging applies after it; an invalid tag is a 400.
   */
  tags?: FolderTag[];
  /** Order of the list; `{ property: 'tree', order: 'ascending' }` when omitted. Paging applies after it. */
  orderBy?: FolderListOrderBy;
}

/** Ordering for `POST /folders/{repoId}/{folderVar}/action;list`. */
export interface FolderListOrderBy {
  /**
   * - `"tree"` (default) — by path, so each folder comes right before its own
   *   descendants; the only order that keeps the hierarchy together when
   *   `depth` goes below the direct children
   * - `"name"` — by `name`, compared by code point
   * - `"title"` — by the title in the negotiated `Accept-Language` (else
   *   another stored language), falling back to `name`; Unicode root collation
   * - `"dateRangeStart"` — by the start of the explicit, else automatic,
   *   `dateRange`; folders without one sort last regardless of `order`
   *
   * Ties are ordered by path.
   */
  property: 'tree' | 'name' | 'title' | 'dateRangeStart';
  order: SortOrder;
}
