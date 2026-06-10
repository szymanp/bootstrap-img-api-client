# REST API Reference

All responses use JSON. Errors use [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457) (`application/problem+json`).

Localized endpoints accept `Accept-Language` / `Content-Language` headers and return `Content-Language` + `Vary: Accept-Language`.

---

## Conventions

### Base URL & content types

- The server listens on `http://localhost:8080` by default. All paths below are relative to that origin.
- JSON request bodies must be sent with `Content-Type: application/json`. Binary upload/download and the folder `text` subresource use the content types noted on those endpoints.
- Timestamps are RFC 3339 / ISO 8601 in UTC (e.g. `2026-01-01T00:00:00Z`).

### Authentication & sessions

Authentication is **cookie-based**. The flow:

1. `POST /auth/action;send-token` with the user's email to request a one-time token (delivered by email; test users get it in the response body).
2. `POST /auth` with header `Authorization: X-Token <email>:<token>`. On success the server replies `204` with a `Set-Cookie: session=<opaque>; Path=/` header.
3. The client must **store that `session` cookie and send it on every subsequent request** that requires authentication. A standard cookie jar handles this automatically.
4. `POST /auth/action;logout` terminates the session; the response clears the cookie (`session=` with `Max-Age=0`).

`GET /auth/session` reports the current session, or `401` if the cookie is missing/expired/invalid. Endpoints that require a session respond `401 Unauthorized` (with `WWW-Authenticate: Cookie`) when none is present, and `403 Forbidden` when the session is valid but lacks permission. User registration/verification and `auth:*` endpoints are the only ones reachable without a session.

### Resource envelope

Single-resource responses wrap the entity in `{ "meta", "data", "links", "related" }`; `meta.revision` (when present) is an opaque token for optimistic concurrency — echo it back verbatim on mutating requests. Collection responses use `{ "meta", "records": [ … ] }` (or `related` groupings as noted per-endpoint).

### Error format

Error bodies are `application/problem+json`:

```json
{
  "type": "urn:bootstrap:error:revision-conflict",
  "status": 409,
  "title": "Revision Conflict",
  "detail": "…human-readable explanation (optional)…",
  "instance": "…optional URI of the failing request…"
}
```

The machine-readable `type` is the stable discriminator. Known values:

| `type` | Typical status |
|---|---|
| `urn:bootstrap:error:bad-request` / `:validation-failed` | 400 / 422 |
| `urn:bootstrap:error:unauthorized` | 401 |
| `urn:bootstrap:error:forbidden` | 403 |
| `urn:bootstrap:error:user-not-found` / `:user-already-exists` / `:user-already-verified` / `:user-not-verified` | 404 / 409 |
| `urn:bootstrap:error:token-too-recent` / `:token-not-found` / `:invalid-token` / `:token-expired` | 400 / 401 / 404 |
| `urn:bootstrap:error:repository-not-found` / `:repository-name-conflict` | 404 / 409 |
| `urn:bootstrap:error:folder-not-found` / `:parent-folder-not-found` | 404 |
| `urn:bootstrap:error:media-item-not-found` / `:media-item-already-exists` | 404 / 409 |
| `urn:bootstrap:error:revision-conflict` | 409 |
| `urn:bootstrap:error:unsupported-media-type` | 415 |
| `urn:bootstrap:error:internal-error` | 500 |

---

## Service Root

### GET /

Returns a `links` envelope advertising every available endpoint, keyed by `rel`. Clients should start here and follow links rather than hard-coding URLs.

Each link is one of two kinds:

- **href link** — a ready-to-use URL with no placeholders:
  ```json
  { "rel": "repos:create", "href": "/repos" }
  ```
- **template link** — a URL with `{placeholder}` segments that must be substituted before use. The `fields` array lists the placeholders:
  ```json
  { "rel": "repos:read", "template": "/repos/{repoId}", "fields": ["repoId"] }
  ```

**Response body**
```json
{
  "links": {
    "repos:create": { "rel": "repos:create", "href": "/repos" },
    "repos:query":  { "rel": "repos:query", "href": "/repos;query" },
    "repos:read":   { "rel": "repos:read", "template": "/repos/{repoId}", "fields": ["repoId"] }
  }
}
```

