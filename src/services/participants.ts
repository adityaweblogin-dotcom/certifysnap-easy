import { recordAudit } from "./audit";
import { table, unwrap } from "./db";
import type { Participant } from "./types";

export interface ParticipantDraft {
  name: string;
  email: string;
  certificate_type: string | null;
  data: Record<string, string>;
}

export async function listParticipants(eventId: string): Promise<Participant[]> {
  return unwrap<Participant[]>(
    await table("participants")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true }),
  );
}

export async function addParticipant(
  eventId: string,
  draft: ParticipantDraft,
): Promise<Participant> {
  const rows = unwrap<Participant[]>(
    await table("participants")
      .insert({ event_id: eventId, ...draft })
      .select(),
  );
  await recordAudit({
    action: "participant.created",
    entityType: "participant",
    ...(rows[0]?.id ? { entityId: rows[0].id } : {}),
    eventId,
    metadata: { email: draft.email },
  });
  return rows[0]!;
}

export async function updateParticipant(
  id: string,
  patch: Partial<ParticipantDraft>,
): Promise<void> {
  unwrap(await table("participants").update(patch).eq("id", id));
  await recordAudit({
    action: "participant.updated",
    entityType: "participant",
    entityId: id,
    metadata: patch as Record<string, unknown>,
  });
}

export async function deleteParticipant(id: string): Promise<void> {
  unwrap(await table("participants").delete().eq("id", id));
  await recordAudit({ action: "participant.deleted", entityType: "participant", entityId: id });
}

export async function bulkImportParticipants(
  eventId: string,
  drafts: ParticipantDraft[],
  source: string,
): Promise<{ imported: number }> {
  if (drafts.length === 0) return { imported: 0 };
  const payload = drafts.map((d) => ({ event_id: eventId, ...d }));
  unwrap(await table("participants").upsert(payload, { onConflict: "event_id,email" }));
  await recordAudit({
    action: "participants.imported",
    entityType: "event",
    entityId: eventId,
    eventId,
    metadata: { imported: drafts.length, source },
  });
  return { imported: drafts.length };
}
