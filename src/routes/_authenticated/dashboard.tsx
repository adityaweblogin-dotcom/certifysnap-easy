import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  CalendarDays,
  Download,
  MailCheck,
  MailX,
  Plus,
  Send,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthUser } from "@/hooks/useAuth";
import { listAuditLogs } from "@/services/audit";
import { listAllCertificates } from "@/services/certificates";
import { listEvents } from "@/services/events";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Certara" },
      {
        name: "description",
        content: "Certificate totals, delivery rate, recent events and recent activity.",
      },
      { property: "og:title", content: "Dashboard — Certara" },
      { property: "og:description", content: "Your certificate operations at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuthUser();
  const events = useQuery({ queryKey: ["events"], queryFn: () => listEvents() });
  const certificates = useQuery({ queryKey: ["certificates", "all"], queryFn: listAllCertificates });
  const activity = useQuery({ queryKey: ["audit", "recent"], queryFn: () => listAuditLogs({ limit: 8 }) });

  const all = certificates.data ?? [];
  const sent = all.filter((c) => c.status === "sent" || c.status === "downloaded").length;
  const downloaded = all.filter((c) => c.downloaded_at).length;
  const failed = all.filter((c) => c.status === "failed").length;
  const rate = all.length > 0 ? Math.round((sent / all.length) * 100) : 0;
  const countsByEvent = new Map<string, number>();
  for (const certificate of all) {
    countsByEvent.set(certificate.event_id, (countsByEvent.get(certificate.event_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back${user?.email ? `, ${user.email.split("@")[0]}` : ""}`}
        description="Everything you have generated, sent and delivered across your events."
        actions={
          <Button asChild>
            <Link to="/events">
              <Plus className="mr-1.5 size-4" /> New event
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Certificates generated" value={all.length} icon={Award} tone="accent" />
        <StatCard label="Sent" value={sent} icon={Send} />
        <StatCard label="Downloaded" value={downloaded} icon={Download} />
        <StatCard label="Delivery rate" value={`${rate}%`} icon={MailCheck} tone="success" />
        <StatCard label="Failed deliveries" value={failed} icon={MailX} tone="destructive" />
        <StatCard label="Events" value={events.data?.length ?? 0} icon={CalendarDays} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(events.data ?? []).slice(0, 6).map((event) => (
              <Link
                key={event.id}
                to="/events/$eventId"
                params={{ eventId: event.id }}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{event.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.event_date ? new Date(event.event_date).toLocaleDateString() : "No date"} ·{" "}
                    {event.certificate_type}
                  </p>
                </div>
                <Badge variant="secondary">{countsByEvent.get(event.id) ?? 0} certificates</Badge>
              </Link>
            ))}
            {(events.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(activity.data ?? []).map((log) => (
              <div key={log.id} className="rounded-lg border border-border px-3 py-2">
                <p className="text-sm font-medium">{log.action.replace(/[._]/g, " ")}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                  {log.actor_email ? ` · ${log.actor_email}` : ""}
                </p>
              </div>
            ))}
            {(activity.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
