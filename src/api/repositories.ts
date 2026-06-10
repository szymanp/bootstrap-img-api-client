import { fieldsParam, readParams } from '../http/language.js';
import { parseJson, parseVoid, Transport } from '../http/transport.js';
import type { ReadOptions, WriteLanguageOptions } from '../types/common.js';
import type { Collection, Resource } from '../types/envelope.js';
import type { PageQuery } from '../types/envelope.js';
import type { CreateRepositoryInput, Repository, UpdateRepositoryInput } from '../types/repositories.js';

export type RepositoryResource = Resource<Repository>;

/** Repository endpoints. */
export class RepositoriesApi {
  constructor(private readonly transport: Transport) {}

  /**
   * Create a repository. The title is stored under `Content-Language`
   * (the client default unless overridden).
   */
  async create(input: CreateRepositoryInput, options: WriteLanguageOptions = {}): Promise<RepositoryResource> {
    return this.transport.request({
      method: 'POST',
      path: '/repos',
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
      path: '/repos;query',
      acceptLanguage: options.acceptLanguage,
      body: { kind: 'json', value: { query } },
      parse: parseJson<Collection<RepositoryResource>>,
    });
  }

  /** Retrieve a repository. */
  async get(repoId: string, options: ReadOptions = {}): Promise<RepositoryResource> {
    return this.transport.request({
      method: 'GET',
      path: `/repos/${encodeURIComponent(repoId)}`,
      query: readParams(options),
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
      path: `/repos/${encodeURIComponent(repoId)}`,
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
      path: `/repos/${encodeURIComponent(repoId)}`,
      body: { kind: 'json', value: { revision } },
      parse: parseVoid,
    });
  }
}
