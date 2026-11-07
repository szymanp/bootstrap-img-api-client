/** Public API surface for bootstrap-img-client. */

export { BootstrapClient } from './client';
export type { ClientOptions, FetchLike } from './config';

// Resource API interfaces (the user-facing types for the sub-clients).
export type { IAuthApi } from './api/auth.api';
export {
  generateLoginRequestId,
  isLoginCode,
  isLoginRequestId,
  LOGIN_CODE_PATTERN,
  LOGIN_REQUEST_ID_PATTERN,
} from './api/auth.api';
export type { IUsersApi } from './api/users.api';
export { isVerificationToken, VERIFICATION_TOKEN_PATTERN } from './api/users.api';
export type {
  IRepositoriesApi,
  RepositoryMeta,
  RepositoryQuery,
  RepositoryResource,
  RepositoryRelated,
  GetRepositoryByNameOptions,
  ChangelogCollection,
  RepositoryTagsCollection,
  RepositoryTagsQuery,
  CreateMetadataSnapshotResult,
  MetadataSnapshotMeta,
  MetadataSnapshotQuery,
  MetadataSnapshotResult,
  MetadataSyncResult,
} from './api/repositories.api';
export type {
  IOrganizationsApi,
  OrganizationMembersCollection,
  OrganizationResource,
  OrganizationWriteOptions,
} from './api/organizations.api';
export type {
  IFoldersApi,
  FolderResource,
  FolderText,
  MediaMembershipCollection,
  PermissionsCollection,
  PermissionsRelated,
  PublicationPreview,
  PublicationsCollection,
  PublicationsMeta,
  PublishResult,
  PutTextOptions,
  PutTextResult,
  RegeneratePublicKeyResult,
  TextMediaCollection,
  TextMediaOptions,
  TextMediaRelated,
  TextMediaResult,
  UnresolvedReference,
} from './api/folders.api';
export type {
  IMediaApi,
  DownloadOptions,
  HlsRendition,
  MediaItemVariant,
  MediaResource,
  PossessionProof,
  UploadByIdOptions,
} from './api/media.api';
export type {
  IPublishedApi,
  PublishedHref,
  PublishedIndex,
  PublishedIndexQuery,
  PublishedMediaCollection,
  PublishedMeta,
  PublishedPageOptions,
  PublishedPageResource,
  PublishedText,
  PublishedTree,
} from './api/published.api';
export type {
  IAccessLinksApi,
  AccessLinkGrantsCollection,
  AccessLinkResource,
  AccessLinksCollection,
} from './api/access-links.api';
export type { IServiceRootApi, ServiceRoot } from './api/service-root.api';
export { ServiceLinks } from './links';

// References.
export { FolderRef, MediaRef, type FolderRefInput } from './refs';

// Errors.
export {
  ApiError,
  ErrorType,
  isApiError,
  problemFromResponse,
  type IdempotencyKeyReusedProblem,
  type KnownErrorType,
  type PossessionProofRequiredProblem,
  type ProblemDetails,
  type RevisionConflictProblem,
  type ValidationFailedProblem,
  type ValidationIssue,
} from './http/errors';

// Digests & upload-claim proofs.
export {
  computePossessionProof,
  formatPossessionProof,
  formatReprDigest,
  type RereadableBody,
  type Sha256Input,
} from './http/digest';

// Credential stores.
export {
  BrowserCredentialStore,
  MemoryCookieStore,
  defaultCredentialStore,
  type CredentialStore,
} from './http/credentials';

