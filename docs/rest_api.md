# REST API Reference

All responses use JSON. Errors use [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457) (`application/problem+json`).

Localized endpoints accept `Accept-Language` / `Content-Language` headers and return `Content-Language` + `Vary: Accept-Language`.

---

## Conventions

### Base URL & content types

- The server listens on `http://localhost:8080` by default. All paths below are relative to that origin.
- JSON request bodies must be sent with `Content-Type: application/json`. Binary upload/download and the folder `text` subresource use the content types noted on those endpoints.
- Some JSON requests and responses in this document are described as "json5" and include comments; these comments do not exist in actual JSON objects.
- Timestamps are RFC 3339 / ISO 8601 in UTC (e.g. `2026-01-01T00:00:00Z`).

### Authentication & sessions

Authentication is **cookie-based**. The flow:

1. `POST /auth/action;send-token` with the user's email to request a one-time token (delivered by email; test users get it in the response body).
2. `POST /auth` with header `Authorization: X-Token <email>:<token>`. On success the server replies `204` with a `Set-Cookie: session=<opaque>; Path=/` header.
3. The client must **store that `session` cookie and send it on every subsequent request** that requires authentication. A standard cookie jar handles this automatically.
4. `POST /auth/action;logout` terminates the session; the response clears the cookie (`session=` with `Max-Age=0`).

`GET /auth/session` reports the current session, or `401` if the cookie is missing/expired/invalid. Verifying a newly registered user (`POST /users/{userIdOrEmail}/action;verify-user`) also starts a session and sets the cookie, as in step 2. Endpoints that require a session respond `401 Unauthorized` (with `WWW-Authenticate: Cookie`) when none is present, and `403 Forbidden` when the session is valid but lacks permission. User registration/verification and `auth:*` endpoints are the only ones reachable without a session.

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

The machine-readable `type` is the stable discriminator. Some problems add type-specific extension members (RFC 9457
§3.2) as extra top-level fields, e.g. `reason`, `conflicts`, or `errors` on `POST /repos/{repoId}/metadata-sync`
errors; clients should ignore members they don't recognize. Known `type` values:

| `type` | Typical status |
| --- | --- |
| `urn:bootstrap:error:bad-request` / `:validation-failed` | 400 / 422 |
| `urn:bootstrap:error:unauthorized` | 401 |
| `urn:bootstrap:error:forbidden` | 403 |
| `urn:bootstrap:error:user-not-found` / `:user-already-exists` / `:user-already-verified` / `:user-not-verified` | 404 / 409 |
| `urn:bootstrap:error:token-too-recent` / `:token-not-found` / `:invalid-token` / `:token-expired` | 400 / 401 / 404 |
| `urn:bootstrap:error:repository-not-found` / `:repository-name-conflict` | 404 / 409 |
| `urn:bootstrap:error:repository-would-have-no-owners` | 422 |
| `urn:bootstrap:error:organization-not-found` / `:organization-name-conflict` / `:organization-not-empty` | 404 / 409 / 409 |
| `urn:bootstrap:error:organization-would-have-no-owners` | 422 |
| `urn:bootstrap:error:folder-not-found` / `:parent-folder-not-found` / `:folder-already-exists` / `:folder-path-conflict` | 404 / 409 |
| `urn:bootstrap:error:media-item-not-found` / `:media-item-already-exists` | 404 / 409 |
| `urn:bootstrap:error:media-variant-not-ready` | 404 |
| `urn:bootstrap:error:revision-conflict` | 409 |
| `urn:bootstrap:error:idempotency-key-reused` | 409 |
| `urn:bootstrap:error:unsupported-media-type` | 415 |
| `urn:bootstrap:error:digest-mismatch` | 400 |
| `urn:bootstrap:error:possession-proof-invalid` | 403 |
| `urn:bootstrap:error:upload-required` | 422 |
| `urn:bootstrap:error:possession-proof-required` | 428 |
| `urn:bootstrap:error:metadata-snapshot-failed` | 410 |
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

#### Response body

```json
{
  "links": {
    "repos:create": { "rel": "repos:create", "href": "/repos" },
    "repos:query":  { "rel": "repos:query", "href": "/repos;query" },
    "repos:read":   { "rel": "repos:read", "template": "/repos/{repoId}", "fields": ["repoId"] }
  }
}
```

#### Link relations

The complete set of `rel` keys advertised by the root, with the HTTP method and target endpoint each one points at. `href` links have no placeholders; `template` links carry `{placeholder}` segments listed under `fields`.

##### Repositories

| `rel` | Kind | Method & target |
| --- | --- | --- |
| `repos:create` | href | `POST /repos` |
| `repos:query` | href | `POST /repos;query` |
| `repos:read` | template | `GET /repos/{repoId}` |
| `repos:update` | template | `POST /repos/{repoId}` |
| `repos:delete` | template | `DELETE /repos/{repoId}` |
| `repos:changelog` | template | `GET /repos/{repoId}/changelog` |
| `repos:metadata-snapshot-create` | template | `POST /repos/{repoId}/metadata-snapshots` |
| `repos:metadata-snapshot-read` | template | `GET /repos/{repoId}/metadata-snapshots/{snapshotId}` |
| `repos:metadata-sync` | template | `POST /repos/{repoId}/metadata-sync` |

##### Organizations

| `rel` | Kind | Method & target |
| --- | --- | --- |
| `orgs:list` | href | `GET /orgs` |
| `orgs:create` | href | `POST /orgs` |
| `orgs:read` | template | `GET /orgs/{orgName}` |
| `orgs:update` | template | `POST /orgs/{orgName}` |
| `orgs:delete` | template | `DELETE /orgs/{orgName}` |
| `orgs:list-members` | template | `GET /orgs/{orgName}/members` |
| `orgs:patch-members` | template | `PATCH /orgs/{orgName}/members` |

##### Folders

| `rel` | Kind | Method & target |
| --- | --- | --- |
| `folders:create` | template | `POST /folders/{repoId}` |
| `folders:list-root` | template | `POST /folders/{repoId}/action;listroot` |
| `folders:read` | template | `GET /folders/{repoId}/{folderIdOrPath}` |
| `folders:update` | template | `POST /folders/{repoId}/{folderIdOrPath}` |
| `folders:delete` | template | `DELETE /folders/{repoId}/{folderIdOrPath}` |
| `folders:list` | template | `POST /folders/{repoId}/{folderIdOrPath}/action;list` |
| `folders:tree` | template | `POST /folders/{repoId}/{folderIdOrPath}/action;tree` |
| `folders:read-text` | template | `GET /folders/{repoId}/{folderIdOrPath}/text` |
| `folders:update-text` | template | `PUT /folders/{repoId}/{folderIdOrPath}/text` |
| `folders:text-media` | template | `GET /folders/{repoId}/{folderIdOrPath}/text/media` |
| `folders:list-permissions` | template | `GET /folders/{repoId}/{folderIdOrPath}/permissions` |
| `folders:patch-permissions` | template | `PATCH /folders/{repoId}/{folderIdOrPath}/permissions` |
| `folders:list-media` | template | `GET /folders/{repoId}/{folderIdOrPath}/media` |
| `folders:query-media` | template | `POST /folders/{repoId}/{folderIdOrPath}/media;query` |
| `folders:replace-media` | template | `PUT /folders/{repoId}/{folderIdOrPath}/media` |
| `folders:patch-media` | template | `PATCH /folders/{repoId}/{folderIdOrPath}/media` |

##### Media items

| `rel` | Kind | Method & target |
| --- | --- | --- |
| `media:list` | template | `POST /media/{repoId}/action;list` |
| `media:upload` | template | `PUT /media/{repoId}/{folderIdOrPath}/{filename}` |
| `media:download` | template | `GET /media/{repoId}/{folderIdOrPath}/{filename}` |
| `media:metadata` | template | `GET /media/{repoId}/{folderIdOrPath}/{filename}/metadata` |
| `media:upload-by-id` | template | `PUT /media/{repoId}/mid;{mediaItemId}` |
| `media:download-by-id` | template | `GET /media/{repoId}/mid;{mediaItemId}` |
| `media:metadata-by-id` | template | `GET /media/{repoId}/mid;{mediaItemId}/metadata` |
| `media:metadata-by-sha256` | template | `GET /media/{repoId}/sha256;{mediaItemHash}/metadata` |
| `media:poster` | template | `GET /media/{repoId}/{folderIdOrPath}/{filename}/poster` |
| `media:poster-by-id` | template | `GET /media/{repoId}/mid;{mediaItemId}/poster` |
| `media:hls-master` | template | `GET /media/{repoId}/{folderIdOrPath}/{filename}/hls/master.m3u8` |
| `media:hls-master-by-id` | template | `GET /media/{repoId}/mid;{mediaItemId}/hls/master.m3u8` |

Variant-playlist and segment URLs are deliberately **not** advertised as root templates — clients discover them from
the master playlist content and the `metadata` response's `video:hls:variant:*` links, the same way image `?size=`
variant URLs are discovered today rather than built from a root template.

##### Users

| `rel` | Kind | Method & target |
| --- | --- | --- |
| `users:create` | href | `POST /users` |
| `users:update` | template | `POST /users/{userIdOrEmail}` |
| `users:read-settings` | template | `GET /users/{userIdOrEmail}/settings` |
| `users:update-settings` | template | `PUT /users/{userIdOrEmail}/settings` |
| `users:resend-verification-token` | template | `POST /users/{userIdOrEmail}/action;resend-verification-token` |
| `users:verify-user` | template | `POST /users/{userIdOrEmail}/action;verify-user` |

##### Authentication

| `rel` | Kind | Method & target |
| --- | --- | --- |
| `auth:send-token` | href | `POST /auth/action;send-token` |
| `auth:login` | href | `POST /auth` |
| `auth:logout` | href | `POST /auth/action;logout` |
| `auth:session` | href | `GET /auth/session` |

> The `media:upload-by-id`, `media:download-by-id`, and `media:metadata-by-id` templates expose the `mediaItemId` field as a bare placeholder (`/media/{repoId}/{mediaItemId}…`); substitute it with the `mid;<uuid>` matrix segment shown above.

#### Responses

- `200 OK`

---

## Authentication

### POST /auth/action;send-token

Issues a one-time login token for the given email. Always returns 204 to avoid user enumeration. Test users receive the token in the response body.

