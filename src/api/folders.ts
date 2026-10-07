import { fieldsParam, readParams } from '../http/language';
import { parseJson, parseVoid, Transport } from '../http/transport';
import type { LinksProvider } from '../links';
import { type FolderRefInput } from '../refs';
import type { ReadOptions, WriteLanguageOptions } from '../types/common';
import { isMediaItemVariantLink, type Collection, type PageQuery } from '../types/envelope';
import type {
  CreateFolderInput,
  MediaMembership,
  MediaMembershipPatch,
  MediaMembershipQuery,
  PermissionRecord,
  TreeQuery,
  UpdateFolderInput,
} from '../types/folders';
import type {
  FolderResource,
  FolderText,
  IFoldersApi,
  MediaMembershipCollection,
  PermissionsCollection,
  PutTextResult,
  TextMediaCollection,
  TextMediaOptions,
  TextMediaResult,
  UnresolvedReference,
} from './folders.api';
import type { MediaItemVariant } from './media.api';

/** Folder endpoints, scoped to a single repository. */
export class FoldersApi implements IFoldersApi {
  constructor(
    private readonly transport: Transport,
    private readonly repoId: string,
    private readonly links: LinksProvider,
  ) {}

  /** Create a folder under an existing parent. */
  async create(input: CreateFolderInput, options: WriteLanguageOptions = {}): Promise<FolderResource> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).createFolder(this.repoId).href,
      acceptLanguage: options.acceptLanguage,
      contentLanguage: options.contentLanguage ?? this.transport.defaultLanguage,
      body: { kind: 'json', value: { data: input, fields: fieldsParam(options.fields) } },
      parse: parseJson<FolderResource>,
    });
  }

  /** Retrieve a folder. */
  async get(ref: FolderRefInput, options: ReadOptions = {}): Promise<FolderResource> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).readFolder(this.repoId, ref).href,
      query: readParams(options),
      acceptLanguage: options.acceptLanguage,
      parse: parseJson<FolderResource>,
    });
  }

  /** Update a folder (rename, move, retitle, or replace typed content). */
  async update(
    ref: FolderRefInput,
    revision: string,
    data: UpdateFolderInput,
    options: WriteLanguageOptions = {},
  ): Promise<FolderResource> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).updateFolder(this.repoId, ref).href,
      acceptLanguage: options.acceptLanguage,
      contentLanguage: options.contentLanguage ?? this.transport.defaultLanguage,
      body: {
        kind: 'json',
        value: { meta: { revision }, data, fields: fieldsParam(options.fields) },
      },
      parse: parseJson<FolderResource>,
    });
  }

  /** Delete a folder and all descendants (requires the current revision). */
  async delete(ref: FolderRefInput, revision: string): Promise<void> {
    return this.transport.request({
      method: 'DELETE',
      path: (await this.links()).deleteFolder(this.repoId, ref).href,
      body: { kind: 'json', value: { revision } },
      parse: parseVoid,
    });
  }

  /** List root-level folders the caller can reach. */
  async listRoot(
    query: PageQuery = {},
    options: Pick<ReadOptions, 'acceptLanguage'> = {},
  ): Promise<Collection<FolderResource>> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).listRootFolders(this.repoId).href,
      acceptLanguage: options.acceptLanguage,
      body: { kind: 'json', value: { query } },
      parse: parseJson<Collection<FolderResource>>,
    });
  }

  /** List direct children of a folder. */
  async list(
    ref: FolderRefInput,
    query: PageQuery = {},
    options: Pick<ReadOptions, 'acceptLanguage'> = {},
  ): Promise<Collection<FolderResource>> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).listFolders(this.repoId, ref).href,
      acceptLanguage: options.acceptLanguage,
      body: { kind: 'json', value: { query } },
      parse: parseJson<Collection<FolderResource>>,
    });
  }

  /** Return a recursive subtree of subfolders. */
  async tree(
    ref: FolderRefInput,
    query: TreeQuery = {},
    options: Pick<ReadOptions, 'acceptLanguage'> = {},
  ): Promise<Collection<FolderResource>> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).treeFolders(this.repoId, ref).href,
      acceptLanguage: options.acceptLanguage,
      body: { kind: 'json', value: { query } },
      parse: parseJson<Collection<FolderResource>>,
    });
  }

  /** Read the folder's full localized markdown body and its revision. */
  async getText(ref: FolderRefInput, options: Pick<ReadOptions, 'acceptLanguage'> = {}): Promise<FolderText> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).readFolderText(this.repoId, ref).href,
      acceptLanguage: options.acceptLanguage,
      headers: { accept: 'text/markdown' },
      parse: async (res) => ({
        text: await res.text(),
        contentLanguage: res.headers.get('content-language'),
        revision: res.headers.get('revision-id'),
      }),
    });
  }

  /**
   * Store the folder's markdown body under `Content-Language`, preserving other
   * languages. `revision` must match the folder's current revision. The body
   * (GFM plus `::media`/`::gallery` embed directives) is scanned for
   * `media:`/`media-path:`/`folder:`/`folder-path:` references: every
   * reference found is persisted (resolved, missing, or malformed alike), and
   * ones that don't resolve are also reported in
   * {@link PutTextResult.unresolvedReferences}. Returns the new revision.
   */
  async putText(
    ref: FolderRefInput,
    markdown: string,
    revision: string,
    options: Pick<WriteLanguageOptions, 'contentLanguage'> = {},
  ): Promise<PutTextResult> {
    return this.transport.request({
      method: 'PUT',
      path: (await this.links()).updateFolderText(this.repoId, ref).href,
      contentLanguage: options.contentLanguage ?? this.transport.defaultLanguage,
      headers: { 'revision-id': revision },
      body: { kind: 'markdown', value: markdown },
      parse: async (res) => {
        const body = (await res.json()) as {
          meta?: { revision?: string };
          validation?: { unresolvedReferences?: UnresolvedReference[] };
        };
        return {
          revision: res.headers.get('revision-id') ?? body.meta?.revision ?? null,
          unresolvedReferences: body.validation?.unresolvedReferences ?? [],
        };
      },
    });
  }

  /**
   * Return every reference recorded from the folder's text body / associated
   * object data, re-resolved against current repository state. The language
   * is selected from `acceptLanguage` (defaulting to the client's language).
   * Supports a conditional GET via `ifNoneMatch`; an ETag match yields
   * `notModified: true`.
   */
  async getTextMedia(ref: FolderRefInput, options: TextMediaOptions = {}): Promise<TextMediaResult> {
    const ifNoneMatch = Array.isArray(options.ifNoneMatch) ? options.ifNoneMatch.join(', ') : options.ifNoneMatch;
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).readFolderTextMedia(this.repoId, ref).href,
      acceptLanguage: options.acceptLanguage,
      headers: { 'if-none-match': ifNoneMatch },
      allowStatuses: [304],
      parse: async (res): Promise<TextMediaResult> => {
        const etag = res.headers.get('etag');
        if (res.status === 304) {
          return { notModified: true, etag };
        }
        return { notModified: false, result: (await res.json()) as TextMediaCollection, etag };
      },
    });
  }

  /** List the folder's effective (direct + inherited) permissions. */
  async getPermissions(
    ref: FolderRefInput,
    options: Pick<ReadOptions, 'acceptLanguage'> = {},
  ): Promise<PermissionsCollection> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).listFolderPermissions(this.repoId, ref).href,
      acceptLanguage: options.acceptLanguage,
      parse: parseJson<PermissionsCollection>,
    });
  }

  /** Add, remove, or modify folder permissions. */
  async patchPermissions(
    ref: FolderRefInput,
    records: PermissionRecord[],
    options: Pick<ReadOptions, 'acceptLanguage'> = {},
  ): Promise<void> {
    return this.transport.request({
      method: 'PATCH',
      path: (await this.links()).patchFolderPermissions(this.repoId, ref).href,
      acceptLanguage: options.acceptLanguage,
      body: { kind: 'json', value: { records: records.map((data) => ({ data })) } },
      parse: parseVoid,
    });
  }

  /**
   * List the folder's direct media-item membership, in the folder's custom
   * order. A newly linked item is appended to the end of that order.
   */
  async getMedia(ref: FolderRefInput): Promise<MediaMembership[]> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).listFolderMedia(this.repoId, ref).href,
      parse: parseJson<MediaMembership[]>,
    });
  }

  /**
   * Query the folder's direct media-item membership with paging, filename
   * filtering, and ordering. Returns the matching membership records plus the
   * full media-item resources under `related.mediaitem`.
   */
  async queryMedia(
    ref: FolderRefInput,
    query: MediaMembershipQuery = {},
    options: Pick<ReadOptions, 'acceptLanguage'> = {},
  ): Promise<MediaMembershipCollection> {
    const { fields, ...rest } = query;
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).queryFolderMedia(this.repoId, ref).href,
      acceptLanguage: options.acceptLanguage,
      body: { kind: 'json', value: { query: rest, fields: fieldsParam(fields) } },
      parse: parseJson<MediaMembershipCollection>,
    });
  }

  /**
   * Replace the folder's direct media membership with exactly `members`. The
   * supplied array's order becomes the folder's new custom order.
   */
  async putMedia(ref: FolderRefInput, members: MediaMembership[]): Promise<void> {
    return this.transport.request({
      method: 'PUT',
      path: (await this.links()).replaceFolderMedia(this.repoId, ref).href,
      body: { kind: 'json', value: members },
      parse: parseVoid,
    });
  }

  /**
   * Apply an ordered list of membership patches (`add`, `remove`, or `move`);
   * returns the resulting membership in the folder's custom order.
   */
  async patchMedia(ref: FolderRefInput, patches: MediaMembershipPatch[]): Promise<MediaMembership[]> {
    return this.transport.request({
      method: 'PATCH',
      path: (await this.links()).patchFolderMedia(this.repoId, ref).href,
      body: { kind: 'json', value: patches },
      parse: parseJson<MediaMembership[]>,
    });
  }

  getCoverVariants(resource: FolderResource): MediaItemVariant[] {
    if (!resource.links) {
      return [];
    }

    return Object.values(resource.links)
      .filter(isMediaItemVariantLink)
      .filter((link) => link.rel.startsWith(COVER_VARIANT_PREFIX))
      .map((link) => ({
        ...link,
        type: 'image' as const,
        name: link.rel.substring(COVER_VARIANT_PREFIX.length),
      }));
  }
}

const COVER_VARIANT_PREFIX = 'cover:variant:';
