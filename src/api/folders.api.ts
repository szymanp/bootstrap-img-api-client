import { type FolderRefInput } from '../refs';
import type { ReadOptions, WriteLanguageOptions } from '../types/common';
import type { Collection, PageQuery, Resource } from '../types/envelope';
import type {
  CreateFolderInput,
  Folder,
  FolderRelated,
  MediaMembership,
  MediaMembershipPatch,
  MediaMembershipQuery,
  PermissionRecord,
  TreeQuery,
  UpdateFolderInput,
} from '../types/folders';
import type { MediaMetadata } from '../types/media';

export type FolderResource = Resource<Folder, FolderRelated>;
export type PermissionsCollection = Collection<Resource<PermissionRecord>, { folder?: FolderResource[] }>;
/** Result of a media-membership query: membership records plus the full media-item resources. */
export type MediaMembershipCollection = Collection<
  Resource<MediaMembership>,
  { mediaitem?: Resource<MediaMetadata>[] }
>;

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
  /** `media` for `mid:`/`img:` references, `folder` for `folderid:`/`folder:`. */
  type: 'media' | 'folder';
  /** The original `scheme:target` reference text. */
  reference: string;
}

/** Result of storing a folder's markdown body via {@link IFoldersApi.putText}. */
export interface PutTextResult {
  /** The folder's revision after the update (from `Revision-Id` / `meta.revision`). */
  revision: string | null;
  /**
   * References found in the body that did not resolve to an existing folder or
   * media item; empty when every reference resolved. Resolved references are
   * persisted server-side.
   */
  unresolvedReferences: UnresolvedReference[];
}

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
  listRoot(
    query?: PageQuery,
    options?: Pick<ReadOptions, 'acceptLanguage'>,
  ): Promise<Collection<FolderResource>>;

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
   * languages. `revision` must match the folder's current revision. The body is
   * scanned for `mid:`/`img:`/`folderid:`/`folder:` references: resolved ones
   * are persisted, and any that don't resolve are returned in
   * {@link PutTextResult.unresolvedReferences}. Returns the new revision.
   */
  putText(
    ref: FolderRefInput,
    markdown: string,
    revision: string,
    options?: Pick<WriteLanguageOptions, 'contentLanguage'>,
  ): Promise<PutTextResult>;

  /** List all permissions on a folder. */
  getPermissions(
    ref: FolderRefInput,
    options?: Pick<ReadOptions, 'acceptLanguage'>,
  ): Promise<PermissionsCollection>;

  /** Add, remove, or modify folder permissions. */
  patchPermissions(
    ref: FolderRefInput,
    records: PermissionRecord[],
    options?: Pick<ReadOptions, 'acceptLanguage'>,
  ): Promise<void>;

  /** List the folder's direct media-item membership. */
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

  /** Replace the folder's direct media membership with exactly `members`. */
  putMedia(ref: FolderRefInput, members: MediaMembership[]): Promise<void>;

  /** Apply an ordered list of membership patches; returns the resulting membership. */
  patchMedia(ref: FolderRefInput, patches: MediaMembershipPatch[]): Promise<MediaMembership[]>;
}
