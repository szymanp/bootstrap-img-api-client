import { describe, expect, it } from 'vitest';
import {
  ApiError,
  BootstrapClient,
  ErrorType,
  isApiError,
  MemoryCookieStore,
  type RevisionConflictProblem,
  type ValidationFailedProblem,
} from '../../src/index';
import { MockFetch } from './mock-fetch';
import { serviceRootFixture } from './service-root.fixture';

function makeClient(mock: MockFetch, credentials = new MemoryCookieStore()) {
  return new BootstrapClient({
    baseUrl: 'http://localhost:8080',
    defaultLanguage: 'en-US',
    fetch: mock.fetch,
    credentials,
    // Seed the service root so resource APIs resolve URLs without a lazy GET /.
    serviceRoot: serviceRootFixture,
  });
}

describe('service-root link resolution', () => {
  it('lazily fetches GET / once on first use, then reuses it', async () => {
    const mock = new MockFetch().enqueue(
      { status: 200, json: serviceRootFixture },
      { status: 200, json: { meta: {}, records: [] } },
      { status: 200, json: { meta: {}, records: [] } },
    );
    // No seeded serviceRoot here, so the first call must resolve links over the wire.
    const client = new BootstrapClient({ baseUrl: 'http://localhost:8080', fetch: mock.fetch });

    await client.repos.query();
    await client.repos.query();

    const roots = mock.requests.filter((r) => new URL(r.url).pathname === '/');
    expect(roots).toHaveLength(1);
    expect(roots[0]?.method).toBe('GET');
    expect(mock.requests.map((r) => new URL(r.url).pathname)).toEqual(['/', '/repos;query', '/repos;query']);
  });
});

describe('auth', () => {
  it('sends a token request and parses the test-user token', async () => {
    const mock = new MockFetch().enqueue({ status: 200, json: { token: 'tok-123' } });
    const client = makeClient(mock);

    const result = await client.auth.sendToken('test@example.com');
    expect(result.token).toBe('tok-123');
    expect(mock.last.url).toBe('http://localhost:8080/auth/action;send-token');
    expect(mock.last.method).toBe('POST');
    expect(JSON.parse(mock.last.body!)).toEqual({ email: 'test@example.com' });
  });

  it('returns {} for a real-user 204', async () => {
    const mock = new MockFetch().enqueue({ status: 204 });
    const client = makeClient(mock);
    expect(await client.auth.sendToken('real@example.com')).toEqual({});
  });

  it('logs in with the X-Token header and captures the cookie', async () => {
    const mock = new MockFetch().enqueue({
      status: 204,
      headers: { 'set-cookie': 'session=opaque; Path=/' },
    });
    const credentials = new MemoryCookieStore();
    const client = makeClient(mock, credentials);

    await client.auth.login('test@example.com', 'tok-123');
    expect(mock.last.headers.get('authorization')).toBe('X-Token test@example.com:tok-123');

    const headers = new Headers();
    credentials.decorate(headers);
    expect(headers.get('cookie')).toBe('session=opaque');
  });

  it('replays the captured cookie on later requests', async () => {
    const mock = new MockFetch().enqueue(
      { status: 204, headers: { 'set-cookie': 'session=opaque; Path=/' } },
      { status: 200, json: { principal: 'p', email: 'test@example.com', createdAt: '', expiresAt: '' } },
    );
    const client = makeClient(mock);

    await client.auth.login('test@example.com', 'tok');
    await client.auth.session();
    expect(mock.last.headers.get('cookie')).toBe('session=opaque');
  });
});

