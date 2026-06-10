import type { CredentialStore } from "./http/credentials.js";
import type { LanguageTag } from "./types/common.js";

/** A `fetch`-compatible function. */
export type FetchLike = typeof fetch;

/** Options for constructing a {@link BootstrapClient}. */
export interface ClientOptions {
  /** API origin. Defaults to `http://localhost:8080`. */
  baseUrl?: string;
  /**
   * Default locale sent as `Accept-Language` (and `Content-Language` on writes)
   * when a call does not specify one. Defaults to `en-US`.
   */
  defaultLanguage?: LanguageTag;
  /**
   * The `fetch` implementation to use. Defaults to `globalThis.fetch`. Inject a
   * mock for tests, or a polyfill on older runtimes.
   */
  fetch?: FetchLike;
  /**
   * Session/cookie handling. Defaults to a browser-aware store: a no-op jar that
   * relies on `credentials: 'include'` in browsers, and an in-memory cookie jar
   * in Node.
   */
  credentials?: CredentialStore;
  /** Extra headers added to every request (overridable per call). */
  defaultHeaders?: Record<string, string>;
}

export interface ResolvedConfig {
  baseUrl: string;
  defaultLanguage: LanguageTag;
  fetch: FetchLike;
  credentials: CredentialStore;
  defaultHeaders: Record<string, string>;
}

const DEFAULT_BASE_URL = "http://localhost:8080";
const DEFAULT_LANGUAGE = "en-US";

export function resolveConfig(
  options: ClientOptions,
  fallbackCredentials: () => CredentialStore,
): ResolvedConfig {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error(
      "No fetch implementation available. Pass `fetch` in ClientOptions or run on a platform with a global fetch.",
    );
  }
  return {
    baseUrl: (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
    defaultLanguage: options.defaultLanguage ?? DEFAULT_LANGUAGE,
    // Bind to preserve the global `this` (some runtimes require it).
    fetch: fetchImpl === globalThis.fetch ? fetchImpl.bind(globalThis) : fetchImpl,
    credentials: options.credentials ?? fallbackCredentials(),
    defaultHeaders: { ...options.defaultHeaders },
  };
}
