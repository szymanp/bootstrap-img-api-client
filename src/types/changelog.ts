/** A repository audit-log entry (`GET /repos/{repoId}/changelog`). */
export interface AuditLogEntry {
  id: number;
  /** `null` for system-attributed events. */
  principalId: string | null;
  timestamp: string;
  /**
   * `type` is one of the audit event kinds (`repository_created`,
   * `repository_renamed`, `repository_title_changed`, `owner_added`/
   * `owner_removed`, `editor_added`/`editor_removed`, or one of the
   * `folder_*` events); `data` carries that event's own fields.
   */
  description: { type: string; data: Record<string, unknown> };
}
