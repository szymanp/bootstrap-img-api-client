/** Public API surface for bootstrap-img-client. */

export { BootstrapClient } from "./client.js";
export type { ClientOptions, FetchLike } from "./config.js";

// Resource APIs (for typing references to the sub-clients).
export { AuthApi } from "./api/auth.js";
export { UsersApi } from "./api/users.js";
export { RepositoriesApi, type RepositoryResource } from "./api/repositories.js";
export {
  FoldersApi,
  type FolderResource,
  type FolderText,
  type PermissionsCollection,
} from "./api/folders.js";
export { MediaApi, type DownloadOptions, type MediaResource } from "./api/media.js";
export { ServiceRootApi, type ServiceRoot } from "./api/service-root.js";

// References.
export { FolderRef, MediaRef, type FolderRefInput } from "./refs.js";

// Errors.
export {
  ApiError,
  ErrorType,
  isApiError,
  problemFromResponse,
  type KnownErrorType,
  type ProblemDetails,
} from "./http/errors.js";

// Credential stores.
export {
  BrowserCredentialStore,
  MemoryCookieStore,
  defaultCredentialStore,
  type CredentialStore,
} from "./http/credentials.js";

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
} from "./types/envelope.js";
export type {
  Effect,
  LanguageTag,
  Localized,
  Permission,
  Principal,
  ReadOptions,
  Representation,
  WriteLanguageOptions,
} from "./types/common.js";
export type { Session, SendTokenResult } from "./types/auth.js";
export type {
  CreateRepositoryInput,
  Repository,
  UpdateRepositoryInput,
} from "./types/repositories.js";
export type {
  CreateFolderInput,
  Folder,
  FolderReference,
  FolderRelated,
  FolderType,
  MediaMembership,
  MediaMembershipPatch,
  PermissionRecord,
  TreeQuery,
  UpdateFolderInput,
} from "./types/folders.js";
export type {
  BinaryBody,
  DownloadResult,
  MediaListQuery,
  MediaMetadata,
  MediaType,
  MediaVisibility,
  UploadResult,
} from "./types/media.js";
