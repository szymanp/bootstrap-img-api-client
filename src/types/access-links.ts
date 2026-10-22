/** Access-link types (`/access-links/{repoId}`). */

import type { FolderRefInput } from '../refs';
import type { PrincipalId } from './auth';
import type { Permission, UuidString } from './common';
import type { FolderId } from './folders';

/** The identifier of an access link. */
export type AccessLinkId = UuidString;

/** The identifier of one recipient's grant of an access link. */
export type AccessLinkGrantId = UuidString;

/** The only permission an access link can give. */
export type AccessLinkPermissionKind = Extract<Permission, 'view'>;

/**
 * - `active` — can be redeemed.
 * - `expired` — past `expiresAt`; access already given is kept.
 * - `deactivated` — redemption stopped (see `deactivatedAt`); access already
 *   given is kept.
 */
export type AccessLinkStatus = 'active' | 'expired' | 'deactivated';

/** A permission an access link (or one of its grants) gives on a folder. */
export interface AccessLinkPermission {
  folder: FolderId;
  permission: AccessLinkPermissionKind;
}

/** An access link as returned in a resource envelope's `data`. */
export interface AccessLink {
  id: AccessLinkId;
  /** Absent when the link has none (as are `expiresAt` and `deactivatedAt`). */
  label?: string;
  /** The creator; absent once the creator's account is gone. */
  createdBy?: { type: 'user'; email: string };
  createdAt: string;
  expiresAt?: string;
  status: AccessLinkStatus;
  /** Present when `status` is `deactivated`. */
  deactivatedAt?: string;
  /** In folder path order; empty once every folder of the link has been deleted. */
  permissions: AccessLinkPermission[];
  /** The number of recipients. */
  grantCount: number;
  /**
   * The code to redeem (43 characters), a bearer secret. Present only in the
   * response that created the link; the server keeps only its SHA-256.
   */
  code?: string;
}

/** A permission requested for a new access link. */
export interface AccessLinkPermissionInput {
  /**
   * The folder, by id or path (a plain string is a path). A path is resolved
   * at creation, so a later rename or move doesn't affect the link.
   */
  folder: FolderRefInput;
  permission: AccessLinkPermissionKind;
}

/** Body for `POST /access-links/{repoId}`. */
export interface CreateAccessLinkInput {
  /** At most 250 characters; must not be blank. */
  label?: string;
  /** Must be in the future. */
  expiresAt?: string;
  /** 1 to 100 entries (`access_links.max_permissions`). */
  permissions: AccessLinkPermissionInput[];
}

/** The recipient of an access link grant. */
export type AccessLinkRecipient =
  | { type: 'user'; email: string; firstName?: string; lastName?: string }
  | {
      type: 'anonymous';
      id: PrincipalId;
      /** The anonymous principal's last recorded activity. */
      lastActiveAt?: string;
    };

/** One recipient's grant of an access link. */
export interface AccessLinkGrant {
  id: AccessLinkGrantId;
  principal: AccessLinkRecipient;
  redeemedAt: string;
  /** The permissions the grant still gives. */
  permissions: AccessLinkPermission[];
}
