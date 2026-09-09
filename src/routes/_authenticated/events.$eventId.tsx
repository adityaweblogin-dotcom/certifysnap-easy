import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Award,
  Download,
  Eye,
  Send,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CertificatePreviewDialog } from "@/components/certificates/CertificatePreviewDialog";
import { TemplateDesigner } from "@/components/certificates/TemplateDesigner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ImportWizard } from "@/components/participants/ImportWizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRoles } from "@/hooks/useAuth";
import { availableTokens, buildCertificateValues } from "@/lib/certificate";
import { SAMPLE_CSV } from "@/lib/csv";
import { sendCertificateEmails } from "@/lib/delivery.functions";
import { downloadTextFile } from "@/lib/download";
import { generateCertificates, listCertificates, listDeliveryLogs } from "@/services/certificates";
import { getEvent, nextRunFromCadence, updateSchedule } from "@/services/events";
import { getOrganization } from "@/services/organizations";
import { addParticipant, deleteParticipant, listParticipants } from "@/services/participants";
import { ensureEventTemplate } from "@/services/templates";
import type { Certificate, Participant } from "@/services/types";

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Event workspace — Certara" },
      {
        name: "description",
        content:
          "Participants, certificate design, generation, delivery status and scheduled sending for this event.",
      },
      { property: "og:title", content: "Event workspace — Certara" },
      {
        property: "og:description",
        content: "Import participants, design the certificate and send it out.",
      },
    ],
  }),
  component: EventWorkspace,
});

