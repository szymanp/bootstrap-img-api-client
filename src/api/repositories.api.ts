import type { AuditLogEntry } from '../types/changelog';
import type { ReadOptions, WriteLanguageOptions } from '../types/common';
import type { Collection, Meta, PageQuery, Resource } from '../types/envelope';
import type { FolderTag } from '../types/folders';
import type { CreateMetadataSnapshotInput, MetadataSnapshotRecord } from '../types/metadata-snapshot';
import type { MetadataSyncPlan } from '../types/metadata-sync';
import type {
  CreateRepositoryInput,
  Repository,
  RepositoryId,
  RepositoryRelationship,
  RepositoryRelationshipKind,
  UpdateRepositoryInput,
} from '../types/repositories';
import type { UserSummary } from '../types/users';

/** Repository endpoints. */
export interface IRepositoriesApi {
  /**
   * Create a repository. The title is stored under `Content-Language`
   * (the client default unless overridden). With `owners` or `editors`,
   * `related.users` names the users among them, sorted by email.
   *
   * @param input The repository's name and title.
   * @param options `Content-Language`/`Accept-Language` overrides and a field selector.
   * @returns The created repository.
   */
  create(input: CreateRepositoryInput, options?: WriteLanguageOptions): Promise<RepositoryResource>;

  /**
   * List the repositories the caller relates to (paginated, ordered by
   * repository id). `query.relationships` selects those the caller is an
   * `owner` or `editor` of, or follows (`follower`); a repository matching any
   * is listed once. It defaults to `['owner', 'editor']`; an empty list or an
   * unknown value is a 400 `ApiError`. A followed repository is listed only
   * while the caller may read it. An anonymous session may query, and has
   * only follows.
   *
   * By default each record carries `organizationName` (absent if none),
   * `name`, and `title`; `owners` and `editors` are never included. Each
   * record's `meta.relationship` tells how the caller relates to it;
   * `meta.revision` is present only with a role, and `links` has
   * `repos:follow` or `repos:unfollow`.
   *
   * @param query Relationship filter and pagination offset/limit.
   * @param options Field selector and `Accept-Language` override.
   * @returns A page of repositories.
   */
  query(
    query?: RepositoryQuery,
    options?: Pick<ReadOptions, 'acceptLanguage' | 'fields'>,
  ): Promise<Collection<RepositoryResource>>;

  /**
   * Retrieve a repository, as far as the caller may see it: an owner or
   * editor reads all of it; a caller with `view` or `read` on some folder of
   * it (their own, or `public`'s) reads only its summary (`id`,
   * `organizationName`, `name`, `title`, no `meta.revision`); anyone else gets
   * a 404 `ApiError`, as for a repository that doesn't exist. With a session,
   * `meta.relationship` tells how the caller relates to it. With `owners` or
   * `editors`, `related.users` names the users among them, sorted by email.
   *
   * @param repoId The repository's id.
   * @param options Field selector, representation, and `Accept-Language` override.
   * @returns The repository.
   */
  get(repoId: RepositoryId, options?: ReadOptions): Promise<RepositoryResource>;

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
   * (`ErrorType.RepositoryWouldHaveNoOwners`) and nothing is applied. With
   * `owners` or `editors`, `related.users` names the users among them,
   * sorted by email.
   *
   * @param repoId The repository's id.
   * @param revision The repository's current `meta.revision`.
   * @param data Fields to change; omitted fields are left unchanged.
   * @param options `Content-Language`/`Accept-Language` overrides and a field selector.
   * @returns The updated repository.
   */
  update(
    repoId: RepositoryId,
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
  delete(repoId: RepositoryId, revision: string): Promise<void>;

  /**
   * Follow a repository: add it to the caller's list
   * (`relationships: ['follower']` in {@link query}). Following grants
   * nothing. Needs a session (a user or an anonymous principal) and read
   * access to the repository, otherwise a 404 `ApiError`
   * (`ErrorType.RepositoryNotFound`). Idempotent.
   *
   * @param repoId The repository's id.
   * @returns Resolves once the repository is followed.
   */
  follow(repoId: RepositoryId): Promise<void>;

  /**
   * Stop following a repository. Works without access to the repository,
   * and for one that doesn't exist. Idempotent.
   *
   * @param repoId The repository's id.
   * @returns Resolves once the repository is no longer followed.
   */
  unfollow(repoId: RepositoryId): Promise<void>;

  /**
   * Retrieve a page of the repository's audit log, most recent first. The
   * caller must be a repository owner or editor.
   *
   * @param repoId The repository's id.
   * @param query Pagination offset/limit.
   * @returns A page of audit-log entries, most recent first.
   */
  getChangelog(repoId: RepositoryId, query?: PageQuery): Promise<ChangelogCollection>;

  /**
   * List the names of the repository's folder tags that at least one folder
   * uses, sorted by code point. System tags (`system:*`) are never listed.
   * The caller must be a repository owner or editor.
   *
   * @param repoId The repository's id.
   * @param query Pagination offset/limit (server defaults `0`/`20`), plus an
   * optional `startsWith` prefix (normalized like a tag name).
   * @returns A page of tag names.
   */
  getTags(repoId: RepositoryId, query?: RepositoryTagsQuery): Promise<RepositoryTagsCollection>;

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
    repoId: RepositoryId,
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
    repoId: RepositoryId,
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
    repoId: RepositoryId,
    repositoryVersion: number,
    idempotencyKey: string,
    plan: MetadataSyncPlan,
  ): Promise<MetadataSyncResult>;
}

/** `meta` of a repository resource. */
export interface RepositoryMeta extends Meta {
  /** How the caller relates to the repository; present for a caller with a session. */
  relationship?: RepositoryRelationship;
}

/** Related resources attached to a single-repository response. */
export interface RepositoryRelated {
  /** The users among the repository's `owners` and `editors`, sorted by email; present when those fields are. */
  users?: UserSummary[];
}

export type RepositoryResource = Resource<Repository, RepositoryRelated> & { meta: RepositoryMeta };

/** Query for {@link IRepositoriesApi.query}. */
export interface RepositoryQuery extends PageQuery {
  /** Which repositories to list; defaults server-side to `['owner', 'editor']`. Must not be empty. */
  relationships?: RepositoryRelationshipKind[];
}

/** Result of {@link IRepositoriesApi.getChangelog}. */
export type ChangelogCollection = Collection<Resource<AuditLogEntry>>;

/** Query for {@link IRepositoriesApi.getTags}. */
export interface RepositoryTagsQuery extends PageQuery {
  /** Lists only tags starting with this string, normalized like a tag name (NFC, lowercase). */
  startsWith?: string;
}

/** Result of {@link IRepositoriesApi.getTags}: plain tag names, not resource envelopes. */
export type RepositoryTagsCollection = Collection<FolderTag>;

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
