import { recordAudit } from "./audit";
import { supabase, table, unwrap } from "./db";
import type { TemplateElement, TemplateRecord } from "./types";

const BUCKET = "certificate-assets";

export async function getEventTemplate(eventId: string): Promise<TemplateRecord | null> {
  const rows = unwrap<TemplateRecord[]>(
    await table("templates")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .limit(1),
  );
  return rows[0] ?? null;
}

export async function ensureEventTemplate(eventId: string): Promise<TemplateRecord> {
  const existing = await getEventTemplate(eventId);
  if (existing) return existing;
  const rows = unwrap<TemplateRecord[]>(
    await table("templates").insert({ event_id: eventId }).select(),
  );
  return rows[0]!;
}

export async function saveTemplate(
  id: string,
  patch: {
    name?: string;
    elements?: TemplateElement[];
    field_map?: Record<string, string>;
    background_url?: string | null;
    background_color?: string;
    width?: number;
    height?: number;
  },
): Promise<void> {
  unwrap(await table("templates").update(patch).eq("id", id));
  await recordAudit({ action: "template.updated", entityType: "template", entityId: id });
}

/** Uploads a design asset and returns a long-lived signed URL for rendering. */
export async function uploadTemplateAsset(file: File, eventId: string): Promise<string> {
  const path = `${eventId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signError || !data) throw new Error(signError?.message ?? "Could not read uploaded file");
  return data.signedUrl;
}
