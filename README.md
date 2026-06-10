# bootstrap-img-client

An isomorphic, dependency-free TypeScript client for the **bootstrap-img** REST API.
Built on the `fetch` API, it runs unchanged in a **Node CLI** and an **Angular web app**.

- Typed `{ meta, data, links, related }` / `{ meta, records }` envelopes
- RFC 9457 `application/problem+json` errors surfaced as a typed `ApiError`
- Cookie-session auth that works in both environments (browser cookie jar / Node in-memory jar)
- Optimistic concurrency via `meta.revision`
- `Accept-Language` / `Content-Language` negotiation with sensible defaults
- Hypermedia service-root discovery and helpers for `id;` / `path;` folder addressing

## Install

```bash
npm install bootstrap-img-client
```

Requires a runtime with a global `fetch` (Node 18+ or any modern browser). On older
runtimes, pass a polyfill via the `fetch` option.

## Quick start (Node CLI)

```ts
import { BootstrapClient, isApiError, ErrorType } from "bootstrap-img-client";

const client = new BootstrapClient({
  baseUrl: "http://localhost:8080",
  defaultLanguage: "en-US",
});

// Test users receive their token in the response, so we can log in directly.
await client.auth.loginWithTestToken("test@example.com");
// (production: client.auth.sendToken(email) then client.auth.login(email, token))

const repo = await client.repos.create({ name: "demo", title: "Demo" });

const folders = client.folders(repo.data.id);
const album = await folders.create({
  parent: { path: "/albums" },
  name: "vacation",
  title: "Vacation",
  type: "album",
});

const media = client.media(repo.data.id);
const bytes = await readFileBytes("photo.jpg"); // Uint8Array | Blob | ArrayBuffer | ReadableStream
const { mediaItemId } = await media.upload(
  { id: album.data.id },
  "photo.jpg",
  bytes,
  "image/jpeg",
);

// Optimistic concurrency + typed errors:
try {
  await client.repos.update(repo.data.id, repo.meta.revision!, { title: "Renamed" });
} catch (err) {
  if (isApiError(err, ErrorType.RevisionConflict)) {
    const fresh = await client.repos.get(repo.data.id);
    await client.repos.update(repo.data.id, fresh.meta.revision!, { title: "Renamed" });
  } else {
    throw err;
  }
}
```

In Node the session cookie returned by `POST /auth` is captured automatically and
replayed on every subsequent request. To persist a session between CLI invocations:

```ts
import { BootstrapClient, MemoryCookieStore } from "bootstrap-img-client";

const credentials = MemoryCookieStore.fromJSON(loadSavedCookies() ?? []);
const client = new BootstrapClient({ baseUrl, credentials });
// ... after login:
saveCookies(credentials.toJSON());
```

## Angular

The client is framework-agnostic and ships zero runtime dependencies, so it drops
straight into Angular's DI. In the browser, cookies are handled by the user agent —
the client sets `credentials: 'include'` automatically (ensure the server allows
credentialed CORS for cross-origin setups).

```ts
// bootstrap-client.token.ts
import { InjectionToken, type Provider } from "@angular/core";
import { BootstrapClient } from "bootstrap-img-client";

export const BOOTSTRAP_CLIENT = new InjectionToken<BootstrapClient>("BOOTSTRAP_CLIENT");

export function provideBootstrapClient(baseUrl: string): Provider {
  return {
    provide: BOOTSTRAP_CLIENT,
    useFactory: () => new BootstrapClient({ baseUrl }),
  };
}
```

```ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [provideBootstrapClient("https://api.example.com")],
};

// some.service.ts
@Injectable({ providedIn: "root" })
export class RepoService {
  private client = inject(BOOTSTRAP_CLIENT);
  list() {
    return this.client.repos.query({ limit: 20 });
  }
}
```

## API surface

| Accessor | Endpoints |
|---|---|
| `client.serviceRoot` | `GET /` link discovery, template resolution |
| `client.auth` | `sendToken`, `login`, `loginWithTestToken`, `logout`, `session` |
| `client.users` | `register`, `resendVerification`, `verify` |
| `client.repos` | `create`, `query`, `get`, `update`, `delete` |
| `client.folders(repoId)` | `create`, `get`, `update`, `delete`, `listRoot`, `list`, `tree`, `getText`/`putText`, `getPermissions`/`patchPermissions`, `getMedia`/`putMedia`/`patchMedia` |
| `client.media(repoId)` | `upload`, `download` (incl. variants & conditional GET), `metadata`, `list` |

### Folder & media references

```ts
import { FolderRef, MediaRef } from "bootstrap-img-client";

FolderRef.id("a1b2…");              // -> id;a1b2…
FolderRef.path("/albums/vacation"); // -> path;albums;vacation
MediaRef.id("uuid");                // -> mid;uuid
MediaRef.file({ path: "/albums" }, "p.jpg");
```

Methods that take a folder accept a `FolderRef`, a `{ id }` / `{ path }` object, or a
plain path string interchangeably.

### Errors

Every non-2xx (except an expected `304`) throws an `ApiError` carrying the parsed
`ProblemDetails`. Use `isApiError(err, ErrorType.X)` to branch on the stable `type`.

## Options

```ts
new BootstrapClient({
  baseUrl: "http://localhost:8080", // default
  defaultLanguage: "en-US",          // default Accept-/Content-Language
  fetch: globalThis.fetch,           // injectable (tests / polyfills)
  credentials: /* auto: browser vs Node */,
  defaultHeaders: {},                // added to every request
});
```

## Development

```bash
npm install
npm run typecheck
npm test                 # unit tests (mock fetch)
npm run build            # dist/ ESM + CJS + .d.ts

# Integration tests against a live server (opt-in):
BOOTSTRAP_API_URL=http://localhost:8080 npm run test:integration
```