// Envelope & common types.
export {
  isTemplateLink,
  type Collection,
  type HrefLink,
  type Link,
  type LinkSet,
  type Meta,
  type PageCursor,
  type PageQuery,
  type Resource,
  type TemplateLink,
} from './types/envelope';
export type {
  Effect,
  LanguageTag,
  Localized,
  Permission,
  Principal,
  ReadOptions,
  Representation,
  UuidString,
  WriteLanguageOptions,
} from './types/common';
export type {
  AnonymousLoginResult,
  PrincipalId,
  PrincipalType,
  RedeemAccessLinkResult,
  RedeemedAccessLinkFolder,
  Session,
  SendTokenOptions,
  SendTokenResult,
} from './types/auth';
export type {
  AccessLink,
  AccessLinkGrant,
  AccessLinkGrantId,
  AccessLinkId,
  AccessLinkPermission,
  AccessLinkPermissionInput,
  AccessLinkPermissionKind,
  AccessLinkRecipient,
  AccessLinkStatus,
  CreateAccessLinkInput,
} from './types/access-links';
export type {
  EmailLanguageOptions,
  RegisterUserInput,
  UpdateUserInput,
  User,
  UserSummary,
  UserSettings,
} from './types/users';
export type {
  CreateRepositoryInput,
  Repository,
  RepositoryId,
  RepositoryRelationship,
  RepositoryRelationshipKind,
  RepositoryRole,
  UpdateRepositoryInput,
} from './types/repositories';
export type {
  CreateOrganizationInput,
  Organization,
  OrganizationMember,
  OrganizationMemberPatch,
  OrganizationName,
  OrganizationRole,
  UpdateOrganizationInput,
} from './types/organizations';
export type { AuditLogEntry } from './types/changelog';
export type {
  CreateMetadataSnapshotInput,
  FolderSnapshotRecord,
  MediaItemSnapshotRecord,
  MetadataSnapshotAspect,
  MetadataSnapshotRecord,
  MetadataSnapshotScope,
  RepositorySnapshotRecord,
} from './types/metadata-snapshot';
export type {
  FolderCreateOperation,
  FolderDeleteOperation,
  FolderUpdateChanges,
  FolderUpdateOperation,
  MetadataSyncOperation,
  MetadataSyncPlan,
  MetadataSyncTextChanges,
  RepositoryUpdateOperation,
} from './types/metadata-sync';
export type {
  CreateFolderInput,
  EffectivePermission,
  Folder,
  FolderCover,
  FolderCoverInput,
  FolderDateRange,
  FolderDateRangeInput,
  FolderTag,
  FolderId,
  FolderListOrderBy,
  FolderListQuery,
  FolderReference,
  FolderRelated,
  FolderSummarySelection,
  FolderType,
  MediaMembership,
  MediaMembershipCursorQuery,
  MediaMembershipFilterQuery,
  MediaMembershipOrderBy,
  MediaMembershipPatch,
  MediaMembershipQuery,
  PermissionRecord,
  TextMediaRecord,
  TreeQuery,
  UpdateFolderInput,
} from './types/folders';
export type {
  FolderPublicationStatus,
  PublicationDiagnostic,
  PublicationDiagnosticCode,
  PublicationDiagnosticSeverity,
  PublicationMeta,
  PublicationPreviewInput,
  PublicationRef,
  PublicationRevision,
  PublicationRevisionNumber,
  FolderPublicKey,
  PublishedDirectMediaOrderBy,
  PublishedEffectiveMediaOrderBy,
  PublishedEntryPoints,
  PublishedFolderListEntry,
  PublishedMediaCursorQuery,
  PublishedMediaFilterQuery,
  PublishedMediaQuery,
  PublishedPage,
  PublishedReference,
  PublishedReferenceStatus,
  PublishedResolvedObject,
  PublishedTreeRow,
  PublishInput,
} from './types/publishing';
export type {
  BinaryBody,
  DownloadResult,
  MediaCamera,
  MediaCaptureTime,
  MediaDimensions,
  MediaEffectiveMetadata,
  MediaFormatInfo,
  MediaItemId,
  MediaListCursorQuery,
  MediaListFilterQuery,
  MediaListOrderBy,
  MediaListQuery,
  MediaMetadata,
  MediaType,
  MediaVisibility,
  SortOrder,
  UploadResult,
} from './types/media';
