import type { ReadOptions, WriteLanguageOptions } from '../types/common';
import type { Collection, Resource } from '../types/envelope';
import type {
  CreateOrganizationInput,
  Organization,
  OrganizationMember,
  OrganizationMemberPatch,
  OrganizationName,
  UpdateOrganizationInput,
} from '../types/organizations';

/**
 * Organization endpoints. Organizations qualify repository names and group the
 * users allowed to create repositories in them. They are addressed by name
 * (case-insensitive) and have no revision.
 */
export interface IOrganizationsApi {
  /**
   * List the organizations in which the caller holds any role, ordered by
   * name. Not paginated.
   *
   * @param options `Accept-Language` override.
   * @returns Every organization the caller is a member or owner of.
   */
  list(options?: Pick<ReadOptions, 'acceptLanguage'>): Promise<Collection<OrganizationResource>>;

  /**
   * Create an organization and make the caller its owner. The title is stored
   * under `Content-Language` (the client default unless overridden). Throws
   * `ApiError` 409 (`ErrorType.OrganizationNameConflict`) if the name is taken
   * (compared case-insensitively), or 400 for an invalid name.
   *
   * @param input The organization's name and title.
   * @param options `Content-Language`/`Accept-Language` overrides.
   * @returns The created organization.
   */
  create(input: CreateOrganizationInput, options?: OrganizationWriteOptions): Promise<OrganizationResource>;

  /**
   * Retrieve an organization by name. Requires no session and no role. Throws
   * `ApiError` 404 (`ErrorType.OrganizationNotFound`).
   *
   * @param orgName The organization's name (case-insensitive).
   * @param options Field selector, representation, and `Accept-Language` override.
   * @returns The organization.
   */
  get(orgName: OrganizationName, options?: ReadOptions): Promise<OrganizationResource>;

  /**
   * Update an organization's title. Requires the owner role; no revision is
   * needed. A bare-string title is merged into the existing translations under
   * `Content-Language`; an object replaces every translation. The name cannot
   * be changed.
   *
   * @param orgName The organization's name (case-insensitive).
   * @param data Fields to change; omitted fields are left unchanged.
   * @param options `Content-Language`/`Accept-Language` overrides.
   * @returns The updated organization.
   */
  update(
    orgName: OrganizationName,
    data: UpdateOrganizationInput,
    options?: OrganizationWriteOptions,
  ): Promise<OrganizationResource>;

  /**
   * Delete an organization. Requires the owner role. Throws `ApiError` 409
   * (`ErrorType.OrganizationNotEmpty`) while repositories still belong to it.
   *
   * @param orgName The organization's name (case-insensitive).
   * @returns Resolves once the organization is deleted.
   */
  delete(orgName: OrganizationName): Promise<void>;

  /**
   * List the organization's members (owners included), ordered by email; each
   * user appears once, with the role they hold. Requires the member role. Not
   * paginated.
   *
   * @param orgName The organization's name (case-insensitive).
   * @returns The member list.
   */
  getMembers(orgName: OrganizationName): Promise<OrganizationMembersCollection>;

  /**
   * Apply an ordered list of member operations in a single transaction.
   * Requires the owner role. A request that would leave the organization with
   * no owner is rejected with a 422 `ApiError`
   * (`ErrorType.OrganizationWouldHaveNoOwners`) and none of its operations is
   * applied; an email with no registered user yields 404
   * (`ErrorType.UserNotFound`).
   *
   * @param orgName The organization's name (case-insensitive).
   * @param patches The operations to apply, in order.
   * @returns The resulting member list.
   */
  patchMembers(orgName: OrganizationName, patches: OrganizationMemberPatch[]): Promise<OrganizationMembersCollection>;
}

export type OrganizationResource = Resource<Organization>;

/** Result of {@link IOrganizationsApi.getMembers} and {@link IOrganizationsApi.patchMembers}. */
export type OrganizationMembersCollection = Collection<{ data: OrganizationMember }>;

/** Options for organization writes (no field selector). */
export type OrganizationWriteOptions = Pick<WriteLanguageOptions, 'contentLanguage' | 'acceptLanguage'>;
