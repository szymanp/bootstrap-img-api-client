import { parseJson, Transport } from '../http/transport.js';
import { isTemplateLink, type Link, type LinkSet } from '../types/envelope.js';
import { ServiceLinks } from '../links.js';

/** Body of `GET /` — a `links` envelope advertising every endpoint. */
export interface ServiceRoot {
  links: LinkSet;
}

/** Service-root discovery. Clients can follow links instead of hard-coding paths. */
export class ServiceRootApi {
  #serviceRootResponse: ServiceRoot | undefined;
  #links: ServiceLinks | undefined;

  /**
   * @param initial Optional pre-fetched service root. When provided, {@link get}
   *   and {@link links} resolve without a network round-trip — useful for tests
   *   or callers that already hold the root.
   */
  constructor(
    private readonly transport: Transport,
    initial?: ServiceRoot,
  ) {
    this.#serviceRootResponse = initial;
  }

  /** Fetch the service root link set. */
  async get(): Promise<ServiceRoot> {
    if (!this.#serviceRootResponse) {
      this.#serviceRootResponse = await this.transport.request({
        method: 'GET',
        path: '/',
        parse: parseJson<ServiceRoot>,
      });
    }
    return this.#serviceRootResponse;
  }

  /** Fetch the root and return just the link with the given `rel`, if present. */
  async link(rel: string): Promise<Link | undefined> {
    const root = await this.get();
    return root.links[rel];
  }

  /**
   * Fetch the root and return a typed {@link ServiceLinks} builder over its link
   * set, so callers can construct endpoint URLs from server-advertised templates
   * instead of hard-coding paths.
   */
  async links(): Promise<ServiceLinks> {
    if (!this.#links) {
      const root = await this.get();
      this.#links = new ServiceLinks(root.links);
    }
    return this.#links;
  }

  /**
   * Resolve a template link by substituting `fields`. Throws if a required field
   * is missing. Returns the link's `href` directly when it is not templated.
   */
  static resolve(link: Link, fields: Record<string, string> = {}): string {
    if (!isTemplateLink(link)) return link.href;
    return link.template.replace(/\{([^}]+)\}/g, (_match, name: string) => {
      const value = fields[name];
      if (value === undefined) {
        throw new Error(`Missing field "${name}" for template link "${link.rel}".`);
      }
      return encodeURIComponent(value);
    });
  }
}
