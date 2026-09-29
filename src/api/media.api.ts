import type { Sha256Input } from '../http/digest';
import type { FolderRefInput, MediaRef } from '../refs';
import type { MediaItemVariantName, ReadOptions } from '../types/common';
import type { Collection, HlsRenditionLink, MediaItemVariantLink, Resource } from '../types/envelope';
import type {
  BinaryBody,
  DownloadResult,
  MediaListQuery,
  MediaMetadata,
  MediaType,
  UploadResult,
} from '../types/media';

export type MediaResource = Resource<MediaMetadata>;

/** Options for downloading a media binary. */
export interface DownloadOptions {
  /** Variant name (e.g. `thumbnail`, `medium`) instead of the original. */
  size?: string;
  /** `If-None-Match` value(s) for a conditional GET. */
  ifNoneMatch?: string | string[];
}

/** Options for {@link IMediaApi.uploadById}. */
export interface UploadByIdOptions {
  /**
   * SHA-256 of the whole file (32 raw bytes, or hex/base64). Sent as
   * `Repr-Digest`; the server rejects a full upload whose bytes don't match
   * with a `400` {@link ErrorType.DigestMismatch}.
   */
  sha256?: Sha256Input;
  /**
   * Try an upload claim before sending the bytes: if the server already holds
   * a file with this `sha256`, prove possession and create the item without
   * transferring it. Requires `sha256` and a `Blob`/`ArrayBuffer`/
   * `ArrayBufferView` body (a `ReadableStream` can't be re-read for the
   * fallback upload). Falls back to a full upload when the server won't take
   * a claim, the proof is rejected, or Web Crypto isn't available.
   */
  claim?: boolean;
}

/** An answered possession-proof challenge, for {@link IMediaApi.claimById}. */
export interface PossessionProof {
  /** The challenge token, exactly as received. */
  challenge: string;
  /** Hex-encoded HMAC response (see `computePossessionProof`). */
  response: string;
}

export interface MediaItemVariant extends MediaItemVariantLink {
  /** The name of this variant. E.g. "primary" or "fhd". */
  name: MediaItemVariantName;
  /** The type of media (image or video) that this variant represents. */
  type: MediaType;
}

/** One HLS rendition (variant playlist) of a video media item, e.g. "hd". */
export interface HlsRendition extends HlsRenditionLink {
  /** The name of this rendition. E.g. "hd" or "sd". */
  name: MediaItemVariantName;
}

/** Media-item endpoints, scoped to a single repository. */
export interface IMediaApi {
  /**
   * Upload a media item into a folder under `filename`. `contentType` must be an
   * `image/*` or `video/*` type. Returns the assigned media-item id.
   */
  uploadToFolder(
    folder: FolderRefInput,
    filename: string,
    body: BinaryBody,
    contentType: string,
  ): Promise<UploadResult>;

  /**
   * Upload a media item under a known stable id. `contentType` must be an
   * `image/*` or `video/*` type. The user must be a repository owner or editor.
   * Throws an {@link ApiError} with status `409` if an item already exists at
   * that id whose original blob differs from the uploaded binary. Returns the
   * media-item id echoed by the server, and whether the bytes were sent.
   *
   * With `options.claim`, only the chunks the server challenges for are read
   * from `body`. In Node, pass `await fs.openAsBlob(path)` as the body and a
   * streamed `node:crypto` hash as `sha256` to avoid loading the file into
   * memory.
   */
  uploadById(
    mediaItemId: string,
    body: BinaryBody,
    contentType: string,
    options?: UploadByIdOptions,
  ): Promise<UploadResult>;

  /**
   * Low-level upload claim: `PUT` with an empty body and `Repr-Digest`, plus
   * `Possession-Proof` when `proof` is given. Resolves (`transferred: false`)
   * when the item was created, or already exists with this hash. Otherwise
   * throws an {@link ApiError}:
   * - `428` {@link ErrorType.PossessionProofRequired} — `problem` is a
   *   `PossessionProofRequiredProblem`; answer it and call again with `proof`.
   * - `422` {@link ErrorType.UploadRequired} — upload the file in full.
   * - `403` {@link ErrorType.PossessionProofInvalid} — wrong or expired proof.
   * - `409` — an item with this id exists with a different hash.
   *
   * {@link uploadById} with `claim: true` runs this whole flow.
   */
  claimById(mediaItemId: string, sha256: Sha256Input, proof?: PossessionProof): Promise<UploadResult>;

  /**
   * Download a media binary. Returns `{ notModified: true }` when a conditional
   * GET matches (HTTP 304); otherwise the binary plus content type and ETag.
   */
  download(ref: MediaRef, options?: DownloadOptions): Promise<DownloadResult>;

  /**
   * Read a media item's metadata and variant links. `fields` selects among
   * `type`, `visibility`, `originalHash`, and `metadata` (`id` is always
   * included); defaults to every field except `metadata`, which requires an
   * extra DB lookup and must be requested explicitly.
   */
  metadata(ref: MediaRef, options?: Pick<ReadOptions, 'fields'>): Promise<MediaResource>;

  /**
   * Reads a list of media item variants for this media resource: `image:variant:*`
   * for an image item, `video:poster:variant:*` for a video item's poster frame.
   */
  getVariants(resource: MediaResource): MediaItemVariant[];

  /** Reads a video media item's HLS renditions (`video:hls:variant:*`), e.g. for a quality picker. */
  getHlsRenditions(resource: MediaResource): HlsRendition[];

  /**
   * Download a video item's poster frame (a WebP image). Same `?size=`/conditional-GET
   * semantics as {@link download}, since the poster is an image regardless of the
   * parent item's media type.
   */
  downloadPoster(ref: MediaRef, options?: DownloadOptions): Promise<DownloadResult>;

  /** Download a video item's HLS master playlist (`.m3u8` text). */
  hlsMaster(ref: MediaRef): Promise<string>;

  /** List media items in a folder. */
  list(query: MediaListQuery, options?: { acceptLanguage?: string }): Promise<Collection<MediaResource>>;
}
