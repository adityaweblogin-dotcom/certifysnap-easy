import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  CalendarClock,
  FileSpreadsheet,
  MailCheck,
  PenTool,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Certara — Generate & deliver certificates at scale" },
      {
        name: "description",
        content:
          "Upload participants, design a certificate once, generate personalised copies with QR verification, and deliver them in bulk on a schedule.",
      },
      { property: "og:title", content: "Certara — Certificates at scale" },
      {
        property: "og:description",
        content:
          "Participant import, certificate designer, verification IDs and scheduled bulk delivery in one platform.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: FileSpreadsheet,
    title: "Validated participant import",
    body: "Upload a CSV, map your columns, and fix flagged rows before anything is generated.",
  },
  {
    icon: PenTool,
    title: "Drag-and-drop designer",
    body: "Place text, logos, signatures and dynamic participant fields exactly where you want them.",
  },
  {
    icon: ShieldCheck,
    title: "QR verification",
    body: "Every certificate carries a unique ID and QR code that anyone can verify publicly.",
  },
  {
    icon: CalendarClock,
    title: "Scheduled bulk sending",
    body: "Choose a cadence per event and let batches go out automatically.",
  },
  {
    icon: MailCheck,
    title: "Delivery tracking",
    body: "See what was sent, what failed, and what recipients downloaded.",
  },
  {
    icon: Award,
    title: "Roles that fit teams",
    body: "Admins, organizers and viewers get exactly the access they need.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2">
          <Award className="size-6 text-accent" />
          <span className="font-display text-lg font-semibold">Certara</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/verify">Verify a certificate</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="bg-parchment mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Certificate operations platform
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
          Issue thousands of certificates without touching a design tool twice.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Import your participants, design the certificate once, and Certara generates a personalised,
          verifiable copy for everyone — then delivers them individually or on a schedule.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link to="/auth">Start free with demo data</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/verify">Verify a certificate ID</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="h-full">
              <CardContent className="p-6">
                <feature.icon className="size-5 text-accent" />
                <h2 className="mt-4 font-display text-lg font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Certara · certificate generation, verification and delivery
      </footer>
    </div>
  );
}
