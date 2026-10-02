/** Public API surface for bootstrap-img-client. */

export { BootstrapClient } from './client';
export type { ClientOptions, FetchLike } from './config';

// Resource API interfaces (the user-facing types for the sub-clients).
export type { IAuthApi } from './api/auth.api';
export type { IUsersApi } from './api/users.api';
export type {
  IRepositoriesApi,
  RepositoryResource,
  GetRepositoryByNameOptions,
  ChangelogCollection,
  CreateMetadataSnapshotResult,
  MetadataSnapshotMeta,
  MetadataSnapshotQuery,
  MetadataSnapshotResult,
  MetadataSyncResult,
} from './api/repositories.api';
export type {
  IFoldersApi,
  FolderResource,
  FolderText,
  MediaMembershipCollection,
  PermissionsCollection,
  PutTextResult,
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
export type { PrincipalId, Session, SendTokenResult } from './types/auth';
export type { CreateRepositoryInput, Repository, RepositoryId, UpdateRepositoryInput } from './types/repositories';
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
  FolderId,
  FolderReference,
  FolderRelated,
  FolderType,
  MediaMembership,
  MediaMembershipOrderBy,
  MediaMembershipPatch,
  MediaMembershipQuery,
  PermissionRecord,
  TextMediaRecord,
  TreeQuery,
  UpdateFolderInput,
} from './types/folders';
export type {
  BinaryBody,
  DownloadResult,
  MediaCamera,
  MediaCaptureTime,
  MediaDimensions,
  MediaEffectiveMetadata,
  MediaFormatInfo,
  MediaItemId,
  MediaListOrderBy,
  MediaListQuery,
  MediaMetadata,
  MediaType,
  MediaVisibility,
  UploadResult,
} from './types/media';