describe('repositories', () => {
  it('creates with default Accept-Language and Content-Language', async () => {
    const mock = new MockFetch().enqueue({
      status: 200,
      json: { meta: { revision: 'r1' }, data: { id: 'id1', name: 'demo' }, links: {} },
    });
    const client = makeClient(mock);

    const repo = await client.repos.create({ name: 'demo', title: 'Demo' });
    expect(repo.data.id).toBe('id1');
    expect(mock.last.url).toBe('http://localhost:8080/repos');
    expect(mock.last.headers.get('accept-language')).toBe('en-US');
    expect(mock.last.headers.get('content-language')).toBe('en-US');
    expect(JSON.parse(mock.last.body!)).toMatchObject({ data: { name: 'demo', title: 'Demo' } });
  });

  it('passes fields and representation as query params on get', async () => {
    const mock = new MockFetch().enqueue({
      status: 200,
      json: { meta: {}, data: { id: 'id1' } },
    });
    const client = makeClient(mock);

    await client.repos.get('id1', { fields: ['name', 'title'], representation: 'original' });
    const url = new URL(mock.last.url);
    expect(url.pathname).toBe('/repos/id1');
    expect(url.searchParams.get('fields')).toBe('name,title');
    expect(url.searchParams.get('representation')).toBe('original');
  });

  it('sends revision in the body on update', async () => {
    const mock = new MockFetch().enqueue({
      status: 200,
      json: { meta: { revision: 'r2' }, data: { id: 'id1' } },
    });
    const client = makeClient(mock);

    await client.repos.update('id1', 'r1', { title: 'New' });
    expect(JSON.parse(mock.last.body!)).toMatchObject({
      meta: { revision: 'r1' },
      data: { title: 'New' },
    });
  });

  it('throws a typed ApiError on revision conflict', async () => {
    const mock = new MockFetch().enqueue({
      status: 409,
      headers: { 'content-type': 'application/problem+json' },
      body: JSON.stringify({
        type: ErrorType.RevisionConflict,
        status: 409,
        title: 'Revision Conflict',
      }),
    });
    const client = makeClient(mock);

    await expect(client.repos.delete('id1', 'stale')).rejects.toThrowError(ApiError);
  });

  it('exposes the problem type via isApiError', async () => {
    const mock = new MockFetch().enqueue({
      status: 409,
      headers: { 'content-type': 'application/problem+json' },
      body: JSON.stringify({ type: ErrorType.RepositoryNameConflict, status: 409 }),
    });
    const client = makeClient(mock);

    const err = await client.repos.create({ name: 'dup', title: 'x' }).catch((e) => e);
    expect(isApiError(err, ErrorType.RepositoryNameConflict)).toBe(true);
    expect(err.status).toBe(409);
  });

  it('looks up a repository by name via the /repos collection path', async () => {
    const mock = new MockFetch().enqueue({
      status: 200,
      json: { meta: {}, data: { id: 'id1', name: 'my-repo' } },
    });
    const client = makeClient(mock);

    await client.repos.getByName('my-repo', { org: 'acme' });
    const url = new URL(mock.last.url);
    expect(mock.last.method).toBe('GET');
    expect(url.pathname).toBe('/repos');
    expect(url.searchParams.get('org')).toBe('acme');
    expect(url.searchParams.get('name')).toBe('my-repo');
  });

  it('pages through the audit log', async () => {
    const mock = new MockFetch().enqueue({
      status: 200,
      json: {
        meta: { offset: 0, limit: 20 },
        records: [
          {
            data: {
              id: 42,
              principalId: null,
              timestamp: '2026-01-01T00:00:00Z',
              description: { type: 'repository_renamed', data: { oldName: 'old', newName: 'new' } },
            },
          },
        ],
      },
    });
    const client = makeClient(mock);

    const result = await client.repos.getChangelog('id1', { offset: 20, limit: 10 });
    const url = new URL(mock.last.url);
    expect(mock.last.method).toBe('GET');
    expect(url.pathname).toBe('/repos/id1/changelog');
    expect(url.searchParams.get('offset')).toBe('20');
    expect(url.searchParams.get('limit')).toBe('10');
    expect(result.records[0]?.data.principalId).toBeNull();
    expect(result.records[0]?.data.description.type).toBe('repository_renamed');
  });

  it('starts a metadata snapshot and parses the 202 body', async () => {
    const mock = new MockFetch().enqueue({
      status: 202,
      headers: { location: '/repos/id1/metadata-snapshots/snap-1' },
      json: { meta: { snapshot: 'snap-1', createdAt: '2026-09-20T10:00:00Z' } },
    });
    const client = makeClient(mock);

    const result = await client.repos.createMetadataSnapshot('id1', {
      formatVersion: 1,
      scope: { roots: ['/albums'], include: ['repository', 'folder-data'] },
    });
    expect(mock.last.method).toBe('POST');
    expect(mock.last.url).toBe('http://localhost:8080/repos/id1/metadata-snapshots');
    expect(JSON.parse(mock.last.body!)).toEqual({
      formatVersion: 1,
      scope: { roots: ['/albums'], include: ['repository', 'folder-data'] },
    });
    expect(result).toEqual({ snapshotId: 'snap-1', createdAt: '2026-09-20T10:00:00Z' });
  });

  it('reports a building snapshot as 204 without parsing a body', async () => {
    const mock = new MockFetch().enqueue({ status: 204 });
    const client = makeClient(mock);

    const result = await client.repos.getMetadataSnapshot('id1', 'snap-1', { wait: 5 });
    const url = new URL(mock.last.url);
    expect(url.pathname).toBe('/repos/id1/metadata-snapshots/snap-1');
    expect(url.searchParams.get('wait')).toBe('5');
    expect(result).toEqual({ status: 'building' });
  });

  it('reads a ready snapshot page, including repository/folder/media-item records', async () => {
    const mock = new MockFetch().enqueue({
      status: 200,
      json: {
        meta: {
          snapshot: 'snap-1',
          repositoryVersion: 42,
          scopeHash: 'abc',
          formatVersion: 1,
          createdAt: '2026-09-20T10:00:00Z',
          limit: 100,
          offset: 0,
        },
        records: [
          {
            type: 'repository',
            revision: 'rev-repo',
            value: { name: 'demo', title: 'Demo', owners: [], editors: [] },
          },
          {
            type: 'folder',
            id: 'folder-uuid',
            revision: 'rev-folder',
            parent: { path: '/albums' },
            name: 'narty',
            data: { type: 'album', title: { 'en-us': 'Skiing' } },
            texts: { 'en-us': 'body' },
            permissions: [],
            media: [],
          },
          {
            type: 'media-item',
            id: 'media-uuid',
            value: { type: 'image', visibility: 'normal', originalHash: 'hash' },
          },
        ],
      },
    });
    const client = makeClient(mock);

    const result = await client.repos.getMetadataSnapshot('id1', 'snap-1');
    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.meta).toEqual({
        snapshotId: 'snap-1',
        repositoryVersion: 42,
        scopeHash: 'abc',
        formatVersion: 1,
        createdAt: '2026-09-20T10:00:00Z',
        limit: 100,
        offset: 0,
      });
      expect(result.records).toHaveLength(3);
      expect(result.records[0]).toMatchObject({ type: 'repository' });
      expect(result.records[1]).toMatchObject({ type: 'folder', id: 'folder-uuid' });
      expect(result.records[2]).toMatchObject({ type: 'media-item', id: 'media-uuid' });
    }
  });

  it('surfaces a failed snapshot build as a typed 410 ApiError', async () => {
    const mock = new MockFetch().enqueue({
      status: 410,
      headers: { 'content-type': 'application/problem+json' },
      body: JSON.stringify({
        type: ErrorType.MetadataSnapshotFailed,
        status: 410,
        detail: 'build failed: disk full',
      }),
    });
    const client = makeClient(mock);

    const err = await client.repos.getMetadataSnapshot('id1', 'snap-1').catch((e) => e);
    expect(isApiError(err, ErrorType.MetadataSnapshotFailed)).toBe(true);
    expect(err.problem.detail).toBe('build failed: disk full');
  });

  it('applies a metadata-sync plan with If-Match and Idempotency-Key headers', async () => {
    const mock = new MockFetch().enqueue({
      status: 200,
      headers: { etag: '"repository-metadata:43"' },
      json: {
        meta: {
          operation: '0be4aa18-ee30-4f99-9025-f5f19368bb30',
          previousRepositoryVersion: 42,
          repositoryVersion: 43,
        },
        data: { revisions: { repository: 'new-repository-revision-uuid' } },
      },
    });
    const client = makeClient(mock);

    const result = await client.repos.applyMetadataSync(
      'id1',
      42,
      '0be4aa18-ee30-4f99-9025-f5f19368bb30',
      {
        operations: [
          { op: 'repository.update', expectedRevision: 'old-repository-revision-uuid', name: 'piotrek' },
        ],
      },
    );

    expect(mock.last.method).toBe('POST');
    expect(mock.last.url).toBe('http://localhost:8080/repos/id1/metadata-sync');
    expect(mock.last.headers.get('if-match')).toBe('"repository-metadata:42"');
    expect(mock.last.headers.get('idempotency-key')).toBe('0be4aa18-ee30-4f99-9025-f5f19368bb30');
    expect(JSON.parse(mock.last.body!)).toEqual({
      meta: { formatVersion: 1 },
      operations: [{ op: 'repository.update', expectedRevision: 'old-repository-revision-uuid', name: 'piotrek' }],
    });
    expect(result).toEqual({
      operationId: '0be4aa18-ee30-4f99-9025-f5f19368bb30',
      previousRepositoryVersion: 42,
      repositoryVersion: 43,
      revisions: { repository: 'new-repository-revision-uuid' },
    });
  });

  it('surfaces a reused idempotency key as a typed 409 ApiError', async () => {
    const mock = new MockFetch().enqueue({
      status: 409,
      headers: { 'content-type': 'application/problem+json' },
      body: JSON.stringify({ type: ErrorType.IdempotencyKeyReused, status: 409 }),
    });
    const client = makeClient(mock);

    const err = await client.repos
      .applyMetadataSync('id1', 42, 'dup-key', { operations: [] })
      .catch((e) => e);
    expect(isApiError(err, ErrorType.IdempotencyKeyReused)).toBe(true);
  });

  it('sends folder.create content fields and bare-UUID folder.update/delete targets', async () => {
    const mock = new MockFetch().enqueue({
      status: 200,
      json: { meta: { operation: 'k', previousRepositoryVersion: 1, repositoryVersion: 2 }, data: { revisions: {} } },
    });
    const client = makeClient(mock);

    const operations = [
      {
        op: 'folder.create' as const,
        id: 'new-uuid',
        parent: { path: '/albums' },
        name: '2026',
        title: { 'en-us': '2026', 'pl-pl': '2026' },
        type: 'album' as const,
        data: {},
        texts: { 'en-us': 'Photos from 2026' },
        permissions: [{ principal: { type: 'anonymous' as const }, permission: 'view' as const, effect: 'grant' as const }],
        media: [{ op: 'add' as const, id: 'media-uuid', filename: 'first.jpg' }],
      },
      { op: 'folder.update' as const, folder: 'folder-uuid', expectedRevision: 'r1', changes: { name: 'x' } },
      { op: 'folder.delete' as const, folder: 'other-uuid', expectedRevision: 'r2' },
    ];
    await client.repos.applyMetadataSync('id1', 1, 'k', { operations });

    expect(JSON.parse(mock.last.body!)).toEqual({ meta: { formatVersion: 1 }, operations });
  });

  it('exposes metadata-sync problem extension members', async () => {
    const mock = new MockFetch()
      .enqueue({
        status: 409,
        headers: { 'content-type': 'application/problem+json' },
        body: JSON.stringify({
          type: ErrorType.RevisionConflict,
          status: 409,
          title: 'Resource Revision Conflict',
          reason: 'resource-revision-changed',
          conflicts: ['folder:f1'],
        }),
      })
      .enqueue({
        status: 422,
        headers: { 'content-type': 'application/problem+json' },
        body: JSON.stringify({
          type: ErrorType.ValidationFailed,
          status: 422,
          detail: 'operations[1,3]: duplicate folder.create body.id',
          errors: [{ operations: [1, 3], message: 'operations[1,3]: duplicate folder.create body.id' }],
        }),
      });
    const client = makeClient(mock);

    const conflict = await client.repos.applyMetadataSync('id1', 1, 'k1', { operations: [] }).catch((e) => e);
    expect(isApiError(conflict, ErrorType.RevisionConflict)).toBe(true);
    const cp = (conflict as ApiError).problem as RevisionConflictProblem;
    expect(cp.reason).toBe('resource-revision-changed');
    expect(cp.conflicts).toEqual(['folder:f1']);

    const invalid = await client.repos.applyMetadataSync('id1', 1, 'k2', { operations: [] }).catch((e) => e);
    expect(isApiError(invalid, ErrorType.ValidationFailed)).toBe(true);
    expect(((invalid as ApiError).problem as ValidationFailedProblem).errors?.[0]?.operations).toEqual([1, 3]);
  });
});

