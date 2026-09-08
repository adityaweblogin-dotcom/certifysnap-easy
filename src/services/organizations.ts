import { recordAudit } from "./audit";
import { supabase, table, unwrap } from "./db";
import type { AppRole, Organization } from "./types";

export async function listOrganizations(): Promise<Organization[]> {
  return unwrap<Organization[]>(
    await table("organizations").select("*").order("created_at", { ascending: true }),
  );
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const data = unwrap<Organization[]>(await table("organizations").select("*").eq("id", id).limit(1));
  return data[0] ?? null;
}

export async function createOrganization(input: {
  name: string;
  website?: string;
}): Promise<Organization> {
  const { data: auth } = await supabase.auth.getUser();
  const created = unwrap<Organization[]>(
    await table("organizations")
      .insert({
        name: input.name,
        website: input.website ?? null,
        owner_id: auth.user?.id ?? null,
        slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      })
      .select(),
  );
  const org = created[0]!;
  if (auth.user) {
    await table("organization_members").insert({
      organization_id: org.id,
      user_id: auth.user.id,
      role: "admin" as AppRole,
    });
  }
  await recordAudit({
    action: "organization.created",
    entityType: "organization",
    entityId: org.id,
    organizationId: org.id,
    metadata: { name: org.name },
  });
  return org;
}

export async function updateOrganization(
  id: string,
  patch: Partial<Pick<Organization, "name" | "website" | "logo_url" | "signature_url">>,
): Promise<void> {
  unwrap(await table("organizations").update(patch).eq("id", id));
  await recordAudit({
    action: "organization.updated",
    entityType: "organization",
    entityId: id,
    organizationId: id,
    metadata: patch,
  });
}

export async function myOrgRole(organizationId: string): Promise<AppRole | null> {
  const { data, error } = await supabase.rpc("org_role" as never, {
    _org: organizationId,
  } as never);
  if (error) return null;
  return (data as AppRole | null) ?? null;
}
