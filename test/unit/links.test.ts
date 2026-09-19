import { describe, expect, it } from 'vitest';
import { FolderRef, ServiceLinks, type LinkSet } from '../../src/index';

const links: LinkSet = {
  'auth:login': { rel: 'auth:login', href: '/auth' },
  'repos:read': { rel: 'repos:read', template: '/repos/{repoId}', fields: ['repoId'] },
  'folders:read': {
    rel: 'folders:read',
    template: '/folders/{repoId}/{folderIdOrPath}',
    fields: ['repoId', 'folderIdOrPath'],
  },
  'media:upload': {
    rel: 'media:upload',
    template: '/media/{repoId}/{folderIdOrPath}/{filename}',
    fields: ['repoId', 'folderIdOrPath', 'filename'],
  },
  'media:download-by-id': {
    rel: 'media:download-by-id',
    template: '/media/{repoId}/{mediaItemId}',
    fields: ['repoId', 'mediaItemId'],
  },
  'media:upload-by-id': {
    rel: 'media:upload-by-id',
    template: '/media/{repoId}/{mediaItemId}',
    fields: ['repoId', 'mediaItemId'],
  },
  'media:metadata-by-sha256': {
    rel: 'media:metadata-by-sha256',
    template: '/media/{repoId}/{mediaItemHash}/metadata',
    fields: ['repoId', 'mediaItemHash'],
  },
  'folders:text-media': {
    rel: 'folders:text-media',
    template: '/folders/{repoId}/{folderIdOrPath}/text/media',
    fields: ['repoId', 'folderIdOrPath'],
  },
  'repos:create': { rel: 'repos:create', href: '/repos' },
  'users:verify-user': {
    rel: 'users:verify-user',
    template: '/users/{userIdOrEmail}/action;verify-user',
    fields: ['userIdOrEmail'],
  },
};

describe('ServiceLinks', () => {
  const sl = new ServiceLinks(links);

  it('returns non-templated links verbatim', () => {
    expect(sl.login()).toEqual({ rel: 'auth:login', href: '/auth' });
  });

  it('substitutes a single field and encodes it', () => {
    expect(sl.readRepo('r 1')).toEqual({ rel: 'repos:read', href: '/repos/r%201' });
  });

  it('inserts a folder ref segment without double-encoding the separators', () => {
    expect(sl.readFolder('repo', FolderRef.path('/albums/vacation'))).toEqual({
      rel: 'folders:read',
      href: '/folders/repo/path;albums;vacation',
    });
    expect(sl.readFolder('repo', { id: 'abc' }).href).toBe('/folders/repo/id;abc');
  });

  it('builds folder + filename media links', () => {
    expect(sl.uploadMedia('repo', 'photos', 'a b.jpg')).toEqual({
      rel: 'media:upload',
      href: '/media/repo/path;photos/a%20b.jpg',
    });
  });

  it('builds the folder text-media link with a folder ref segment', () => {
    expect(sl.readFolderTextMedia('repo', FolderRef.path('/albums/trip'))).toEqual({
      rel: 'folders:text-media',
      href: '/folders/repo/path;albums;trip/text/media',
    });
  });

  it('resolves the repos collection href, shared with repos:create', () => {
    expect(sl.reposCollection()).toEqual({ rel: 'repos:create', href: '/repos' });
  });

  it('prefixes the mid; matrix segment for by-id media links', () => {
    expect(sl.downloadMediaById('repo', 'm1')).toEqual({
      rel: 'media:download-by-id',
      href: '/media/repo/mid;m1',
    });
    expect(sl.uploadMediaById('repo', 'm1')).toEqual({
      rel: 'media:upload-by-id',
      href: '/media/repo/mid;m1',
    });
  });

  it('prefixes the sha256; matrix segment for the by-hash metadata link', () => {
    expect(sl.mediaMetadataBySha256('repo', 'abc123')).toEqual({
      rel: 'media:metadata-by-sha256',
      href: '/media/repo/sha256;abc123/metadata',
    });
  });

  it('encodes user-or-email fields', () => {
    expect(sl.verifyUser('a@b.com').href).toBe('/users/a%40b.com/action;verify-user');
  });

  it('throws for a relation the root does not advertise', () => {
    expect(() => sl.queryRepos()).toThrow(/does not advertise/);
  });
});
