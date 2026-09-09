import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRoles } from "@/hooks/useAuth";
import { createEvent, listEvents } from "@/services/events";
import { listOrganizations } from "@/services/organizations";

export const Route = createFileRoute("/_authenticated/events/")({
  head: () => ({
    meta: [
      { title: "Events — Certara" },
      {
        name: "description",
        content: "Create events, manage participants and issue certificates for each programme.",
      },
      { property: "og:title", content: "Events — Certara" },
      { property: "og:description", content: "All your certificate programmes in one place." },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { canManage } = useRoles();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [certificateType, setCertificateType] = useState("participation");
  const [organizationId, setOrganizationId] = useState("");

  const events = useQuery({ queryKey: ["events"], queryFn: () => listEvents() });
  const organizations = useQuery({ queryKey: ["organizations"], queryFn: listOrganizations });
  const orgName = new Map((organizations.data ?? []).map((o) => [o.id, o.name]));

  const create = useMutation({
    mutationFn: () =>
      createEvent({
        organization_id: organizationId || (organizations.data?.[0]?.id ?? ""),
        name: name.trim(),
        certificate_type: certificateType,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(eventDate ? { event_date: eventDate } : {}),
      }),
    onSuccess: async () => {
      toast.success("Event created");
      setOpen(false);
      setName("");
      setDescription("");
      setEventDate("");
      await queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canSubmit = name.trim().length > 1 && (organizationId || organizations.data?.[0]?.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Programmes"
        title="Events"
        description="Each event holds its own participants, certificate design, delivery schedule and audit trail."
        actions={
          canManage ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-1.5 size-4" /> New event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="event-name">Event name</Label>
                    <Input
                      id="event-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Spring Hackathon 2026"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="event-org">Organization</Label>
                    <Select
                      value={organizationId || (organizations.data?.[0]?.id ?? "")}
                      onValueChange={setOrganizationId}
                    >
                      <SelectTrigger id="event-org">
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {(organizations.data ?? []).map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="event-date">Date</Label>
                      <Input
                        id="event-date"
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="event-type">Certificate type</Label>
                      <Select value={certificateType} onValueChange={setCertificateType}>
                        <SelectTrigger id="event-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="participation">Participation</SelectItem>
                          <SelectItem value="completion">Completion</SelectItem>
                          <SelectItem value="achievement">Achievement</SelectItem>
                          <SelectItem value="appreciation">Appreciation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="event-description">Description</Label>
                    <Textarea
                      id="event-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => create.mutate()}
                    disabled={!canSubmit || create.isPending}
                  >
                    {create.isPending ? "Creating…" : "Create event"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {(events.data ?? []).length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description="Create your first event to import participants and issue certificates."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(events.data ?? []).map((event) => (
            <Link
              key={event.id}
              to="/events/$eventId"
              params={{ eventId: event.id }}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg font-semibold leading-tight">{event.name}</h2>
                <Badge variant="secondary" className="capitalize">
                  {event.certificate_type}
                </Badge>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {event.description ?? "No description"}
              </p>
              <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {event.event_date
                    ? new Date(event.event_date).toLocaleDateString()
                    : "Date not set"}
                </span>
                <span>{orgName.get(event.organization_id) ?? ""}</span>
              </div>
              {event.schedule_enabled ? (
                <Badge variant="outline" className="w-fit capitalize">
                  Scheduled · {event.schedule_cadence}
                </Badge>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
