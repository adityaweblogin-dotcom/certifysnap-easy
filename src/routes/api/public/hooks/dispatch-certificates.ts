import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/**
 * Scheduled bulk sender: processes every event whose send schedule is due,
 * emails pending certificates in batches, then advances the next run time.
 */
export const Route = createFileRoute("/api/public/hooks/dispatch-certificates")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await authenticateCronRequest(request);
        if (unauthorized) return unauthorized;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendCertificatesFor } = await import("@/lib/delivery.server");
        const origin = new URL(request.url).origin;
        const now = new Date();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = supabaseAdmin as any;
        const { data: events, error } = await client
          .from("events")
          .select("id, schedule_cadence, schedule_batch_size, schedule_next_at")
          .eq("schedule_enabled", true)
          .or(`schedule_next_at.is.null,schedule_next_at.lte.${now.toISOString()}`);

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        const results: Record<string, unknown>[] = [];
        for (const event of events ?? []) {
          try {
            const outcome = await sendCertificatesFor({
              client,
              eventId: event.id as string,
              origin,
              limit: (event.schedule_batch_size as number) ?? 50,
              onlyUnsent: true,
              triggeredBy: "schedule",
            });
            results.push({ eventId: event.id, ...outcome });
          } catch (sendError) {
            results.push({ eventId: event.id, error: (sendError as Error).message });
          }
          const next = new Date(now.getTime());
          const cadence = (event.schedule_cadence as string) ?? "daily";
          if (cadence === "hourly") next.setHours(next.getHours() + 1);
          else if (cadence === "weekly") next.setDate(next.getDate() + 7);
          else next.setDate(next.getDate() + 1);
          await client
            .from("events")
            .update({
              schedule_last_run_at: now.toISOString(),
              schedule_next_at: next.toISOString(),
            })
            .eq("id", event.id);
        }

        return Response.json({ processed: results.length, results });
      },
    },
  },
});