#### Request body

```json
{ "email": "user@example.com" }
```

#### Responses

- `204 No Content` — token sent by email
- `200 OK` — test user only: `{ "token": "<uuid>" }`

---

### POST /auth

Validates a one-time token and starts a session (sets a session cookie).

**Authorization header**: `X-Token <email>:<token>`

#### Responses

- `204 No Content` — session started
- `401 Unauthorized` — invalid token, unknown user, or unverified user

---

### POST /auth/action;logout

Terminates the current session and clears the session cookie.

#### Responses

- `204 No Content`
- `401 Unauthorized` — no active session

---

### GET /auth/session

Returns details about the current session.

#### Response body

```json
{
  "principal": "<uuid>",
  "email": "user@example.com",
  "firstName": "Jan",
  "lastName": "Kowalski",
  "createdAt": "2026-01-01T00:00:00Z",
  "expiresAt":  "2026-01-08T00:00:00Z"
}
```

#### Responses

- `200 OK`
- `401 Unauthorized` — no active session

---

## Users

### POST /users

Registers a new user and sends a verification email. Always returns 204 to avoid enumeration.

#### Request body

```json
{ "email": "user@example.com", "firstName": "Jan", "lastName": "Kowalski" }
```

All three fields are required. Names are trimmed; a blank name, or one longer than 255 characters, is rejected.

#### Responses

- `204 No Content`
- `400 Bad Request` (`urn:bootstrap:error:validation-failed`) — a missing, blank, or too-long `firstName`/`lastName`

---

### POST /users/{userIdOrEmail}

Updates a user's first and/or last name. `userIdOrEmail` is a UUID or an email address. Only the user themselves may
update their profile: the request must carry that user's session.

#### Request body

```json
{ "firstName": "Jan", "lastName": "Kowalski" }
```

Both fields are optional; an omitted field is left unchanged. Names are mandatory, so `null`, a blank name, or one
longer than 255 characters is rejected. Names are trimmed.

#### Response body

```json
{ "id": "<uuid>", "email": "user@example.com", "firstName": "Jan", "lastName": "Kowalski" }
```

#### Responses

- `200 OK`
- `400 Bad Request` (`urn:bootstrap:error:validation-failed`) — a `null`, blank, or too-long name
- `401 Unauthorized` — no session
- `403 Forbidden` — the session belongs to a different user
- `404 Not Found` — no such user

---

### GET /users/{userIdOrEmail}/settings

Returns the user's settings: an arbitrary JSON object owned by the client (the webapp). The server stores it verbatim
and never interprets it. A user who has never stored settings gets `{}`. Only the user themselves may read their
settings: the request must carry that user's session.

#### Response body

```json
{ "theme": "dark", "grid": { "columns": 4 } }
```

#### Responses

- `200 OK`
- `401 Unauthorized` — no session
- `403 Forbidden` — the session belongs to a different user
- `404 Not Found` — no such user

---

### PUT /users/{userIdOrEmail}/settings

Replaces the user's settings object wholesale (no key-level merge). There is no revision or optimistic-concurrency
check: the last write wins. Only the user themselves may write their settings.

#### Request body

Any JSON object (`Content-Type: application/json`). Arrays, scalars, and `null` are rejected.

#### Responses

- `204 No Content`
- `400 Bad Request` (`urn:bootstrap:error:validation-failed`) — the body is not a JSON object
- `401 Unauthorized` — no session
- `403 Forbidden` — the session belongs to a different user
- `404 Not Found` — no such user

---

### POST /users/{userIdOrEmail}/action;resend-verification-token

Resends the verification email. `userIdOrEmail` is a UUID or an email address.

#### Responses

- `204 No Content`

---

### POST /users/{userIdOrEmail}/action;verify-user

Confirms email ownership using the token from the verification email, activating the account, and logs the user in:
like `POST /auth`, it starts a session and sets the `session` cookie (`Set-Cookie: session=<opaque>; Path=/`), so
no separate token login is needed after registration.

#### Request body

```json
{ "token": "<token-from-email>" }
```

#### Responses

- `204 No Content` — user verified, session started
- `404 Not Found` — no such user
- `409 Conflict` — user already verified
- `422 Unprocessable Entity` — wrong or expired token, or no pending verification token

---

## Repositories

Repository responses include a `meta.revision` field used for optimistic concurrency control. Pass it back verbatim in `meta.revision` on all mutating requests.

### POST /repos

Creates a repository. `Content-Language` header is required; the title is stored under that locale.

#### Request body

```json
{
  "data": {
    "name": "my-repo",
    "title": "My Repository",
    "organization": "my-org"
  }
}
```

