import type {
  AccessLink,
  AccessLinkGrant,
  AccessLinkGrantId,
  AccessLinkId,
  CreateAccessLinkInput,
} from '../types/access-links';
import type { Collection, Resource } from '../types/envelope';

/**
 * Access-link endpoints, scoped to a single repository. An access link is a
 * code that gives `view` on one or more folders to whoever redeems it (see
 * `IAuthApi.redeemAccessLink`). Owners and editors manage every link of the
 * repository and see its recipients; a creator without a repository role
 * manages only the links they created and doesn't see their recipients.
 * Another caller gets a 404 `ApiError` (`ErrorType.AccessLinkNotFound`) for a
 * link. Link operations change no folder revision and no `repositoryVersion`;
 * they are recorded in the changelog.
 */
export interface IAccessLinksApi {
  /**
   * Create an access link. A registered user may do so as an owner or editor
   * of the repository, or with `share` on every folder of the link (otherwise
   * a 403 `ApiError`, and nothing is created). An anonymous session yields a
   * 403 `ApiError` (`ErrorType.RegisteredUserRequired`).
   *
   * @param input The link's permissions (1 to 100, each `view`), plus an
   * optional label and expiry.
   * @returns The link, with its code in `data.code` — shown only this once.
   */
  create(input: CreateAccessLinkInput): Promise<AccessLinkResource>;

  /**
   * List the links the caller manages, newest first, without codes: every
   * link of the repository for an owner or editor, the links they created
   * for anyone else. An anonymous session yields a 403 `ApiError`
   * (`ErrorType.RegisteredUserRequired`); an unknown repository a 404
   * (`ErrorType.RepositoryNotFound`).
   *
   * @returns The links.
   */
  list(): Promise<AccessLinksCollection>;

  /**
   * Retrieve a link, without its code. An anonymous session yields a 403
   * `ApiError` (`ErrorType.RegisteredUserRequired`); an unknown repository a
   * 404 (`ErrorType.RepositoryNotFound`), and a link that doesn't exist or
   * that the caller doesn't manage a 404 (`ErrorType.AccessLinkNotFound`).
   *
   * @param linkId The link's id.
   * @returns The link.
   */
  get(linkId: AccessLinkId): Promise<AccessLinkResource>;

  /**
   * Stop redemption of a link; access already given stays. Idempotent; there
   * is no reactivation.
   *
   * @param linkId The link's id.
   * @returns The deactivated link.
   */
  deactivate(linkId: AccessLinkId): Promise<AccessLinkResource>;

  /**
   * Delete a link and withdraw the access it has given from everyone.
   *
   * @param linkId The link's id.
   * @returns Resolves once the link is deleted.
   */
  delete(linkId: AccessLinkId): Promise<void>;

  /**
   * List a link's recipients, oldest first. Owners and editors only (a 403
   * `ApiError` otherwise).
   *
   * @param linkId The link's id.
   * @returns The link's grants.
   */
  listGrants(linkId: AccessLinkId): Promise<AccessLinkGrantsCollection>;

  /**
   * Withdraw what a link gave one recipient; access they have otherwise
   * stays, and they may redeem the link again while it is active. Idempotent.
   * Owners and editors only.
   *
   * @param linkId The link's id.
   * @param grantId The grant's id.
   * @returns Resolves once the grant is deleted.
   */
  deleteGrant(linkId: AccessLinkId, grantId: AccessLinkGrantId): Promise<void>;
}

export type AccessLinkResource = Resource<AccessLink>;

/** Result of {@link IAccessLinksApi.list}. */
export type AccessLinksCollection = Collection<AccessLinkResource>;

/** Result of {@link IAccessLinksApi.listGrants}. */
export type AccessLinkGrantsCollection = Collection<Resource<AccessLinkGrant>>;
