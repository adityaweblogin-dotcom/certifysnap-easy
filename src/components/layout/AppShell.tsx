import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Building2,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuthUser, useRoles } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { supabase } from "@/services/db";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/organizations", label: "Organizations", icon: Building2 },
  { to: "/audit", label: "Audit log", icon: ScrollText },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuthUser();
  const { roles } = useRoles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground">
      <Link to="/dashboard" className="flex items-center gap-2 px-2 pt-1">
        <Award className="size-6 text-sidebar-primary" />
        <span className="font-display text-lg font-semibold tracking-tight">Certara</span>
      </Link>
      <NavLinks onNavigate={() => setOpen(false)} />
      <div className="mt-auto space-y-3 border-t border-sidebar-border pt-4">
        <div className="px-2">
          <p className="truncate text-sm font-medium">{user?.email ?? "Signed in"}</p>
          <p className="text-xs capitalize text-sidebar-foreground/70">
            {roles.length > 0 ? roles.join(", ") : "member"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="mr-2 size-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>
          <span className="font-display text-base font-semibold">Certara</span>
          <Link to="/verify" className="ml-auto text-sm text-muted-foreground">
            <ShieldCheck className="size-4" />
          </Link>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
