import type { PrincipalId } from "./auth";

/** A repository audit-log entry (`GET /repos/{repoId}/changelog`). */
export interface AuditLogEntry {
  id: number;
  /** `null` for system-attributed events. */
  principalId: PrincipalId | null;
  timestamp: string;
  /**
   * `type` is one of the audit event kinds (`repository_created`,
   * `repository_renamed`, `repository_title_changed`, `owner_added`/
   * `owner_removed`, `editor_added`/`editor_removed`, one of the
   * `folder_*` events, or a publishing event); `data` carries that event's
   * own fields.
   *
   * Publishing events: `publication_created` `{ folderId, revision,
   * setAsDefault }`, `publication_deleted` `{ folderId, revision }`,
   * `publication_default_changed` `{ folderId, revision }` (`revision` is
   * `null` when cleared), and `folder_public_key_regenerated` `{ folderId,
   * publicKey }`. They don't advance the metadata `repositoryVersion`.
   *
   * `repository_renamed` covers a change of name, organization, or both, with
   * data `{ oldOrganization?, oldName, newOrganization?, newName }` (an
   * organization field is absent when there was/is none).
   *
   * `folder_tags_changed` records a change of a folder's set of tags, with
   * data `{ folderId, added, removed }` (both lists sorted).
   */
  description: { type: string; data: Record<string, unknown> };
}
