import type { UuidString } from './common';
import type { FolderReference } from './folders';

/** The identifier of a media item. */
export type MediaItemId = UuidString;

export type MediaType = 'image' | 'video';
export type MediaVisibility = 'private' | 'normal' | 'published' | string;

/** Effective capture time extracted from embedded metadata (see `docs/media_metadata.md`). */
export interface MediaCaptureTime {
  /** Local wall-clock time with no offset, e.g. `"2026-08-23T17:42:11.384"`. */
  local: string;
  /** UTC offset, e.g. `"+02:00"`; absent when the timezone is unknown. */
  offset?: string;
  /** UTC instant (`local` combined with `offset`); absent when the timezone is unknown. */
  instant?: string;
  /** Calendar date, `"YYYY-MM-DD"`. */
  date: string;
  /** Precision of the extracted value, e.g. `"millisecond"` or `"second"`. */
  precision: string;
  /** How the value was derived, e.g. `"embedded"` or `"timezone_missing"`. */
  quality: string;
}

/** Pixel dimensions, taken from the orientation-corrected display size when known. */
export interface MediaDimensions {
  width: number;
  height: number;
  /** Raw EXIF orientation code (1-8); images only. */
  orientation?: number;
}

/** Camera/lens info extracted from embedded metadata. */
export interface MediaCamera {
  make?: string;
  model?: string;
  lens?: string;
}

/** Format as detected by the metadata extractor. */
export interface MediaFormatInfo {
  name?: string;
  mimetype?: string;
}

/**
 * Effective common properties extracted from embedded metadata (see
 * `docs/media_metadata.md`). Each group is present only once at least one of
 * its fields is known; a group with nothing extracted is omitted entirely
 * rather than returned with null values. GPS/location is not exposed here.
 */
export interface MediaEffectiveMetadata {
  captureTime?: MediaCaptureTime;
  dimensions?: MediaDimensions;
  camera?: MediaCamera;
  format?: MediaFormatInfo;
  /** Video only. */
  durationMs?: number;
}

/** Metadata payload returned by the media `metadata` endpoints. */
export interface MediaMetadata {
  id: MediaItemId;
  type: MediaType | string;
  visibility: MediaVisibility;
  /** The hash of the original blob associated with this media item. */
  originalHash: string;
  /**
   * Extracted common properties; absent until metadata extraction has
   * populated anything at all. Only returned when requested via the
   * `fields` selector (see {@link IMediaApi.metadata}).
   */
  metadata?: MediaEffectiveMetadata;
  [key: string]: unknown;
}

/** Sort direction; `asc`/`desc` are accepted as aliases. */
export type SortOrder = 'ascending' | 'descending' | 'asc' | 'desc';

/**
 * Paging offset for `POST /media/{repoId}/action;list`: a number of items to
 * skip (shorthand for `{ index }`), or `{ after }` to continue after that
 * item (keyset pagination). The response's `meta.offset` echoes it in object
 * form.
 */
export type MediaListOffset = number | { index: number } | { after: MediaItemId };

/** Ordering for `POST /media/{repoId}/action;list`. */
export interface MediaListOrderBy {
  /**
   * `"creationTime"` (default) or `"captureTime"` — the item's effective
   * capture time, once metadata extraction has populated it (see
   * `docs/media_metadata.md`); items with no extracted capture time sort
   * last regardless of `order`.
   */
  property: 'creationTime' | 'captureTime';
  order: SortOrder;
}

/** Body for `POST /media/{repoId}/action;list`. */
export interface MediaListQuery {
  folder: FolderReference;
  mediaType?: MediaType;
  visibility?: MediaVisibility;
  offset?: MediaListOffset;
  limit?: number;
  /** Defaults to `{ property: 'creationTime', order: 'descending' }` when omitted. */
  orderBy?: MediaListOrderBy;
  /** Field selector applied to the returned media-item resources. */
  fields?: string | string[];
}

/** Acceptable binary payloads for an upload. */
export type BinaryBody = Blob | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array>;

/** Result of a media upload. */
export interface UploadResult {
  mediaItemId: MediaItemId;
  /**
   * Set by `uploadById`: `false` when the item was created from an upload
   * claim without sending the bytes, `true` when the file was uploaded in full.
   */
  transferred?: boolean;
}

/** A binary download (200) or a not-modified result (304). */
export type DownloadResult =
  | { notModified: false; body: ArrayBuffer; contentType: string | null; etag: string | null }
  | { notModified: true; etag: string | null };
