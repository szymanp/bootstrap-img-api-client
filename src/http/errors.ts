/** RFC 9457 Problem Details and the error thrown by the client. */

/** Parsed `application/problem+json` body. */
export interface ProblemDetails {
  /** Stable, machine-readable discriminator (e.g. `urn:bootstrap:error:revision-conflict`). */
  type: string;
  status: number;
  title?: string;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}

/** Known `type` discriminators advertised by the API. */
export const ErrorType = {
  BadRequest: 'urn:bootstrap:error:bad-request',
  ValidationFailed: 'urn:bootstrap:error:validation-failed',
  Unauthorized: 'urn:bootstrap:error:unauthorized',
  Forbidden: 'urn:bootstrap:error:forbidden',
  UserNotFound: 'urn:bootstrap:error:user-not-found',
  UserAlreadyExists: 'urn:bootstrap:error:user-already-exists',
  UserAlreadyVerified: 'urn:bootstrap:error:user-already-verified',
  UserNotVerified: 'urn:bootstrap:error:user-not-verified',
  TokenTooRecent: 'urn:bootstrap:error:token-too-recent',
  TokenNotFound: 'urn:bootstrap:error:token-not-found',
  InvalidToken: 'urn:bootstrap:error:invalid-token',
  TokenExpired: 'urn:bootstrap:error:token-expired',
  RepositoryNotFound: 'urn:bootstrap:error:repository-not-found',
  RepositoryNameConflict: 'urn:bootstrap:error:repository-name-conflict',
  RepositoryWouldHaveNoOwners: 'urn:bootstrap:error:repository-would-have-no-owners',
  OrganizationNotFound: 'urn:bootstrap:error:organization-not-found',
  OrganizationNameConflict: 'urn:bootstrap:error:organization-name-conflict',
  /** `DELETE /orgs/{orgName}` while repositories still belong to the organization. */
  OrganizationNotEmpty: 'urn:bootstrap:error:organization-not-empty',
  OrganizationWouldHaveNoOwners: 'urn:bootstrap:error:organization-would-have-no-owners',
  FolderNotFound: 'urn:bootstrap:error:folder-not-found',
  ParentFolderNotFound: 'urn:bootstrap:error:parent-folder-not-found',
  FolderAlreadyExists: 'urn:bootstrap:error:folder-already-exists',
  FolderPathConflict: 'urn:bootstrap:error:folder-path-conflict',
  MediaItemNotFound: 'urn:bootstrap:error:media-item-not-found',
  MediaItemAlreadyExists: 'urn:bootstrap:error:media-item-already-exists',
  /** A `size` variant was requested before the image was processed; retry later. */
  MediaVariantNotReady: 'urn:bootstrap:error:media-variant-not-ready',
  RevisionConflict: 'urn:bootstrap:error:revision-conflict',
  UnsupportedMediaType: 'urn:bootstrap:error:unsupported-media-type',
  DigestMismatch: 'urn:bootstrap:error:digest-mismatch',
  PossessionProofInvalid: 'urn:bootstrap:error:possession-proof-invalid',
  UploadRequired: 'urn:bootstrap:error:upload-required',
  PossessionProofRequired: 'urn:bootstrap:error:possession-proof-required',
  MetadataSnapshotFailed: 'urn:bootstrap:error:metadata-snapshot-failed',
  IdempotencyKeyReused: 'urn:bootstrap:error:idempotency-key-reused',
  InternalError: 'urn:bootstrap:error:internal-error',
} as const;

export type KnownErrorType = (typeof ErrorType)[keyof typeof ErrorType];

/**
 * `ErrorType.RevisionConflict` as returned by `POST /repos/{repoId}/metadata-sync`;
 * `reason` tells the two cases apart.
 */
export interface RevisionConflictProblem extends ProblemDetails {
  /**
   * - `repository-version-changed` — `If-Match` didn't match the current
   *   repository version (see `expectedRepositoryVersion`/`currentRepositoryVersion`).
   * - `resource-revision-changed` — one or more operations' `expectedRevision`
   *   didn't match (see `conflicts`).
   */
  reason?: 'repository-version-changed' | 'resource-revision-changed';
  expectedRepositoryVersion?: number;
  currentRepositoryVersion?: number;
  /** Every conflicting key: `"repository"` and/or `"folder:<uuid>"`. */
  conflicts?: string[];
}

/**
 * `ErrorType.IdempotencyKeyReused`; `reason` tells the two cases apart.
 * - `request-mismatch` — the key was already used with a different body; don't
 *   retry with this key.
 * - `in-progress` — a request with this key is still being processed; retry the
 *   identical request after the `Retry-After` delay (on `ApiError.response`).
 */
export interface IdempotencyKeyReusedProblem extends ProblemDetails {
  reason?: 'request-mismatch' | 'in-progress';
}

/** One plan-validation issue in a {@link ValidationFailedProblem}. */
export interface ValidationIssue {
  /** Zero-based indexes of the `operations` concerned; empty for plan-wide issues. */
  operations: number[];
  message: string;
}

/**
 * `ErrorType.ValidationFailed`. `errors` is present when a metadata-sync plan
 * is structurally invalid.
 */
export interface ValidationFailedProblem extends ProblemDetails {
  errors?: ValidationIssue[];
}

/**
 * `ErrorType.PossessionProofRequired` (HTTP 428): the server holds the file
 * named by an upload claim and wants proof that the client has it too.
 */
export interface PossessionProofRequiredProblem extends ProblemDetails {
  /** Opaque token; echo it back exactly as received. */
  challenge: string;
  /** Hex-encoded HMAC key. */
  nonce: string;
  /** Size in bytes of each chunk the file is split into (the last may be shorter). */
  chunkSize: number;
  /** Zero-based chunk indexes to hash, in the order given. */
  chunks: number[];
  /** When the challenge stops being accepted (ISO 8601). */
  expiresAt: string;
}

/** Error thrown for any non-2xx (and non-304) HTTP response. */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails;
  readonly response: Response;

  constructor(problem: ProblemDetails, response: Response) {
    super(problem.detail || problem.title || `HTTP ${problem.status} (${problem.type})`);
    this.name = 'ApiError';
    this.status = problem.status;
    this.problem = problem;
    this.response = response;
    // Restore prototype chain for transpiled targets.
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /** The machine-readable problem `type` discriminator. */
  get type(): string {
    return this.problem.type;
  }
}

/** Type guard: is `err` an {@link ApiError}, optionally of a specific `type`? */
export function isApiError(err: unknown, type?: string): err is ApiError {
  return err instanceof ApiError && (type === undefined || err.type === type);
}

/**
 * Build a {@link ProblemDetails} from a failed response, reading the
 * `application/problem+json` body when present and falling back to status.
 */
export async function problemFromResponse(response: Response): Promise<ProblemDetails> {
  const fallback: ProblemDetails = {
    type: 'about:blank',
    status: response.status,
    title: response.statusText || undefined,
  };
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) {
    return fallback;
  }
  try {
    const body = (await response.json()) as Partial<ProblemDetails>;
    return {
      ...fallback,
      ...body,
      type: body.type ?? fallback.type,
      status: body.status ?? fallback.status,
    };
  } catch {
    return fallback;
  }
}
