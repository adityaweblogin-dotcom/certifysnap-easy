import type { EventRecord, Organization, Participant, TemplateElement } from "@/services/types";

export const CORE_FIELDS = [
  "name",
  "email",
  "certificate_type",
  "event_name",
  "event_date",
  "organization_name",
  "certificate_id",
] as const;

export function generateVerificationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) suffix += alphabet[byte % alphabet.length];
  return `CERT-${new Date().getFullYear()}-${suffix}`;
}

/** Merges participant + event + organization data into the token values used on a certificate. */
export function buildCertificateValues(
  participant: Participant,
  event: EventRecord,
  organization: Organization | null,
  verificationCode: string,
): Record<string, string> {
  const values: Record<string, string> = {
    name: participant.name,
    email: participant.email,
    certificate_type: participant.certificate_type ?? event.certificate_type,
    event_name: event.name,
    event_date: event.event_date ?? "",
    organization_name: organization?.name ?? "",
    certificate_id: verificationCode,
  };
  for (const [key, value] of Object.entries(participant.data ?? {})) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

export function renderTokens(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, token: string) => values[token] ?? "");
}

export function elementText(el: TemplateElement, values: Record<string, string>): string {
  if (el.type === "field") {
    const raw = el.text && el.text.trim().length > 0 ? el.text : `{{${el.field ?? ""}}}`;
    return renderTokens(raw, values);
  }
  return renderTokens(el.text ?? "", values);
}

export function verificationUrl(code: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/verify/${code}`;
}

export function availableTokens(participants: { data: Record<string, string> }[]): string[] {
  const extra = new Set<string>();
  for (const p of participants) {
    for (const key of Object.keys(p.data ?? {})) extra.add(key);
  }
  return [...CORE_FIELDS, ...[...extra].filter((k) => !CORE_FIELDS.includes(k as never))];
}