The repository may be created in an [organization](#organizations), given by name (`organization`). The caller must
be a member (or owner) of that organization. Without it, the repository belongs to no organization.

#### Responses

- `200 OK` — `{ "meta": { "revision": "…" }, "data": { "id": "…", "name": "…", "title": "…" }, "links": { "self": "…" } }`
- `400 Bad Request` — missing `Content-Language`
- `403 Forbidden` — the caller is not a member of the organization
- `404 Not Found` (`urn:bootstrap:error:organization-not-found`) — no such organization
- `409 Conflict` — name already taken (within the organization)

---

### POST /repos;query

Returns a paginated list of repositories the caller has a role on.

#### Request body

```json
{ "query": { "offset": 0, "limit": 20 } }
```

Both fields are optional. An optional top-level `fields` array selects the record fields, as `fields` does for
`GET /repos/{repoId}`. By default, each record carries `organizationName` (absent if the repository has no
organization), `name`, and `title`; `owners` and `editors` are never included.

#### Responses

- `200 OK` — `{ "meta": { "offset": …, "limit": … }, "records": [ { "meta": …, "data": …, "links": … }, … ] }`

---

### GET /repos/{repoId}

Retrieves a repository.

#### Query parameters

- `fields` (optional) — comma-separated field selector over `organizationName` (the name of the repository's
  organization, absent if it has none), `name`, `title`, `owners`, and `editors`. All of them are returned by default.
- `representation` (optional) — `standard` (default) or `original`

The `representation` parameter selects how the repository is rendered:

- `standard` (the default when omitted) — the rich representation: `title` is the single translation negotiated for `Accept-Language`.
- `original` — the canonical, language-independent representation: `title` is rendered as a `{ "<lang>": … }` object carrying **all** stored translations.

#### Responses

- `200 OK` — repository resource
- `404 Not Found`

---

### GET /repos?org=organizationName&name=repositoryName

Retrieves a repository by its name (`name`). The repository name can optionally be qualified with an organization
name (`org`); organization names are case-insensitive.

This request accepts the same additional query parameters as `GET /repos/{repoId}` and returns the same responses.

---

### POST /repos/{repoId}

Updates a repository. All data fields are optional (partial update). `meta.revision` is required. Requires the
caller to hold the repository's **owner** role (`RepositoryPermission.Manage`) — this applies to the whole request,
not just to `owners`/`editors` changes.

#### Request body

```json
{
  "meta": { "revision": "<current-revision>" },
  "data": {
    "name": "new-name",
    "title": "New Title",
    "organizationName": "my-org",
    "owners": [ { "type": "user", "email": "owner@example.com" } ],
    "editors": [ { "type": "user", "email": "editor@example.com" } ]
  }
}
```

All fields under `data` are optional:

- `name` — renames the repository.
- `title` — as in `POST /repos` (bare string stores under `Content-Language`, merging with existing translations;
  an object replaces every stored translation).
- `organizationName` — moves the repository into that [organization](#organizations). The caller must be a member
  (or owner) of it. A repository cannot be taken out of an organization.
- `owners` / `editors` — each, when present, **wholesale-replaces** the current set of principals holding that role:
  principals missing from the list are removed, listed principals not currently holding the role are added.
  Principal shape is the same `{ "type": "user"/"anonymous"/"link", ... }` form used by
  `PATCH .../permissions`. Omitting the field leaves that role's assignments untouched. `"owners": []` is rejected
  outright (`422`, `urn:bootstrap:error:repository-would-have-no-owners`) — a repository must always retain at
  least one owner; the request is refused before anything is written, so `editors`/`name`/`title` changes in the
  same request are not applied either. `"editors": []` has no such restriction and simply clears all editors.

#### Responses

- `200 OK` — returns an updated repository resource
- `404 Not Found`
- `403 Forbidden` — the caller is not a member of the `organizationName` organization
- `404 Not Found` (`urn:bootstrap:error:organization-not-found`) — no such organization
- `409 Conflict` — revision mismatch, or the name is already taken (within the target organization)
- `422 Unprocessable Entity` — `owners` supplied as an empty list

---

### DELETE /repos/{repoId}

Deletes a repository.

#### Request body

```json
{ "revision": "<current-revision>" }
```

#### Responses

- `204 No Content`
- `404 Not Found`
- `409 Conflict` — revision mismatch

---

### GET /repos/{repoId}/changelog

Retrieves the repository's audit log (`repository_audit` entries), most recent first. The caller must be a
repository owner or editor.

#### Query parameters

- `offset` (optional, default `0`)
- `limit` (optional, default `20`)

#### Response body

```json
{
  "meta": { "offset": 0, "limit": 20 },
  "records": [
    {
      "data": {
        "id": 42,
        "principalId": "…",
        "timestamp": "2026-01-01T00:00:00Z",
        "description": { "type": "repository_renamed", "data": { "oldName": "old", "newName": "new" } }
      }
    }
  ]
}
```

`principalId` is `null` for system-attributed events. `description.type` is one of the audit event kinds
(`repository_created`, `repository_renamed`, `repository_title_changed`, `owner_added`/`owner_removed`,
`editor_added`/`editor_removed`, or one of the `folder_*` events); `description.data` carries that event's own
fields.

#### Responses

- `200 OK`
- `403 Forbidden` — caller is not an owner or editor of the repository
- `404 Not Found`

---

## Organizations

An organization qualifies repository names (`GET /repos?org=…&name=…`) and groups the users allowed to create
repositories in it. A user holds one of two roles in an organization:

- `owner` — manages the organization: updates or deletes it and adds or removes members and owners;
- `member` — may create repositories in the organization.

An owner is also a member. Only users hold roles (no link or anonymous principals). An organization always has at least
one owner.

Organizations are addressed by name. A name is a URL-safe slug: letters, digits, and hyphens, not starting or ending
with a hyphen, at most 60 characters. Names are case-insensitive: they are stored and returned in lowercase, and
`/orgs/My-Org` addresses `my-org`. A name cannot be changed after creation.

The organization resource has `id`, `name`, and `title`. `title` is localized like a repository's: in a request, a
bare string is stored under `Content-Language` and an object sets every translation; in a response, it is the
translation negotiated for `Accept-Language` (or every translation with `?representation=original`). Organizations
have no revision.

```json
{
  "meta": {},
  "data": { "id": "<uuid>", "name": "my-org", "title": "My Organization" },
  "links": {
    "self": { "rel": "self", "href": "/orgs/my-org" },
    "members": { "rel": "members", "href": "/orgs/my-org/members" }
  }
}
```

### GET /orgs

Lists the organizations in which the caller holds any role, ordered by name. Not paginated.

#### Response body

```json
{ "meta": {}, "records": [ { "meta": {}, "data": { "id": "…", "name": "my-org", "title": "…" }, "links": { … } } ] }
```

#### Responses

- `200 OK`
- `401 Unauthorized` — no session

---

### POST /orgs

Creates an organization and makes the caller its owner. Any verified user may create one. `Content-Language` is
required.

#### Request body

```json
{ "data": { "name": "my-org", "title": "My Organization" } }
```

#### Responses

- `200 OK` — organization resource
- `400 Bad Request` — missing `Content-Language`, or an invalid `name`
- `401 Unauthorized` — no session
- `409 Conflict` (`urn:bootstrap:error:organization-name-conflict`) — the name is taken (compared case-insensitively)

---

### GET /orgs/{orgName}

Retrieves an organization by name. Requires no session and no role.

#### Query parameters

- `fields` (optional) — comma-separated field selector
- `representation` (optional) — `standard` (default) or `original`, as for `GET /repos/{repoId}`

#### Responses

- `200 OK` — organization resource
- `404 Not Found` (`urn:bootstrap:error:organization-not-found`)

---

### POST /orgs/{orgName}

Updates an organization's title. Requires the **owner** role. No revision is needed.

#### Request body

```json
{ "data": { "title": "New Title" } }
```

`title` is optional; as with repositories, a bare string is merged into the existing translations under
`Content-Language`, and an object replaces every translation. The name cannot be changed: a `name` field is accepted
only if it equals the current name.

#### Responses

- `200 OK` — updated organization resource
- `400 Bad Request` — `name` differs from the current name
- `401 Unauthorized` — no session
- `403 Forbidden` — the caller is not an owner
- `404 Not Found`

---

### DELETE /orgs/{orgName}

Deletes an organization. Requires the **owner** role, and the organization must not contain any repositories.

#### Responses

- `204 No Content`
- `401 Unauthorized` — no session
- `403 Forbidden` — the caller is not an owner
- `404 Not Found`
- `409 Conflict` (`urn:bootstrap:error:organization-not-empty`) — repositories still belong to the organization

---

### GET /orgs/{orgName}/members

Lists the organization's members (owners included), ordered by email. Requires the **member** role. Not paginated.

#### Response body

```json
{
  "meta": {},
  "records": [
    { "data": { "email": "member@example.com", "role": "member" } },
    { "data": { "email": "owner@example.com", "role": "owner" } }
  ]
}
```

`role` is `owner` or `member`. Each user appears once, with the role they hold.

#### Responses

- `200 OK`
- `401 Unauthorized` — no session
- `403 Forbidden` — the caller is not a member
- `404 Not Found`

---

### PATCH /orgs/{orgName}/members

Applies an ordered list of operations to the organization's members in a single transaction, and returns the resulting
member list (same shape as `GET`). Requires the **owner** role.

| Form | Effect |
| --- | --- |
| `{ "op": "add", "email": "<email>", "role": "owner" \| "member" }` | Gives the user that role, adding them or changing the role they hold. `role` defaults to `member`. |
| `{ "op": "remove", "email": "<email>" }` | Removes the user from the organization. No-op if they are not a member. |

An owner may remove themselves or demote themselves to `member`, but the organization must keep at least one owner:
a request that would leave it without one is rejected, and none of its operations is applied.

#### Request body

```json
[
  { "op": "add", "email": "new-owner@example.com", "role": "owner" },
  { "op": "remove", "email": "old-owner@example.com" }
]
```

#### Responses

- `200 OK` — resulting member list
- `400 Bad Request` — an invalid operation
- `401 Unauthorized` — no session
- `403 Forbidden` — the caller is not an owner
- `404 Not Found` — no such organization (`organization-not-found`), or an email with no registered user
  (`user-not-found`)
- `422 Unprocessable Entity` (`urn:bootstrap:error:organization-would-have-no-owners`)

---

## Repository Metadata Snapshots

A point-in-time consistent read of a repository's folder/text/permissions/media metadata — backs the planned Git-like
CLI sync tool's "consistent read snapshot" requirement. See `docs/metadata_snapshot_plan.md` for the design and
implementation notes; this section documents the resulting endpoints. Both endpoints require repository **owner or
editor** access (`RepositoryPermission.Edit`), since a `Ready` snapshot exposes `folder_permissions` wholesale —
repository-admin-grade information, not just what the caller can individually read.

### POST /repos/{repoId}/metadata-snapshots

Starts building a snapshot. Snapshot creation is always asynchronous — this always returns `202 Accepted` with a
`Location` header; poll `GET /repos/{repoId}/metadata-snapshots/{snapshotId}` until it returns `200`.

#### Request body

```json
{
  "formatVersion": 1,
  "scope": {
    "roots": ["/albums"],
    "include": ["repository", "folder-data", "folder-text", "folder-permissions", "folder-media"]
  }
}
```

`scope.roots` are repository-relative folder paths (same `/`-separated form as folder JSON references elsewhere in
this API); the snapshot covers each named folder and everything beneath it. `scope.include` is optional — omitted, it
defaults to every aspect except `media-item-overrides` (there is no authored media-item override API yet, so
requesting it fails with `422`).

#### Responses

- `202 Accepted` — `{ "meta": { "snapshot": "<id>", "createdAt": "…" } }`, `Location: /repos/{repoId}/metadata-snapshots/{snapshotId}`
- `403 Forbidden` — caller is not an owner or editor of the repository
- `404 Not Found` — repository not found
- `422 Unprocessable Entity` — `scope.roots` names a folder outside the repository, or `scope.include` requests `media-item-overrides`

---

### GET /repos/{repoId}/metadata-snapshots/{snapshotId}

Polls a snapshot's build status, or (once ready) returns a page of its records.

#### Query parameters

- `offset` (optional, default `0`)
- `limit` (optional, default `100`)
- `wait` (optional, default `0`) — if the snapshot is still `Building`, long-polls (holding the request open) for up
  to this many seconds for it to finish, instead of returning `204` immediately. Returns as soon as the snapshot
  leaves `Building`; still returns `204 No Content` if it's still `Building` when `wait` elapses. Clamped server-side
  to a configured maximum (`metadata_snapshots.max_wait_seconds` in `config/app.conf`, default `30`) — a larger value
  is silently capped, not rejected.

#### Response body (once ready)

```json5
{
  "meta": {
    "snapshot": "opaque-snapshot-token",
    "repositoryVersion": 42,
    "scopeHash": "sha256-hex",
    "formatVersion": 1,
    "createdAt": "2026-09-20T10:00:00Z",
    "limit": 100,
    "offset": 0
  },
  "records": [
    {
      "type": "repository",
      "revision": "…",
      "value": {
        "name": "…",
        "title": { "pl-pl": "…" },
        "owners": [ { "type": "user", "email": "owner@example.com" } ],
        "editors": []
      }
    },
    {
      "type": "folder",
      // always present
      "id": "folder-uuid",
      "revision": "folder-revision-uuid",
      // { "path": "/albums" } when the *parent's* type is root/albums/media, else { "id": "<uuid>" }
      "parent": { "path": "/albums" },
      "name": "narty",
      // folders.data_content (kind renamed to type) plus the folder's full localized title, verbatim
      "data": { "type": "album", "title": { "en-us": "Skiing", "pl-pl": "Narty" } },
      // the explicit cover and date range, null when automatic, in the shape folder.create/folder.update take
      "cover": { "id": "media-item-uuid" },
      "dateRange": null,
      "texts": { "en-us": "…" },
      // effective (direct + inherited) grants, same records as GET .../permissions — see below
      "permissions": [
        { "data": { "principal": { "type": "user", "email": "a@example.com" }, "folder": "folder-uuid", "permission": "read" } }
      ],
      "media": [ /* same record shape as GET .../media */ ]
    },
    { "type": "media-item", "id": "media-item-uuid", "value": { "type": "image", "visibility": "normal", "originalHash": "…" } }
  ]
}
```

Records are returned in a fixed order — the repository record, then folders in path order (parents before children),
then media items — and `offset`/`limit` page over exactly that flat list.

Notes on folder records:

- `data` is the folder's typed content with two additions: `type` (the folder type) and `title` (every stored
  translation). Everything else in it, including the reserved `text` key (associated object data for markdown embeds),
  is the client-authored content exactly as stored. To round-trip it through `folder.create`/`folder.update`, remove
  `type` and `title` and send the rest as `data`; otherwise they are stored as ordinary content fields.
- `permissions` lists **effective** grants, including those inherited from ancestors, in the same shape as
  `GET .../permissions`: no `effect` field; `folder` names the folder the grant is stored on. A folder's own explicit
  grants are exactly the records whose `data.folder` equals the record's `id`.

#### Responses

- `200 OK` — snapshot is `Ready`; body as above
- `204 No Content` — snapshot is still `Building`
- `403 Forbidden` — caller is not an owner or editor of the repository
- `404 Not Found` — no such snapshot in this repository
- `410 Gone` — snapshot build failed (`urn:bootstrap:error:metadata-snapshot-failed`); the `detail` field carries the
  build error. Request a new snapshot instead of retrying this one — a snapshot is cheap to discard and rebuild.

---

### Repository Metadata Sync

A single atomic mutation endpoint: submit a whole write-batch plan (folder creates, moves, renames, data/text/
permissions/media changes, deletes, plus a repository-level rename/retitle) and have it applied in one database
transaction or not at all. See `docs/metadata_sync_plan.md` for the full design; this section documents the resulting
endpoint.

#### POST /repos/{repoId}/metadata-sync

```text
POST /repos/{repoId}/metadata-sync
Content-Type: application/json
If-Match: "repository-metadata:42"
Idempotency-Key: 0be4aa18-ee30-4f99-9025-f5f19368bb30

{
  "meta": { "formatVersion": 1 },
  "operations": [ /* see "Operation vocabulary" below */ ]
}
```

- `If-Match` is **required**, always exactly `"repository-metadata:<repositoryVersion>"` — the same `repositoryVersion`
  the metadata-snapshot endpoint's `meta.repositoryVersion` reports (`None` treated as version `0`). A missing or
  unparseable header is `400`; a value that doesn't match the repository's current version is a `409` "Repository
  Version Conflict" (see Responses).
- `Idempotency-Key` is **required**: a client-generated UUID identifying this exact logical attempt. Retrying with the
  same key and the same body replays the stored response instead of re-applying the plan; retrying with the same key
  and a *different* body is rejected. Bodies are compared after JSON parsing: whitespace differences don't matter,
  but key order does, so serialize retries identically. Stored responses are kept for 24 hours
  (`metadata_sync.idempotency_expiry_hours`).
- A replayed response has the same status, `ETag`, and JSON content as the original, but **not necessarily the same
  bytes**: the body is stored as PostgreSQL `jsonb`, which reorders object keys (e.g. `data` may come before `meta`).
  Compare replayed responses as parsed JSON.
- `meta.formatVersion` is currently always `1`.

##### Operation vocabulary

Each entry in `operations` is a JSON object with a top-level `"op"` discriminator:

| `op` | Fields | Mirrors |
| --- | --- | --- |
| `repository.update` | `expectedRevision`, plus `name`/`title`/`organizationName`/`owners`/`editors` (same shape as `POST /repos/{repoId}`) | `POST /repos/{repoId}` |
| `folder.create` | `id` (**required** here, unlike the single-resource endpoint), `parent`, `name`, `title`, `type`, `data` (same shape as `POST /folders/{repoId}`) | `POST /folders/{repoId}` |
| `folder.update` | `folder` (bare UUID string), `expectedRevision`, `changes: { name?, parent?, title?, data?, texts?, permissions?, media? }` | `POST /folders/{repoId}/{folderIdOrPath}` + its `text`/`permissions`/`media` subresources |
| `folder.delete` | `folder` (bare UUID string), `expectedRevision` | `DELETE /folders/{repoId}/{folderIdOrPath}` |

`folder.create`'s `title` is a bare string or a `{ "<lang>": "…" }` object (`{}` allowed), as on
`POST /folders/{repoId}`. A bare string — here and in `folder.update`/`repository.update` — is stored under the sync
request's own `Content-Language` header (or the server default when absent); there is no per-operation language, so
send an object to set specific languages.

`folder.create` additionally accepts three optional fields that give the new folder its content in the same plan (a
`folder.update` can't target a folder the same plan creates):

- `texts` — `{ "<lang>": "<markdown>" }`, one body per language; the same shape as a snapshot folder record's `texts`.
  References are extracted exactly as for `PUT .../text`.
- `permissions` — the same patch array `PATCH .../permissions` accepts (requires the repository **owner** role).
- `media` — the same patch array `PATCH .../media` accepts.

It also accepts `cover` and `dateRange`, as on `POST /folders/{repoId}`. Unlike there, a `cover` can be valid: it is
checked after the operation's `media` patches, so a plan can link an item into the new folder and make it the
cover.

`folder.update`'s `changes.name`/`.parent`/`.title`/`.data`/`.cover`/`.dateRange` are exactly `POST /folders/{repoId}/{folderIdOrPath}`'s
own update fields; `changes.permissions` is the same patch array `PATCH .../permissions` accepts (a `permissions`
change additionally requires the caller to hold the repository's **owner** role, matching that endpoint); `changes.media`
is the same patch array `PATCH .../media` accepts. `changes.texts` is `{ "put": { "<lang>": "<markdown>" }, "delete":
["<lang>", ...] }` — `put` stores/replaces the body for each named language (merged into the folder's existing
translations, like `PUT .../text`); `delete` removes a stored language entirely (no single-resource equivalent exists
for this). `changes.cover` is applied last, after `changes.media`, so it can name an item that the same operation
links into the folder.

```json5
{ "op": "repository.update", "expectedRevision": "old-repository-revision-uuid", "name": "piotrek", "title": "Piotrek" }
{
  "op": "folder.create",
  "id": "new-portable-folder-uuid",
  "parent": { "path": "/albums" },
  "name": "2026",
  "title": { "en-us": "2026", "pl-pl": "2026" },
  "type": "album",
  "data": {},
  "texts": { "en-us": "Photos from 2026" },
  "media": [ { "op": "add", "id": "media-item-uuid", "filename": "first.jpg" } ]
}
{
  "op": "folder.update",
  "folder": "folder-uuid",
  "expectedRevision": "old-folder-revision-uuid",
  "changes": {
    "title": "Skiing in 2026",
    "texts": { "put": { "en-us": "New text" }, "delete": [] },
    "permissions": [ { "principal": { "type": "user", "email": "a@example.com" }, "permission": "read", "effect": "grant" } ]
  }
}
{ "op": "folder.delete", "folder": "folder-uuid", "expectedRevision": "old-folder-revision-uuid" }
```

Folder addressing:

- `folder` (in `folder.update`/`folder.delete`) is a **bare folder UUID string**, not a `{"id": …}`/`{"path": …}`
  object; these operations cannot address a folder by path. Each folder may be the target of at most one
  `folder.update`/`folder.delete` per plan, and never of a folder created in the same plan (both `422`).
- `parent` (in `folder.create` and `changes.parent`) uses the same `{"id": "<uuid>"}` / `{"path": "/albums/..."}`
  forms as every other folder JSON reference in this API. `{"id": ...}` may also name another `folder.create`
  operation's `id` from the *same* plan, letting a plan create a nested folder structure in one request. A
  `{"path": ...}` parent is resolved against the repository **as it was before the plan**: it names whichever folder
  was at that path, even if the plan moves or renames that folder, and it cannot name a folder the plan creates (use
  `{"id": ...}` for those).

Execution order: operations do not need to be listed in dependency order. After locking every folder the plan touches
and checking every `expectedRevision`, the server applies the plan in fixed phases, regardless of the order of
`operations`:

1. `repository.update`.
2. Structure: every folder the plan creates, moves, or renames is first given a temporary internal name, then
   `folder.create` and parent-changing `folder.update` operations run in topological order, so parents are created
   or moved before their children.
3. `folder.delete`, in list order. A delete removes the whole subtree. Deleting both a folder and one of its
   descendants is allowed: both must exist and match their `expectedRevision` when the plan starts. A folder moved
   out of a deleted folder (phase 2) survives the delete.
4. Every folder from phase 2 takes its final name.
5. Content, against the folders' final locations: each `folder.update`'s `title`/`data`/`dateRange`, then `texts`,
   then `permissions`, then `media` (applied strictly in array order, as in `PATCH .../media`), then `cover`; then
   each `folder.create`'s `texts`, `permissions`, `media`, `dateRange`, and `cover`. Changes to a folder that a
   `folder.delete` in the same plan removed (because it deleted an ancestor) are skipped.

Only the **final** state must have unique folder paths. A plan may delete a folder and create another under the same
name, move or rename a folder into a name another operation frees up, or swap two sibling names. A plan whose final
state would put two folders at the same path is rejected with `409` (`urn:bootstrap:error:folder-path-conflict`). A
plan is rejected with `422` if a `folder.create` or parent-changing `folder.update` would place a folder inside a
subtree that a `folder.delete` in the same plan removes — whether its `parent` names the deleted folder itself (by
`{"id": …}` or `{"path": …}`) or any folder beneath it that the plan doesn't move out first.

##### Responses

- `200 OK` — the whole plan applied.

  ```text
  ETag: "repository-metadata:43"

  {
    "meta": {
      "operation": "0be4aa18-ee30-4f99-9025-f5f19368bb30",
      "previousRepositoryVersion": 42,
      "repositoryVersion": 43
    },
    "data": {
      "revisions": {
        "repository": "new-repository-revision-uuid",
        "folder:9bd1c3d0-...": "new-folder-revision-uuid"
      }
    }
  }
  ```

  `data.revisions` has one entry per resource the plan actually mutated (`"repository"` present only if a
  `repository.update` op was included; one `"folder:<uuid>"` entry per folder touched by `folder.create` or
  `folder.update` — not for `folder.delete`).
- `400 Bad Request` — missing/unparseable `If-Match` or `Idempotency-Key`, or a body that fails to decode.
- `403 Forbidden` — the caller lacks the permission a specific operation requires. Nothing in the plan is applied.
- `404 Not Found` (`urn:bootstrap:error:repository-not-found`) — repository not found.
- `404 Not Found` (`urn:bootstrap:error:folder-not-found`) — an operation's `folder` or `parent` references a folder
  that does not exist.
- `404 Not Found` (`urn:bootstrap:error:media-item-not-found`) — a media `add` names a nonexistent media item, or a
  media `move` names a filename that isn't linked in the folder.
- `404 Not Found` (`urn:bootstrap:error:user-not-found`) — a permission patch names an email with no registered user.
- `409 Conflict` (`urn:bootstrap:error:revision-conflict`) — two cases share this `type`; the `reason` extension member
  tells them apart:
  - `reason: "repository-version-changed"` (`title: "Repository Version Conflict"`) — `If-Match` didn't match the
    current `repositoryVersion`. Also carries `expectedRepositoryVersion` and `currentRepositoryVersion`.
  - `reason: "resource-revision-changed"` (`title: "Resource Revision Conflict"`) — one or more operations'
    `expectedRevision` didn't match. `conflicts` lists every conflicting key (`"repository"` and/or
    `"folder:<uuid>"`).

  ```json
  {
    "type": "urn:bootstrap:error:revision-conflict",
    "status": 409,
    "title": "Resource Revision Conflict",
    "detail": "Resource revision conflict: folder:9bd1c3d0-…",
    "instance": null,
    "reason": "resource-revision-changed",
    "conflicts": ["folder:9bd1c3d0-…"]
  }
  ```

- `409 Conflict` (`urn:bootstrap:error:idempotency-key-reused`) — again two cases, told apart by `reason`:
  - `reason: "request-mismatch"`, no `Retry-After` — the key was already used with a different request body.
    Don't retry with this key.
  - `reason: "in-progress"`, `Retry-After: 1` — a request with this exact key is still being processed. Retry the
    identical request with the same key after the delay.
- `409 Conflict` (`urn:bootstrap:error:folder-path-conflict`) — the plan's final state would put two folders at the
  same path; `detail` names the path.
- `409 Conflict` (`urn:bootstrap:error:folder-already-exists`) — a `folder.create` `id` is already in use.
- `409 Conflict` (`urn:bootstrap:error:media-item-already-exists`) — a media `add` would duplicate a filename in the
  folder.
- `409 Conflict` (`urn:bootstrap:error:repository-name-conflict`) — a `repository.update` renames the repository to a
  name that is already taken.
- `422 Unprocessable Entity` (`urn:bootstrap:error:validation-failed`) — the plan is structurally invalid: duplicate
  `folder.create` ids, a missing `folder.create` `id`, a parent-reference cycle, a `folder.create` naming a
  `folderType` that's a per-repository singleton (`root`/`albums`/`media`), a `folder.create`/`folder.update` placing a
  folder inside a subtree a `folder.delete` in the same plan removes, a `folder.update`/`folder.delete` of a folder created in the same plan, a
  folder targeted by more than one `folder.update`/`folder.delete`, or more than the configured maximum number of
  operations. The `errors` extension member lists every issue found, each with the zero-based indexes of the
  `operations` it concerns (empty for plan-wide issues such as the operation limit); `detail` joins the same
  messages with semicolons.

  ```json
  {
    "type": "urn:bootstrap:error:validation-failed",
    "status": 422,
    "title": "Bad Request",
    "detail": "operations[1,3]: duplicate folder.create body.id",
    "instance": null,
    "errors": [ { "operations": [1, 3], "message": "operations[1,3]: duplicate folder.create body.id" } ]
  }
  ```

- `422 Unprocessable Entity` (`urn:bootstrap:error:validation-failed`, no `errors` member) — a media `move` whose
  `afterFilename` equals its `filename`; a `dateRange` whose `start` is after its `end`; or a `cover` that is not an
  image, is `restricted`, or is not in the folder or its subfolders once the operation's media patches have applied
  (title `Invalid Folder Cover`). A `cover` naming a nonexistent media item is a `404`
  (`urn:bootstrap:error:media-item-not-found`).
- `422 Unprocessable Entity` (`urn:bootstrap:error:repository-would-have-no-owners`) — a `repository.update` op
  supplied `owners: []`.

Every error response means nothing in the plan was applied. Every `4xx` outcome is recorded under the
`Idempotency-Key` and replayed on retry (with the same status and body), like a `200`. A `500` is not recorded: the
key stays reserved for about 10 minutes (`metadata_sync.idempotency_stale_after_minutes`), during which a retry gets
`409` with `reason: "in-progress"`, and is then released so a retry attempts the plan again.

---

## Folders

Folders are addressed with a `{folderVar}` path segment:

| Format | Example | Resolves to |
| --- | --- | --- |
| `id;<uuid>` | `id;a1b2c3…` | Folder with that UUID |
| `path;el1;el2` | `path;albums;vacation` | `/albums/vacation` |

In JSON bodies, folder references use:

```json
{ "id": "<uuid>" }
{ "path": "/albums/vacation" }
```

Single-folder responses include `related.ancestors` — an ordered list of ancestor folder resources from the root down.

Folder `data` carries a `textPreview` field (first 250 characters of the localized markdown body) when text content exists for the resolved language. Use the dedicated text subresource below to read the full body or write a new translation.

Folder `data` also carries a `data` field — an arbitrary JSON object holding the folder's typed content (kind-specific properties). The shape depends on the folder's `type`; for example an `album` folder may expose `{"title": "Cover Title"}`. Unknown fields in this object are preserved round-trip. The internal `kind` discriminator is omitted from responses since it is already conveyed by `type`. A reserved `text` key, present on any folder type, carries the folder's associated object data for markdown embeds (e.g. a `::gallery` directive's definition) — see [folder_text.md](folder_text.md#associated-object-data). It is client-authored content, not derived by the server from the markdown body (the server only derives its reference index from it), and it is always wholesale-replaced along with the rest of `data`, like every other part of this field.

Folder `links` includes a `text` link pointing at the text subresource. When any text has been stored, the link advertises the available languages, e.g.

```json
"text": { "rel": "text", "href": "…/text", "language": ["en-us", "pl-pl"] }
```

#### Cover, date range, and item count

Folder `data` also carries a summary of everything the folder exposes: its own media items and those of all its
subfolders (see [folder_summary_plan.md](folder_summary_plan.md)).

```json5
{
  "cover": { "id": "<media-item-uuid>", "selection": "auto" },
  "dateRange": { "start": "2014-11-10", "end": "2014-11-17", "selection": "auto" },
  "itemCount": 2
}
```

- `cover` — the folder's cover image. The user can choose it (`selection: "explicit"`; see `cover` on
  `POST /folders/{repoId}/{folderVar}`); otherwise (`selection: "auto"`) it is the first image (with `normal`
  visibility) in the folder's own custom order, failing that the earliest-captured such image among everything the
  folder exposes. Videos and `restricted` items are never covers. An explicit cover that the folder no longer exposes
  (unlinked, or its subfolder moved away) is replaced by the automatic one, but the choice is kept and applies again
  once the item is back. Absent when no item qualifies.
- `dateRange` — the folder's explicit date range (`selection: "explicit"`) if the user set one; otherwise
  (`selection: "auto"`) the earliest and latest local capture dates (inclusive) among the exposed items, ignoring
  items without a capture time. Absent when neither exists.
- `itemCount` — the number of distinct media items the folder exposes, of any type or visibility; an item linked
  more than once counts once.

The automatic values are computed in the background, so they can lag behind a change: by up to about a second after
an upload, a move, or a membership change, and for `dateRange` until the item's metadata has been extracted. Explicit
values, and a new folder's `itemCount: 0`, show at once. The fields are included by default and can be selected with
`fields` like any other field. `?representation=original` omits `itemCount` and renders `cover` and `dateRange` as
the explicit values only (`{ "id": … }` and `{ "start", "end" }`), `null` when automatic.

With a cover, `links` also includes a `cover` link to the cover item's metadata and, once the image has been
processed, `cover:variant:*` links mirroring its `image:variant:*` links, so the cover can be displayed without
fetching its metadata:

```json
"cover": { "rel": "cover", "href": "/media/{repoId}/mid;{mediaItemId}/metadata" },
"cover:variant:primary": { "rel": "cover:variant:primary", "href": "/media/{repoId}/mid;{mediaItemId}", "width": 2560, "height": 1440, "hash": "<sha256-hex>" },
"cover:variant:sm": { "rel": "cover:variant:sm", "href": "/media/{repoId}/mid;{mediaItemId}?size=sm", "width": 640, "height": 480 }
```

The summary fields and cover links appear on the folders returned by `GET`, create, update, `action;list`,
`action;listroot`, and `action;tree`, but not on `related.ancestors` entries, nor on folders listed under another
resource's `related` (`…/permissions`, `…/text/media`).

### POST /folders/{repoId}

Creates a folder under an existing parent. `Content-Language` is required.

#### Request body

```json
{
  "data": {
    "id": "a1b2c3d4-…",
    "parent": { "path": "/albums" },
    "name": "vacation",
    "title": "Summer Vacation",
    "type": "album",
    "data": { "title": "Cover Title" }
  }
}
```

Valid folder types: `root`, `albums`, `album`, `document`, `tag`, `media`, `media-source`, `picture`.

`title` is either a bare string, stored under the request's `Content-Language`, or a `{ "<lang>": "…" }` object
carrying every translation at once. An empty object (`{}`) is accepted and creates a folder with no title.

The inner `data` object is optional. When omitted, an empty default content object (`{}`) is stored. The content shape is determined by `type`; unknown fields are preserved.

The `data.id` property (a UUID sibling of `parent`/`name`/`title`/`type`, not part of the inner `data` content object) is optional and specifies the ID of the newly created folder. If omitted, an ID is assigned automatically by the server. If a folder with that ID already exists, the request fails with `409 Conflict` (`urn:bootstrap:error:folder-already-exists`).

`data.cover` and `data.dateRange` are accepted as on `POST /folders/{repoId}/{folderVar}`. A new folder contains no
media, so a `cover` is always rejected here; it is useful in a metadata-sync `folder.create`, which can add the media
in the same operation.

#### Responses

- `200 OK` — folder resource with ancestors
- `400 Bad Request` (`urn:bootstrap:error:validation-failed`) — `dateRange.start` is after `dateRange.end`
- `404 Not Found` — parent folder not found
- `409 Conflict` - if a folder ID specified, but a folder with this ID already exists
- `422 Unprocessable Entity` — invalid parent reference, or a `cover` (which the new folder cannot contain yet)

---

### GET /folders/{repoId}/{folderVar}

Retrieves a folder.

#### Query parameters

- `fields` (optional) — comma-separated field selector
- `representation` (optional) — `standard` (default) or `original`

The `representation` parameter selects how the folder is rendered:

- `standard` (the default when omitted) — the rich representation: `title` is the single translation negotiated for `Accept-Language`, the derived `textPreview` field is included when text content exists, and `related.ancestors` lists the ancestor chain.
- `original` — the canonical, language-independent representation: `title` is rendered as a `{ "<lang>": … }` object carrying **all** stored translations, derived fields (such as `textPreview` and `itemCount`) are omitted, and no `related.ancestors` section is returned. The included fields are `id`, `name`, `path`, `type`, `title`, `data`, and the explicit `cover` and `dateRange` (`null` when automatic).

#### Responses

- `200 OK` — folder resource
- `404 Not Found`

---

### POST /folders/{repoId}/{folderVar}

Updates a folder (rename, move, change title, or replace typed content). `meta.revision` is required.

#### Request body

```json
{
  "meta": { "revision": "<current-revision>" },
  "data": {
    "name": "new-name",
    "parent": { "path": "/albums" },
    "title": "Updated Title",
    "data": { "title": "Updated Cover" },
    "cover": { "id": "<media-item-uuid>" },
    "dateRange": { "start": "2026-08-01", "end": "2026-08-14" }
  }
}
```

All fields under `data` are optional:

- `name` — renames the folder (updates all descendant paths).
- `parent` — moves the folder under the referenced parent.
- `title` — updates the folder's localized title. A bare string (e.g. `"Updated Title"`) is stored under the request's `Content-Language`, merging with any existing translations; an object (e.g. `{ "en": "Title", "pl": "Tytuł" }`) replaces **all** stored translations at once.
- `data` — replaces the folder's typed content JSON wholesale (no key-level merge), including the reserved `text`
  key; omitting it leaves the existing content unchanged. Every key is stored as given, so do not echo back the
  `type`/`title` keys a metadata snapshot adds to its folder `data` — they would be stored as ordinary content fields.
- `cover` — `{ "id": "<media-item-uuid>" }` sets the folder's explicit cover; `null` returns to the automatic cover.
  The item must be an image with `normal` visibility that the folder or one of its subfolders contains, so anyone who
  can read the folder can display it. It is checked after any move in the same request.
- `dateRange` — `{ "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" }` sets the folder's explicit date range (both dates
  required, inclusive); `null` returns to the automatic range. It is not checked against the folder's media, so it may
  be wider (the whole trip, including days without photos) or narrower than the automatic one.

