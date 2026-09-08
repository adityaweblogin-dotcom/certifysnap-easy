import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "accent" | "success" | "destructive";
}) {
  const toneClass = {
    default: "bg-secondary text-secondary-foreground",
    accent: "bg-accent/20 text-accent-foreground",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  }[tone];

  return (
    <Card className="shadow-none">
      <CardContent className="flex items-start gap-4 p-5">
        {Icon ? (
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", toneClass)}>
            <Icon className="size-5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-2xl font-semibold">{value}</p>
          {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
