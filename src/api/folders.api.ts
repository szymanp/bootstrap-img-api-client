import { type FolderRefInput } from '../refs';
import type { ReadOptions, WriteLanguageOptions } from '../types/common';
import type { Collection, PageQuery, Resource } from '../types/envelope';
import type {
  CreateFolderInput,
  EffectivePermission,
  Folder,
  FolderRelated,
  MediaMembership,
  MediaMembershipPatch,
  MediaMembershipQuery,
  PermissionRecord,
  TextMediaRecord,
  TreeQuery,
  UpdateFolderInput,
} from '../types/folders';
import type { MediaMetadata } from '../types/media';

/** Folder endpoints, scoped to a single repository. */
export interface IFoldersApi {
  /** Create a folder under an existing parent. */
  create(input: CreateFolderInput, options?: WriteLanguageOptions): Promise<FolderResource>;

  /** Retrieve a folder. */
  get(ref: FolderRefInput, options?: ReadOptions): Promise<FolderResource>;

  /** Update a folder (rename, move, retitle, or replace typed content). */
  update(
    ref: FolderRefInput,
    revision: string,
    data: UpdateFolderInput,
    options?: WriteLanguageOptions,
  ): Promise<FolderResource>;

  /** Delete a folder and all descendants (requires the current revision). */
  delete(ref: FolderRefInput, revision: string): Promise<void>;

  /** List root-level folders the caller can reach. */
  listRoot(query?: PageQuery, options?: Pick<ReadOptions, 'acceptLanguage'>): Promise<Collection<FolderResource>>;

  /** List direct children of a folder. */
  list(
    ref: FolderRefInput,
    query?: PageQuery,
    options?: Pick<ReadOptions, 'acceptLanguage'>,
  ): Promise<Collection<FolderResource>>;

  /** Return a recursive subtree of subfolders. */
  tree(
    ref: FolderRefInput,
    query?: TreeQuery,
    options?: Pick<ReadOptions, 'acceptLanguage'>,
  ): Promise<Collection<FolderResource>>;

  /** Read the folder's full localized markdown body and its revision. */
  getText(ref: FolderRefInput, options?: Pick<ReadOptions, 'acceptLanguage'>): Promise<FolderText>;

  /**
   * Store the folder's markdown body under `Content-Language`, preserving other
   * languages. `revision` must match the folder's current revision. The body
   * (GFM plus `::media`/`::gallery` embed directives) is scanned for
   * `media:`/`media-path:`/`folder:`/`folder-path:` references: every
   * reference found is persisted (resolved, missing, or malformed alike), and
   * ones that don't resolve are also reported in
   * {@link PutTextResult.unresolvedReferences}. Returns the new revision.
   */
  putText(
    ref: FolderRefInput,
    markdown: string,
    revision: string,
    options?: Pick<WriteLanguageOptions, 'contentLanguage'>,
  ): Promise<PutTextResult>;

  /**
   * Return every reference recorded from the folder's text body / associated
   * object data, re-resolved against current repository state. The language
   * is selected from `acceptLanguage` (defaulting to the client's language).
   * Supports a conditional GET via `ifNoneMatch`; an ETag match yields
   * `notModified: true`.
   */
  getTextMedia(ref: FolderRefInput, options?: TextMediaOptions): Promise<TextMediaResult>;

  /**
   * List the folder's effective permissions: its own grants plus those
   * inherited from ancestors. A record's `folder` names where the grant is
   * stored, so the direct grants are those whose `folder` is this folder's id.
   * Repository roles (owner/editor) are not included.
   */
  getPermissions(ref: FolderRefInput, options?: Pick<ReadOptions, 'acceptLanguage'>): Promise<PermissionsCollection>;

  /** Add, remove, or modify folder permissions. */
  patchPermissions(
    ref: FolderRefInput,
    records: PermissionRecord[],
    options?: Pick<ReadOptions, 'acceptLanguage'>,
  ): Promise<void>;

