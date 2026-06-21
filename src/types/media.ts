import type { FolderReference } from './folders';

export type MediaType = 'image' | 'video';
export type MediaVisibility = 'private' | 'normal' | 'published' | string;

/** Metadata payload returned by the media `metadata` endpoints. */
export interface MediaMetadata {
  id: string;
  type: MediaType | string;
  visibility: MediaVisibility;
  /** The hash of the original blob associated with this media item. */
  originalHash: string;
  [key: string]: unknown;
}

/** Body for `POST /media/{repoId}/action;list`. */
export interface MediaListQuery {
  folder: FolderReference;
  mediaType?: MediaType;
  visibility?: MediaVisibility;
  offset?: number;
  limit?: number;
  orderBy?: string;
}

/** Acceptable binary payloads for an upload. */
export type BinaryBody = Blob | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array>;

/** Result of a media upload. */
export interface UploadResult {
  mediaItemId: string;
}

/** A binary download (200) or a not-modified result (304). */
export type DownloadResult =
  | { notModified: false; body: ArrayBuffer; contentType: string | null; etag: string | null }
  | { notModified: true; etag: string | null };