Changing `cover` or `dateRange` bumps the revision, like any other change, and shows in the response at once.

#### Responses

- `200 OK` — updated folder resource with ancestors
- `400 Bad Request` (`urn:bootstrap:error:validation-failed`) — `dateRange.start` is after `dateRange.end`
- `404 Not Found` — the folder, or (`urn:bootstrap:error:media-item-not-found`) the `cover` item
- `409 Conflict` — revision mismatch
- `422 Unprocessable Entity` — e.g. a `cover` that is not an image, is `restricted`, or is not in the folder or its
  subfolders (`urn:bootstrap:error:validation-failed`, title `Invalid Folder Cover`)

---

### DELETE /folders/{repoId}/{folderVar}

Deletes a folder and all its descendants.

#### Request body

```json
{ "revision": "<current-revision>" }
```

#### Responses

- `204 No Content`
- `404 Not Found`
- `409 Conflict` — revision mismatch

---

### POST /folders/{repoId}/action;listroot

Lists root-level folders in the repository.

#### Request body (optional)

```json
{ "query": { "offset": 0, "limit": 20 } }
```

#### Responses

- `200 OK` — array of folder resources

---

### POST /folders/{repoId}/{folderVar}/action;list

Lists direct children of a folder.

#### Request body (optional)

```json
{ "query": { "offset": 0, "limit": 20 } }
```

