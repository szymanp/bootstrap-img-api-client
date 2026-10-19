import type { LanguageTag, Localized } from './common';
import type { HrefLink, PageCursor } from './envelope';
import type {
  FolderCover,
  FolderDateRange,
  FolderId,
  FolderTag,
  FolderType,
  MediaMembershipOrderBy,
} from './folders';
import type { MediaItemId, MediaListOrderBy } from './media';

/**
 * A folder's public key: its stable identifier in published URLs, a slug of its
 * name plus a random suffix (e.g. `narty-2025-k3x9p2q`). Allocated the first
 * time the folder is published; regenerating gives a new one, and old keys
 * stay valid and are never reused.
 */
export type FolderPublicKey = string;

/** A publication revision number. Counts up from 1; never reused, even after deletion. */
export type PublicationRevisionNumber = number;

/**
 * Addresses a publication (`{publicationRootVar}`): the root folder's public
 * key (current or earlier) for its default revision, or `{ key, revision }`
 * for a revision by number (`<key>;rev=<n>`).
 */
export type PublicationRef = FolderPublicKey | { key: FolderPublicKey; revision?: PublicationRevisionNumber };

/** A folder's `data.publication`: present once it has a public key or has been published. */
export interface FolderPublicationStatus {
  /** The folder's current public key. */
  publicKey: FolderPublicKey;
  /** The folder's default revision; absent when none is the default. */
  defaultRevision?: PublicationRevisionNumber;
  /** The newest of the folder's own revisions; absent when it has none. */
  latestRevision?: PublicationRevisionNumber;
}

/** Body `data` for `POST /folders/{repoId}/{folderVar}/publications`. All optional. */
export interface PublishInput {
  /** Describes the revision. */
  message?: string;
  /** Makes the new revision the default (defaults to `false`). */
  setAsDefault?: boolean;
}

/** A publication revision, as listed and as returned by publishing. */
export interface PublicationRevision {
  revision: PublicationRevisionNumber;
  message?: string;
  createdAt: string;
  isDefault: boolean;
}

/** The severity of a {@link PublicationDiagnostic}: errors refuse the publication. */
export type PublicationDiagnosticSeverity = 'warning' | 'error';

/**
 * Known diagnostic codes. Errors: `object-invalid`, `object-unknown`,
 * `query-scope-invalid`, `query-scope-excluded`, `query-scope-not-readable`.
 * Warnings: `reference-missing`, `reference-malformed`,
 * `reference-unavailable`, `object-missing`.
 */
export type PublicationDiagnosticCode =
  | 'object-invalid'
  | 'object-unknown'
  | 'query-scope-invalid'
  | 'query-scope-excluded'
  | 'query-scope-not-readable'
  | 'reference-missing'
  | 'reference-malformed'
  | 'reference-unavailable'
  | 'object-missing'
  | (string & {});

/** One issue found while checking a publication snapshot. */
export interface PublicationDiagnostic {
  severity: PublicationDiagnosticSeverity;
  code: PublicationDiagnosticCode;
  /** The folder whose text or object it concerns. */
  folder: FolderId;
  /** When it concerns one language's text. */
  language?: LanguageTag;
  /** `text`, or `data` for an embedded object. */
  location: 'text' | 'data';
  /** When it concerns an embedded object. */
  objectKey?: string;
  reference?: string;
  message: string;
}

/** `meta` of a published-content response: the revision shown. */
export interface PublicationMeta {
  revision: PublicationRevisionNumber;
  isDefault: boolean;
  createdAt: string;
  message?: string;
}

/** Body for `POST /folders/{repoId}/{folderVar}/publication-preview`. All optional. */
export interface PublicationPreviewInput {
  /** The live folder whose page to render; the root by default. Must be a page of the publication. */
  page?: FolderId;
  /** The language to render the text in, if the page has text in it; else negotiated from `Accept-Language`. */
  language?: LanguageTag;
}

/**
 * One row of a publication's tree, in pre-order. A page has `key`, `name`,
 * `type`, and `title`; a group (`group: true`) is an excluded folder kept for
 * the structure of its included descendants, with its `title` only.
 */
