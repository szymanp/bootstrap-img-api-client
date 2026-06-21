/**
 * Response envelopes shared by every endpoint.
 *
 * Single-resource responses wrap the entity in `{ meta, data, links, related }`.
 * Collection responses use `{ meta, records }` (plus an optional `related` grouping).
 */

/** Opaque concurrency token plus pagination cursors, depending on the endpoint. */
export interface Meta {
  /** Optimistic-concurrency token; echo back verbatim on mutating requests. */
  revision?: string;
  /** Pagination offset (collection responses). */
  offset?: number;
  /** Pagination limit (collection responses). */
  limit?: number;
  /** Tree depth (tree responses). */
  depth?: number;
  [key: string]: unknown;
}

/** A ready-to-use hypermedia link with no placeholders. */
export interface HrefLink {
  rel: string;
  href: string;
}

/** A link whose URL contains `{placeholder}` segments listed in `fields`. */
export interface TemplateLink {
  rel: string;
  template: string;
  fields: string[];
}

/** A link to a variant of a media item resource. */
export interface MediaItemVariantLink extends HrefLink {
  height: number;
  width: number;
  /** The SHA-256 hash of the target resource. */
  hash?: string;
}

export type Link = HrefLink | TemplateLink | MediaItemVariantLink;

/** Map of `rel` -> link, as returned by the service root and resource `links`. */
export type LinkSet = Record<string, Link>;

/** Returns true when a link is a template link (has placeholders). */
export function isTemplateLink(link: Link): link is TemplateLink {
  return typeof (link as TemplateLink).template === 'string';
}

/** Returns true when a link is an href link. */
export function isHrefLink(link: Link): link is HrefLink {
  return typeof (link as HrefLink).href === 'string';
}

/** Returns true when a link is an href link. */
export function isMediaItemVariantLink(link: Link): link is MediaItemVariantLink {
  return (
    isHrefLink(link) &&
    typeof (link as MediaItemVariantLink).width === 'number' &&
    typeof (link as MediaItemVariantLink).height === 'number'
  );
}

/** Single-resource envelope. `T` is the payload, `R` the shape of `related`. */
export interface Resource<T, R = unknown> {
  meta: Meta;
  data: T;
  links?: LinkSet;
  related?: R;
}

/** Collection envelope. `T` is the element type (often `Resource<…>`). */
export interface Collection<T, R = unknown> {
  meta: Meta;
  records: T[];
  related?: R;
}

/** Standard pagination query accepted by `*;query` / `action;list` endpoints. */
export interface PageQuery {
  offset?: number;
  limit?: number;
}