**Responses**
- `200 OK`

---

## Authentication

### POST /auth/action;send-token

Issues a one-time login token for the given email. Always returns 204 to avoid user enumeration. Test users receive the token in the response body.

**Request body**
```json
{ "email": "user@example.com" }
```

**Responses**
- `204 No Content` — token sent by email
- `200 OK` — test user only: `{ "token": "<uuid>" }`

---

### POST /auth

Validates a one-time token and starts a session (sets a session cookie).

**Authorization header**: `X-Token <email>:<token>`

**Responses**
- `204 No Content` — session started
- `401 Unauthorized` — invalid token, unknown user, or unverified user

---

### POST /auth/action;logout

Terminates the current session and clears the session cookie.

**Responses**
- `204 No Content`
- `401 Unauthorized` — no active session

---

### GET /auth/session

Returns details about the current session.

**Response body**
```json
{
  "principal": "<uuid>",
  "email": "user@example.com",
  "createdAt": "2026-01-01T00:00:00Z",
  "expiresAt":  "2026-01-08T00:00:00Z"
}
```

**Responses**
- `200 OK`
- `401 Unauthorized` — no active session

---

## Users

### POST /users

Registers a new user and sends a verification email. Always returns 204 to avoid enumeration.

**Request body**
```json
{ "email": "user@example.com" }
```

**Responses**
- `204 No Content`

---

### POST /users/{userIdOrEmail}/action;resend-verification-token

Resends the verification email. `userIdOrEmail` is a UUID or an email address.

**Responses**
- `204 No Content`

---

### POST /users/{userIdOrEmail}/action;verify-user

Confirms email ownership using the token from the verification email, activating the account.

**Request body**
```json
{ "token": "<token-from-email>" }
```

**Responses**
- `204 No Content`

---

## Repositories

Repository responses include a `meta.revision` field used for optimistic concurrency control. Pass it back verbatim in `meta.revision` on all mutating requests.

### POST /repos

Creates a repository. `Content-Language` header is required; the title is stored under that locale.

**Request body**
```json
{
  "data": {
    "name": "my-repo",
    "title": "My Repository"
  }
}
```

**Responses**
- `200 OK` — `{ "meta": { "revision": "…" }, "data": { "id": "…", "name": "…", "title": "…" }, "links": { "self": "…" } }`
- `400 Bad Request` — missing `Content-Language`
- `409 Conflict` — name already taken

---

### POST /repos;query

Returns a paginated list of repositories the caller has a role on.

**Request body**
```json
{ "query": { "offset": 0, "limit": 20 } }
```

Both fields are optional.

**Responses**
- `200 OK` — `{ "meta": { "offset": …, "limit": … }, "records": [ { "meta": …, "data": …, "links": … }, … ] }`

---

### GET /repos/{repoId}

Retrieves a repository.

**Query parameters**
- `fields` (optional) — comma-separated field selector
- `representation` (optional) — `standard` (default) or `original`

The `representation` parameter selects how the repository is rendered:

- `standard` (the default when omitted) — the rich representation: `title` is the single translation negotiated for `Accept-Language`.
- `original` — the canonical, language-independent representation: `title` is rendered as a `{ "<lang>": … }` object carrying **all** stored translations.

**Responses**
- `200 OK` — repository resource
- `404 Not Found`

---

### POST /repos/{repoId}

Updates a repository. All data fields are optional (partial update). `meta.revision` is required.

**Request body**
```json
{
  "meta": { "revision": "<current-revision>" },
  "data": { "name": "new-name", "title": "New Title" }
}
```

**Responses**
- `200 OK` — updated repository resource
- `404 Not Found`
- `409 Conflict` — revision mismatch or name already taken

---

### DELETE /repos/{repoId}

Deletes a repository.

**Request body**
```json
{ "revision": "<current-revision>" }
```

**Responses**
- `204 No Content`
- `404 Not Found`
- `409 Conflict` — revision mismatch

---

## Folders

Folders are addressed with a `{folderVar}` path segment:

