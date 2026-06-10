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
  /** Some links carry extra attributes (e.g. variant width/height, available languages). */
  [key: string]: unknown;
}

/** A link whose URL contains `{placeholder}` segments listed in `fields`. */
export interface TemplateLink {
  rel: string;
  template: string;
  fields: string[];
  [key: string]: unknown;
}

export type Link = HrefLink | TemplateLink;

/** Map of `rel` -> link, as returned by the service root and resource `links`. */
export type LinkSet = Record<string, Link>;

/** Returns true when a link is a template link (has placeholders). */
export function isTemplateLink(link: Link): link is TemplateLink {
  return typeof (link as TemplateLink).template === 'string';
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
