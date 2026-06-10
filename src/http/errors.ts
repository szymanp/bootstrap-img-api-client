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
  BadRequest: "urn:bootstrap:error:bad-request",
  ValidationFailed: "urn:bootstrap:error:validation-failed",
  Unauthorized: "urn:bootstrap:error:unauthorized",
  Forbidden: "urn:bootstrap:error:forbidden",
  UserNotFound: "urn:bootstrap:error:user-not-found",
  UserAlreadyExists: "urn:bootstrap:error:user-already-exists",
  UserAlreadyVerified: "urn:bootstrap:error:user-already-verified",
  UserNotVerified: "urn:bootstrap:error:user-not-verified",
  TokenTooRecent: "urn:bootstrap:error:token-too-recent",
  TokenNotFound: "urn:bootstrap:error:token-not-found",
  InvalidToken: "urn:bootstrap:error:invalid-token",
  TokenExpired: "urn:bootstrap:error:token-expired",
  RepositoryNotFound: "urn:bootstrap:error:repository-not-found",
  RepositoryNameConflict: "urn:bootstrap:error:repository-name-conflict",
  FolderNotFound: "urn:bootstrap:error:folder-not-found",
  ParentFolderNotFound: "urn:bootstrap:error:parent-folder-not-found",
  MediaItemNotFound: "urn:bootstrap:error:media-item-not-found",
  MediaItemAlreadyExists: "urn:bootstrap:error:media-item-already-exists",
  RevisionConflict: "urn:bootstrap:error:revision-conflict",
  UnsupportedMediaType: "urn:bootstrap:error:unsupported-media-type",
  InternalError: "urn:bootstrap:error:internal-error",
} as const;

export type KnownErrorType = (typeof ErrorType)[keyof typeof ErrorType];

/** Error thrown for any non-2xx (and non-304) HTTP response. */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails;
  readonly response: Response;

  constructor(problem: ProblemDetails, response: Response) {
    super(problem.detail || problem.title || `HTTP ${problem.status} (${problem.type})`);
    this.name = "ApiError";
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
    type: "about:blank",
    status: response.status,
    title: response.statusText || undefined,
  };
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
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
