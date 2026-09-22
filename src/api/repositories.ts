import { fieldsParam, readParams } from '../http/language';
import { parseJson, parseVoid, Transport } from '../http/transport';
import type { LinksProvider } from '../links';
import type { ReadOptions, WriteLanguageOptions } from '../types/common';
import type { Collection } from '../types/envelope';
import type { PageQuery } from '../types/envelope';
import type { CreateMetadataSnapshotInput, MetadataSnapshotRecord } from '../types/metadata-snapshot';
import type { MetadataSyncPlan } from '../types/metadata-sync';
import type { CreateRepositoryInput, UpdateRepositoryInput } from '../types/repositories';
import type {
  ChangelogCollection,
  CreateMetadataSnapshotResult,
  GetRepositoryByNameOptions,
  IRepositoriesApi,
  MetadataSnapshotMeta,
  MetadataSnapshotQuery,
  MetadataSnapshotResult,
  MetadataSyncResult,
  RepositoryResource,
} from './repositories.api';

/** Repository endpoints. */
export class RepositoriesApi implements IRepositoriesApi {
  constructor(
    private readonly transport: Transport,
    private readonly links: LinksProvider,
  ) {}

  /**
   * Create a repository. The title is stored under `Content-Language`
   * (the client default unless overridden).
   */
  async create(input: CreateRepositoryInput, options: WriteLanguageOptions = {}): Promise<RepositoryResource> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).createRepo().href,
      acceptLanguage: options.acceptLanguage,
      // Content-Language is required by this endpoint; default to the client locale.
      contentLanguage: options.contentLanguage ?? this.transport.defaultLanguage,
      body: {
        kind: 'json',
        value: { data: input, fields: fieldsParam(options.fields) },
      },
      parse: parseJson<RepositoryResource>,
    });
  }

  /** List repositories the caller has a role on (paginated). */
  async query(
    query: PageQuery = {},
    options: Pick<ReadOptions, 'acceptLanguage'> = {},
  ): Promise<Collection<RepositoryResource>> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).queryRepos().href,
      acceptLanguage: options.acceptLanguage,
      body: { kind: 'json', value: { query } },
      parse: parseJson<Collection<RepositoryResource>>,
    });
  }

  /** Retrieve a repository. */
  async get(repoId: string, options: ReadOptions = {}): Promise<RepositoryResource> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).readRepo(repoId).href,
      query: readParams(options),
      acceptLanguage: options.acceptLanguage,
      parse: parseJson<RepositoryResource>,
    });
  }

  /**
   * Retrieve a repository by name, optionally qualified by organization. No
   * dedicated link relation is advertised for this endpoint; it shares the
   * `/repos` collection path with `repos:create`, disambiguated by method
   * and query params.
   */
  async getByName(name: string, options: GetRepositoryByNameOptions = {}): Promise<RepositoryResource> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).reposCollection().href,
      query: { ...readParams(options), org: options.org, name },
      acceptLanguage: options.acceptLanguage,
      parse: parseJson<RepositoryResource>,
    });
  }

  /**
   * Partially update a repository. `revision` is the current `meta.revision`
   * (optimistic concurrency); a mismatch yields a 409 `ApiError`.
   */
  async update(
    repoId: string,
    revision: string,
    data: UpdateRepositoryInput,
    options: WriteLanguageOptions = {},
  ): Promise<RepositoryResource> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).updateRepo(repoId).href,
      acceptLanguage: options.acceptLanguage,
      contentLanguage: options.contentLanguage ?? this.transport.defaultLanguage,
      body: {
        kind: 'json',
        value: { meta: { revision }, data, fields: fieldsParam(options.fields) },
      },
      parse: parseJson<RepositoryResource>,
    });
  }

  /** Delete a repository (requires the current revision). */
  async delete(repoId: string, revision: string): Promise<void> {
    return this.transport.request({
      method: 'DELETE',
      path: (await this.links()).deleteRepo(repoId).href,
      body: { kind: 'json', value: { revision } },
      parse: parseVoid,
    });
  }

  /**
   * Retrieve a page of the repository's audit log, most recent first. The
   * caller must be a repository owner or editor.
   */
  async getChangelog(repoId: string, query: PageQuery = {}): Promise<ChangelogCollection> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).changelog(repoId).href,
      query: { offset: query.offset, limit: query.limit },
      parse: parseJson<ChangelogCollection>,
    });
  }

  /**
   * Start building a metadata snapshot. Snapshot creation is always
   * asynchronous — this resolves once the server accepts the request (`202`);
   * poll {@link getMetadataSnapshot} until it reports `ready`.
   */
  async createMetadataSnapshot(
    repoId: string,
    input: CreateMetadataSnapshotInput = { formatVersion: 1 },
  ): Promise<CreateMetadataSnapshotResult> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).createMetadataSnapshot(repoId).href,
      body: { kind: 'json', value: input },
      parse: async (res) => {
        const body = (await res.json()) as { meta: { snapshot: string; createdAt: string } };
        return { snapshotId: body.meta.snapshot, createdAt: body.meta.createdAt };
      },
    });
  }

  /**
   * Poll a metadata snapshot's build status, or (once `ready`) read a page
   * of its records. A failed build surfaces as an `ApiError` of type
   * `ErrorType.MetadataSnapshotFailed` (`410`) — request a new snapshot
   * rather than retrying this one.
   */
  async getMetadataSnapshot(
    repoId: string,
    snapshotId: string,
    query: MetadataSnapshotQuery = {},
  ): Promise<MetadataSnapshotResult> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).readMetadataSnapshot(repoId, snapshotId).href,
      query: { offset: query.offset, limit: query.limit, wait: query.wait },
      allowStatuses: [204],
      parse: async (res): Promise<MetadataSnapshotResult> => {
        if (res.status === 204) return { status: 'building' };
        const body = (await res.json()) as {
          meta: {
            snapshot: string;
            repositoryVersion: number;
            scopeHash: string;
            formatVersion: number;
            createdAt: string;
            offset: number;
            limit: number;
          };
          records: MetadataSnapshotRecord[];
        };
        const meta: MetadataSnapshotMeta = {
          snapshotId: body.meta.snapshot,
          repositoryVersion: body.meta.repositoryVersion,
          scopeHash: body.meta.scopeHash,
          formatVersion: body.meta.formatVersion,
          createdAt: body.meta.createdAt,
          offset: body.meta.offset,
          limit: body.meta.limit,
        };
        return { status: 'ready', meta, records: body.records };
      },
    });
  }

  /**
   * Atomically apply a metadata-sync plan in one database transaction, or
   * not at all. `repositoryVersion` must match the repository's current
   * version (a stale value yields a `409` `RevisionConflict`);
   * `idempotencyKey` should be a client-generated UUID identifying this
   * exact logical attempt.
   */
  async applyMetadataSync(
    repoId: string,
    repositoryVersion: number,
    idempotencyKey: string,
    plan: MetadataSyncPlan,
  ): Promise<MetadataSyncResult> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).metadataSync(repoId).href,
      headers: {
        'if-match': `"repository-metadata:${repositoryVersion}"`,
        'idempotency-key': idempotencyKey,
      },
      body: {
        kind: 'json',
        value: { meta: { formatVersion: 1 }, operations: plan.operations },
      },
      parse: async (res) => {
        const body = (await res.json()) as {
          meta: { operation: string; previousRepositoryVersion: number; repositoryVersion: number };
          data: { revisions: Record<string, string> };
        };
        return {
          operationId: body.meta.operation,
          previousRepositoryVersion: body.meta.previousRepositoryVersion,
          repositoryVersion: body.meta.repositoryVersion,
          revisions: body.data.revisions,
        };
      },
    });
  }
}