| Format | Example | Resolves to |
|---|---|---|
| `id;<uuid>` | `id;a1b2c3…` | Folder with that UUID |
| `path;el1;el2` | `path;albums;vacation` | `/albums/vacation` |

In JSON bodies, folder references use:
```json
{ "id": "<uuid>" }
{ "path": "/albums/vacation" }
```

Single-folder responses include `related.ancestors` — an ordered list of ancestor folder resources from the root down.

Folder `data` carries a `textPreview` field (first 250 characters of the localized markdown body) when text content exists for the resolved language. Use the dedicated text subresource below to read the full body or write a new translation.

Folder `data` also carries a `data` field — an arbitrary JSON object holding the folder's typed content (kind-specific properties). The shape depends on the folder's `type`; for example an `album` folder may expose `{"title": "Cover Title"}`. Unknown fields in this object are preserved round-trip. The internal `kind` discriminator is omitted from responses since it is already conveyed by `type`.

Folder `links` includes a `text` link pointing at the text subresource. When any text has been stored, the link advertises the available languages, e.g.
```json
"text": { "rel": "text", "href": "…/text", "language": ["en-us", "pl-pl"] }
```

### POST /folders/{repoId}

Creates a folder under an existing parent. `Content-Language` is required.

**Request body**
```json
{
  "data": {
    "parent": { "path": "/albums" },
    "name": "vacation",
    "title": "Summer Vacation",
    "type": "album",
    "data": { "title": "Cover Title" }
  }
}
```

Valid folder types: `root`, `albums`, `album`, `document`, `tag`, `media`, `media-source`, `picture`.

`data` is optional. When omitted, an empty default content object (`{}`) is stored. The content shape is determined by `type`; unknown fields are preserved.

**Responses**
- `200 OK` — folder resource with ancestors
- `404 Not Found` — parent folder not found
- `422 Unprocessable Entity` — invalid parent reference

---

### GET /folders/{repoId}/{folderVar}

Retrieves a folder.

**Query parameters**
- `fields` (optional) — comma-separated field selector
- `representation` (optional) — `standard` (default) or `original`

The `representation` parameter selects how the folder is rendered:

- `standard` (the default when omitted) — the rich representation: `title` is the single translation negotiated for `Accept-Language`, the derived `textPreview` field is included when text content exists, and `related.ancestors` lists the ancestor chain.
- `original` — the canonical, language-independent representation: `title` is rendered as a `{ "<lang>": … }` object carrying **all** stored translations, derived fields (such as `textPreview`) are omitted, and no `related.ancestors` section is returned. The included fields are `id`, `name`, `path`, `type`, `title`, and `data`.

**Responses**
- `200 OK` — folder resource
- `404 Not Found`

---

### POST /folders/{repoId}/{folderVar}

Updates a folder (rename, move, change title, or replace typed content). `meta.revision` is required.

**Request body**
```json
{
  "meta": { "revision": "<current-revision>" },
  "data": {
    "name": "new-name",
    "parent": { "path": "/albums" },
    "title": "Updated Title",
    "data": { "title": "Updated Cover" }
  }
}
```

All fields under `data` are optional:
- `name` — renames the folder (updates all descendant paths).
- `parent` — moves the folder under the referenced parent.
- `title` — updates the folder's localized title. A bare string (e.g. `"Updated Title"`) is stored under the request's `Content-Language`, merging with any existing translations; an object (e.g. `{ "en": "Title", "pl": "Tytuł" }`) replaces **all** stored translations at once.
- `data` — replaces the folder's typed content JSON wholesale; omitting it leaves the existing content unchanged.

**Responses**
- `200 OK` — updated folder resource with ancestors
- `404 Not Found`
- `409 Conflict` — revision mismatch
- `422 Unprocessable Entity`

---

### DELETE /folders/{repoId}/{folderVar}

Deletes a folder and all its descendants.

**Request body**
```json
{ "revision": "<current-revision>" }
```

**Responses**
- `204 No Content`
- `404 Not Found`
- `409 Conflict` — revision mismatch

---

### POST /folders/{repoId}/action;listroot

Lists root-level folders in the repository.