#### Responses

- `200 OK` — paginated array of folder resources
- `404 Not Found`

---

### POST /folders/{repoId}/{folderVar}/action;tree

Returns a recursive subtree of subfolders.

#### Request body (optional)

```json
{ "query": { "depth": 3 } }
```

#### Responses

- `200 OK` — hierarchical tree of folder resources
- `404 Not Found`

---

### GET /folders/{repoId}/{folderVar}/text

Returns the folder's full markdown body. The translation is selected from the folder's stored content using the request's `Accept-Language`; if no translation matches and no text is stored, an empty body is returned.

#### Response headers

- `Content-Type: text/markdown`
- `Content-Language` — language of the returned text
- `Revision-Id` — the folder's current revision (pass back on `PUT`)

#### Responses

- `200 OK` — markdown body (possibly empty)
- `404 Not Found`

---

### PUT /folders/{repoId}/{folderVar}/text

Stores the request body as the folder's text content under the request's `Content-Language`. Other languages already present on the folder are preserved. Uses optimistic concurrency: the supplied revision must match the folder's current revision.

The markdown body (GFM plus `::media`/`::gallery` embed directives) is scanned for references to other folders and media items (`media:`/`media-path:`/`folder:`/`folder-path:`). Every reference found is persisted — resolved, missing, or malformed alike (keyed by repository, folder, and language; the previous set for that language is cleared and replaced) — so it can be queried later via `GET …/text/media`; references that do not resolve to an existing folder/media item are still saved but reported in this response. See [folder_text.md](folder_text.md) for the reference forms, embed directives, and resolution rules.

