/** Public API surface for bootstrap-img-client. */

export { BootstrapClient } from './client';
export type { ClientOptions, FetchLike } from './config';

// Resource APIs (for typing references to the sub-clients).
export { AuthApi } from './api/auth';
export { UsersApi } from './api/users';
export { RepositoriesApi, type RepositoryResource } from './api/repositories';
export {
  FoldersApi,
  type FolderResource,
  type FolderText,
  type MediaMembershipCollection,
  type PermissionsCollection,
} from './api/folders';
export { MediaApi, type DownloadOptions, type MediaResource } from './api/media';
export { ServiceRootApi, type ServiceRoot } from './api/service-root';
export { ServiceLinks } from './links';

// References.
export { FolderRef, MediaRef, type FolderRefInput } from './refs';

// Errors.
export {
  ApiError,
  ErrorType,
  isApiError,
  problemFromResponse,
  type KnownErrorType,
  type ProblemDetails,
} from './http/errors';

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
  WriteLanguageOptions,
} from './types/common';
export type { Session, SendTokenResult } from './types/auth';
export type { CreateRepositoryInput, Repository, UpdateRepositoryInput } from './types/repositories';
export type {
  CreateFolderInput,
  Folder,
  FolderReference,
  FolderRelated,
  FolderType,
  MediaMembership,
  MediaMembershipOrderBy,
  MediaMembershipPatch,
  MediaMembershipQuery,
  PermissionRecord,
  TreeQuery,
  UpdateFolderInput,
} from './types/folders';
export type {
  BinaryBody,
  DownloadResult,
  MediaListQuery,
  MediaMetadata,
  MediaType,
  MediaVisibility,
  UploadResult,
} from './types/media';
