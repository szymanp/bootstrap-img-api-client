/** Shared scalar/value types used across resources. */

/** An alias for a string representing a UUID. */
export type UuidString = string;

/** A BCP-47 language tag (e.g. `en-US`). The server normalises to lowercase. */
export type LanguageTag = string;

/** A name of a variant of a media item. E.g. "primary" or "fhd". */
export type MediaItemVariantName = string;

/**
 * A localized string value.
 * - `standard` representation: a single negotiated string.
 * - `original` representation: an object carrying every stored translation.
 */
export type Localized = string | Record<LanguageTag, string>;

/**
 * A security principal referenced in permissions and repository roles.
 * - `user` — a registered user, by email.
 * - `public` — every caller, logged in or not: a grant to it also applies to
 *   every user. Not accepted in repository roles.
 * - `anonymous` — an anonymous principal (an individual without an account).
 *   Not accepted in `PATCH .../permissions` nor in repository roles (`422`);
 *   an `id` that isn't an anonymous principal is `404`
 *   (`ErrorType.PrincipalNotFound`).
 */
export type Principal =
  | { type: 'user'; email: string }
  | { type: 'public' }
  | { type: 'anonymous'; id: string };

/** Permissions that can be granted on a folder. */
export type Permission = 'view' | 'read' | 'write' | 'publish' | 'share';

/** Effect of a permission record: add a grant, or reset to inherited default. */
export type Effect = 'grant' | 'default';

/** Rendering of localized fields. `standard` is the default when omitted. */
export type Representation = 'standard' | 'original';

/** Options common to read endpoints that support partial/representation rendering. */
export interface ReadOptions {
  /** Comma-joined or array field selector. */
  fields?: string | string[];
  representation?: Representation;
  /** Per-call `Accept-Language` override. */
  acceptLanguage?: LanguageTag;
}

/** Options for mutating endpoints that store a localized value. */
export interface WriteLanguageOptions {
  /** Per-call `Content-Language` override (locale the value is stored under). */
  contentLanguage?: LanguageTag;
  /** Per-call `Accept-Language` override (locale the response is rendered in). */
  acceptLanguage?: LanguageTag;
  /** Field selector applied to the response. */
  fields?: string | string[];
}
