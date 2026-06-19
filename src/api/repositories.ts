import { fieldsParam, readParams } from '../http/language';
import { parseJson, parseVoid, Transport } from '../http/transport';
import type { LinksProvider } from '../links';
import type { ReadOptions, WriteLanguageOptions } from '../types/common';
import type { Collection } from '../types/envelope';
import type { PageQuery } from '../types/envelope';
import type { CreateRepositoryInput, UpdateRepositoryInput } from '../types/repositories';
import type { IRepositoriesApi, RepositoryResource } from './repositories.api';

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
}
