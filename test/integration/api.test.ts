import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiError, BootstrapClient, ErrorType, FolderRef, MediaRef, isApiError } from '../../src/index';

/**
 * Integration tests against a live server. Opt-in: set BOOTSTRAP_API_URL (and
 * optionally BOOTSTRAP_TEST_EMAIL). Mirrors the .hurl reference flows.
 */
const baseUrl = process.env.BOOTSTRAP_API_URL;
const email = process.env.BOOTSTRAP_TEST_EMAIL ?? 'test@example.com';

const run = baseUrl ? describe : describe.skip;

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
        .upload(FolderRef.id(albumId), 'tiny.jpg', bytes, 'image/jpeg')
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
});
