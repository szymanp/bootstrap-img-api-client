import { fieldsParam } from '../http/language';
import { parseJson, Transport } from '../http/transport';
import type { LinksProvider } from '../links';
import type { ReadOptions } from '../types/common';
import type { PublicationRef, PublishedEntryPoints, PublishedMediaQuery } from '../types/publishing';
import type {
  IPublishedApi,
  PublishedHref,
  PublishedIndex,
  PublishedIndexQuery,
  PublishedMediaCollection,
  PublishedPageOptions,
  PublishedPageResource,
  PublishedText,
  PublishedTree,
} from './published.api';

/** Published-content endpoints, scoped to a single repository. */
export class PublishedApi implements IPublishedApi {
  constructor(
    private readonly transport: Transport,
    private readonly repoId: string,
    private readonly links: LinksProvider,
  ) {}

  /** The Viewer's entry points (`index`, `home`). */
  async entryPoints(): Promise<PublishedEntryPoints> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).discoverPublished(this.repoId).href,
      parse: parseJson<PublishedEntryPoints>,
    });
  }

  /** The albums whose default revision the caller may see, newest published first. */
  async index(
    query: PublishedIndexQuery = {},
    options: Pick<ReadOptions, 'acceptLanguage'> = {},
  ): Promise<PublishedIndex> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).publishedIndex(this.repoId).href,
      query: { limit: query.limit, cursor: query.cursor },
      acceptLanguage: options.acceptLanguage,
      parse: parseJson<PublishedIndex>,
    });
  }

  /** A publication's root page, or an included subfolder's page. */
  async get(publication: PublicationRef, options: PublishedPageOptions = {}): Promise<PublishedPageResource> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).readPublished(this.repoId, publication, options.sub).href,
      acceptLanguage: options.acceptLanguage,
      parse: parseJson<PublishedPageResource>,
    });
  }

  /** Everything needed to render a published page's markdown. */
  async getText(publication: PublicationRef, options: PublishedPageOptions = {}): Promise<PublishedText> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).publishedText(this.repoId, publication, options.sub).href,
      acceptLanguage: options.acceptLanguage,
      parse: parseJson<PublishedText>,
    });
  }

  /** The publication's whole tree, in pre-order. */
  async tree(
    publication: PublicationRef,
    options: Pick<ReadOptions, 'acceptLanguage'> = {},
  ): Promise<PublishedTree> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).publishedTree(this.repoId, publication).href,
      acceptLanguage: options.acceptLanguage,
      parse: parseJson<PublishedTree>,
    });
  }

  /** A page of a published page's media. */
  async queryMedia(
    publication: PublicationRef,
    query: PublishedMediaQuery = {},
    options: PublishedPageOptions = {},
  ): Promise<PublishedMediaCollection> {
    const path = (await this.links()).queryPublishedMedia(this.repoId, publication, options.sub).href;
    return this.postMediaQuery(path, query, options);
  }

  /** Read the page a published link points at. */
  followPage(
    link: PublishedHref,
    options: Pick<ReadOptions, 'acceptLanguage'> = {},
  ): Promise<PublishedPageResource> {
    return this.getHref(link, options, parseJson<PublishedPageResource>);
  }

  /** Read the text bundle a page's `text` link points at. */
  followText(link: PublishedHref, options: Pick<ReadOptions, 'acceptLanguage'> = {}): Promise<PublishedText> {
    return this.getHref(link, options, parseJson<PublishedText>);
  }

  /** Read the tree a page's `tree` link points at. */
  followTree(link: PublishedHref, options: Pick<ReadOptions, 'acceptLanguage'> = {}): Promise<PublishedTree> {
    return this.getHref(link, options, parseJson<PublishedTree>);
  }

  /** Query the media a page's `media` link points at. */
  followMedia(
    link: PublishedHref,
    query: PublishedMediaQuery = {},
    options: Pick<ReadOptions, 'acceptLanguage'> = {},
  ): Promise<PublishedMediaCollection> {
    return this.postMediaQuery(hrefOf(link), query, options);
  }

  private getHref<T>(
    link: PublishedHref,
    options: Pick<ReadOptions, 'acceptLanguage'>,
    parse: (response: Response) => Promise<T>,
  ): Promise<T> {
    return this.transport.request({
      method: 'GET',
      path: hrefOf(link),
      acceptLanguage: options.acceptLanguage,
      parse,
    });
  }

  private postMediaQuery(
    path: string,
    query: PublishedMediaQuery,
    options: Pick<ReadOptions, 'acceptLanguage'>,
  ): Promise<PublishedMediaCollection> {
    const { fields, ...rest } = query;
    return this.transport.request({
      method: 'POST',
      path,
      acceptLanguage: options.acceptLanguage,
      body: { kind: 'json', value: { query: rest, fields: fieldsParam(fields) } },
      parse: parseJson<PublishedMediaCollection>,
    });
  }
}

/** The bare `href` of a {@link PublishedHref}. */
function hrefOf(link: PublishedHref): string {
  return typeof link === 'string' ? link : link.href;
}