describe('folders', () => {
  it('addresses a folder by path with action;list', async () => {
    const mock = new MockFetch().enqueue({ status: 200, json: { meta: {}, records: [] } });
    const client = makeClient(mock);

    await client.folders('repo1').list({ path: '/albums' }, { limit: 5 });
    expect(mock.last.url).toBe('http://localhost:8080/folders/repo1/path;albums/action;list');
    expect(JSON.parse(mock.last.body!)).toEqual({ query: { limit: 5 } });
  });

  it('wraps permission records under data and sends PATCH', async () => {
    const mock = new MockFetch().enqueue({ status: 204 });
    const client = makeClient(mock);

    await client
      .folders('repo1')
      .patchPermissions(FolderById(), [
        { principal: { type: 'user', email: 'u@e.com' }, permission: 'read', effect: 'grant' },
      ]);
    expect(mock.last.method).toBe('PATCH');
    expect(JSON.parse(mock.last.body!)).toEqual({
      records: [{ data: { principal: { type: 'user', email: 'u@e.com' }, permission: 'read', effect: 'grant' } }],
    });
  });

  it('queries media membership with a wrapped query body and parses related media items', async () => {
    const mock = new MockFetch().enqueue({
      status: 200,
      json: {
        meta: {},
        records: [{ data: { id: 'm1', filename: 'first.JPG' } }],
        related: {
          mediaitem: [{ meta: { revision: 'r1' }, data: { id: 'm1', type: 'image', visibility: 'private' } }],
        },
      },
    });
    const client = makeClient(mock);

    const result = await client
      .folders('repo1')
      .queryMedia(
        { path: '/albums' },
        { limit: 20, filename: '*.jpg', orderBy: { property: 'filename', order: 'ascending' } },
      );

    expect(mock.last.method).toBe('POST');
    expect(mock.last.url).toBe('http://localhost:8080/folders/repo1/path;albums/media;query');
    expect(JSON.parse(mock.last.body!)).toEqual({
      query: { limit: 20, filename: '*.jpg', orderBy: { property: 'filename', order: 'ascending' } },
    });
    expect(result.records[0]?.data).toEqual({ id: 'm1', filename: 'first.JPG' });
    expect(result.related?.mediaitem?.[0]?.data.id).toBe('m1');
  });

  it('reads text with the Revision-Id and Content-Language headers', async () => {
    const mock = new MockFetch().enqueue({
      status: 200,
      body: '# Hello\n',
      headers: { 'content-type': 'text/markdown', 'revision-id': 'rev9', 'content-language': 'en-us' },
    });
    const client = makeClient(mock);

    const text = await client.folders('repo1').getText({ id: 'f1' });
    expect(text.text).toBe('# Hello\n');
    expect(text.revision).toBe('rev9');
    expect(text.contentLanguage).toBe('en-us');
  });

  it('writes text with a Revision-Id request header and returns the new revision and unresolved refs', async () => {
    const mock = new MockFetch().enqueue({
      status: 200,
      headers: { 'revision-id': 'rev10' },
      json: {
        meta: { revision: 'rev10' },
        validation: {
          unresolvedReferences: [
            { type: 'media', reference: 'media-path:./missing.jpg', status: 'missing', addressKind: 'by-path' },
            { type: 'folder', reference: 'folder-path:../nope', status: 'missing', addressKind: 'by-path' },
          ],
        },
      },
    });
    const client = makeClient(mock);

    const result = await client.folders('repo1').putText({ id: 'f1' }, '# Body', 'rev9');
    expect(mock.last.method).toBe('PUT');
    expect(mock.last.headers.get('revision-id')).toBe('rev9');
    expect(mock.last.headers.get('content-type')).toContain('text/markdown');
    expect(result.revision).toBe('rev10');
    expect(result.unresolvedReferences).toEqual([
      { type: 'media', reference: 'media-path:./missing.jpg', status: 'missing', addressKind: 'by-path' },
      { type: 'folder', reference: 'folder-path:../nope', status: 'missing', addressKind: 'by-path' },
    ]);
  });

  it('defaults unresolvedReferences to empty when validation is absent', async () => {
    const mock = new MockFetch().enqueue({
      status: 200,
      headers: { 'revision-id': 'rev10' },
      json: { meta: { revision: 'rev10' } },
    });
    const client = makeClient(mock);

    const result = await client.folders('repo1').putText({ id: 'f1' }, '# Body', 'rev9');
    expect(result.unresolvedReferences).toEqual([]);
  });

  it('reads recorded text-media references, including a 304 conditional GET', async () => {
    const mock = new MockFetch().enqueue(
      {
        status: 200,
        headers: { etag: '"rev7"' },
        json: {
          meta: { revision: 'rev7' },
          records: [
            {
              url: 'media:550e8400-e29b-41d4-a716-446655440000',
              sourceLocation: 'text',
              targetKind: 'media',
              targetId: '550e8400-e29b-41d4-a716-446655440000',
              addressKind: 'by-id',
              status: 'resolved',
            },
          ],
          related: { mediaItems: [{ meta: {}, data: { id: '550e8400-e29b-41d4-a716-446655440000' } }] },
        },
      },
      { status: 304, headers: { etag: '"rev7"' } },
    );
    const client = makeClient(mock);

    const result = await client.folders('repo1').getTextMedia({ path: 'albums/trip' }, { acceptLanguage: 'pl-PL' });
    expect(mock.last.method).toBe('GET');
    expect(mock.last.url).toBe('http://localhost:8080/folders/repo1/path;albums;trip/text/media');
    expect(mock.last.headers.get('accept-language')).toBe('pl-PL');
    expect(result.notModified).toBe(false);
    if (!result.notModified) {
      expect(result.result.records[0]?.targetKind).toBe('media');
      expect(result.etag).toBe('"rev7"');
    }

    const again = await client.folders('repo1').getTextMedia({ path: 'albums/trip' }, { ifNoneMatch: '"rev7"' });
    expect(mock.last.headers.get('if-none-match')).toBe('"rev7"');
    expect(again.notModified).toBe(true);
  });

  it('sends fields alongside the wrapped query body for media membership', async () => {
    const mock = new MockFetch().enqueue({ status: 200, json: { meta: {}, records: [] } });
    const client = makeClient(mock);

    await client.folders('repo1').queryMedia({ path: '/albums' }, { limit: 10, fields: ['type', 'metadata'] });
    expect(JSON.parse(mock.last.body!)).toEqual({
      query: { limit: 10 },
      fields: 'type,metadata',
    });
  });

  it('applies a move patch to reorder a folder media membership entry', async () => {
    const mock = new MockFetch().enqueue({
      status: 200,
      json: [
        { id: 'm2', filename: 'second.JPG' },
        { id: 'm1', filename: 'first.JPG' },
      ],
    });
    const client = makeClient(mock);

    const result = await client
      .folders('repo1')
      .patchMedia(FolderById(), [{ op: 'move', filename: 'first.JPG', afterFilename: 'second.JPG' }]);
    expect(mock.last.method).toBe('PATCH');
    expect(JSON.parse(mock.last.body!)).toEqual([
      { op: 'move', filename: 'first.JPG', afterFilename: 'second.JPG' },
    ]);
    expect(result[0]?.filename).toBe('second.JPG');
  });
});

