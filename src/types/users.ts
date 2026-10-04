/** User registration & profile types. */

import type { LanguageTag, UuidString } from './common';

/**
 * Body of `POST /users`. All fields are required; names are trimmed by the
 * server, and a blank name or one longer than 255 characters is rejected.
 */
export interface RegisterUserInput {
  email: string;
  firstName: string;
  lastName: string;
}

/** Options for endpoints that send the user an email. */
export interface EmailLanguageOptions {
  /**
   * Per-call `Accept-Language` override; selects the language of the email
   * sent to the user. Defaults to the client's `defaultLanguage`.
   */
  acceptLanguage?: LanguageTag;
}

/**
 * Body of `POST /users/{userIdOrEmail}`. An omitted field is left unchanged;
 * names are trimmed, and a blank name or one longer than 255 characters is rejected.
 */
export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
}

/** A user's profile, as returned by `POST /users/{userIdOrEmail}`. */
export interface User {
  id: UuidString;
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * A user's settings: an arbitrary JSON object owned by the client. The server
 * stores it verbatim and never interprets it.
 */
export type UserSettings = Record<string, unknown>;
