# CLAUDE.md

Guidance for working in this repository.

## What this is

`bootstrap-img-client` — an isomorphic, dependency-free TypeScript REST client for the
**bootstrap-img** API. It targets the `fetch` API and runs unchanged in a Node CLI and
in an Angular (browser) web app. The API it wraps is documented in
[docs/rest_api.md](docs/rest_api.md); executable request/response examples live in the
sibling repo's HURL files at `../bootstrap-img-srv/hurl/` (auth, repository, folder,
folder-access, media-item). The API runs at `http://localhost:8080` by default.

## Commands

```bash
npm install
npm run typecheck                                     # tsc --noEmit
npm test                                              # unit tests (mock fetch); integration skips
npm run test:watch
npm run build                                         # tsup -> dist/ ESM + CJS + .d.ts
BOOTSTRAP_API_URL=http://localhost:8080 npm run test:integration   # opt-in, live server
```

Integration tests self-skip unless `BOOTSTRAP_API_URL` is set (optionally
`BOOTSTRAP_TEST_EMAIL`, default `test@example.com`).

## Architecture

Layered, with a thin low-level transport under typed resource APIs:

- `src/config.ts` — `ClientOptions`, default resolution (`baseUrl`, `defaultLanguage`,
  `fetch`, `credentials`), browser-vs-Node detection.
- `src/http/transport.ts` — the single `Transport.request()` fetch wrapper: URL +
  query building, header assembly (`Accept`, `Accept-Language`, `Content-Language`,
  defaults), tagged body encoding (`json` / `markdown` / `binary`), cookie hooks, and
  non-2xx → `ApiError` mapping. `allowStatuses` lets callers accept e.g. `304`. Each
  call supplies a `parse(response)` closure, so endpoints that need response headers
  (revision id, `Media-Item-Id`, ETag, `Content-Language`) read them directly.
- `src/http/errors.ts` — `ProblemDetails` (RFC 9457), `ApiError` (carries `status`,
  `problem`, `response`), the `ErrorType` discriminator map, and `isApiError(e, type?)`.
- `src/http/credentials.ts` — `CredentialStore` abstraction for cookie-session auth.
  `MemoryCookieStore` (Node) captures/replays the `session` cookie and is serializable;
  `BrowserCredentialStore` is a no-op that sets `credentials: 'include'`.
- `src/refs.ts` — `FolderRef` (`id;<uuid>` / `path;a;b` segments + `{id}`/`{path}` body
  form) and `MediaRef` (`mid;<uuid>` / folder+filename). Methods accept a ref, a plain
  `{id}`/`{path}`, or a path string interchangeably via `FolderRef.from()`.
- `src/types/` — envelopes (`Resource`, `Collection`, `Meta`, `Link`/`LinkSet`),
  common scalars (`Principal`, `Permission`, `Localized`, `ReadOptions`,
  `WriteLanguageOptions`), and per-resource payload types.
- `src/api/` — one class per resource group (`auth`, `users`, `repositories`,
  `folders`, `media`, `service-root`). Folders/media are repo-scoped and constructed
  with `(transport, repoId)`.
- `src/client.ts` — `BootstrapClient` wires it together: `auth`, `users`, `repos`,
  `serviceRoot` properties plus `folders(repoId)` / `media(repoId)` factories.
- `src/index.ts` — the public barrel; the only entry point consumers import from.

## Conventions specific to this API

- **Envelopes**: single resources are `{ meta, data, links, related }`; collections are
  `{ meta, records }`. Keep these shapes when adding endpoints.
- **Optimistic concurrency**: mutations require the current `meta.revision`. Resource
  methods take `revision` as an explicit argument and put it in `meta.revision` (or the
  `revision` body field for deletes, or the `Revision-Id` header for folder text).
- **Localization**: writes that store a localized value default `Content-Language` to
  the client's `defaultLanguage` (do `?? this.transport.defaultLanguage`); reads default
  `Accept-Language` via the transport. Per-call overrides live in `*Options`.
- **`Accept-Language`/`Content-Language` semantics in transport**: `undefined` ⇒ use the
  configured default; `null` ⇒ suppress the header entirely (used by binary download).
- **Errors**: never inspect status codes ad hoc in callers — throw flows through
  `ApiError`; branch with `isApiError(err, ErrorType.X)`.

## House style

- ESM source with extensionless relative import specifiers (allowed by `moduleResolution:
  Bundler`; tsup/vitest bundle and tsc only typechecks). `type`-only imports use `import type`.
- Zero runtime dependencies — keep it that way so the bundle stays Angular-friendly.
- Add unit tests in `test/unit/` using the scripted `MockFetch` (`test/unit/mock-fetch.ts`);
  assert on URL, method, headers, and request body. Mirror real flows in
  `test/integration/` when behavior depends on the live server.
