import "server-only";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type AuditEntry = {
  /** Dotted action key, e.g. `order.ship`, `team.add`, `settings.update`. */
  action: string;
  /** The kind of thing changed, e.g. `order`, `settings`, `admin_user`. */
  entity: string;
  /** The affected id / slug / email, if any. */
  entityId?: string | null;
  /** Human-readable one-liner shown in the log. */
  summary: string;
};

/**
 * Record an admin action in the audit log. Fail-soft — resolves the actor from
 * the session and inserts a row, but NEVER throws (a logging failure must not
 * fail the mutation it's logging). `audit_log` postpends the generated types
 * (migration 0028) → `as never`.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const user = await getSessionUser();
    const db = createAdminSupabase();
    const { error } = await db.from("audit_log" as never).insert({
      actor_email: user?.email ?? "system",
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId ?? null,
      summary: entry.summary,
    } as never);
    if (error) console.error("logAudit insert failed:", error);
  } catch (err) {
    console.error("logAudit failed:", err);
  }
}

export type AuditRow = {
  id: string;
  actorEmail: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
  createdAt: string;
};

type DbRow = {
  id: string;
  actor_email: string;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string;
  created_at: string;
};

/** The most recent audit entries (newest first). `[]` on error (fail-soft). */
export async function getAuditLog(limit = 200): Promise<AuditRow[]> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("audit_log" as never)
    .select("id, actor_email, action, entity, entity_id, summary, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)
    .overrideTypes<DbRow[], { merge: false }>();
  if (error) {
    console.error("getAuditLog failed:", error);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    actorEmail: r.actor_email,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    summary: r.summary,
    createdAt: r.created_at,
  }));
}
