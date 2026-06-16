import { FolderRef, type FolderRefInput } from './refs.js';
import { isTemplateLink, type HrefLink, type Link, type LinkSet } from './types/envelope.js';

/** Lazily resolves a {@link ServiceLinks} from the (cached) service root. */
export type LinksProvider = () => Promise<ServiceLinks>;

/**
 * Typed builder over the service-root {@link LinkSet}.
 *
 * Rather than hard-coding paths (as the resource APIs historically did), every
 * method here resolves the template the server advertised under one link
 * relation, substitutes the supplied parameters, and returns a ready-to-use
 * {@link HrefLink}. Build one from {@link ServiceRootApi.links}.
 *
 * Folder parameters accept any {@link FolderRefInput}; the resulting
 * `id;<uuid>` / `path;a;b` segment is inserted verbatim. All other parameters
 * are URL-encoded before substitution.
 */
export class ServiceLinks {
  constructor(private readonly links: LinkSet) {}

  // --- auth ---

  /** `auth:login` — exchange a token for a session. */
  login(): HrefLink {
    return this.href('auth:login');
  }

  /** `auth:logout` — end the current session. */
  logout(): HrefLink {
    return this.href('auth:logout');
  }

  /** `auth:session` — inspect the current session. */
  session(): HrefLink {
    return this.href('auth:session');
  }

  /** `auth:send-token` — request a login token. */
  sendToken(): HrefLink {
    return this.href('auth:send-token');
  }

  // --- users ---

  /** `users:create` — register a user. */
  createUser(): HrefLink {
    return this.href('users:create');
  }

  /** `users:verify-user` — verify a user's email. */
  verifyUser(userIdOrEmail: string): HrefLink {
    return this.resolve('users:verify-user', { userIdOrEmail: encode(userIdOrEmail) });
  }

  /** `users:resend-verification-token` — re-issue a verification token. */
  resendVerificationToken(userIdOrEmail: string): HrefLink {
    return this.resolve('users:resend-verification-token', { userIdOrEmail: encode(userIdOrEmail) });
  }

  // --- repositories ---

  /** `repos:create` — create a repository. */
  createRepo(): HrefLink {
    return this.href('repos:create');
  }

  /** `repos:query` — list repositories the caller can reach. */
  queryRepos(): HrefLink {
    return this.href('repos:query');
  }

  /** `repos:read` — retrieve a repository. */
  readRepo(repoId: string): HrefLink {
    return this.resolve('repos:read', { repoId: encode(repoId) });
  }

  /** `repos:update` — update a repository. */
  updateRepo(repoId: string): HrefLink {
    return this.resolve('repos:update', { repoId: encode(repoId) });
  }

  /** `repos:delete` — delete a repository. */
  deleteRepo(repoId: string): HrefLink {
    return this.resolve('repos:delete', { repoId: encode(repoId) });
  }

  // --- folders ---

  /** `folders:create` — create a folder under a parent. */
  createFolder(repoId: string): HrefLink {
    return this.resolve('folders:create', { repoId: encode(repoId) });
  }

  /** `folders:list-root` — list root-level folders. */
  listRootFolders(repoId: string): HrefLink {
    return this.resolve('folders:list-root', { repoId: encode(repoId) });
  }

  /** `folders:read` — retrieve a folder. */
  readFolder(repoId: string, folder: FolderRefInput): HrefLink {
    return this.resolve('folders:read', this.folderFields(repoId, folder));
  }

  /** `folders:update` — update a folder. */
  updateFolder(repoId: string, folder: FolderRefInput): HrefLink {
    return this.resolve('folders:update', this.folderFields(repoId, folder));
  }

  /** `folders:delete` — delete a folder and its descendants. */
  deleteFolder(repoId: string, folder: FolderRefInput): HrefLink {
    return this.resolve('folders:delete', this.folderFields(repoId, folder));
  }

  /** `folders:list` — list a folder's direct children. */
  listFolders(repoId: string, folder: FolderRefInput): HrefLink {
    return this.resolve('folders:list', this.folderFields(repoId, folder));
  }

  /** `folders:tree` — return a recursive subtree. */
  treeFolders(repoId: string, folder: FolderRefInput): HrefLink {
    return this.resolve('folders:tree', this.folderFields(repoId, folder));
  }

  /** `folders:read-text` — read a folder's markdown body. */
  readFolderText(repoId: string, folder: FolderRefInput): HrefLink {
    return this.resolve('folders:read-text', this.folderFields(repoId, folder));
  }

  /** `folders:update-text` — store a folder's markdown body. */
  updateFolderText(repoId: string, folder: FolderRefInput): HrefLink {
    return this.resolve('folders:update-text', this.folderFields(repoId, folder));
  }

