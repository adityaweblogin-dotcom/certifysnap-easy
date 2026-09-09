import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useRoles } from "@/hooks/useAuth";
import { listEvents } from "@/services/events";
import { createOrganization, listOrganizations } from "@/services/organizations";

export const Route = createFileRoute("/_authenticated/organizations")({
  head: () => ({
    meta: [
      { title: "Organizations — Certara" },
      {
        name: "description",
        content: "Manage the institutions and companies that issue your certificates.",
      },
      { property: "og:title", content: "Organizations — Certara" },
      {
        property: "og:description",
        content: "Issuers, branding and the events that belong to each of them.",
      },
    ],
  }),
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const { canManage } = useRoles();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");

  const organizations = useQuery({ queryKey: ["organizations"], queryFn: listOrganizations });
  const events = useQuery({ queryKey: ["events"], queryFn: () => listEvents() });

  const counts = new Map<string, number>();
  for (const event of events.data ?? []) {
    counts.set(event.organization_id, (counts.get(event.organization_id) ?? 0) + 1);
  }

  const create = useMutation({
    mutationFn: () =>
      createOrganization({
        name: name.trim(),
        ...(website.trim() ? { website: website.trim() } : {}),
      }),
    onSuccess: async () => {
      toast.success("Organization created");
      setOpen(false);
      setName("");
      setWebsite("");
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Issuers"
        title="Organizations"
        description="Certificates are always issued on behalf of an organization."
        actions={
          canManage ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-1.5 size-4" /> New organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create organization</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="org-name">Name</Label>
                    <Input
                      id="org-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Northgate Institute"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="org-website">Website</Label>
                    <Input
                      id="org-website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.org"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => create.mutate()}
                    disabled={name.trim().length < 2 || create.isPending}
                  >
                    {create.isPending ? "Creating…" : "Create organization"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      {(organizations.data ?? []).length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          description="Add the institution or company whose name appears on the certificates."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(organizations.data ?? []).map((org) => (
            <Card key={org.id}>
              <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
                <CardTitle className="text-base leading-tight">{org.name}</CardTitle>
                {org.is_demo ? <Badge variant="outline">Demo</Badge> : null}
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{counts.get(org.id) ?? 0} events</p>
                {org.website ? (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {org.website}
                  </a>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
