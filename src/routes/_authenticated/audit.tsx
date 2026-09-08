import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAuditLogs } from "@/services/audit";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit log — Certara" },
      {
        name: "description",
        content:
          "Persistent record of certificate generation, verification attempts, imports and bulk deliveries.",
      },
      { property: "og:title", content: "Audit log — Certara" },
      { property: "og:description", content: "Who did what, and when, across your certificates." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const [search, setSearch] = useState("");
  const logs = useQuery({ queryKey: ["audit", "all"], queryFn: () => listAuditLogs({ limit: 300 }) });
  const rows = (logs.data ?? []).filter((log) =>
    `${log.action} ${log.actor_email ?? ""} ${log.entity_id ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compliance"
        title="Audit log"
        description="Generation, verification attempts, participant imports and bulk delivery actions are recorded permanently."
      />
      <Input
        placeholder="Search by action, person or record"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-sm"
      />
      {rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="No matching activity" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.actor_email ?? "system"}
                  </TableCell>
                  <TableCell className="max-w-40 truncate text-xs">
                    {log.entity_type ? `${log.entity_type}: ${log.entity_id ?? ""}` : "—"}
                  </TableCell>
                  <TableCell className="max-w-60 truncate text-xs text-muted-foreground">
                    {JSON.stringify(log.metadata)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
