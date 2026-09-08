import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  eventId: z.string().uuid(),
  certificateIds: z.array(z.string().uuid()).max(500).optional(),
  onlyUnsent: z.boolean().optional(),
});

export const sendCertificateEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { sendCertificatesFor } = await import("./delivery.server");
    const request = getRequest();
    const origin = new URL(request.url).origin;
    return sendCertificatesFor({
      client: context.supabase,
      eventId: data.eventId,
      origin,
      ...(data.certificateIds ? { certificateIds: data.certificateIds } : {}),
      onlyUnsent: data.onlyUnsent ?? true,
      actor: { id: context.userId, email: (context.claims as { email?: string } | null)?.email ?? null },
      triggeredBy: "manual",
    });
  });
