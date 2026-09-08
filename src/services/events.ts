import { recordAudit } from "./audit";
import { supabase, table, unwrap } from "./db";
import type { EventRecord } from "./types";

export async function listEvents(organizationId?: string): Promise<EventRecord[]> {
  let query = table("events").select("*").order("created_at", { ascending: false });
  if (organizationId) query = query.eq("organization_id", organizationId);
  return unwrap<EventRecord[]>(await query);
}

export async function getEvent(id: string): Promise<EventRecord | null> {
  const rows = unwrap<EventRecord[]>(await table("events").select("*").eq("id", id).limit(1));
  return rows[0] ?? null;
}

export async function createEvent(input: {
  organization_id: string;
  name: string;
  description?: string;
  event_date?: string;
  certificate_type: string;
}): Promise<EventRecord> {
  const { data: auth } = await supabase.auth.getUser();
  const rows = unwrap<EventRecord[]>(
    await table("events")
      .insert({
        organization_id: input.organization_id,
        name: input.name,
        description: input.description ?? null,
        event_date: input.event_date ?? null,
        certificate_type: input.certificate_type,
        created_by: auth.user?.id ?? null,
      })
      .select(),
  );
  const event = rows[0]!;
  await table("templates").insert({ event_id: event.id, name: `${event.name} template` });
  await recordAudit({
    action: "event.created",
    entityType: "event",
    entityId: event.id,
    organizationId: event.organization_id,
    eventId: event.id,
    metadata: { name: event.name },
  });
  return event;
}

export async function updateEvent(id: string, patch: Partial<EventRecord>): Promise<void> {
  unwrap(await table("events").update(patch).eq("id", id));
}

export async function deleteEvent(id: string): Promise<void> {
  unwrap(await table("events").delete().eq("id", id));
  await recordAudit({ action: "event.deleted", entityType: "event", entityId: id, eventId: null });
}

export async function updateSchedule(
  id: string,
  patch: {
    schedule_enabled: boolean;
    schedule_cadence: string;
    schedule_batch_size: number;
    schedule_next_at: string | null;
  },
): Promise<void> {
  unwrap(await table("events").update(patch).eq("id", id));
  await recordAudit({
    action: "event.schedule_updated",
    entityType: "event",
    entityId: id,
    eventId: id,
    metadata: patch,
  });
}

export function nextRunFromCadence(cadence: string, from = new Date()): string {
  const next = new Date(from.getTime());
  if (cadence === "hourly") next.setHours(next.getHours() + 1);
  else if (cadence === "daily") next.setDate(next.getDate() + 1);
  else if (cadence === "weekly") next.setDate(next.getDate() + 7);
  else next.setDate(next.getDate() + 1);
  return next.toISOString();
}
