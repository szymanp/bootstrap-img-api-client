/**
 * Cross-environment session-cookie handling.
 *
 * The API is cookie-based: `POST /auth` returns `Set-Cookie: session=…`, which
 * must be replayed on every subsequent request.
 *
 * - In a browser the cookie jar is managed by the user agent, so we only need to
 *   opt requests into credentialed mode (`credentials: 'include'`) and never touch
 *   the `Cookie`/`Set-Cookie` headers ourselves.
 * - In Node `fetch` has no cookie jar, so we capture `Set-Cookie` from responses
 *   and attach a `Cookie` header to outgoing requests.
 */
export interface CredentialStore {
  /** Attach stored credentials (e.g. a `Cookie` header) to an outgoing request. */
  decorate(headers: Headers): void;
  /** Capture credentials (e.g. `Set-Cookie`) from a response. */
  capture(response: Response): void;
  /** The `credentials` mode to use for `fetch`, if any. */
  fetchCredentials(): RequestCredentials | undefined;
}

/**
 * Browser store: defers entirely to the user agent's cookie jar.
 * Requires the server to allow credentialed CORS for cross-origin use.
 */
export class BrowserCredentialStore implements CredentialStore {
  decorate(_headers: Headers): void {
    /* no-op: the browser attaches cookies automatically */
  }
  capture(_response: Response): void {
    /* no-op: the browser stores Set-Cookie automatically */
  }
  fetchCredentials(): RequestCredentials {
    return 'include';
  }
}

/** A single parsed cookie (name + value only; attributes are not replayed). */
interface StoredCookie {
  name: string;
  value: string;
}

/**
 * In-memory cookie jar for Node. Tracks cookies by name and replays them as a
 * single `Cookie` header. Honors `Max-Age=0` / past `Expires` to clear cookies
 * (used by logout).
 */
export class MemoryCookieStore implements CredentialStore {
  protected cookies = new Map<string, StoredCookie>();

  decorate(headers: Headers): void {
    if (this.cookies.size === 0) return;
    const header = [...this.cookies.values()].map((c) => `${c.name}=${c.value}`).join('; ');
    headers.set('cookie', header);
  }

  capture(response: Response): void {
    for (const raw of getSetCookies(response)) {
      this.ingest(raw);
    }
  }

  fetchCredentials(): RequestCredentials | undefined {
    return undefined;
  }

  /** Serialize the jar (e.g. to persist a CLI session between invocations). */
  toJSON(): StoredCookie[] {
    return [...this.cookies.values()];
  }

  /** Restore a jar previously produced by {@link toJSON}. */
  static fromJSON(cookies: StoredCookie[]): MemoryCookieStore {
    const store = new MemoryCookieStore();
    for (const c of cookies) store.cookies.set(c.name, c);
    return store;
  }

  /** Remove all stored cookies. */
  clear(): void {
    this.cookies.clear();
  }

  private ingest(setCookie: string): void {
    const parsed = parseSetCookie(setCookie);
    if (!parsed) return;
    if (parsed.expired) {
      this.cookies.delete(parsed.name);
    } else {
      this.cookies.set(parsed.name, { name: parsed.name, value: parsed.value });
    }
  }
}

/** Read `Set-Cookie` headers across fetch implementations. */
function getSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

interface ParsedSetCookie {
  name: string;
  value: string;
  expired: boolean;
}

function parseSetCookie(setCookie: string): ParsedSetCookie | null {
  const parts = setCookie.split(';');
  const first = parts[0]?.trim();
  if (!first) return null;
  const eq = first.indexOf('=');
  if (eq < 0) return null;
  const name = first.slice(0, eq).trim();
  const value = first.slice(eq + 1).trim();
  if (!name) return null;

  let expired = false;
  for (let i = 1; i < parts.length; i++) {
    const attr = parts[i]?.trim() ?? '';
    const aEq = attr.indexOf('=');
    const key = (aEq < 0 ? attr : attr.slice(0, aEq)).trim().toLowerCase();
    const aVal = aEq < 0 ? '' : attr.slice(aEq + 1).trim();
    if (key === 'max-age' && Number(aVal) <= 0) expired = true;
    if (key === 'expires' && aVal) {
      const when = Date.parse(aVal);
      if (!Number.isNaN(when) && when <= Date.now()) expired = true;
    }
  }
  return { name, value, expired };
}

/** Pick a sensible default store for the current runtime. */
export function defaultCredentialStore(): CredentialStore {
  const isBrowser =
    typeof document !== 'undefined' || typeof (globalThis as { window?: unknown }).window !== 'undefined';
  return isBrowser ? new BrowserCredentialStore() : new MemoryCookieStore();
}
