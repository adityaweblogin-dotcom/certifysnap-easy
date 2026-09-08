// Server-only certificate delivery logic, shared by the interactive send action
// and the scheduled dispatcher.

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SendOutcome {
  sent: number;
  failed: number;
  skipped: number;
  simulated: boolean;
}

interface CertRow {
  id: string;
  verification_code: string;
  event_id: string;
  status: string;
  participants: { name: string; email: string } | null;
}

function certificateEmailHtml(params: {
  name: string;
  eventName: string;
  organizationName: string;
  code: string;
  verifyUrl: string;
}): string {
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#f7f5ef;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #e8e3d6">
    <p style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#8a7a4e;margin:0 0 12px">${params.organizationName}</p>
    <h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 16px;color:#1f2937">Your certificate is ready</h1>
    <p style="color:#374151;line-height:1.6">Hello ${params.name},</p>
    <p style="color:#374151;line-height:1.6">Your certificate for <strong>${params.eventName}</strong> has been issued. You can view, download and verify it any time using the link below.</p>
    <p style="margin:24px 0"><a href="${params.verifyUrl}" style="background:#1f2937;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">View &amp; download certificate</a></p>
    <p style="color:#6b7280;font-size:13px">Certificate ID: <strong>${params.code}</strong></p>
  </div></body></html>`;
}

async function deliver(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; simulated: boolean; detail: string }> {
  const apiKey = process.env['RESEND_API_KEY'];
  const from = process.env['CERTIFICATE_FROM_EMAIL'] ?? 'Certificates <onboarding@resend.dev>';
  if (!apiKey) {
    return {
      ok: true,
      simulated: true,
      detail: 'Recorded as delivered — no email provider connected yet',
    };
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!response.ok) {
      return { ok: false, simulated: false, detail: `Provider responded ${response.status}` };
    }
    return { ok: true, simulated: false, detail: 'Delivered by email provider' };
  } catch (error) {
    return { ok: false, simulated: false, detail: (error as Error).message };
  }
}

export async function sendCertificatesFor(params: {
  client: any;
  eventId: string;
  origin: string;
  certificateIds?: string[];
  limit?: number;
  onlyUnsent?: boolean;
  actor?: { id: string | null; email: string | null };
  triggeredBy: string;
}): Promise<SendOutcome> {
  const { client, eventId, origin, certificateIds, limit = 200, onlyUnsent = true } = params;

  const { data: event } = await client
    .from('events')
    .select('id, name, organization_id, organizations(name)')
    .eq('id', eventId)
    .maybeSingle();
  if (!event) throw new Error('Event not found');

  let query = client
    .from('certificates')
    .select('id, verification_code, event_id, status, participants(name, email)')
    .eq('event_id', eventId)
    .eq('revoked', false)
    .limit(limit);
  if (certificateIds && certificateIds.length > 0) query = query.in('id', certificateIds);
  else if (onlyUnsent) query = query.in('status', ['generated', 'failed']);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  const certificates = (rows ?? []) as CertRow[];
  const outcome: SendOutcome = { sent: 0, failed: 0, skipped: 0, simulated: false };
  const organizationName = (event.organizations as { name: string } | null)?.name ?? '';

  for (const certificate of certificates) {
    const recipient = certificate.participants;
    if (!recipient?.email) {
      outcome.skipped += 1;
      continue;
    }
    const verifyUrl = `${origin}/verify/${certificate.verification_code}`;
    const result = await deliver(
      recipient.email,
      `Your certificate for ${event.name as string}`,
      certificateEmailHtml({
        name: recipient.name,
        eventName: event.name as string,
        organizationName,
        code: certificate.verification_code,
        verifyUrl,
      }),
    );
    if (result.simulated) outcome.simulated = true;

    await client
      .from('certificates')
      .update(
        result.ok
          ? { status: 'sent', sent_at: new Date().toISOString(), last_error: null }
          : { status: 'failed', last_error: result.detail },
      )
      .eq('id', certificate.id);

    await client.from('delivery_logs').insert({
      event_id: eventId,
      certificate_id: certificate.id,
      recipient_email: recipient.email,
      status: result.ok ? 'sent' : 'failed',
      detail: result.detail,
    });

    if (result.ok) outcome.sent += 1;
    else outcome.failed += 1;
  }

  await client.from('audit_logs').insert({
    actor_id: params.actor?.id ?? null,
    actor_email: params.actor?.email ?? null,
    action: 'certificates.bulk_sent',
    entity_type: 'event',
    entity_id: eventId,
    organization_id: event.organization_id,
    event_id: eventId,
    metadata: { ...outcome, triggered_by: params.triggeredBy },
  });

  return outcome;
}
