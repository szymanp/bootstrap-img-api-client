import type { FolderRefInput, MediaRef } from '../refs';
import type { Collection, Resource } from '../types/envelope';
import type { BinaryBody, DownloadResult, MediaListQuery, MediaMetadata, UploadResult } from '../types/media';

export type MediaResource = Resource<MediaMetadata>;

/** Options for downloading a media binary. */
export interface DownloadOptions {
  /** Variant name (e.g. `thumbnail`, `medium`) instead of the original. */
  size?: string;
  /** `If-None-Match` value(s) for a conditional GET. */
  ifNoneMatch?: string | string[];
}

/** Options for {@link IMediaApi.textRefs}. */
export interface TextRefsOptions {
  /** Language version of the folder text to resolve references against. */
  acceptLanguage?: string;
  /** `If-None-Match` value(s) for a conditional GET (the ETag tracks the folder revision). */
  ifNoneMatch?: string | string[];
}

/** A media-by-text-references listing (200) or a not-modified result (304). */
export type TextRefsResult =
  | { notModified: false; collection: Collection<MediaResource>; etag: string | null }
  | { notModified: true; etag: string | null };

/** Media-item endpoints, scoped to a single repository. */
export interface IMediaApi {
  /**
   * Upload a media item into a folder under `filename`. `contentType` must be an
   * `image/*` or `video/*` type. Returns the assigned media-item id.
   */
  upload(folder: FolderRefInput, filename: string, body: BinaryBody, contentType: string): Promise<UploadResult>;

  /**
   * Download a media binary. Returns `{ notModified: true }` when a conditional
   * GET matches (HTTP 304); otherwise the binary plus content type and ETag.
   */
  download(ref: MediaRef, options?: DownloadOptions): Promise<DownloadResult>;

  /** Read a media item's metadata and variant links. */
  metadata(ref: MediaRef): Promise<MediaResource>;

  /** List media items in a folder. */
  list(query: MediaListQuery, options?: { acceptLanguage?: string }): Promise<Collection<MediaResource>>;

  /**
   * List every media item referenced in the text body of `folder` (the
   * resolved `mid:`/`img:` references). The language is selected from
   * `acceptLanguage` (defaulting to the client's language). Supports a
   * conditional GET via `ifNoneMatch`; an ETag match yields `notModified: true`.
   */
  textRefs(folder: FolderRefInput, options?: TextRefsOptions): Promise<TextRefsResult>;
}
