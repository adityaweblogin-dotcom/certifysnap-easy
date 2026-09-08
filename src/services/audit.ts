import { supabase, table, unwrap } from "./db";
import type { AuditLog } from "./types";

export interface AuditInput {
  action: string;
  entityType?: string;
  entityId?: string;
  organizationId?: string | null;
  eventId?: string | null;
  metadata?: Record<string, unknown>;
}

/** Persistent audit trail — fire-and-forget so UI flows never break on logging. */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    await table("audit_logs").insert({
      actor_id: data.user?.id ?? null,
      actor_email: data.user?.email ?? null,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      organization_id: input.organizationId ?? null,
      event_id: input.eventId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.warn("audit log failed", error);
  }
}

export async function listAuditLogs(filters?: {
  eventId?: string;
  action?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  let query = table("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 200);
  if (filters?.eventId) query = query.eq("event_id", filters.eventId);
  if (filters?.action) query = query.eq("action", filters.action);
  return unwrap<AuditLog[]>(await query);
}
