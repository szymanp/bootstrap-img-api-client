/** User registration & profile types. */

import type { UuidString } from './common';

/**
 * Body of `POST /users`. All fields are required; names are trimmed by the
 * server, and a blank name or one longer than 255 characters is rejected.
 */
export interface RegisterUserInput {
  email: string;
  firstName: string;
  lastName: string;
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