export interface PublishedTreeRow {
  /** Local to the revision. */
  id: number;
  /** Absent for the root. */
  parentId?: number;
  depth: number;
  /** Position among its siblings. */
  position: number;
  group: boolean;
  /** Empty when a group has none. */
  title: string;
  key?: FolderPublicKey;
  name?: string;
  type?: FolderType;
  /** In a preview: the live folder the row comes from. */
  folder?: FolderId;
  [key: string]: unknown;
}

/** A published page: the snapshot's folder data, tags, and summary. */
export interface PublishedPage {
  key: FolderPublicKey;
  name: string;
  type: FolderType;
  title: Localized;
  /** The folder's typed content, with its `text` object data. */
  data: Record<string, unknown>;
  tags: FolderTag[];
  /** Computed when published from the media published with the page. */
  cover?: FolderCover;
  /** Computed when published from the media published with the page. */
  dateRange?: FolderDateRange;
  /** Media published directly with the page. */
  directCount: number;
  /** Media published with the page and its subfolders. */
  effectiveCount: number;
  /** In a preview: the row id. */
  id?: number;
  /** In a preview: the live folder. */
  folder?: FolderId;
  [key: string]: unknown;
}

/** Status of a reference in a published text. */
export type PublishedReferenceStatus = 'resolved' | 'missing' | 'malformed' | 'unavailable';

/** A reference of a published text, or of an object it embeds. */
export interface PublishedReference {
  /** The original `scheme:target` reference text. */
  url: string;
  sourceLocation: 'text' | 'data' | string;
  targetKind: 'folder' | 'media';
  status: PublishedReferenceStatus;
  /** A resolved media reference's item. */
  mediaItem?: MediaItemId;
  /** A resolved folder reference's page URL; its resource is under `related.folders`. */
  folder?: string;
  /** In a preview: a reference to a page of the preview names its tree row. */
  page?: number;
  [key: string]: unknown;
}

/** An entry of a resolved folder list. */
export interface PublishedFolderListEntry {
  status: PublishedReferenceStatus;
  folder?: string;
  page?: number;
  [key: string]: unknown;
}

/** A resolved embedded object: a gallery's `items`, or a folder list's `entries`, in order. */
export interface PublishedResolvedObject {
  items?: MediaItemId[];
  entries?: PublishedFolderListEntry[];
  [key: string]: unknown;
}

/** Ordering for a published page's `effective` media. */
export type PublishedEffectiveMediaOrderBy = MediaListOrderBy;

/** Ordering for a published page's `direct` media. */
export type PublishedDirectMediaOrderBy = MediaMembershipOrderBy;

/**
 * Filter-form query for a published page's media. `effective` (the default)
 * lists every item the page exposes, subfolders included, each once, as
 * `POST /media/{repoId}/action;list`; `direct` the page's own links, as
 * `…/media;query`.
 */
export type PublishedMediaFilterQuery = (
  | {
    membership?: 'effective';
    /** Defaults to `creationTime`, newest first. */
    orderBy?: PublishedEffectiveMediaOrderBy;
    relativeTo?: { id: MediaItemId };
  }
  | {
    membership: 'direct';
    /** Defaults to `custom`. */
    orderBy?: PublishedDirectMediaOrderBy;
    relativeTo?: { filename: string };
  }
) & {
  offset?: number;
  /** Defaults to `30`. */
  limit?: number;
  /** Field selector applied to the returned media items. */
  fields?: string | string[];
  cursor?: never;
};

/** Cursor-form query for a published page's media: continues from a previous `meta.next`/`meta.prev`. */
export interface PublishedMediaCursorQuery {
  cursor: PageCursor;
  limit?: number;
  /** Field selector applied to the returned media items. */
  fields?: string | string[];
  membership?: never;
  orderBy?: never;
  relativeTo?: never;
  offset?: never;
}

/** Query for `POST /published/{repoId}/{publicationRootVar}[/sub/{key}]/media;query`. */
export type PublishedMediaQuery = PublishedMediaFilterQuery | PublishedMediaCursorQuery;

/** Links of `GET /published/{repoId}`. */
export interface PublishedEntryPoints {
  links: {
    /** The "All albums" index. */
    index: HrefLink;
    /** The default revision of `/home`, when it has one the caller may see. */
    home?: HrefLink;
  };
}