#### Request body

The markdown text.

#### Request headers

- `Content-Type: text/markdown`
- `Content-Language` — language to store the body under (falls back to default when omitted)
- `Revision-Id: <current-revision>` (required)

#### Response body

```json
{
  "meta": { "revision": "<new-revision>" },
  "validation": {
    "unresolvedReferences": [
      { "type": "media", "reference": "media-path:./missing.jpg", "status": "missing", "addressKind": "by-path" },
      { "type": "folder", "reference": "folder-path:../nope", "status": "missing", "addressKind": "by-path" }
    ]
  }
}
```

`unresolvedReferences` is empty when every reference resolved. Each entry's `type` is `media` (for `media:`/`media-path:`) or `folder` (for `folder:`/`folder-path:`), `reference` is the original `scheme:target` text, `status` is `missing` (well-formed, no such target) or `malformed` (bad UUID, or a path escaping the repository root), and `addressKind` is `by-id` or `by-path`.

#### Response headers

- `Content-Type: application/json`
- `Revision-Id: <new-revision>` — the folder's revision after the update

#### Responses

- `200 OK` — body stored; validation result returned
- `400 Bad Request` — missing or unparseable `Revision-Id`
- `403 Forbidden` — caller lacks write permission
- `404 Not Found`
- `409 Conflict` — revision mismatch

---

### GET /folders/{repoId}/{folderVar}/text/media

Returns every reference recorded from the folder's text body / associated object data, in the language negotiated
from `Accept-Language`, re-resolved against current repository state (see [folder_text.md](folder_text.md)). A
resolved by-id reference trusts its stored target directly; anything else (by-path, or a by-id reference that was
missing/malformed when last saved) is re-resolved live, so a folder move, rename, or later-created target is
reflected without re-saving the document.

Requires `Accept-Language` to select the right language version of the text. Supports conditional `GET` via
`If-None-Match`/`ETag`, where the `ETag` is correlated with the folder's revision.

#### Response body

```json
{
  "meta": { "revision": "UUID" },
  "records": [
    {
      "url": "folder-path:../My album",
      "sourceLocation": "text",
      "targetKind": "folder",
      "targetId": "e377a8e3-48d0-48ae-848a-58a52e8cf194",
      "addressKind": "by-path",
      "status": "resolved"
    },
    {
      "url": "media:550e8400-e29b-41d4-a716-446655440000",
      "sourceLocation": "text",
      "targetKind": "media",
      "targetId": "550e8400-e29b-41d4-a716-446655440000",
      "addressKind": "by-id",
      "status": "resolved"
    }
  ],
  "related": {
    "folders": [ /* folder resource for e377a8e3-48d0-48ae-848a-58a52e8cf194 */ ],
    "mediaItems": [ /* media item resource for 550e8400-e29b-41d4-a716-446655440000 */ ]
  }
}
```

`status` reflects whether the target exists, independent of read permissions. A resolved target is included under
`related` only when the caller can read it — its row still reports `status: "resolved"` in `records` either way.

#### Responses

- `200 OK`
- `304 Not Modified` — `If-None-Match` matches the folder's current revision
- `403 Forbidden` — caller lacks read permission on the folder
- `404 Not Found`

---

### GET /folders/{repoId}/{folderVar}/permissions

Lists the folder's **effective** permissions: explicit grants stored on the folder itself plus grants inherited from
its ancestors. There is one record per (principal, permission) pair, taken from the nearest folder that grants it (the
folder itself wins over an ancestor).

#### Response body

```json
{
  "meta": {},
  "records": [
    { "data": { "principal": { "type": "user", "email": "user@example.com" }, "folder": "<folder-uuid>", "permission": "read" } }
  ],
  "related": { "folder": [ { "meta": …, "data": …, "links": … } ] }
}
```

- `folder` is the ID of the folder the grant is stored on — this folder for a direct grant, an ancestor for an
  inherited one. The folder's direct grants are exactly the records whose `folder` equals the folder's own ID.
- Records carry no `effect` field; every record is a grant. (`effect` exists only in `PATCH` requests.)
- Repository roles (owner/editor) are not listed here.
- A link principal is returned as `{ "type": "link", "id": "<principal-uuid>" }` and carries no secret.

#### Responses

- `200 OK`
- `404 Not Found`

---

### PATCH /folders/{repoId}/{folderVar}/permissions

Adds, removes, or modifies folder permissions.

A **principal** is one of:

| Form | Meaning |
| --- | --- |
| `{ "type": "user", "email": "user@example.com" }` | A registered user, by email |
| `{ "type": "anonymous" }` | Any unauthenticated caller |
| `{ "type": "link", "id": "<principal-uuid>" }` | A shared-link principal |

Valid `permission` values: `view`, `read`, `write`, `publish`, `share`.
Valid `effect` values: `grant` (add the permission on this folder; a no-op if it is already granted here) or
`default` (remove the explicit grant stored on this folder, if any; a grant inherited from an ancestor still applies).

#### Request body

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

#### Responses

- `204 No Content`
- `404 Not Found`

---

### GET /folders/{repoId}/{folderVar}/media

