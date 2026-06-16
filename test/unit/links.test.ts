import { describe, expect, it } from 'vitest';
import { FolderRef, ServiceLinks, type LinkSet } from '../../src/index.js';

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

  it('prefixes the mid; matrix segment for by-id media links', () => {
    expect(sl.downloadMediaById('repo', 'm1')).toEqual({
      rel: 'media:download-by-id',
      href: '/media/repo/mid;m1',
    });
  });

  it('encodes user-or-email fields', () => {
    expect(sl.verifyUser('a@b.com').href).toBe('/users/a%40b.com/action;verify-user');
  });

  it('throws for a relation the root does not advertise', () => {
    expect(() => sl.queryRepos()).toThrow(/does not advertise/);
  });
});
