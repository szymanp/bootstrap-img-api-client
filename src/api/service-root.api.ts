import type { ServiceLinks } from '../links';
import type { Link, LinkSet } from '../types/envelope';

/** Body of `GET /` — a `links` envelope advertising every endpoint. */
export interface ServiceRoot {
  links: LinkSet;
}

/** Service-root discovery. Clients can follow links instead of hard-coding paths. */
export interface IServiceRootApi {
  /** Fetch the service root link set. */
  get(): Promise<ServiceRoot>;

  /** Fetch the root and return just the link with the given `rel`, if present. */
  link(rel: string): Promise<Link | undefined>;

  /**
   * Fetch the root and return a typed {@link ServiceLinks} builder over its link
   * set, so callers can construct endpoint URLs from server-advertised templates
   * instead of hard-coding paths.
   */
  links(): Promise<ServiceLinks>;
}
