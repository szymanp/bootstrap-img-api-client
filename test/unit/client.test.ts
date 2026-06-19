import { describe, expect, it } from 'vitest';
import { ApiError, BootstrapClient, ErrorType, isApiError, MemoryCookieStore } from '../../src/index';
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
            { type: 'media', reference: 'img:./missing.jpg' },
            { type: 'folder', reference: 'folder:../nope' },
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
      { type: 'media', reference: 'img:./missing.jpg' },
      { type: 'folder', reference: 'folder:../nope' },
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
});

describe('media', () => {
  it('uploads binary and returns the Media-Item-Id', async () => {
    const mock = new MockFetch().enqueue({ status: 204, headers: { 'media-item-id': 'm1' } });
    const client = makeClient(mock);

    const bytes = new Uint8Array([1, 2, 3]);
    const result = await client.media('repo1').upload({ id: 'f1' }, 'a.JPG', bytes, 'image/jpeg');
    expect(mock.last.method).toBe('PUT');
    expect(mock.last.url).toBe('http://localhost:8080/media/repo1/id;f1/a.JPG');
    expect(mock.last.headers.get('content-type')).toBe('image/jpeg');
    expect(result.mediaItemId).toBe('m1');
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

  it('lists media referenced in a folder text body', async () => {
    const mock = new MockFetch().enqueue({
      status: 200,
      headers: { etag: '"rev7"' },
      json: { meta: { offset: null, limit: 30 }, records: [{ meta: {}, data: { id: 'm1' }, links: {} }] },
    });
    const client = makeClient(mock);

    const result = await client.media('repo1').textRefs({ path: 'albums/trip' }, { acceptLanguage: 'pl-PL' });
    expect(mock.last.method).toBe('GET');
    expect(mock.last.url).toBe('http://localhost:8080/media/repo1/query;textrefs=path;albums;trip');
    expect(mock.last.headers.get('accept-language')).toBe('pl-PL');
    expect(result.notModified).toBe(false);
    if (!result.notModified) {
      expect(result.collection.records[0]?.data.id).toBe('m1');
      expect(result.etag).toBe('"rev7"');
    }
  });

  it('surfaces a 304 textrefs conditional GET as notModified', async () => {
    const mock = new MockFetch().enqueue({ status: 304, headers: { etag: '"rev7"' } });
    const client = makeClient(mock);

    const result = await client.media('repo1').textRefs({ id: 'f1' }, { ifNoneMatch: '"rev7"' });
    expect(mock.last.headers.get('if-none-match')).toBe('"rev7"');
    expect(result.notModified).toBe(true);
    expect(result.etag).toBe('"rev7"');
  });
});

function FolderById() {
  return { id: 'f1' } as const;
}
