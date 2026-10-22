import type { ServiceRoot } from '../../src/index';

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
    'folders:text-media': {
      rel: 'folders:text-media',
      template: '/folders/{repoId}/{folderIdOrPath}/text/media',
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
    'media:metadata-by-sha256': {
      rel: 'media:metadata-by-sha256',
      template: '/media/{repoId}/{mediaItemHash}/metadata',
      fields: ['repoId', 'mediaItemHash'],
    },
    'media:upload-by-id': {
      rel: 'media:upload-by-id',
      template: '/media/{repoId}/{mediaItemId}',
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
    'orgs:list': { rel: 'orgs:list', href: '/orgs' },
    'orgs:create': { rel: 'orgs:create', href: '/orgs' },
    'orgs:read': { rel: 'orgs:read', template: '/orgs/{orgName}', fields: ['orgName'] },
    'orgs:update': { rel: 'orgs:update', template: '/orgs/{orgName}', fields: ['orgName'] },
    'orgs:delete': { rel: 'orgs:delete', template: '/orgs/{orgName}', fields: ['orgName'] },
    'orgs:list-members': { rel: 'orgs:list-members', template: '/orgs/{orgName}/members', fields: ['orgName'] },
    'orgs:patch-members': { rel: 'orgs:patch-members', template: '/orgs/{orgName}/members', fields: ['orgName'] },
    'users:read-settings': {
      rel: 'users:read-settings',
      template: '/users/{userIdOrEmail}/settings',
      fields: ['userIdOrEmail'],
    },
    'users:update-settings': {
      rel: 'users:update-settings',
      template: '/users/{userIdOrEmail}/settings',
      fields: ['userIdOrEmail'],
    },
    'repos:changelog': {
      rel: 'repos:changelog',
      template: '/repos/{repoId}/changelog',
      fields: ['repoId'],
    },
    'repos:tags': {
      rel: 'repos:tags',
      template: '/repos/{repoId}/tags',
      fields: ['repoId'],
    },
    'repos:metadata-snapshot-create': {
      rel: 'repos:metadata-snapshot-create',
      template: '/repos/{repoId}/metadata-snapshots',
      fields: ['repoId'],
    },
    'repos:metadata-snapshot-read': {
      rel: 'repos:metadata-snapshot-read',
      template: '/repos/{repoId}/metadata-snapshots/{snapshotId}',
      fields: ['repoId', 'snapshotId'],
    },
    'repos:metadata-sync': {
      rel: 'repos:metadata-sync',
      template: '/repos/{repoId}/metadata-sync',
      fields: ['repoId'],
    },
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
    'users:update': {
      rel: 'users:update',
      template: '/users/{userIdOrEmail}',
      fields: ['userIdOrEmail'],
    },
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
    'media:poster': {
      rel: 'media:poster',
      template: '/media/{repoId}/{folderIdOrPath}/{filename}/poster',
      fields: ['repoId', 'folderIdOrPath', 'filename'],
    },
    'media:poster-by-id': {
      rel: 'media:poster-by-id',
      template: '/media/{repoId}/{mediaItemId}/poster',
      fields: ['repoId', 'mediaItemId'],
    },
    'media:hls-master': {
      rel: 'media:hls-master',
      template: '/media/{repoId}/{folderIdOrPath}/{filename}/hls/master.m3u8',
      fields: ['repoId', 'folderIdOrPath', 'filename'],
    },
    'media:hls-master-by-id': {
      rel: 'media:hls-master-by-id',
      template: '/media/{repoId}/{mediaItemId}/hls/master.m3u8',
      fields: ['repoId', 'mediaItemId'],
    },
    'folders:publication-preview': {
      rel: 'folders:publication-preview',
      template: '/folders/{repoId}/{folderIdOrPath}/publication-preview',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'folders:publish': {
      rel: 'folders:publish',
      template: '/folders/{repoId}/{folderIdOrPath}/publications',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'folders:list-publications': {
      rel: 'folders:list-publications',
      template: '/folders/{repoId}/{folderIdOrPath}/publications',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'folders:set-default-publication': {
      rel: 'folders:set-default-publication',
      template: '/folders/{repoId}/{folderIdOrPath}/publications/default',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'folders:delete-publication': {
      rel: 'folders:delete-publication',
      template: '/folders/{repoId}/{folderIdOrPath}/publications/{revision}',
      fields: ['repoId', 'folderIdOrPath', 'revision'],
    },
    'folders:regenerate-public-key': {
      rel: 'folders:regenerate-public-key',
      template: '/folders/{repoId}/{folderIdOrPath}/action;regenerate-public-key',
      fields: ['repoId', 'folderIdOrPath'],
    },
    'published:discover': {
      rel: 'published:discover',
      template: '/published/{repoId}',
      fields: ['repoId'],
    },
    'published:index': {
      rel: 'published:index',
      template: '/published/{repoId}/index',
      fields: ['repoId'],
    },
    'published:read': {
      rel: 'published:read',
      template: '/published/{repoId}/{publicationRootVar}',
      fields: ['repoId', 'publicationRootVar'],
    },
    'published:text': {
      rel: 'published:text',
      template: '/published/{repoId}/{publicationRootVar}/text',
      fields: ['repoId', 'publicationRootVar'],
    },
    'published:sub-text': {
      rel: 'published:sub-text',
      template: '/published/{repoId}/{publicationRootVar}/sub/{subFolderId}/text',
      fields: ['repoId', 'publicationRootVar', 'subFolderId'],
    },
    'published:read-sub': {
      rel: 'published:read-sub',
      template: '/published/{repoId}/{publicationRootVar}/sub/{subFolderId}',
      fields: ['repoId', 'publicationRootVar', 'subFolderId'],
    },
    'published:tree': {
      rel: 'published:tree',
      template: '/published/{repoId}/{publicationRootVar}/tree',
      fields: ['repoId', 'publicationRootVar'],
    },
    'published:query-media': {
      rel: 'published:query-media',
      template: '/published/{repoId}/{publicationRootVar}/media;query',
      fields: ['repoId', 'publicationRootVar'],
    },
    'published:query-sub-media': {
      rel: 'published:query-sub-media',
      template: '/published/{repoId}/{publicationRootVar}/sub/{subFolderId}/media;query',
      fields: ['repoId', 'publicationRootVar', 'subFolderId'],
    },
    'auth:redeem-access-link': { rel: 'auth:redeem-access-link', href: '/auth/action;redeem-access-link' },
    'auth:transfer-anonymous-access': {
      rel: 'auth:transfer-anonymous-access',
      href: '/auth/action;transfer-anonymous-access',
    },
    'repos:follow': { rel: 'repos:follow', template: '/repos/{repoId}/following', fields: ['repoId'] },
    'repos:unfollow': { rel: 'repos:unfollow', template: '/repos/{repoId}/following', fields: ['repoId'] },
    'access-links:create': { rel: 'access-links:create', template: '/access-links/{repoId}', fields: ['repoId'] },
    'access-links:list': { rel: 'access-links:list', template: '/access-links/{repoId}', fields: ['repoId'] },
    'access-links:read': {
      rel: 'access-links:read',
      template: '/access-links/{repoId}/{linkId}',
      fields: ['repoId', 'linkId'],
    },
    'access-links:deactivate': {
      rel: 'access-links:deactivate',
      template: '/access-links/{repoId}/{linkId}/action;deactivate',
      fields: ['repoId', 'linkId'],
    },
    'access-links:delete': {
      rel: 'access-links:delete',
      template: '/access-links/{repoId}/{linkId}',
      fields: ['repoId', 'linkId'],
    },
    'access-links:list-grants': {
      rel: 'access-links:list-grants',
      template: '/access-links/{repoId}/{linkId}/grants',
      fields: ['repoId', 'linkId'],
    },
    'access-links:delete-grant': {
      rel: 'access-links:delete-grant',
      template: '/access-links/{repoId}/{linkId}/grants/{grantId}',
      fields: ['repoId', 'linkId', 'grantId'],
    },
    'folders:list': {
      rel: 'folders:list',
      template: '/folders/{repoId}/{folderIdOrPath}/action;list',
      fields: ['repoId', 'folderIdOrPath'],
    },
  },
};
