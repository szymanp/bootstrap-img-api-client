import { parseJson, Transport } from '../http/transport.js';
import { isTemplateLink, type Link, type LinkSet } from '../types/envelope.js';

/** Body of `GET /` — a `links` envelope advertising every endpoint. */
export interface ServiceRoot {
  links: LinkSet;
}

/** Service-root discovery. Clients can follow links instead of hard-coding paths. */
export class ServiceRootApi {
  constructor(private readonly transport: Transport) {}

  /** Fetch the service root link set. */
  async get(): Promise<ServiceRoot> {
    return this.transport.request({
      method: 'GET',
      path: '/',
      parse: parseJson<ServiceRoot>,
    });
  }

  /** Fetch the root and return just the link with the given `rel`, if present. */
  async link(rel: string): Promise<Link | undefined> {
    const root = await this.get();
    return root.links[rel];
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
