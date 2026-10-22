import { parseJson, parseVoid, Transport } from '../http/transport';
import type { LinksProvider } from '../links';
import { FolderRef } from '../refs';
import type { AccessLinkGrantId, AccessLinkId, CreateAccessLinkInput } from '../types/access-links';
import type {
  AccessLinkGrantsCollection,
  AccessLinkResource,
  AccessLinksCollection,
  IAccessLinksApi,
} from './access-links.api';

/** Access-link endpoints, scoped to a single repository. */
export class AccessLinksApi implements IAccessLinksApi {
  constructor(
    private readonly transport: Transport,
    private readonly repoId: string,
    private readonly links: LinksProvider,
  ) {}

  /** Create an access link; its code is in `data.code`, shown only this once. */
  async create(input: CreateAccessLinkInput): Promise<AccessLinkResource> {
    const data = {
      ...input,
      permissions: input.permissions.map((p) => ({
        folder: FolderRef.from(p.folder).toReference(),
        permission: p.permission,
      })),
    };
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).createAccessLink(this.repoId).href,
      body: { kind: 'json', value: { data } },
      parse: parseJson<AccessLinkResource>,
    });
  }

  /** List the links the caller manages, newest first. */
  async list(): Promise<AccessLinksCollection> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).listAccessLinks(this.repoId).href,
      parse: parseJson<AccessLinksCollection>,
    });
  }

  /** Retrieve a link, without its code. */
  async get(linkId: AccessLinkId): Promise<AccessLinkResource> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).readAccessLink(this.repoId, linkId).href,
      parse: parseJson<AccessLinkResource>,
    });
  }

  /** Stop redemption of a link (idempotent). */
  async deactivate(linkId: AccessLinkId): Promise<AccessLinkResource> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).deactivateAccessLink(this.repoId, linkId).href,
      parse: parseJson<AccessLinkResource>,
    });
  }

  /** Delete a link and withdraw the access it has given. */
  async delete(linkId: AccessLinkId): Promise<void> {
    return this.transport.request({
      method: 'DELETE',
      path: (await this.links()).deleteAccessLink(this.repoId, linkId).href,
      parse: parseVoid,
    });
  }

  /** List a link's recipients, oldest first. */
  async listGrants(linkId: AccessLinkId): Promise<AccessLinkGrantsCollection> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).listAccessLinkGrants(this.repoId, linkId).href,
      parse: parseJson<AccessLinkGrantsCollection>,
    });
  }

  /** Withdraw what a link gave one recipient (idempotent). */
  async deleteGrant(linkId: AccessLinkId, grantId: AccessLinkGrantId): Promise<void> {
    return this.transport.request({
      method: 'DELETE',
      path: (await this.links()).deleteAccessLinkGrant(this.repoId, linkId, grantId).href,
      parse: parseVoid,
    });
  }
}
