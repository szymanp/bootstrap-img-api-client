import { fieldsParam, readParams } from '../http/language.js';
import { parseJson, parseVoid, Transport } from '../http/transport.js';
import type { LinksProvider } from '../links.js';
import { type FolderRefInput } from '../refs.js';
import type { ReadOptions, WriteLanguageOptions } from '../types/common.js';
import type { Collection, PageQuery, Resource } from '../types/envelope.js';
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
} from '../types/folders.js';
import type { MediaMetadata } from '../types/media.js';

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

/** Folder endpoints, scoped to a single repository. */
export class FoldersApi {
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
   * languages. `revision` must match the folder's current revision. Returns the
   * new revision (from the `Revision-Id` response header).
   */
  async putText(
    ref: FolderRefInput,
    markdown: string,
    revision: string,
    options: Pick<WriteLanguageOptions, 'contentLanguage'> = {},
  ): Promise<{ revision: string | null }> {
    return this.transport.request({
      method: 'PUT',
      path: (await this.links()).updateFolderText(this.repoId, ref).href,
      contentLanguage: options.contentLanguage ?? this.transport.defaultLanguage,
      headers: { 'revision-id': revision },
      body: { kind: 'markdown', value: markdown },
      parse: (res) => ({ revision: res.headers.get('revision-id') }),
    });
  }

  /** List all permissions on a folder. */
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

  /** List the folder's direct media-item membership. */
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
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).queryFolderMedia(this.repoId, ref).href,
      acceptLanguage: options.acceptLanguage,
      body: { kind: 'json', value: { query } },
      parse: parseJson<MediaMembershipCollection>,
    });
  }

  /** Replace the folder's direct media membership with exactly `members`. */
  async putMedia(ref: FolderRefInput, members: MediaMembership[]): Promise<void> {
    return this.transport.request({
      method: 'PUT',
      path: (await this.links()).replaceFolderMedia(this.repoId, ref).href,
      body: { kind: 'json', value: members },
      parse: parseVoid,
    });
  }

  /** Apply an ordered list of membership patches; returns the resulting membership. */
  async patchMedia(ref: FolderRefInput, patches: MediaMembershipPatch[]): Promise<MediaMembership[]> {
    return this.transport.request({
      method: 'PATCH',
      path: (await this.links()).patchFolderMedia(this.repoId, ref).href,
      body: { kind: 'json', value: patches },
      parse: parseJson<MediaMembership[]>,
    });
  }
}
