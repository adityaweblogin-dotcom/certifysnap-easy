import { buildCertificateValues, generateVerificationCode } from "@/lib/certificate";

import { recordAudit } from "./audit";
import { table, unwrap } from "./db";
import type {
  Certificate,
  DeliveryLog,
  EventRecord,
  Organization,
  Participant,
  TemplateRecord,
} from "./types";

export async function listCertificates(eventId: string): Promise<Certificate[]> {
  return unwrap<Certificate[]>(
    await table("certificates")
      .select("*")
      .eq("event_id", eventId)
      .order("issued_at", { ascending: false }),
  );
}

export async function listAllCertificates(): Promise<Certificate[]> {
  return unwrap<Certificate[]>(
    await table("certificates").select("*").order("issued_at", { ascending: false }).limit(1000),
  );
}

/** Creates (or refreshes) a certificate per participant with a unique verification ID. */
export async function generateCertificates(params: {
  event: EventRecord;
  organization: Organization | null;
  participants: Participant[];
  template: TemplateRecord | null;
  existing: Certificate[];
}): Promise<{ created: number; refreshed: number }> {
  const { event, organization, participants, template, existing } = params;
  const byParticipant = new Map(existing.map((c) => [c.participant_id, c]));
  const inserts: Record<string, unknown>[] = [];
  let refreshed = 0;

  for (const participant of participants) {
    const current = byParticipant.get(participant.id);
    const code = current?.verification_code ?? generateVerificationCode();
    const values = buildCertificateValues(participant, event, organization, code);
    if (current) {
      unwrap(
        await table("certificates")
          .update({ values, template_id: template?.id ?? null })
          .eq("id", current.id),
      );
      refreshed += 1;
    } else {
      inserts.push({
        event_id: event.id,
        participant_id: participant.id,
        template_id: template?.id ?? null,
        verification_code: code,
        values,
        status: "generated",
      });
    }
  }

  if (inserts.length > 0) unwrap(await table("certificates").insert(inserts));

  await recordAudit({
    action: "certificates.generated",
    entityType: "event",
    entityId: event.id,
    organizationId: event.organization_id,
    eventId: event.id,
    metadata: { created: inserts.length, refreshed },
  });

  return { created: inserts.length, refreshed };
}

export async function revokeCertificate(id: string, revoked: boolean): Promise<void> {
  unwrap(await table("certificates").update({ revoked }).eq("id", id));
  await recordAudit({
    action: revoked ? "certificate.revoked" : "certificate.restored",
    entityType: "certificate",
    entityId: id,
  });
}

export async function listDeliveryLogs(eventId: string): Promise<DeliveryLog[]> {
  return unwrap<DeliveryLog[]>(
    await table("delivery_logs")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(300),
  );
}