  /**
   * List the folder's direct media-item membership, in the folder's custom
   * order (see the `move` op on {@link MediaMembershipPatch}). A newly linked
   * item is appended to the end of that order.
   */
  getMedia(ref: FolderRefInput): Promise<MediaMembership[]>;

  /**
   * Query the folder's direct media-item membership with paging, filename
   * filtering, and ordering. Returns the matching membership records plus the
   * full media-item resources under `related.mediaitem`.
   */
  queryMedia(
    ref: FolderRefInput,
    query?: MediaMembershipQuery,
    options?: Pick<ReadOptions, 'acceptLanguage'>,
  ): Promise<MediaMembershipCollection>;

  /**
   * Replace the folder's direct media membership with exactly `members`. The
   * supplied array's order becomes the folder's new custom order.
   */
  putMedia(ref: FolderRefInput, members: MediaMembership[]): Promise<void>;

  /**
   * Apply an ordered list of membership patches (`add`, `remove`, or `move` —
   * see {@link MediaMembershipPatch}); returns the resulting membership in
   * the folder's custom order.
   */
  patchMedia(ref: FolderRefInput, patches: MediaMembershipPatch[]): Promise<MediaMembership[]>;
}

export type FolderResource = Resource<Folder, FolderRelated>;
export type PermissionsCollection = Collection<Resource<EffectivePermission>, { folder?: FolderResource[] }>;
/** Result of a media-membership query: membership records plus the full media-item resources. */
export type MediaMembershipCollection = Collection<
  Resource<MediaMembership>,
  { mediaitem?: Resource<MediaMetadata>[] }
>;

/** Related resources attached to a {@link IFoldersApi.getTextMedia} response. */
export interface TextMediaRelated {
  folders?: FolderResource[];
  mediaItems?: Resource<MediaMetadata>[];
}

/** Collection returned by {@link IFoldersApi.getTextMedia}. */
export type TextMediaCollection = Collection<TextMediaRecord, TextMediaRelated>;

/** Options for {@link IFoldersApi.getTextMedia}. */
export interface TextMediaOptions {
  /** Language version of the folder text to resolve references against. */
  acceptLanguage?: string;
  /** `If-None-Match` value(s) for a conditional GET (the ETag tracks the folder revision). */
  ifNoneMatch?: string | string[];
}

/** A folder's text-reference listing (200) or a not-modified result (304). */
export type TextMediaResult =
  | { notModified: false; result: TextMediaCollection; etag: string | null }
  | { notModified: true; etag: string | null };

/** Full markdown body of a folder's `text` subresource plus its metadata. */
export interface FolderText {
  text: string;
  /** Language the returned text is in (from `Content-Language`). */
  contentLanguage: string | null;
  /** The folder's current revision (from `Revision-Id`); pass back on writes. */
  revision: string | null;
}

/** A markdown reference that did not resolve to an existing folder/media item. */
export interface UnresolvedReference {
  /** `media` for `media:`/`media-path:` references, `folder` for `folder:`/`folder-path:`. */
  type: 'media' | 'folder';
  /** The original `scheme:target` reference text. */
  reference: string;
  /** `missing` (well-formed, no such target) or `malformed` (bad UUID, or a path escaping the repository root). */
  status: 'missing' | 'malformed';
  addressKind: 'by-id' | 'by-path';
}

/** Result of storing a folder's markdown body via {@link IFoldersApi.putText}. */
export interface PutTextResult {
  /** The folder's revision after the update (from `Revision-Id` / `meta.revision`). */
  revision: string | null;
  /**
   * References found in the body that did not resolve to an existing folder or
   * media item; empty when every reference resolved. Every reference found —
   * resolved, missing, or malformed alike — is persisted server-side and can
   * be queried later via {@link IFoldersApi.getTextMedia}.
   */
  unresolvedReferences: UnresolvedReference[];
}
