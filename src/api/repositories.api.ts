import type { ReadOptions, WriteLanguageOptions } from '../types/common';
import type { Collection, PageQuery, Resource } from '../types/envelope';
import type { CreateRepositoryInput, Repository, UpdateRepositoryInput } from '../types/repositories';

export type RepositoryResource = Resource<Repository>;

/** Options for {@link IRepositoriesApi.getByName}. */
export interface GetRepositoryByNameOptions extends ReadOptions {
  /** Organization qualifying the repository name. */
  org?: string;
}

/** Repository endpoints. */
export interface IRepositoriesApi {
  /**
   * Create a repository. The title is stored under `Content-Language`
   * (the client default unless overridden).
   */
  create(input: CreateRepositoryInput, options?: WriteLanguageOptions): Promise<RepositoryResource>;

  /** List repositories the caller has a role on (paginated). */
  query(query?: PageQuery, options?: Pick<ReadOptions, 'acceptLanguage'>): Promise<Collection<RepositoryResource>>;

  /** Retrieve a repository. */
  get(repoId: string, options?: ReadOptions): Promise<RepositoryResource>;

  /** Retrieve a repository by name, optionally qualified by organization. */
  getByName(name: string, options?: GetRepositoryByNameOptions): Promise<RepositoryResource>;

  /**
   * Partially update a repository. `revision` is the current `meta.revision`
   * (optimistic concurrency); a mismatch yields a 409 `ApiError`.
   */
  update(
    repoId: string,
    revision: string,
    data: UpdateRepositoryInput,
    options?: WriteLanguageOptions,
  ): Promise<RepositoryResource>;

  /** Delete a repository (requires the current revision). */
  delete(repoId: string, revision: string): Promise<void>;
}