  /** `folders:list-permissions` — list a folder's permissions. */
  listFolderPermissions(repoId: string, folder: FolderRefInput): HrefLink {
    return this.resolve('folders:list-permissions', this.folderFields(repoId, folder));
  }

  /** `folders:patch-permissions` — add, remove, or modify permissions. */
  patchFolderPermissions(repoId: string, folder: FolderRefInput): HrefLink {
    return this.resolve('folders:patch-permissions', this.folderFields(repoId, folder));
  }

  /** `folders:list-media` — list a folder's direct media membership. */
  listFolderMedia(repoId: string, folder: FolderRefInput): HrefLink {
    return this.resolve('folders:list-media', this.folderFields(repoId, folder));
  }

  /** `folders:query-media` — query a folder's media membership. */
  queryFolderMedia(repoId: string, folder: FolderRefInput): HrefLink {
    return this.resolve('folders:query-media', this.folderFields(repoId, folder));
  }

  /** `folders:replace-media` — replace a folder's media membership. */
  replaceFolderMedia(repoId: string, folder: FolderRefInput): HrefLink {
    return this.resolve('folders:replace-media', this.folderFields(repoId, folder));
  }

  /** `folders:patch-media` — apply membership patches. */
  patchFolderMedia(repoId: string, folder: FolderRefInput): HrefLink {
    return this.resolve('folders:patch-media', this.folderFields(repoId, folder));
  }

  // --- media ---

  /** `media:list` — list media items in a repository. */
  listMedia(repoId: string): HrefLink {
    return this.resolve('media:list', { repoId: encode(repoId) });
  }

  /** `media:download-by-id` — download a media binary by its stable id. */
  downloadMediaById(repoId: string, mediaItemId: string): HrefLink {
    return this.resolve('media:download-by-id', { repoId: encode(repoId), mediaItemId: midSegment(mediaItemId) });
  }

  /** `media:metadata-by-id` — read media metadata by its stable id. */
  mediaMetadataById(repoId: string, mediaItemId: string): HrefLink {
    return this.resolve('media:metadata-by-id', { repoId: encode(repoId), mediaItemId: midSegment(mediaItemId) });
  }

  /** `media:download` — download a media binary by folder + filename. */
  downloadMedia(repoId: string, folder: FolderRefInput, filename: string): HrefLink {
    return this.resolve('media:download', this.mediaFields(repoId, folder, filename));
  }

  /** `media:metadata` — read media metadata by folder + filename. */
  mediaMetadata(repoId: string, folder: FolderRefInput, filename: string): HrefLink {
    return this.resolve('media:metadata', this.mediaFields(repoId, folder, filename));
  }

  /** `media:upload` — upload a media item by folder + filename. */
  uploadMedia(repoId: string, folder: FolderRefInput, filename: string): HrefLink {
    return this.resolve('media:upload', this.mediaFields(repoId, folder, filename));
  }

  // --- internals ---

  private folderFields(repoId: string, folder: FolderRefInput): Record<string, string> {
    return { repoId: encode(repoId), folderIdOrPath: FolderRef.from(folder).toPathSegment() };
  }

  private mediaFields(repoId: string, folder: FolderRefInput, filename: string): Record<string, string> {
    return { ...this.folderFields(repoId, folder), filename: encode(filename) };
  }

  /** Look up a non-templated link and return it as an {@link HrefLink}. */
  private href(rel: string): HrefLink {
    const link = this.require(rel);
    if (isTemplateLink(link)) {
      throw new Error(`Link "${rel}" is templated; resolve it with its required fields.`);
    }
    return { rel: link.rel, href: link.href };
  }

  /**
   * Resolve a link by `rel`, substituting `fields` (already encoded) into its
   * template. Returns the link's `href` directly when it is not templated.
   */
  private resolve(rel: string, fields: Record<string, string>): HrefLink {
    const link = this.require(rel);
    if (!isTemplateLink(link)) return { rel: link.rel, href: link.href };
    const href = link.template.replace(/\{([^}]+)\}/g, (_match, name: string) => {
      const value = fields[name];
      if (value === undefined) {
        throw new Error(`Missing field "${name}" for template link "${rel}".`);
      }
      return value;
    });
    return { rel: link.rel, href };
  }

  private require(rel: string): Link {
    const link = this.links[rel];
    if (!link) {
      throw new Error(`Service root does not advertise link "${rel}".`);
    }
    return link;
  }
}

function encode(value: string): string {
  return encodeURIComponent(value);
}

/**
 * The `mid;<uuid>` matrix segment used to address a media item by its stable id.
 * The advertised by-id templates use a bare `{mediaItemId}` placeholder, but the
 * API expects the `mid;` prefix (mirroring `id;`/`path;` for folders).
 */
function midSegment(mediaItemId: string): string {
  return `mid;${encode(mediaItemId)}`;
}