function EventWorkspace() {
  const { eventId } = Route.useParams();
  const { canManage } = useRoles();
  const queryClient = useQueryClient();
  const send = useServerFn(sendCertificateEmails);

  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<Participant | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const event = useQuery({ queryKey: ["event", eventId], queryFn: () => getEvent(eventId) });
  const organization = useQuery({
    queryKey: ["organization", event.data?.organization_id],
    enabled: Boolean(event.data?.organization_id),
    queryFn: () => getOrganization(event.data!.organization_id),
  });
  const participants = useQuery({
    queryKey: ["participants", eventId],
    queryFn: () => listParticipants(eventId),
  });
  const template = useQuery({
    queryKey: ["template", eventId],
    queryFn: () => ensureEventTemplate(eventId),
  });
  const certificates = useQuery({
    queryKey: ["certificates", eventId],
    queryFn: () => listCertificates(eventId),
  });
  const logs = useQuery({
    queryKey: ["delivery-logs", eventId],
    queryFn: () => listDeliveryLogs(eventId),
  });

  const rows = participants.data ?? [];
  const certs = certificates.data ?? [];
  const certByParticipant = new Map(certs.map((c) => [c.participant_id, c]));
  const sentCount = certs.filter((c) => c.status === "sent" || c.status === "downloaded").length;
  const failedCount = certs.filter((c) => c.status === "failed").length;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["participants", eventId] }),
      queryClient.invalidateQueries({ queryKey: ["certificates", eventId] }),
      queryClient.invalidateQueries({ queryKey: ["delivery-logs", eventId] }),
      queryClient.invalidateQueries({ queryKey: ["audit", "recent"] }),
    ]);
  };

  const addOne = useMutation({
    mutationFn: () =>
      addParticipant(eventId, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        certificate_type: event.data?.certificate_type ?? null,
        data: {},
      }),
    onSuccess: async () => {
      setName("");
      setEmail("");
      toast.success("Participant added");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeOne = useMutation({
    mutationFn: (id: string) => deleteParticipant(id),
    onSuccess: refresh,
    onError: (error: Error) => toast.error(error.message),
  });

  const generate = useMutation({
    mutationFn: () =>
      generateCertificates({
        event: event.data!,
        organization: organization.data ?? null,
        participants: rows,
        template: template.data ?? null,
        existing: certs,
      }),
    onSuccess: async (result) => {
      toast.success(`${result.created} created · ${result.refreshed} refreshed`);
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dispatch = useMutation({
    mutationFn: () => send({ data: { eventId, onlyUnsent: true } }),
    onSuccess: async () => {
      toast.success("Delivery run finished");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const [cadence, setCadence] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState<number | null>(null);
  const currentCadence = cadence ?? event.data?.schedule_cadence ?? "daily";
  const currentBatch = batchSize ?? event.data?.schedule_batch_size ?? 100;

  const saveSchedule = useMutation({
    mutationFn: (enabled: boolean) =>
      updateSchedule(eventId, {
        schedule_enabled: enabled,
        schedule_cadence: currentCadence,
        schedule_batch_size: currentBatch,
        schedule_next_at: enabled ? nextRunFromCadence(currentCadence) : null,
      }),
    onSuccess: async () => {
      toast.success("Schedule saved");
      await queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (event.isLoading) return <p className="text-sm text-muted-foreground">Loading event…</p>;
  if (!event.data) {
    return (
      <EmptyState
        icon={Award}
        title="Event not found"
        description="It may have been deleted, or you may not have access to it."
        action={
          <Button asChild variant="outline">
            <Link to="/events">Back to events</Link>
          </Button>
        }
      />
    );
  }

  const previewValues = preview
    ? buildCertificateValues(
        preview,
        event.data,
        organization.data ?? null,
        certByParticipant.get(preview.id)?.verification_code ?? "PREVIEW",
      )
    : {};

  return (
    <div className="space-y-6">
      <Link
        to="/events"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All events
      </Link>

      <PageHeader
        eyebrow={organization.data?.name ?? "Event"}
        title={event.data.name}
        description={event.data.description ?? undefined}
        actions={
          canManage ? (
            <>
              <Button
                variant="outline"
                onClick={() => generate.mutate()}
                disabled={rows.length === 0 || generate.isPending}
              >
                <Award className="mr-1.5 size-4" />
                {generate.isPending ? "Generating…" : "Generate certificates"}
              </Button>
              <Button onClick={() => dispatch.mutate()} disabled={certs.length === 0 || dispatch.isPending}>
                <Send className="mr-1.5 size-4" />
                {dispatch.isPending ? "Sending…" : "Send now"}
              </Button>
            </>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Participants" value={rows.length} icon={Users} />
        <StatCard label="Certificates" value={certs.length} icon={Award} tone="accent" />
        <StatCard label="Sent" value={sentCount} icon={Send} tone="success" />
        <StatCard label="Failed" value={failedCount} icon={Download} tone="destructive" />
      </div>

      <Tabs defaultValue="participants" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="space-y-4">
          {canManage ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Add participants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="Participant name"
                  />
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-label="Participant email"
                  />
                  <Button
                    onClick={() => addOne.mutate()}
                    disabled={name.trim().length < 2 || !email.includes("@") || addOne.isPending}
                  >
                    <UserPlus className="mr-1.5 size-4" /> Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setImportOpen(true)}>
                    <Upload className="mr-1.5 size-4" /> Import spreadsheet
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => downloadTextFile(SAMPLE_CSV, "participants-sample.csv")}
                  >
                    Download sample file
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No participants yet"
              description="Add them one by one, or import a spreadsheet with names and emails."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((participant) => {
                    const certificate = certByParticipant.get(participant.id);
                    return (
                      <TableRow key={participant.id}>
                        <TableCell className="font-medium">{participant.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {participant.email}
                        </TableCell>
                        <TableCell className="capitalize text-sm">
                          {participant.certificate_type ?? event.data!.certificate_type}
                        </TableCell>
                        <TableCell>
                          {certificate ? (
                            <Badge variant="secondary" className="capitalize">
                              {certificate.status}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not generated</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Preview certificate"
                            onClick={() => setPreview(participant)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          {canManage ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Remove participant"
                              onClick={() => removeOne.mutate(participant.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="design">
          {template.data ? (
            <TemplateDesigner
              template={template.data}
              previewValues={buildCertificateValues(
                rows[0] ?? { name: "Sample Name", email: "sample@example.com", data: {} },
                event.data,
                organization.data ?? null,
                "CERT-PREVIEW",
              )}
              tokens={availableTokens(rows)}
              participantColumns={Object.keys(rows[0]?.data ?? {})}
              canEdit={canManage}
              onSaved={() => {
                void queryClient.invalidateQueries({ queryKey: ["template", eventId] });
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Preparing design…</p>
          )}
        </TabsContent>

        <TabsContent value="certificates">
          {certs.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No certificates generated"
              description="Generate certificates once your participant list is validated."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Verification ID</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Downloads</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certs.map((certificate: Certificate) => (
                    <TableRow key={certificate.id}>
                      <TableCell className="font-mono text-xs">
                        <Link
                          to="/verify/$code"
                          params={{ code: certificate.verification_code }}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {certificate.verification_code}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {certificate.values['recipient_name'] ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={certificate.status === "failed" ? "destructive" : "secondary"}
                          className="capitalize"
                        >
                          {certificate.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(certificate.issued_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">{certificate.download_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Scheduled sending</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Send automatically</p>
                  <p className="text-xs text-muted-foreground">
                    {event.data.schedule_next_at
                      ? `Next run ${new Date(event.data.schedule_next_at).toLocaleString()}`
                      : "Currently off"}
                  </p>
                </div>
                <Switch
                  checked={event.data.schedule_enabled}
                  disabled={!canManage || saveSchedule.isPending}
                  onCheckedChange={(checked) => saveSchedule.mutate(checked)}
                  aria-label="Toggle scheduled sending"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cadence">Cadence</Label>
                  <Select value={currentCadence} onValueChange={setCadence} disabled={!canManage}>
                    <SelectTrigger id="cadence">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="batch">Batch size</Label>
                  <Input
                    id="batch"
                    type="number"
                    min={1}
                    max={500}
                    value={currentBatch}
                    disabled={!canManage}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                  />
                </div>
              </div>
              {canManage ? (
                <Button
                  variant="outline"
                  onClick={() => saveSchedule.mutate(event.data!.schedule_enabled)}
                  disabled={saveSchedule.isPending}
                >
                  Save schedule
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {(logs.data ?? []).length === 0 ? (
            <EmptyState icon={Send} title="No delivery attempts yet" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(logs.data ?? []).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">{log.recipient_email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={log.status === "failed" ? "destructive" : "secondary"}
                          className="capitalize"
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-60 truncate text-xs text-muted-foreground">
                        {log.detail ?? ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ImportWizard
        open={importOpen}
        onOpenChange={setImportOpen}
        eventId={eventId}
        existingEmails={rows.map((r) => r.email)}
        onImported={() => {
          void refresh();
        }}
      />

      <CertificatePreviewDialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        template={template.data ?? null}
        values={previewValues}
        title={preview?.name ?? "Certificate"}
      />
    </div>
  );
}
