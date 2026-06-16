import { AuthApi } from './api/auth.js';
import { FoldersApi } from './api/folders.js';
import { MediaApi } from './api/media.js';
import { RepositoriesApi } from './api/repositories.js';
import { ServiceRootApi } from './api/service-root.js';
import { UsersApi } from './api/users.js';
import { resolveConfig, type ClientOptions } from './config.js';
import { defaultCredentialStore, type CredentialStore } from './http/credentials.js';
import { Transport } from './http/transport.js';
import type { LinksProvider } from './links.js';

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

  readonly serviceRoot: ServiceRootApi;
  readonly auth: AuthApi;
  readonly users: UsersApi;
  readonly repos: RepositoriesApi;

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
  folders(repoId: string): FoldersApi {
    return new FoldersApi(this.transport, repoId, this.links);
  }

  /** Media-item endpoints scoped to a repository. */
  media(repoId: string): MediaApi {
    return new MediaApi(this.transport, repoId, this.links);
  }
}
