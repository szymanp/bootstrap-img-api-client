import type { AuditLogEntry } from '../types/changelog';
import type { ReadOptions, WriteLanguageOptions } from '../types/common';
import type { Collection, PageQuery, Resource } from '../types/envelope';
import type { CreateMetadataSnapshotInput, MetadataSnapshotRecord } from '../types/metadata-snapshot';
import type { MetadataSyncPlan } from '../types/metadata-sync';
import type { CreateRepositoryInput, Repository, UpdateRepositoryInput } from '../types/repositories';

/** Repository endpoints. */
export interface IRepositoriesApi {
  /**
   * Create a repository. The title is stored under `Content-Language`
   * (the client default unless overridden).
   *
   * @param input The repository's name and title.
   * @param options `Content-Language`/`Accept-Language` overrides and a field selector.
   * @returns The created repository.
   */
  create(input: CreateRepositoryInput, options?: WriteLanguageOptions): Promise<RepositoryResource>;

  /**
   * List repositories the caller has a role on (paginated).
   *
   * @param query Pagination offset/limit.
   * @param options `Accept-Language` override.
   * @returns A page of repositories.
   */
  query(query?: PageQuery, options?: Pick<ReadOptions, 'acceptLanguage'>): Promise<Collection<RepositoryResource>>;

  /**
   * Retrieve a repository.
   *
   * @param repoId The repository's id.
   * @param options Field selector, representation, and `Accept-Language` override.
   * @returns The repository.
   */
  get(repoId: string, options?: ReadOptions): Promise<RepositoryResource>;

  /**
   * Retrieve a repository by name, optionally qualified by organization.
   *
   * @param name The repository's name.
   * @param options The qualifying organization, plus the usual read options.
   * @returns The repository.
   */
  getByName(name: string, options?: GetRepositoryByNameOptions): Promise<RepositoryResource>;

  /**
   * Partially update a repository. `revision` is the current `meta.revision`
   * (optimistic concurrency); a mismatch yields a 409 `ApiError`. Requires the
   * repository's owner role for any change, not just `owners`/`editors`.
   * `owners`/`editors`, when given, wholesale-replace that role's principals;
   * `owners: []` is rejected with a 422 `ApiError`
   * (`ErrorType.RepositoryWouldHaveNoOwners`) and nothing is applied.
   *
   * @param repoId The repository's id.
   * @param revision The repository's current `meta.revision`.
   * @param data Fields to change; omitted fields are left unchanged.
   * @param options `Content-Language`/`Accept-Language` overrides and a field selector.
   * @returns The updated repository.
   */
  update(
    repoId: string,
    revision: string,
    data: UpdateRepositoryInput,
    options?: WriteLanguageOptions,
  ): Promise<RepositoryResource>;

  /**
   * Delete a repository (requires the current revision).
   *
   * @param repoId The repository's id.
   * @param revision The repository's current `meta.revision`.
   * @returns Resolves once the repository is deleted.
   */
  delete(repoId: string, revision: string): Promise<void>;

  /**
   * Retrieve a page of the repository's audit log, most recent first. The
   * caller must be a repository owner or editor.
   *
   * @param repoId The repository's id.
   * @param query Pagination offset/limit.
   * @returns A page of audit-log entries, most recent first.
   */
  getChangelog(repoId: string, query?: PageQuery): Promise<ChangelogCollection>;

  /**
   * Start building a metadata snapshot — a point-in-time consistent read of
   * the repository's folder/text/permissions/media metadata. Snapshot
   * creation is always asynchronous: this resolves once the server accepts
   * the request; poll {@link getMetadataSnapshot} until it reports `ready`.
   * Requires repository owner or editor access, since a `ready` snapshot
   * exposes folder permissions wholesale.
   *
   * @param repoId The repository's id.
   * @param input The snapshot's format version and scope (roots/aspects to include).
   * @returns The new snapshot's id and creation time.
   */
  createMetadataSnapshot(
    repoId: string,
    input?: CreateMetadataSnapshotInput,
  ): Promise<CreateMetadataSnapshotResult>;

  /**
   * Poll a metadata snapshot's build status, or (once `ready`) read a page
   * of its records. `query.wait` long-polls server-side while the snapshot
   * is still building, instead of returning immediately. A failed build
   * surfaces as an `ApiError` of type `ErrorType.MetadataSnapshotFailed`
   * (`410`) — request a new snapshot rather than retrying this one.
   *
   * @param repoId The repository's id.
   * @param snapshotId The snapshot's id, from {@link createMetadataSnapshot}.
   * @param query Pagination offset/limit, plus an optional long-poll `wait` (seconds).
   * @returns `{ status: 'building' }` while the snapshot builds, otherwise
   * `{ status: 'ready', meta, records }` with a page of its records.
   */
  getMetadataSnapshot(
    repoId: string,
    snapshotId: string,
    query?: MetadataSnapshotQuery,
  ): Promise<MetadataSnapshotResult>;

