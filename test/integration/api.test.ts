import { createHash, randomUUID } from 'node:crypto';
import { crc32, deflateSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiError, BootstrapClient, ErrorType, FolderRef, MediaRef, isApiError } from '../../src/index';

/**
 * Integration tests against a live server. Opt-in: set BOOTSTRAP_API_URL (and
 * optionally BOOTSTRAP_TEST_EMAIL). Mirrors the .hurl reference flows.
 */
const baseUrl = process.env.BOOTSTRAP_API_URL;
const email = process.env.BOOTSTRAP_TEST_EMAIL ?? 'test@example.com';

const run = baseUrl ? describe : describe.skip;

/** A valid 1x1 PNG carrying `text` in a tEXt chunk, so each call yields a never-seen file. */
function uniquePng(text: string): Uint8Array<ArrayBuffer> {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]); // 1x1, 8-bit RGB
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('tEXt', Buffer.from(`Comment\0${text}`, 'latin1')),
      chunk('IDAT', deflateSync(Buffer.from([0, 0x80, 0x80, 0x80]))),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

run('integration (live server)', () => {
  const client = new BootstrapClient({ baseUrl, defaultLanguage: 'en-US' });

  beforeAll(async () => {
    await client.auth.loginWithTestToken(email);
  });

  afterAll(async () => {
    await client.auth.logout().catch(() => undefined);
  });

  it('reports a session after login', async () => {
    const session = await client.auth.session();
    expect(session.email).toBe(email);
    expect(session.principal).toBeTruthy();
  });

  it('runs the full repo + folder + media lifecycle', async () => {
    // Create a repository.
    const repo = await client.repos.create({ name: `repo-${randomUUID()}`, title: 'IT Repo' });
    const repoId = repo.data.id;
    expect(repo.meta.revision).toBeTruthy();

    try {
      // It appears in the caller's repository query.
      const list = await client.repos.query({ limit: 50 });
      expect(list.records.some((r) => r.data.id === repoId)).toBe(true);

      // Stale-revision update -> 409.
      const conflict = await client.repos.update(repoId, randomUUID(), { title: 'nope' }).catch((e) => e);
      expect(isApiError(conflict, ErrorType.RevisionConflict)).toBe(true);

      const folders = client.folders(repoId);

      // The auto-created /albums folder resolves by path.
      const albums = await folders.get(FolderRef.path('/albums'));
      expect(albums.data.path).toBe('/albums');

      // Create an album, then upload an image into it.
      const album = await folders.create({
        parent: { path: '/albums' },
        name: 'vacation',
        title: 'Vacation',
        type: 'album',
      });
      const albumId = album.data.id;

      const media = client.media(repoId);
      const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]); // minimal jpeg-ish bytes
      const upload = await media
        .uploadToFolder(FolderRef.id(albumId), 'tiny.jpg', bytes, 'image/jpeg')
        .catch((e: ApiError) => e);
      // Some servers reject non-decodable images with 415/422; accept either a
      // successful upload or an explicit unsupported-media error.
      if (upload instanceof ApiError) {
        expect([415, 422]).toContain(upload.status);
      } else {
        expect(upload.mediaItemId).toBeTruthy();

        // Membership now lists the file.
        const membership = await folders.getMedia(FolderRef.id(albumId));
        expect(membership.some((m) => m.filename === 'tiny.jpg')).toBe(true);

        // Metadata + download by id.
        const meta = await media.metadata(MediaRef.id(upload.mediaItemId));
        expect(meta.data.id).toBe(upload.mediaItemId);

        const download = await media.download(MediaRef.id(upload.mediaItemId));
        expect(download.notModified).toBe(false);
      }

      // Folder text round-trip.
      const created = await folders.create({
        parent: { id: albumId },
        name: 'notes',
        title: 'Notes',
        type: 'album',
      });
      const put = await folders.putText(FolderRef.id(created.data.id), '# Notes\nhello\n', created.meta.revision!);
      expect(put.revision).toBeTruthy();
      const text = await folders.getText(FolderRef.id(created.data.id));
      expect(text.text).toContain('hello');
    } finally {
      const fresh = await client.repos.get(repoId);
      await client.repos.delete(repoId, fresh.meta.revision!);
    }
  });

  it('extracts text references and lists them via the text/media subresource', async () => {
    const repo = await client.repos.create({ name: `repo-${randomUUID()}`, title: 'Textrefs Repo' });
    const repoId = repo.data.id;

    try {
      const folders = client.folders(repoId);
      const media = client.media(repoId);

      // The album whose text body we will edit.
      const trip = await folders.create({
        parent: { path: '/albums' },
        name: 'trip',
        title: 'Trip',
        type: 'album',
      });
      const tripRef = FolderRef.id(trip.data.id);

      // Try to seed a media item we can reference by path.
      const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]); // minimal jpeg-ish bytes
      const upload = await media.uploadToFolder(tripRef, 'cover.jpg', bytes, 'image/jpeg').catch((e: ApiError) => e);
      const uploaded = !(upload instanceof ApiError);

      // Store a body mixing a resolvable reference (when the upload took) with a
      // guaranteed-broken one. The broken reference must be reported; the good
      // one must not.
      const body = uploaded
        ? '# Trip\n\n![cover](media-path:./cover.jpg)\n\nBroken: ![x](media-path:./missing.jpg)\n'
        : '# Trip\n\nBroken: ![x](media-path:./missing.jpg)\n';
      const put = await folders.putText(tripRef, body, trip.meta.revision!);
      expect(put.revision).toBeTruthy();

      const brokenRefs = put.unresolvedReferences.map((r) => r.reference);
      expect(brokenRefs).toContain('media-path:./missing.jpg');
      const missing = put.unresolvedReferences.find((r) => r.reference === 'media-path:./missing.jpg');
      expect(missing?.type).toBe('media');
      expect(missing?.status).toBe('missing');
      if (uploaded) {
        expect(brokenRefs).not.toContain('media-path:./cover.jpg');
      }

      // List the references recorded from the body.
      const refs = await folders.getTextMedia(tripRef);
      expect(refs.notModified).toBe(false);
      if (!refs.notModified) {
        if (uploaded) {
          expect(refs.result.related?.mediaItems?.some((m) => m.data.id === upload.mediaItemId)).toBe(true);
        }

        // Conditional GET with the returned ETag -> 304 (the ETag tracks the revision).
        if (refs.etag) {
          const again = await folders.getTextMedia(tripRef, { ifNoneMatch: refs.etag });
          expect(again.notModified).toBe(true);
        }
      }
    } finally {
      const fresh = await client.repos.get(repoId);
      await client.repos.delete(repoId, fresh.meta.revision!);
    }
  });

  it('checks Repr-Digest and creates a second item from an upload claim', async () => {
    const repo = await client.repos.create({ name: `repo-${randomUUID()}`, title: 'IT Claims' });
    const repoId = repo.data.id;
    try {
      const media = client.media(repoId);
      const bytes = uniquePng(randomUUID());
      const sha256 = createHash('sha256').update(bytes).digest('hex');

      // A wrong digest is rejected before anything is stored.
      const mismatch = await media
        .uploadById(randomUUID(), bytes, 'image/png', { sha256: '00'.repeat(32) })
        .catch((e: unknown) => e);
      expect(isApiError(mismatch, ErrorType.DigestMismatch)).toBe(true);

      // The first upload has to transfer the bytes: the server has never seen them.
      const first = await media.uploadById(randomUUID(), bytes, 'image/png', { sha256, claim: true });
      expect(first.transferred).toBe(true);

      // The same file under a new id is claimed without sending it.
      const secondId = randomUUID();
      const second = await media.uploadById(secondId, new Blob([bytes]), 'image/png', { sha256, claim: true });
      expect(second).toEqual({ mediaItemId: secondId, transferred: false });
      const meta = await media.metadata(MediaRef.id(secondId), { fields: ['originalHash'] });
      expect(meta.data.originalHash).toBe(sha256);

      // Claiming an id that already holds this file needs no proof.
      const again = await media.claimById(secondId, sha256);
      expect(again.transferred).toBe(false);
    } finally {
      const fresh = await client.repos.get(repoId);
      await client.repos.delete(repoId, fresh.meta.revision!);
    }
  });
});
