import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase, table, unwrap } from "@/services/db";
import type { AppRole } from "@/services/types";

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

/** Global roles for the signed-in user (admin / organizer / viewer). */
export function useRoles() {
  const { user } = useAuthUser();
  const query = useQuery({
    queryKey: ["roles", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const rows = unwrap<{ role: AppRole }[]>(
        await table("user_roles").select("role").eq("user_id", user!.id),
      );
      return rows.map((r) => r.role);
    },
  });
  const roles = query.data ?? [];
  return {
    roles,
    isAdmin: roles.includes("admin"),
    canManage: roles.includes("admin") || roles.includes("organizer"),
    isViewerOnly: roles.length > 0 && roles.every((r) => r === "viewer"),
    loading: query.isLoading,
  };
}