Lists the folder's direct media-item membership — the set of media items linked into the folder under their stored filenames. Media items reachable only via descendant folders are not included. Results are returned in the folder's custom order (see `PATCH .../media`'s `move` op below) — a newly linked item is appended to the end of that order.

#### Response body

```json
[
  { "id": "<media-item-uuid>", "filename": "first.JPG" },
  { "id": "<media-item-uuid>", "filename": "second.JPG" }
]
```

#### Responses

- `200 OK` — JSON array of membership entries
- `403 Forbidden` — caller lacks read permission on the folder
- `404 Not Found`

---

### POST /folders/{repoId}/{folderVar}/media;query

Queries the folder's direct media-item membership — the set of media items linked into the folder under their stored filenames.

#### Request body

```json5
{ 
  "query": {
    /* Optional offset for paging. */
    "offset": 0,
    /* Optional limit for paging. */
    "limit": 20,
    /* Optional wildcard to filter filenames on. */
    "filename": "*.jpg",
    /**
      Specifies the ordering of the results. Defaults to `{"property": "custom", "order": "ascending"}` — the
      folder's persisted custom order — when omitted.
      Possible values for "property":
      - "filename"
      - "creationTime"
      - "captureTime" — the item's effective capture time, once metadata extraction has populated it (see
        `docs/media_metadata.md`); items with no extracted capture time sort last regardless of "order"
      - "custom" — the folder's persisted, user-arrangeable order (see `PATCH .../media`'s `move` op)
      Possible values for "order":
      - "ascending" (or "asc")
      - "descending" (or "desc")
    */
    "orderBy": {
      "property": "custom",
      "order": "ascending"
    }
  }
}
```

#### Response body

The response includes a list of media items directly associated with the folder in the "records" property. The media item resources for the listed media items are included under "related" / "mediaitem".

```json
{
  "meta": {},
  "records": [
    {
      "data": { "id": "<media-item-uuid>", "filename": "first.JPG" },
      ...
    }
  ],
  "related": {
    "mediaitem": [
      {
        "meta": { "revision": "…" },
        "data": { "id": "…", "type": "image", "visibility": "private", "originalHash": "<sha256-hex>" },
        "links": { ... }
      },
      ...
    ]
  }
}
```

#### Responses

- `200 OK`
- `403 Forbidden` — caller lacks read permission on the folder
- `404 Not Found`

---

### PUT /folders/{repoId}/{folderVar}/media

Replaces the folder's direct media-item membership with exactly the supplied list. All existing direct links are removed and the new ones are added atomically (inside a single transaction). A media item may appear under several different filenames; duplicate filenames within the list are rejected with 409. The supplied array's order becomes the folder's new custom order.

#### Request body

```json
[
  { "id": "<media-item-uuid>", "filename": "first.JPG" },
  { "id": "<media-item-uuid>", "filename": "second.JPG" }
]
```

#### Responses

- `204 No Content`
- `403 Forbidden` — caller lacks write permission on the folder
- `404 Not Found`
- `409 Conflict` — duplicate filename in the list

---

### PATCH /folders/{repoId}/{folderVar}/media

Applies an ordered list of patches to the folder's direct media-item membership in a single transaction. Returns the resulting membership.

Patches are applied strictly in array order, each one seeing the result of the previous ones, so a `move` may name,
in `afterFilename`, an entry added earlier in the same list, and a `remove` followed by an `add` may relink a filename
to a different media item. Filenames are compared exactly (case-sensitive): `IMG.jpg` and `img.jpg` are different
entries.

Each patch is one of:

| Form | Effect |
| --- | --- |
| `{ "op": "add", "id": "<uuid>", "filename": "<name>" }` | Link the media item under the given filename, appended to the end of the folder's custom order. The same media item may be linked under several different filenames. |
| `{ "op": "remove", "filename": "<name>" }` | Unlink whichever media item is linked under that filename. No-op if no such link. |
| `{ "op": "move", "filename": "<name>", "afterFilename": "<name>" \| null }` | Repositions the link within the folder's custom order: moves it to immediately after whichever item is linked under `afterFilename`, or to the very front of the order when `afterFilename` is `null`/omitted. |

#### Request body

```json
[
  { "op": "add", "id": "<media-item-uuid>", "filename": "third.JPG" },
  { "op": "remove", "filename": "second.JPG" },
  { "op": "move", "filename": "first.JPG", "afterFilename": "third.JPG" }
]
```

#### Responses

- `200 OK` — JSON array of the resulting membership (same shape as the GET response), in the folder's custom order
- `400 Bad Request` — invalid patch op, malformed `remove`, or a `move` whose `afterFilename` equals `filename`
- `403 Forbidden` — caller lacks write permission on the folder
- `404 Not Found` — the folder, or (for an `add`) the media item, or (for a `move`) `filename`/`afterFilename` does not
  resolve to a link in the folder
- `409 Conflict` — an `add` would create a duplicate filename

---

## Media Items

Media items are files (images or videos) stored in S3. Supported image inputs include common camera raw formats
(Canon CR2/CR3, Nikon NEF, Sony ARW, Adobe DNG, Panasonic RAW/RW2, Olympus ORF) alongside JPEG/PNG/WebP — raw files
are decoded server-side into the normal `image:variant:*` family, so a raw upload looks identical to a JPEG upload
from the API's point of view once processing completes; see `docs/raw_image_support_plan.md`.

They can be accessed in two ways:

- via folder and filename: e.g. `/media/{repoId}/{folderVar}/{filename}`
- via media item id: e.g. `/media/{repoId}/mid;{mediaItemId}`

Folder addressing uses the same `{folderVar}` format as the Folder API. To access the media item, the user must have "read" permission to the specified folder.

Items can also be addressed by stable ID using the `mid;<uuid>` prefix. To access the media item, the user must have "read" permission to any folder containing the media item, or a "view" or "read" permission to a published folder with that media item.

A video item itself is served **exclusively** through the `.../hls/*` endpoints below — the `?size=` query parameter
documented under the folder+filename `GET` (and its `mid;`-addressed twin) applies only to that item route, and only
for images; on a video item it falls through to the (image-only) primary-variant lookup and fails, since video no
longer exposes a direct-file variant scheme for the video stream itself (see `docs/video_transcoding_plan.md`). The
`.../poster` sub-resource is the one exception: it's an image (the extracted frame) regardless of the parent item's
media type, so it keeps `?size=` semantics identical to the main image `GET` — see the `.../poster` endpoint below.

### PUT /media/{repoId}/{folderVar}/{filename}

Uploads a media item. The body is the raw binary. `Content-Type` must be `image/*` or `video/*`.

#### Responses

- `204 No Content` — `Media-Item-Id: <uuid>` header set
- `403 Forbidden` — insufficient permission
- `409 Conflict` — filename already exists in folder
- `415 Unsupported Media Type`

---

### GET /media/{repoId}/{folderVar}/{filename}

Downloads the original binary. Supports conditional GET via `If-None-Match` / ETag.

#### Query parameters

- `size` (optional) — variant name (e.g. `thumbnail`, `medium`) to download a scaled version instead

#### Responses

- `200 OK` — binary stream with `Content-Type`, `Content-Length`, `ETag`
- `304 Not Modified` — ETag matches
- `404 Not Found` (`urn:bootstrap:error:media-item-not-found`) — no such item, or `size` isn't a variant this image
  has (not a configured `images.sizes` name, or the image already fits within that size)
- `404 Not Found` (`urn:bootstrap:error:media-variant-not-ready`) — `size` was requested but the image hasn't been
  processed yet (its `image_transform` job is pending, e.g. a camera raw file awaiting decode); retry later

---

### GET /media/{repoId}/{folderVar}/{filename}/metadata

Returns metadata and HAL-style links to all available variants for a media item.

#### Query parameters

- `fields` (optional) — comma-separated field selector. Selects among `type`, `visibility`, `originalHash`, and
  `metadata` (`id` is always included). Defaults to every field **except** `metadata`: populating `metadata` requires
  an extra DB lookup of the item's extracted facts (see `docs/media_metadata.md`), so it is opt-in via
  `?fields=metadata` (or `?fields=type,visibility,originalHash,metadata` to get it alongside the defaults) rather than
  returned unconditionally. This selector applies to every endpoint below that returns a media-item resource,
  including the `action;list` collection endpoint and the folder `media;query` endpoint's `related.mediaitem`
  entries (there, selected via the JSON body's `fields`, like `POST /repos;query`).

Each image-variant link carries the variant's `rel`, `href`, and rendered `width`/`height`. The primary variant link (`image:variant:primary`) additionally carries a `hash` field — the lowercase hex SHA-256 of the primary blob's file. The `hash` field is present only on the primary variant; scaled variants omit it.

The `data` object's `originalHash` field is the lowercase hex SHA-256 of the item's **original** blob (the uploaded source). This is distinct from the primary variant link's `hash`, which is the hash of the rendered primary blob (the derivation master, which may differ from the original).

`data.metadata` carries the item's effective common properties extracted from embedded metadata (see
`docs/media_metadata.md`): `captureTime` (the only property this API makes sortable), `dimensions`
(`width`/`height`, taken from the orientation-corrected display size when known, plus the raw EXIF `orientation`
code 1–8), `camera` (`make`/`model`/`lens`), `format` (`name`/`mimetype` as detected by the extractor), and, for
video, `durationMs`. Each group is present only once at least one of its fields is known — a group with nothing
extracted is omitted entirely, not returned with null values, and the field is absent entirely until metadata
extraction has populated anything at all. A timezone-missing capture time stays visibly incomplete
(`offset`/`instant` absent) rather than being masked by a fabricated UTC offset. GPS/location is not exposed here —
the extraction pipeline does not currently parse it (see `docs/media_metadata.md`).

#### Response body

```json
{
  "meta": { "revision": "…" },
  "data": {
    "id": "…", "type": "image", "visibility": "private", "originalHash": "<sha256-hex>",
    "metadata": {
      "captureTime": {
        "local": "2026-08-23T17:42:11.384",
        "offset": "+02:00",
        "instant": "2026-08-23T15:42:11.384Z",
        "date": "2026-08-23",
        "precision": "millisecond",
        "quality": "embedded"
      },
      "dimensions": { "width": 6048, "height": 4024, "orientation": 1 },
      "camera": { "make": "Nikon", "model": "Z 8", "lens": "NIKKOR Z 24-70mm f/2.8 S" },
      "format": { "name": "JPEG", "mimetype": "image/jpeg" }
    }
  },
  "links": {
    "self": { "rel": "self", "href": "…/metadata" },
    "image:variant:primary": {
      "rel": "image:variant:primary",
      "href": "…",
      "width": 1920,
      "height": 1080,
      "hash": "<sha256-hex>"
    },
    "image:variant:thumbnail": {
      "rel": "image:variant:thumbnail",
      "href": "…?size=thumbnail",
      "width": 320,
      "height": 240
    }
  }
}
```

A media item exposes either the `image:variant:*` family (`data.type == "image"`) or the combined `video:hls:*` /
`video:poster` / `video:poster:variant:*` family (`data.type == "video"`), never both. A video item no longer exposes
any directly-downloadable per-resolution file for the video stream itself — every rendition is reached through a
playlist — but the poster keeps per-resolution links exactly like an image does, since it *is* one:

```json
{
  "meta": { "revision": "…" },
  "data": {
    "id": "…", "type": "video", "visibility": "private", "originalHash": "<sha256-hex>",
    "metadata": {
      "captureTime": { "local": "2026-08-23T17:42:11", "precision": "second", "quality": "timezone_missing" },
      "dimensions": { "width": 1920, "height": 1080 },
      "durationMs": 125500
    }
  },
  "links": {
    "self": { "rel": "self", "href": "…/metadata" },
    "video:hls:master": { "rel": "video:hls:master", "href": "…/hls/master.m3u8" },
    "video:hls:variant:hd": {
      "rel": "video:hls:variant:hd",
      "href": "…/hls/hd/playlist.m3u8",
      "width": 1280,
      "height": 720,
      "bitrateKbps": 2500
    },
    "video:poster": { "rel": "video:poster", "href": "…/poster" },
    "video:poster:variant:hd": {
      "rel": "video:poster:variant:hd",
      "href": "…/poster?size=hd",
      "width": 1280,
      "height": 720
    }
  }
}
```

`video:hls:master` has no `width`/`height` — a master playlist has no single resolution. `video:poster:variant:*`
lists one entry per configured `images.sizes` name the poster is larger than, exactly like `image:variant:*` does for
a photo — the link is advertised whether or not that size has been requested yet, and `GET`-ing its `href` is what
lazily creates and caches the underlying scaled poster row. `POST /media/{repoId}/action;list` response records
follow the same split.

#### Responses

- `200 OK`
- `404 Not Found`

---

### GET /media/{repoId}/{folderVar}/{filename}/poster

Downloads the WebP poster frame for a video media item — the extracted, resized thumbnail frame described in
`docs/video_transcoding_plan.md` §7a. Unlike the main item route, this sub-resource keeps `?size=` semantics
identical to the main image `GET`, since the poster is itself an image regardless of the parent item's media type.

#### Query parameters

- `size` (optional) — variant name (e.g. `hd`, `sm`) to download a scaled version instead. Omitted, the poster is
  returned at its stored (largest-`images.sizes`-capped) dimensions; with `?size=` it returns that scaled variant,
  generated on first request and cached like any image variant.

#### Responses

- `200 OK` — binary stream, `Content-Type: image/webp`
- `403 Forbidden` — caller lacks read permission on the item's folder
- `404 Not Found` — not a video item, transcoding hasn't produced a poster yet, or `size` isn't a configured
  `images.sizes` name

---

### GET /media/{repoId}/{folderVar}/{filename}/hls/master.m3u8

Downloads the HLS master playlist tying together every produced rendition.

#### Responses

- `200 OK` — `Content-Type: application/vnd.apple.mpegurl`
- `403 Forbidden`
- `404 Not Found` — not a video item, or transcoding hasn't completed yet

---

### GET /media/{repoId}/{folderVar}/{filename}/hls/{rendition}/playlist.m3u8

Downloads one rendition's variant playlist (e.g. `rendition = hd`).

#### Responses

- `200 OK` — `Content-Type: application/vnd.apple.mpegurl`
- `403 Forbidden`
- `404 Not Found` — not a video item, or `rendition` isn't a produced size

---

### GET /media/{repoId}/{folderVar}/{filename}/hls/{rendition}/{segment}

Downloads one `.ts` segment of a rendition (e.g. `segment = seg_00000.ts`). `segment` is validated against the strict
`seg_%05d.ts` pattern ffmpeg itself produces, then checked against the rendition's actual segment inventory, before
any S3 key is derived from it — see `docs/video_transcoding_plan.md` §12 for the full rationale.

#### Responses

- `200 OK` — `Content-Type: video/mp2t`
- `403 Forbidden`
- `404 Not Found` — not a video item, or `rendition` isn't a produced size
- `400 Bad Request` — `segment` doesn't match one of the rendition's actual segment filenames

---

Each of the four endpoints above has a `mid;{mediaItemId}`-addressed twin, following the same pattern as every other
by-id endpoint (e.g. `GET /media/{repoId}/mid;{mediaItemId}/hls/master.m3u8`).

---

### PUT /media/{repoId}/mid;{mediaItemId}

Uploads a media item. The body is the raw binary. `Content-Type` must be `image/*` or `video/*`.

If a media item with the given ID already exists, but the raw binary does not correspond to the original BLOB for that existing media item, then 409 Conflict is returned.

The user must be a repository owner or editor to perform this action.

The same endpoint also accepts an **upload claim**: the client sends only the file's SHA-256, and if the server
already holds that file (uploaded by anyone, into any repository) the client proves it has the file by answering a
challenge, and the item is created without transferring the bytes. See "Upload claims" below.

#### Request headers

- `Repr-Digest: sha-256=:<base64>:` (optional, [RFC 9530](https://www.rfc-editor.org/rfc/rfc9530)) — the SHA-256 of
  the whole file. On a full upload, the server checks it against the received bytes and rejects a mismatch with `400`
  (`urn:bootstrap:error:digest-mismatch`) without recording anything. Other digest algorithms in the header are
  ignored.
- `Possession-Proof: challenge="<token>", response="<hex>"` — only on an upload claim; see below.

#### Request body

The raw binary data of the media item, or empty (`Content-Length: 0`) for an upload claim.

#### Responses

- `204 No Content` - the media item was created successfully; `Media-Item-Id: <uuid>` header set
- `400 Bad Request` — `Repr-Digest` doesn't match the body (`urn:bootstrap:error:digest-mismatch`), or a malformed
  `Repr-Digest`/`Possession-Proof` header
- `403 Forbidden` — insufficient permission, or an invalid possession proof
- `409 Conflict` — media item already exists
- `415 Unsupported Media Type`
- `422 Unprocessable Entity` — upload claim for a file the server can't accept a claim for; upload it in full
- `428 Precondition Required` — upload claim accepted; the body carries a challenge

#### Upload claims

1. **Claim.** Send the `PUT` with `Content-Length: 0` and a `Repr-Digest` carrying `sha-256`. `Content-Type` is not
   needed; the media type comes from the stored file.
   - If an item with this ID already exists, the response is `204` when its original has this SHA-256 and `409`
     otherwise. No proof is needed.
   - If the server can't accept a claim for this hash, the response is `422` with
     `urn:bootstrap:error:upload-required`. Repeat the request with the full body. This happens when the hash is
     unknown, but also for some files the server does hold (for example ones uploaded before upload claims existed),
     and the response doesn't say which.
   - Otherwise the response is `428` with a challenge:

     ```json
     {
       "type": "urn:bootstrap:error:possession-proof-required",
       "status": 428,
       "title": "Possession Proof Required",
       "detail": "Answer the challenge to prove possession of the file, or upload it in full",
       "instance": null,
       "challenge": "<opaque token>",
       "nonce": "<hex>",
       "chunkSize": 1048576,
       "chunks": [3, 17, 402, 3051],
       "expiresAt": "2026-09-29T12:05:00Z"
     }
     ```

2. **Prove.** Split the file into `chunkSize`-byte chunks (the last may be shorter), numbered from 0. Compute

   ```text
   response = hex( HMAC-SHA256( key = hex-decode(nonce), data = SHA-256(chunk[c1]) ‖ SHA-256(chunk[c2]) ‖ … ) )
   ```

   over the listed `chunks`, in the order given, and repeat the claim `PUT` (still `Content-Length: 0` and the same
   `Repr-Digest`) with `Possession-Proof: challenge="<token>", response="<hex>"`. `challenge` is the token exactly as
   received. Treat it as opaque.
   - `204` + `Media-Item-Id`: the item was created from the stored file. Nothing is reprocessed.
   - `403` (`urn:bootstrap:error:possession-proof-invalid`): wrong response, or the challenge expired or was issued
     for a different user, repository, item ID, or file. Claim again, or upload in full.

A challenge is valid for a few minutes (`upload_claims.challenge_ttl_seconds`) and only for the same user,
repository, item ID and file. Sending `Possession-Proof` with a non-empty body is a `400`.

---

### GET /media/{repoId}/mid;{mediaItemId}

Downloads the original binary by stable media item ID. Supports `?size=<variant>` and conditional GET.

#### Responses — same as the folder+filename variant above

---

### GET /media/{repoId}/mid;{mediaItemId}/metadata

Returns metadata by stable media item ID.

#### Responses — same as the folder+filename variant above

---

### GET /media/{repoId}/sha256;{mediaItemHash}/metadata

Returns metadata of a media item by finding it using the SHA-256 hash of the associated blob(s).

#### Responses — same as the folder+filename variant above

---

### POST /media/{repoId}/action;list

Lists media items in a folder.

#### Request body

```json
{
  "folder": { "path": "/albums/vacation" },
  "mediaType": "image",
  "visibility": "private",
  "offset": 0,
  "limit": 20,
  "orderBy": {
    "property": "creationTime",
    "order": "ascending"
  }
}
```

All fields except `folder` are optional. `orderBy.property` accepts `"creationTime"` (default) or `"captureTime"` —
the item's effective capture time, once metadata extraction has populated it (see `docs/media_metadata.md`); items
with no extracted capture time sort last regardless of `order`. `orderBy.order` accepts `"ascending"`/`"asc"` or
`"descending"`/`"desc"`. When `orderBy` is omitted, items are sorted by `creationTime`, descending.

`offset` is either a number of items to skip (`0`, shorthand for `{ "index": 0 }`), or
`{ "after": "<media-item-uuid>" }` to continue after that item (keyset pagination). The response's `meta.offset`
echoes it in object form.

#### Response body

```json
{
  "meta": {
    "offset": null,
    "limit": 30
  },
  "records": [
    {
      "meta": {},
      "data": {
          "id": "fe181a56-2e8a-4690-98d4-864a5b87645e",
          "type": "image",
          "visibility": "normal",
          "originalHash": "<sha256-hex>"
      },
      "links": {
          "image:variant:hd": {
              "rel": "image:variant:hd",
              "href": "...",
              "width": 1280,
              "height": 720
          },
          ...
          "self": {
              "rel": "self",
              "href": "..."
          }
      }
    },
    ...
  ]
}
```

#### Responses

- `200 OK` — array of media records with metadata and variant links
- `403 Forbidden` — caller lacks read permission on the folder
- `404 Not Found` — folder not found
- `422 Unprocessable Entity` — folder path not found
