import type { FolderReference } from './types/folders.js';

/**
 * A reference to a folder. Folders are addressed either by UUID (`id;<uuid>`) or
 * by path (`path;el1;el2`). This value object renders both the URL path segment
 * (`folderVar`) and the JSON body form (`{ id }` / `{ path }`).
 */
export class FolderRef {
  private constructor(
    private readonly kind: 'id' | 'path',
    /** For `id`: the UUID (single element). For `path`: the path segments. */
    private readonly parts: string[],
  ) {}

  /** Reference a folder by UUID. */
  static id(uuid: string): FolderRef {
    return new FolderRef('id', [uuid]);
  }

  /**
   * Reference a folder by path. Accepts `/albums/vacation`, `albums/vacation`,
   * or pre-split segments `["albums", "vacation"]` (segments are kept verbatim).
   */
  static path(path: string | string[]): FolderRef {
    const segments = Array.isArray(path) ? path : splitPath(path);
    return new FolderRef('path', segments);
  }

  /** Coerce any accepted folder reference shape into a {@link FolderRef}. */
  static from(ref: FolderRefInput): FolderRef {
    if (ref instanceof FolderRef) return ref;
    if (typeof ref === 'string') {
      // A `id;…` / `path;…` segment, or a plain path.
      if (ref.startsWith('id;')) return FolderRef.id(ref.slice(3));
      if (ref.startsWith('path;')) return FolderRef.path(ref.slice(5).split(';'));
      return FolderRef.path(ref);
    }
    if ('id' in ref) return FolderRef.id(ref.id);
    return FolderRef.path(ref.path);
  }

  /** The `{folderVar}` URL path segment, e.g. `id;a1b2…` or `path;albums;vacation`. */
  toPathSegment(): string {
    if (this.kind === 'id') {
      return `id;${encodeURIComponent(this.parts[0] ?? '')}`;
    }
    return ['path', ...this.parts.map(encodeURIComponent)].join(';');
  }

  /** The JSON body reference form, `{ id }` or `{ path }`. */
  toReference(): FolderReference {
    if (this.kind === 'id') return { id: this.parts[0] ?? '' };
    return { path: '/' + this.parts.join('/') };
  }
}

/** Anything accepted where a folder reference is expected. */
export type FolderRefInput = FolderRef | FolderReference | string;

/** Split a slash path into non-empty segments. */
function splitPath(path: string): string[] {
  return path.split('/').filter((s) => s.length > 0);
}

/** How a {@link MediaRef} addresses its media item — by stable id or by location. */
export type MediaAddressing =
  | { kind: 'id'; mediaItemId: string }
  | { kind: 'file'; folder: FolderRefInput; filename: string };

/**
 * A reference to a media item: either by stable id (`mid;<uuid>`) or by the
 * folder + filename pair.
 */
export class MediaRef {
  private constructor(private readonly addr: MediaAddressing) {}

  /** Reference a media item by its stable UUID. */
  static id(uuid: string): MediaRef {
    return new MediaRef({ kind: 'id', mediaItemId: uuid });
  }

  /** Reference a media item by the folder it lives in and its filename. */
  static file(folder: FolderRefInput, filename: string): MediaRef {
    return new MediaRef({ kind: 'file', folder, filename });
  }

  /** How this media item is addressed — used to pick the right link relation. */
  get addressing(): MediaAddressing {
    return this.addr;
  }

  /** The path suffix appended after `/media/{repoId}/`. */
  toPathSuffix(): string {
    if (this.addr.kind === 'id') {
      return `mid;${encodeURIComponent(this.addr.mediaItemId)}`;
    }
    const folderVar = FolderRef.from(this.addr.folder).toPathSegment();
    return `${folderVar}/${encodeURIComponent(this.addr.filename)}`;
  }
}