**Request body** (optional)
```json
{ "query": { "offset": 0, "limit": 20 } }
```

**Responses**
- `200 OK` — array of folder resources

---

### POST /folders/{repoId}/{folderVar}/action;list

Lists direct children of a folder.

**Request body** (optional)
```json
{ "query": { "offset": 0, "limit": 20 } }
```

**Responses**
- `200 OK` — paginated array of folder resources
- `404 Not Found`

---

### POST /folders/{repoId}/{folderVar}/action;tree

Returns a recursive subtree of subfolders.

**Request body** (optional)
```json
{ "query": { "depth": 3 } }
```

**Responses**
- `200 OK` — hierarchical tree of folder resources
- `404 Not Found`

---

### GET /folders/{repoId}/{folderVar}/text

Returns the folder's full markdown body. The translation is selected from the folder's stored content using the request's `Accept-Language`; if no translation matches and no text is stored, an empty body is returned.

**Response headers**
- `Content-Type: text/markdown`
- `Content-Language` — language of the returned text
- `Revision-Id` — the folder's current revision (pass back on `PUT`)

**Responses**
- `200 OK` — markdown body (possibly empty)
- `404 Not Found`

---

### PUT /folders/{repoId}/{folderVar}/text

Stores the request body as the folder's text content under the request's `Content-Language`. Other languages already present on the folder are preserved. Uses optimistic concurrency: the supplied revision must match the folder's current revision.

**Request headers**
- `Content-Type: text/markdown`
- `Content-Language` — language to store the body under (falls back to default when omitted)
- `Revision-Id: <current-revision>` (required)

**Request body**: raw markdown text.

**Response headers**
- `Revision-Id: <new-revision>` — the folder's revision after the update

**Responses**
- `204 No Content`
- `400 Bad Request` — missing or unparseable `Revision-Id`
- `403 Forbidden` — caller lacks write permission
- `404 Not Found`
- `409 Conflict` — revision mismatch

---

### GET /folders/{repoId}/{folderVar}/permissions

Lists all permissions on a folder.

**Response body**
```json
{
  "meta": {},
  "records": [
    { "data": { "principal": { "type": "user", "email": "user@example.com" }, "permission": "read", "effect": "grant" } }
  ],
  "related": { "folder": [ { "meta": …, "data": …, "links": … } ] }
}
```

**Responses**
- `200 OK`
- `404 Not Found`

---

### PATCH /folders/{repoId}/{folderVar}/permissions

Adds, removes, or modifies folder permissions.

A **principal** is one of:

| Form | Meaning |
|---|---|
| `{ "type": "user", "email": "user@example.com" }` | A registered user, by email |
| `{ "type": "anonymous" }` | Any unauthenticated caller |
| `{ "type": "link", "id": "<principal-uuid>" }` | A shared-link principal |

Valid `permission` values: `view`, `read`, `write`, `publish`, `share`.
Valid `effect` values: `grant` (add the permission) or `default` (reset to the inherited default, i.e. remove the explicit grant).

**Request body**
```json
{
  "records": [
    {
      "data": {
        "principal": { "type": "user", "email": "user@example.com" },
        "permission": "read",
        "effect": "grant"
      }
    }
  ]
}
```

**Responses**
- `204 No Content`
- `404 Not Found`

---

### GET /folders/{repoId}/{folderVar}/media

Lists the folder's direct media-item membership — the set of media items linked into the folder under their stored filenames. Media items reachable only via descendant folders are not included.

**Response body**
```json
[
  { "id": "<media-item-uuid>", "filename": "first.JPG" },
  { "id": "<media-item-uuid>", "filename": "second.JPG" }
]
```

**Responses**
- `200 OK` — JSON array of membership entries
- `403 Forbidden` — caller lacks read permission on the folder
- `404 Not Found`

---

### PUT /folders/{repoId}/{folderVar}/media

Replaces the folder's direct media-item membership with exactly the supplied list. All existing direct links are removed and the new ones are added atomically (inside a single transaction). Duplicate filenames or duplicate media-item IDs within the list are rejected with 409.