  /**
   * Atomically apply a metadata-sync plan (folder creates, moves, renames,
   * data/text/permissions/media changes, deletes, plus a repository-level
   * rename/retitle) in one database transaction, or not at all.
   *
   * `repositoryVersion` must be the `repositoryVersion` reported by a prior
   * {@link getMetadataSnapshot} call's `meta.repositoryVersion` (or `0` if
   * none). `idempotencyKey` should be a client-generated UUID identifying
   * this exact logical attempt: retrying with the same key and the same plan
   * (serialized identically — key order matters) replays the stored
   * response, including any `4xx`, for 24 hours.
   *
   * Any error means nothing was applied. Notable failures (branch on the
   * problem's extension members, see `RevisionConflictProblem` etc.):
   * - `409` `ErrorType.RevisionConflict` — `reason` is
   *   `repository-version-changed` (stale `repositoryVersion`) or
   *   `resource-revision-changed` (`conflicts` lists the stale keys).
   * - `409` `ErrorType.IdempotencyKeyReused` — `reason` is `request-mismatch`
   *   (different plan under this key) or `in-progress` (retry after
   *   `Retry-After`).
   * - `409` `ErrorType.FolderPathConflict` — the final state would put two
   *   folders at the same path.
   * - `422` `ErrorType.ValidationFailed` — structurally invalid plan;
   *   `errors` lists each issue with its operation indexes. This includes a
   *   `folder.create` or parent-changing `folder.update` that would place a
   *   folder anywhere inside a subtree a `folder.delete` in the same plan
   *   removes (not just directly under the deleted folder).
   *
   * @param repoId The repository's id.
   * @param repositoryVersion The repository's current metadata version
   * (from a snapshot's `meta.repositoryVersion`, or `0` if none exists yet).
   * @param idempotencyKey A client-generated UUID identifying this exact logical attempt.
   * @param plan The operations to apply; they need not be in dependency order.
   * @returns The plan's outcome: the new repository version and the revision
   * of each resource it mutated.
   */
  applyMetadataSync(
    repoId: string,
    repositoryVersion: number,
    idempotencyKey: string,
    plan: MetadataSyncPlan,
  ): Promise<MetadataSyncResult>;
}

export type RepositoryResource = Resource<Repository>;

/** Result of {@link IRepositoriesApi.getChangelog}. */
export type ChangelogCollection = Collection<Resource<AuditLogEntry>>;

/** Result of {@link IRepositoriesApi.createMetadataSnapshot} (always `202 Accepted`). */
export interface CreateMetadataSnapshotResult {
  snapshotId: string;
  createdAt: string;
}

/** Query for {@link IRepositoriesApi.getMetadataSnapshot}. */
export interface MetadataSnapshotQuery extends PageQuery {
  /**
   * Long-polls (holding the request open) for up to this many seconds while
   * the snapshot is still `Building`, instead of returning immediately.
   * Clamped server-side to a configured maximum.
   */
  wait?: number;
}

/** A `Ready` snapshot's metadata. */
export interface MetadataSnapshotMeta {
  snapshotId: string;
  repositoryVersion: number;
  scopeHash: string;
  formatVersion: number;
  createdAt: string;
  offset: number;
  limit: number;
}

/** Result of {@link IRepositoriesApi.getMetadataSnapshot}: still building, or a page of a `Ready` snapshot. */
export type MetadataSnapshotResult =
  | { status: 'building' }
  | { status: 'ready'; meta: MetadataSnapshotMeta; records: MetadataSnapshotRecord[] };

/** Result of {@link IRepositoriesApi.applyMetadataSync}. */
export interface MetadataSyncResult {
  /** Echoes the request's `Idempotency-Key`. */
  operationId: string;
  previousRepositoryVersion: number;
  repositoryVersion: number;
  /** One entry per resource the plan actually mutated (`"repository"` and/or `"folder:<uuid>"`). */
  revisions: Record<string, string>;
}

/** Options for {@link IRepositoriesApi.getByName}. */
export interface GetRepositoryByNameOptions extends ReadOptions {
  /** Organization qualifying the repository name. */
  org?: string;
}
