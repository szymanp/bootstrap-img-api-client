import type { LanguageTag, ReadOptions } from '../types/common';
import type { HrefLink, LinkSet, Meta, PageCursor } from '../types/envelope';
import type {
  PublicationMeta,
  PublicationRef,
  FolderPublicKey,
  PublishedEntryPoints,
  PublishedMediaQuery,
  PublishedPage,
  PublishedReference,
  PublishedResolvedObject,
  PublishedTreeRow,
} from '../types/publishing';
import type { MediaResource } from './media.api';

/**
 * Published content (what the Viewer reads), scoped to a single repository.
 *
 * A publication is addressed by its root folder's public key (current or
 * earlier) for the default revision, or `{ key, revision }` for a revision by
 * number; an included subfolder's page by its own public key (`sub`). Who sees
 * what follows the live root folder's permissions: `view` shows its default
 * revision, `read` (or a repository role) every revision. Anything the caller
 * may not see is a 404 `ErrorType.PublicationNotFound`, as is an unknown key,
 * a folder without a default revision, or a subfolder the revision doesn't
 * include as a page.
 */
export interface IPublishedApi {
  /**
   * The Viewer's entry points: `index` (the "All albums" index) and `home`
   * (the default revision of `/home`, when the caller may see it). A 404
   * `ErrorType.RepositoryNotFound` for an unknown repository.
   */
  entryPoints(): Promise<PublishedEntryPoints>;

  /**
   * The albums whose default revision the caller may see, newest published
   * first, as page resources. `/home` is not listed. Continue with
   * `meta.next` as `cursor`; it is absent on the last page.
   */
  index(query?: PublishedIndexQuery, options?: Pick<ReadOptions, 'acceptLanguage'>): Promise<PublishedIndex>;

  /** A publication's root page, or (with `options.sub`) an included subfolder's page. */
  get(publication: PublicationRef, options?: PublishedPageOptions): Promise<PublishedPageResource>;

  /**
   * Everything needed to render a page's markdown, in the language negotiated
   * from `Accept-Language` (another one when the page has no text in it):
   * the markdown and object definitions as written, every reference with its
   * resolution, the resolved embedded objects, and the related media items
   * and pages.
   */
  getText(publication: PublicationRef, options?: PublishedPageOptions): Promise<PublishedText>;

  /** The publication's whole tree, unpaginated, in pre-order. */
  tree(publication: PublicationRef, options?: Pick<ReadOptions, 'acceptLanguage'>): Promise<PublishedTree>;

  /**
   * A page of a published page's media (see "Paging media lists" in the API
   * docs). `membership: 'effective'` (the default) lists every item the page
   * exposes, subfolders included, each once; `direct` the page's own links.
   * The membership and order are the snapshot's; the items are live, and one
   * that has since become `restricted` is left out.
   */
  queryMedia(
    publication: PublicationRef,
    query?: PublishedMediaQuery,
    options?: PublishedPageOptions,
  ): Promise<PublishedMediaCollection>;

  /**
   * Read the page a published link points at, as {@link get} does: a page's
   * `self`/`root` link, a tree row's `self`, `entryPoints().links.home`, a
   * publication record's `published` link, or a resolved folder reference's
   * `folder` (in {@link PublishedText.references} or a folder list's
   * `entries`). Following links keeps the revision they name (`;rev=N`), and
   * leads into another publication when the link does.
   */
  followPage(link: PublishedHref, options?: Pick<ReadOptions, 'acceptLanguage'>): Promise<PublishedPageResource>;

  /** Read the text bundle a page's `text` link points at, as {@link getText} does. */
  followText(link: PublishedHref, options?: Pick<ReadOptions, 'acceptLanguage'>): Promise<PublishedText>;

  /** Read the tree a page's `tree` link points at, as {@link tree} does. */
  followTree(link: PublishedHref, options?: Pick<ReadOptions, 'acceptLanguage'>): Promise<PublishedTree>;

  /** Query the media a page's `media` link points at, as {@link queryMedia} does. */
  followMedia(
    link: PublishedHref,
    query?: PublishedMediaQuery,
    options?: Pick<ReadOptions, 'acceptLanguage'>,
  ): Promise<PublishedMediaCollection>;
}

/**
 * A ready-made published URL, as the API returns it: an {@link HrefLink} or
 * its bare `href` (a path relative to the client's `baseUrl`, e.g.
 * `/published/{repoId}/narty-k3x9p2q;rev=1/text`).
 */
export type PublishedHref = HrefLink | string;

/** Options for reads of a single published page. */
export interface PublishedPageOptions {
  /** The public key of an included subfolder, to address its page instead of the root's. */
  sub?: FolderPublicKey;
  /** Per-call `Accept-Language` override. */
  acceptLanguage?: LanguageTag;
}

/** Query for {@link IPublishedApi.index}. */
export interface PublishedIndexQuery {
  /** Defaults to `20` (at least `1`). */
  limit?: number;
  /** `meta.next` of the previous page. */
  cursor?: PageCursor;
}

/** `meta` of a published-content response. */
export interface PublishedMeta extends Meta {
  /** The revision shown; every link in the response names it (`;rev=N`). */
  publication: PublicationMeta;
}

/** A published page resource. A subfolder's page also has a `root` link. */
export interface PublishedPageResource {
  meta: PublishedMeta;
  data: PublishedPage;
  links?: LinkSet;
}

/** Result of {@link IPublishedApi.index}. */
export interface PublishedIndex {
  meta: Meta;
  records: PublishedPageResource[];
}

/** Result of {@link IPublishedApi.getText}. */
export interface PublishedText {
  /** `language` is absent when the page has no text. */
  meta: PublishedMeta & { language?: LanguageTag };
  data: {
    /** As written; `""` when there is none. */
    markdown: string;
    /** The object definitions, as written. */
    objects: Record<string, unknown>;
  };
  /** Every reference of the text and of the objects it embeds (`sourceLocation: "data"`). */
  references: PublishedReference[];
  /** The resolved embedded objects, by key. */
  objects: Record<string, PublishedResolvedObject>;
  related: {
    /** The referenced and gallery items. */
    mediaItems?: MediaResource[];
    /** The referenced and listed pages, each identified by its `self` link. */
    folders?: PublishedPageResource[];
  };
}

/** Result of {@link IPublishedApi.tree}. */
export interface PublishedTree {
  meta: PublishedMeta;
  /** A page row has a `self` link; a group row none. */
  records: { data: PublishedTreeRow; links?: LinkSet }[];
}

/** Result of {@link IPublishedApi.queryMedia}. In the direct form, records carry `meta.filename` too. */
export interface PublishedMediaCollection {
  meta: PublishedMeta;
  records: MediaResource[];
}