describe('media', () => {
  it('uploads binary and returns the Media-Item-Id', async () => {
    const mock = new MockFetch().enqueue({ status: 204, headers: { 'media-item-id': 'm1' } });
    const client = makeClient(mock);

    const bytes = new Uint8Array([1, 2, 3]);
    const result = await client.media('repo1').uploadToFolder({ id: 'f1' }, 'a.JPG', bytes, 'image/jpeg');
    expect(mock.last.method).toBe('PUT');
    expect(mock.last.url).toBe('http://localhost:8080/media/repo1/id;f1/a.JPG');
    expect(mock.last.headers.get('content-type')).toBe('image/jpeg');
    expect(result.mediaItemId).toBe('m1');
  });

  it('uploads binary to a stable id and returns the Media-Item-Id', async () => {
    const mock = new MockFetch().enqueue({ status: 204, headers: { 'media-item-id': 'm1' } });
    const client = makeClient(mock);

    const bytes = new Uint8Array([1, 2, 3]);
    const result = await client.media('repo1').uploadById('m1', bytes, 'image/jpeg');
    expect(mock.last.method).toBe('PUT');
    expect(mock.last.url).toBe('http://localhost:8080/media/repo1/mid;m1');
    expect(mock.last.headers.get('content-type')).toBe('image/jpeg');
    expect(result.mediaItemId).toBe('m1');
  });

  it('reads media metadata by its blob SHA-256 hash', async () => {
    const { MediaRef } = await import('../../src/index');
    const mock = new MockFetch().enqueue({
      status: 200,
      json: { meta: { revision: 'r1' }, data: { id: 'm1', type: 'image', visibility: 'private' }, links: {} },
    });
    const client = makeClient(mock);

    const result = await client.media('repo1').metadata(MediaRef.sha256('abc123'));
    expect(mock.last.method).toBe('GET');
    expect(mock.last.url).toBe('http://localhost:8080/media/repo1/sha256;abc123/metadata');
    expect(result.data.id).toBe('m1');
  });

  it('requests the metadata field explicitly via ?fields=', async () => {
    const { MediaRef } = await import('../../src/index');
    const mock = new MockFetch().enqueue({
      status: 200,
      json: {
        meta: {},
        data: {
          id: 'm1',
          type: 'image',
          visibility: 'private',
          originalHash: 'abc',
          metadata: { dimensions: { width: 100, height: 100 } },
        },
      },
    });
    const client = makeClient(mock);

    const result = await client.media('repo1').metadata(MediaRef.id('m1'), { fields: ['type', 'metadata'] });
    const url = new URL(mock.last.url);
    expect(url.searchParams.get('fields')).toBe('type,metadata');
    expect(result.data.metadata?.dimensions?.width).toBe(100);
  });

  it('surfaces a 304 conditional GET as notModified', async () => {
    const { MediaRef } = await import('../../src/index');
    const mock = new MockFetch().enqueue({ status: 304, headers: { etag: '"abc"' } });
    const client = makeClient(mock);

    const result = await client.media('repo1').download(MediaRef.id('m1'), { ifNoneMatch: '"abc"' });
    expect(result.notModified).toBe(true);
    expect(result.etag).toBe('"abc"');
    expect(mock.last.headers.get('if-none-match')).toBe('"abc"');
  });

  it('sends fields as a top-level body field on action;list', async () => {
    const mock = new MockFetch().enqueue({ status: 200, json: { meta: {}, records: [] } });
    const client = makeClient(mock);

    await client.media('repo1').list({ folder: { path: '/albums' }, fields: ['type', 'metadata'] });
    expect(JSON.parse(mock.last.body!)).toEqual({
      folder: { path: '/albums' },
      fields: 'type,metadata',
    });
  });

  it('extracts image and video-poster variants from a resource, ignoring non-variant links', async () => {
    const client = makeClient(new MockFetch());

    const resource = {
      meta: {},
      data: { id: 'm1' },
      links: {
        self: { rel: 'self', href: 'http://localhost:8080/media/repo1/id;m1' },
        'image:variant:hd': {
          rel: 'image:variant:hd',
          href: 'http://localhost:8080/media/repo1/id;m1?size=hd',
          width: 1280,
          height: 720,
        },
        'video:poster:variant:hd': {
          rel: 'video:poster:variant:hd',
          href: 'http://localhost:8080/media/repo1/id;m1/poster?size=hd',
          width: 1280,
          height: 720,
        },
        'video:poster': { rel: 'video:poster', href: 'http://localhost:8080/media/repo1/id;m1/poster' },
        'video:hls:master': {
          rel: 'video:hls:master',
          href: 'http://localhost:8080/media/repo1/id;m1/hls/master.m3u8',
        },
        'video:hls:variant:hd': {
          rel: 'video:hls:variant:hd',
          href: 'http://localhost:8080/media/repo1/id;m1/hls/hd/playlist.m3u8',
          width: 1280,
          height: 720,
          bitrateKbps: 2500,
        },
      },
    };

    const variants = client.media('repo1').getVariants(resource as never);

    expect(variants).toEqual([
      {
        rel: 'image:variant:hd',
        href: 'http://localhost:8080/media/repo1/id;m1?size=hd',
        width: 1280,
        height: 720,
        type: 'image',
        name: 'hd',
      },
      {
        rel: 'video:poster:variant:hd',
        href: 'http://localhost:8080/media/repo1/id;m1/poster?size=hd',
        width: 1280,
        height: 720,
        type: 'video',
        name: 'hd',
      },
    ]);
  });

  it('extracts HLS renditions from a resource, ignoring the master playlist and poster links', async () => {
    const client = makeClient(new MockFetch());

    const resource = {
      meta: {},
      data: { id: 'm1' },
      links: {
        'video:poster': { rel: 'video:poster', href: 'http://localhost:8080/media/repo1/id;m1/poster' },
        'video:hls:master': {
          rel: 'video:hls:master',
          href: 'http://localhost:8080/media/repo1/id;m1/hls/master.m3u8',
        },
        'video:hls:variant:hd': {
          rel: 'video:hls:variant:hd',
          href: 'http://localhost:8080/media/repo1/id;m1/hls/hd/playlist.m3u8',
          width: 1280,
          height: 720,
          bitrateKbps: 2500,
        },
      },
    };

    const renditions = client.media('repo1').getHlsRenditions(resource as never);

    expect(renditions).toEqual([
      {
        rel: 'video:hls:variant:hd',
        href: 'http://localhost:8080/media/repo1/id;m1/hls/hd/playlist.m3u8',
        width: 1280,
        height: 720,
        bitrateKbps: 2500,
        name: 'hd',
      },
    ]);
  });

  it('returns an empty list when a resource has no links', async () => {
    const client = makeClient(new MockFetch());
    expect(client.media('repo1').getVariants({ meta: {}, data: { id: 'm1' } } as never)).toEqual([]);
    expect(client.media('repo1').getHlsRenditions({ meta: {}, data: { id: 'm1' } } as never)).toEqual([]);
  });

  it('downloads a poster frame by folder+filename and by id, with ?size= and conditional GET', async () => {
    const { MediaRef } = await import('../../src/index');
    const mock = new MockFetch().enqueue(
      { status: 200, headers: { 'content-type': 'image/webp' }, body: new Uint8Array([1, 2, 3]) },
      { status: 304, headers: { etag: '"abc"' } },
    );
    const client = makeClient(mock);

    await client.media('repo1').downloadPoster(MediaRef.file({ path: 'albums/trip' }, 'a.mp4'), { size: 'hd' });
    expect(mock.last.method).toBe('GET');
    expect(mock.last.url).toBe('http://localhost:8080/media/repo1/path;albums;trip/a.mp4/poster?size=hd');

    const result = await client.media('repo1').downloadPoster(MediaRef.id('m1'), { ifNoneMatch: '"abc"' });
    expect(mock.last.url).toBe('http://localhost:8080/media/repo1/mid;m1/poster');
    expect(mock.last.headers.get('if-none-match')).toBe('"abc"');
    expect(result.notModified).toBe(true);
  });

  it('downloads the HLS master playlist by folder+filename and by id', async () => {
    const { MediaRef } = await import('../../src/index');
    const playlist = '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2500000\nhd/playlist.m3u8\n';
    const mock = new MockFetch().enqueue(
      { status: 200, headers: { 'content-type': 'application/vnd.apple.mpegurl' }, body: playlist },
      { status: 200, headers: { 'content-type': 'application/vnd.apple.mpegurl' }, body: playlist },
    );
    const client = makeClient(mock);

    const byFile = await client.media('repo1').hlsMaster(MediaRef.file({ path: 'albums/trip' }, 'a.mp4'));
    expect(mock.last.method).toBe('GET');
    expect(mock.last.url).toBe('http://localhost:8080/media/repo1/path;albums;trip/a.mp4/hls/master.m3u8');
    expect(byFile).toBe(playlist);

    const byId = await client.media('repo1').hlsMaster(MediaRef.id('m1'));
    expect(mock.last.url).toBe('http://localhost:8080/media/repo1/mid;m1/hls/master.m3u8');
    expect(byId).toBe(playlist);
  });

});

function FolderById() {
  return { id: 'f1' } as const;
}
