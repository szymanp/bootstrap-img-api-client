import { readParams } from '../http/language';
import { parseJson, parseVoid, Transport } from '../http/transport';
import type { LinksProvider } from '../links';
import type { ReadOptions } from '../types/common';
import type { Collection } from '../types/envelope';
import type {
  CreateOrganizationInput,
  OrganizationMemberPatch,
  OrganizationName,
  UpdateOrganizationInput,
} from '../types/organizations';
import type {
  IOrganizationsApi,
  OrganizationMembersCollection,
  OrganizationResource,
  OrganizationWriteOptions,
} from './organizations.api';

/** Organization endpoints. */
export class OrganizationsApi implements IOrganizationsApi {
  constructor(
    private readonly transport: Transport,
    private readonly links: LinksProvider,
  ) {}

  /** List the organizations in which the caller holds any role. */
  async list(options: Pick<ReadOptions, 'acceptLanguage'> = {}): Promise<Collection<OrganizationResource>> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).listOrgs().href,
      acceptLanguage: options.acceptLanguage,
      parse: parseJson<Collection<OrganizationResource>>,
    });
  }

  /** Create an organization; the caller becomes its owner. */
  async create(input: CreateOrganizationInput, options: OrganizationWriteOptions = {}): Promise<OrganizationResource> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).createOrg().href,
      acceptLanguage: options.acceptLanguage,
      // Content-Language is required by this endpoint; default to the client locale.
      contentLanguage: options.contentLanguage ?? this.transport.defaultLanguage,
      body: { kind: 'json', value: { data: input } },
      parse: parseJson<OrganizationResource>,
    });
  }

  /** Retrieve an organization by name. */
  async get(orgName: OrganizationName, options: ReadOptions = {}): Promise<OrganizationResource> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).readOrg(orgName).href,
      query: readParams(options),
      acceptLanguage: options.acceptLanguage,
      parse: parseJson<OrganizationResource>,
    });
  }

  /** Update an organization's title (owner role; no revision). */
  async update(
    orgName: OrganizationName,
    data: UpdateOrganizationInput,
    options: OrganizationWriteOptions = {},
  ): Promise<OrganizationResource> {
    return this.transport.request({
      method: 'POST',
      path: (await this.links()).updateOrg(orgName).href,
      acceptLanguage: options.acceptLanguage,
      contentLanguage: options.contentLanguage ?? this.transport.defaultLanguage,
      body: { kind: 'json', value: { data } },
      parse: parseJson<OrganizationResource>,
    });
  }

  /** Delete an empty organization (owner role). */
  async delete(orgName: OrganizationName): Promise<void> {
    return this.transport.request({
      method: 'DELETE',
      path: (await this.links()).deleteOrg(orgName).href,
      parse: parseVoid,
    });
  }

  /** List the organization's members, owners included (member role). */
  async getMembers(orgName: OrganizationName): Promise<OrganizationMembersCollection> {
    return this.transport.request({
      method: 'GET',
      path: (await this.links()).listOrgMembers(orgName).href,
      parse: parseJson<OrganizationMembersCollection>,
    });
  }

  /** Apply member operations atomically (owner role); returns the resulting member list. */
  async patchMembers(
    orgName: OrganizationName,
    patches: OrganizationMemberPatch[],
  ): Promise<OrganizationMembersCollection> {
    return this.transport.request({
      method: 'PATCH',
      path: (await this.links()).patchOrgMembers(orgName).href,
      body: { kind: 'json', value: patches },
      parse: parseJson<OrganizationMembersCollection>,
    });
  }
}
