import type { Localized, Principal } from './common';
import type { Resource } from './envelope';
import type { FolderReference, FolderType, MediaMembership, PermissionRecord } from './folders';
import type { MediaType, MediaVisibility } from './media';

/** A named group of fields a metadata snapshot can include. */
export type MetadataSnapshotAspect =
  | 'repository'
  | 'folder-data'
  | 'folder-text'
  | 'folder-permissions'
  | 'folder-media'
  /** No authored media-item override API exists yet; requesting this aspect fails with `422`. */
  | 'media-item-overrides';

/** What a metadata snapshot covers. */
export interface MetadataSnapshotScope {
  /** Repository-relative folder paths; each covers that folder and everything beneath it. */
  roots?: string[];
  /** Defaults to every aspect except `media-item-overrides` when omitted. */
  include?: MetadataSnapshotAspect[];
}

/** Body for `POST /repos/{repoId}/metadata-snapshots`. */
export interface CreateMetadataSnapshotInput {
  formatVersion: 1;
  scope?: MetadataSnapshotScope;
}

/**
 * One record from a `Ready` snapshot. Records are returned in a fixed order —
 * the repository record, then folders in path order (parents before
 * children), then media items.
 */
export type MetadataSnapshotRecord =
  | RepositorySnapshotRecord
  | FolderSnapshotRecord
  | MediaItemSnapshotRecord;

/** The repository record in a `Ready` snapshot. */
export interface RepositorySnapshotRecord {
  type: 'repository';
  revision: string;
  value: {
    name: string;
    title: Localized;
    owners: Principal[];
    editors: Principal[];
  };
}

/** A folder record in a `Ready` snapshot. */
export interface FolderSnapshotRecord {
  type: 'folder';
  id: string;
  revision: string;
  /** `{ path: "/albums" }` when the *parent's* type is root/albums/media, else `{ id: "<uuid>" }`. */
  parent?: FolderReference;
  name: string;
  /** `folders.data_content` (`kind` renamed to `type`) plus the folder's full localized title, verbatim. */
  data: Record<string, unknown> & { type: FolderType; title: Localized };
  texts?: Record<string, string>;
  /** Same record shape as `GET .../permissions`. */
  permissions: Resource<PermissionRecord>[];
  /** Same record shape as `GET .../media`. */
  media: MediaMembership[];
}

/** A media-item record in a `Ready` snapshot. */
export interface MediaItemSnapshotRecord {
  type: 'media-item';
  id: string;
  value: {
    type: MediaType | string;
    visibility: MediaVisibility;
    originalHash: string;
    [key: string]: unknown;
  };
}
