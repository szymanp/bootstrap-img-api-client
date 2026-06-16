import type { ServiceRoot } from '../../src/index.js';

/**
 * The service-root link set, as advertised by the live server. Unit tests seed
 * this into the client (via `serviceRoot`) so resource APIs resolve endpoint
 * URLs without a lazy `GET /` round-trip that would consume a mocked response.
 */
export const serviceRootFixture: ServiceRoot = {
  links: {
    'repos:delete': { rel: 'repos:delete', template: '/repos/{repoId}', fields: ['repoId'] },
    'auth:logout': { rel: 'auth:logout', href: '/auth/action;logout' },
    'users:verify-user': {
      rel: 'users:verify-user',
      template: '/users/{userIdOrEmail}/action;verify-user',
      fields: ['userIdOrEmail'],
    },
    'folders:patch-permissions': {
      rel: 'folders:patch-permissions',
      template: '/folders/{repoId}/{folderIdOrPath}/permissions',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'media:download-by-id': {
      rel: 'media:download-by-id',
      template: '/media/{repoId}/{mediaItemId}',
      fields: ['repoId', 'mediaItemId'],
    },
    'repos:read': { rel: 'repos:read', template: '/repos/{repoId}', fields: ['repoId'] },
    'repos:query': { rel: 'repos:query', href: '/repos;query' },
    'folders:read-text': {
      rel: 'folders:read-text',
      template: '/folders/{repoId}/{folderIdOrPath}/text',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'folders:patch-media': {
      rel: 'folders:patch-media',
      template: '/folders/{repoId}/{folderIdOrPath}/media',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'folders:query-media': {
      rel: 'folders:query-media',
      template: '/folders/{repoId}/{folderIdOrPath}/media;query',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'folders:update-text': {
      rel: 'folders:update-text',
      template: '/folders/{repoId}/{folderIdOrPath}/text',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'folders:list-root': {
      rel: 'folders:list-root',
      template: '/folders/{repoId}/action;listroot',
      fields: ['repoId'],
    },
    'folders:delete': {
      rel: 'folders:delete',
      template: '/folders/{repoId}/{folderIdOrPath}',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'media:metadata-by-id': {
      rel: 'media:metadata-by-id',
      template: '/media/{repoId}/{mediaItemId}/metadata',
      fields: ['repoId', 'mediaItemId'],
    },
    'users:resend-verification-token': {
      rel: 'users:resend-verification-token',
      template: '/users/{userIdOrEmail}/action;resend-verification-token',
      fields: ['userIdOrEmail'],
    },
    'folders:list-permissions': {
      rel: 'folders:list-permissions',
      template: '/folders/{repoId}/{folderIdOrPath}/permissions',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'folders:replace-media': {
      rel: 'folders:replace-media',
      template: '/folders/{repoId}/{folderIdOrPath}/media',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'repos:update': { rel: 'repos:update', template: '/repos/{repoId}', fields: ['repoId'] },
    'media:list': { rel: 'media:list', template: '/media/{repoId}/action;list', fields: ['repoId'] },
    'media:download': {
      rel: 'media:download',
      template: '/media/{repoId}/{folderIdOrPath}/{filename}',
      fields: ['repoId', 'folderIdOrPath', 'filename'],
    },
    'repos:create': { rel: 'repos:create', href: '/repos' },
    'media:metadata': {
      rel: 'media:metadata',
      template: '/media/{repoId}/{folderIdOrPath}/{filename}/metadata',
      fields: ['repoId', 'folderIdOrPath', 'filename'],
    },
    'folders:tree': {
      rel: 'folders:tree',
      template: '/folders/{repoId}/{folderIdOrPath}/action;tree',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'users:create': { rel: 'users:create', href: '/users' },
    'folders:list-media': {
      rel: 'folders:list-media',
      template: '/folders/{repoId}/{folderIdOrPath}/media',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'auth:send-token': { rel: 'auth:send-token', href: '/auth/action;send-token' },
    'folders:update': {
      rel: 'folders:update',
      template: '/folders/{repoId}/{folderIdOrPath}',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'folders:read': {
      rel: 'folders:read',
      template: '/folders/{repoId}/{folderIdOrPath}',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'auth:session': { rel: 'auth:session', href: '/auth/session' },
    'auth:login': { rel: 'auth:login', href: '/auth' },
    'folders:create': { rel: 'folders:create', template: '/folders/{repoId}', fields: ['repoId'] },
    'media:upload': {
      rel: 'media:upload',
      template: '/media/{repoId}/{folderIdOrPath}/{filename}',
      fields: ['repoId', 'folderIdOrPath', 'filename'],
    },
    'folders:list': {
      rel: 'folders:list',
      template: '/folders/{repoId}/{folderIdOrPath}/action;list',
      fields: ['repoId', 'folderIdOrPath'],
    },
  },
};