**Request body**
```json
[
  { "id": "<media-item-uuid>", "filename": "first.JPG" },
  { "id": "<media-item-uuid>", "filename": "second.JPG" }
]
```

**Responses**
- `204 No Content`
- `403 Forbidden` — caller lacks write permission on the folder
- `404 Not Found`
- `409 Conflict` — duplicate filename or media item in the list

---

### PATCH /folders/{repoId}/{folderVar}/media

Applies an ordered list of patches to the folder's direct media-item membership in a single transaction. Returns the resulting membership.

Each patch is one of:

| Form | Effect |
|---|---|
| `{ "op": "add", "id": "<uuid>", "filename": "<name>" }` | Link the media item under the given filename. |
| `{ "op": "remove", "id": "<uuid>" }` | Unlink the media item with the given ID. No-op if not linked. |
| `{ "op": "remove", "filename": "<name>" }` | Unlink whichever media item is linked under that filename. No-op if no such link. |

**Request body**
```json
[
  { "op": "add", "id": "<media-item-uuid>", "filename": "third.JPG" },
  { "op": "remove", "id": "<media-item-uuid>" },
  { "op": "remove", "filename": "second.JPG" }
]
```

**Responses**
- `200 OK` — JSON array of the resulting membership (same shape as the GET response)
- `400 Bad Request` — invalid patch op or malformed `remove`
- `403 Forbidden` — caller lacks write permission on the folder
- `404 Not Found`
- `409 Conflict` — an `add` would create a duplicate filename or duplicate media item

---

## Media Items

Media items are files (images or videos) stored in S3. 

They can be accessed in two ways:
- via folder and filename: e.g. `/media/{repoId}/{folderVar}/{filename}`
- via media item id: e.g. `/media/{repoId}/mid;{mediaItemId}`

Folder addressing uses the same `{folderVar}` format as the Folder API. To access the media item, the user must have "read" permission to the specified folder.

Items can also be addressed by stable ID using the `mid;<uuid>` prefix. To access the media item, the user must have "read" permission to any folder containing the media item, or a "view" or "read" permission to a published folder with that media item.

### PUT /media/{repoId}/{folderVar}/{filename}

Uploads a media item. The body is the raw binary. `Content-Type` must be `image/*` or `video/*`.

**Responses**
- `204 No Content` — `Media-Item-Id: <uuid>` header set
- `403 Forbidden` — insufficient permission
- `409 Conflict` — filename already exists in folder
- `415 Unsupported Media Type`

---

### GET /media/{repoId}/{folderVar}/{filename}

Downloads the original binary. Supports conditional GET via `If-None-Match` / ETag.

**Query parameters**
- `size` (optional) — variant name (e.g. `thumbnail`, `medium`) to download a scaled version instead

**Responses**
- `200 OK` — binary stream with `Content-Type`, `Content-Length`, `ETag`
- `304 Not Modified` — ETag matches
- `404 Not Found`

---

### GET /media/{repoId}/{folderVar}/{filename}/metadata

Returns metadata and HAL-style links to all available variants for a media item.

**Response body**
```json
{
  "meta": { "revision": "…" },
  "data": { "id": "…", "type": "image", "visibility": "private" },
  "links": {
    "self": "…",
    "variants": { "thumbnail": "…", "medium": "…" }
  }
}
```

**Responses**
- `200 OK`
- `404 Not Found`

---

### GET /media/{repoId}/mid;{mediaItemId}

Downloads the original binary by stable media item ID. Supports `?size=<variant>` and conditional GET.

**Responses** — same as the folder+filename variant above.

---

### GET /media/{repoId}/mid;{mediaItemId}/metadata

Returns metadata by stable media item ID.

**Responses** — same as the folder+filename variant above.

---

### POST /media/{repoId}/action;list

Lists media items in a folder.

**Request body**
```json
{
  "folder": { "path": "/albums/vacation" },
  "mediaType": "image",
  "visibility": "private",
  "offset": 0,
  "limit": 20,
  "orderBy": "createdAt"
}
```

All fields except `folder` are optional.

**Responses**
- `200 OK` — array of media records with metadata and variant links
- `404 Not Found` — folder not found
- `422 Unprocessable Entity` — folder path not found
