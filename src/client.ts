import { AuthApi } from './api/auth';
import type { IAuthApi } from './api/auth.api';
import { FoldersApi } from './api/folders';
import type { IFoldersApi } from './api/folders.api';
import { MediaApi } from './api/media';
import type { IMediaApi } from './api/media.api';
import { RepositoriesApi } from './api/repositories';
import type { IRepositoriesApi } from './api/repositories.api';
import { ServiceRootApi } from './api/service-root';
import type { IServiceRootApi } from './api/service-root.api';
import { UsersApi } from './api/users';
import type { IUsersApi } from './api/users.api';
import { resolveConfig, type ClientOptions } from './config';
import { defaultCredentialStore, type CredentialStore } from './http/credentials';
import { Transport } from './http/transport';
import type { LinksProvider } from './links';

/**
 * Entry point for the bootstrap-img REST API.
 *
 * Works unchanged in Node (CLI) and the browser (Angular). In the browser the
 * session cookie is managed by the user agent; in Node an in-memory cookie jar
 * captures and replays it.
 *
 * @example
 * ```ts
 * const client = new BootstrapClient({ baseUrl: "http://localhost:8080" });
 * await client.auth.loginWithTestToken("test@example.com");
 * const repo = await client.repos.create({ name: "demo", title: "Demo" });
 * const folders = client.folders(repo.data.id);
 * ```
 */
export class BootstrapClient {
  private readonly transport: Transport;

  /** The active credential store (cookie jar in Node, browser passthrough in the browser). */
  readonly credentials: CredentialStore;

  readonly serviceRoot: IServiceRootApi;
  readonly auth: IAuthApi;
  readonly users: IUsersApi;
  readonly repos: IRepositoriesApi;

  /** Lazily resolves (and caches) the typed link builder from the service root. */
  private readonly links: LinksProvider;

  constructor(options: ClientOptions = {}) {
    const config = resolveConfig(options, defaultCredentialStore);
    this.credentials = config.credentials;
    this.transport = new Transport(config);

    this.serviceRoot = new ServiceRootApi(this.transport, options.serviceRoot);
    this.links = () => this.serviceRoot.links();

    this.auth = new AuthApi(this.transport, this.links);
    this.users = new UsersApi(this.transport, this.links);
    this.repos = new RepositoriesApi(this.transport, this.links);
  }

  /** Folder endpoints scoped to a repository. */
  folders(repoId: string): IFoldersApi {
    return new FoldersApi(this.transport, repoId, this.links);
  }

  /** Media-item endpoints scoped to a repository. */
  media(repoId: string): IMediaApi {
    return new MediaApi(this.transport, repoId, this.links);
  }
}
