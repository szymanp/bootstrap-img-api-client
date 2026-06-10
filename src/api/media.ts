import { parseJson, Transport } from "../http/transport.js";
import { MediaRef } from "../refs.js";
import type { FolderRefInput } from "../refs.js";
import type { Collection, Resource } from "../types/envelope.js";
import type {
  BinaryBody,
  DownloadResult,
  MediaListQuery,
  MediaMetadata,
  UploadResult,
} from "../types/media.js";

export type MediaResource = Resource<MediaMetadata>;

/** Options for downloading a media binary. */
export interface DownloadOptions {
  /** Variant name (e.g. `thumbnail`, `medium`) instead of the original. */
  size?: string;
  /** `If-None-Match` value(s) for a conditional GET. */
  ifNoneMatch?: string | string[];
}

/** Media-item endpoints, scoped to a single repository. */
export class MediaApi {
  constructor(
    private readonly transport: Transport,
    private readonly repoId: string,
  ) {}

  private base(): string {
    return `/media/${encodeURIComponent(this.repoId)}`;
  }

  private mediaPath(ref: MediaRef, suffix = ""): string {
    return `${this.base()}/${ref.toPathSuffix()}${suffix}`;
  }

  /**
   * Upload a media item into a folder under `filename`. `contentType` must be an
   * `image/*` or `video/*` type. Returns the assigned media-item id.
   */
  async upload(
    folder: FolderRefInput,
    filename: string,
    body: BinaryBody,
    contentType: string,
  ): Promise<UploadResult> {
    return this.transport.request({
      method: "PUT",
      path: this.mediaPath(MediaRef.file(folder, filename)),
      body: { kind: "binary", value: body, contentType },
      parse: (res) => ({ mediaItemId: res.headers.get("media-item-id") ?? "" }),
    });
  }

  /**
   * Download a media binary. Returns `{ notModified: true }` when a conditional
   * GET matches (HTTP 304); otherwise the binary plus content type and ETag.
   */
  async download(ref: MediaRef, options: DownloadOptions = {}): Promise<DownloadResult> {
    const ifNoneMatch = Array.isArray(options.ifNoneMatch)
      ? options.ifNoneMatch.join(", ")
      : options.ifNoneMatch;
    return this.transport.request({
      method: "GET",
      path: this.mediaPath(ref),
      query: { size: options.size },
      acceptLanguage: null,
      headers: { accept: "*/*", "if-none-match": ifNoneMatch },
      allowStatuses: [304],
      parse: async (res): Promise<DownloadResult> => {
        const etag = res.headers.get("etag");
        if (res.status === 304) {
          return { notModified: true, etag };
        }
        return {
          notModified: false,
          body: await res.arrayBuffer(),
          contentType: res.headers.get("content-type"),
          etag,
        };
      },
    });
  }

  /** Read a media item's metadata and variant links. */
  async metadata(ref: MediaRef): Promise<MediaResource> {
    return this.transport.request({
      method: "GET",
      path: this.mediaPath(ref, "/metadata"),
      parse: parseJson<MediaResource>,
    });
  }

  /** List media items in a folder. */
  async list(
    query: MediaListQuery,
    options: { acceptLanguage?: string } = {},
  ): Promise<Collection<MediaResource>> {
    return this.transport.request({
      method: "POST",
      path: `${this.base()}/action;list`,
      acceptLanguage: options.acceptLanguage,
      body: { kind: "json", value: query },
      parse: parseJson<Collection<MediaResource>>,
    });
  }
}
