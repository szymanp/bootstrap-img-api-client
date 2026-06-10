import type { Effect, Localized, Permission, Principal } from "./common.js";
import type { Resource } from "./envelope.js";

/** Folder content kinds. */
export type FolderType =
  | "root"
  | "albums"
  | "album"
  | "document"
  | "tag"
  | "media"
  | "media-source"
  | "picture";

/** A reference to a folder used inside JSON request bodies. */
export type FolderReference = { id: string } | { path: string };

/** A folder as returned in a resource envelope's `data`. */
export interface Folder {
  id: string;
  name?: string;
  path?: string;
  type?: FolderType | string;
  /** Single string in `standard`; all-languages object in `original`. */
  title?: Localized;
  /** Arbitrary typed content JSON; shape depends on `type`. */
  data?: Record<string, unknown>;
  /** First 250 chars of the localized markdown body (standard representation only). */
  textPreview?: string;
  [key: string]: unknown;
}

/** Ancestor chain attached to single-folder responses (root down to parent). */
export interface FolderRelated {
  ancestors?: Resource<Folder>[];
}

/** Body for `POST /folders/{repoId}` (create). */
export interface CreateFolderInput {
  parent: FolderReference;
  name: string;
  title: string;
  type: FolderType | string;
  /** Optional typed content; defaults to `{}` when omitted. */
  data?: Record<string, unknown>;
}

/** Mutable fields for `POST /folders/{repoId}/{folderVar}` (update). All optional. */
export interface UpdateFolderInput {
  name?: string;
  parent?: FolderReference;
  /** Bare string merges under Content-Language; object replaces all translations. */
  title?: Localized;
  /** Replaces typed content wholesale; omit to leave unchanged. */
  data?: Record<string, unknown>;
}

/** A single permission record. */
export interface PermissionRecord {
  principal: Principal;
  permission: Permission;
  effect: Effect;
}

/** A direct media-item membership entry on a folder. */
export interface MediaMembership {
  id: string;
  filename: string;
}

/** A patch op applied to a folder's direct media membership. */
export type MediaMembershipPatch =
  | { op: "add"; id: string; filename: string }
  | { op: "remove"; id: string }
  | { op: "remove"; filename: string };

/** Query for `action;tree`. */
export interface TreeQuery {
  depth?: number;
}
