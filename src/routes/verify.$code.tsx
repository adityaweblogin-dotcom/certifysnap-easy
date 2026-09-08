import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, CalendarDays, Building2, ShieldAlert, ShieldX } from "lucide-react";
import { useEffect } from "react";

import { QrCode } from "@/components/certificates/QrCode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { verificationUrl } from "@/lib/certificate";
import { rpc } from "@/services/db";
import type { VerificationResult } from "@/services/types";

export const Route = createFileRoute("/verify/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Certificate ${params.code} — verification` },
      {
        name: "description",
        content: `Public verification result for certificate ${params.code}, including event and recipient details.`,
      },
      { property: "og:title", content: `Certificate ${params.code}` },
      { property: "og:description", content: "Public certificate verification result." },
    ],
  }),
  component: VerifyCode,
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
      We couldn't check this certificate right now. Please try again shortly.
    </div>
  ),
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

function VerifyCode() {
  const { code } = Route.useParams();
  const query = useQuery({
    queryKey: ["verify", code],
    queryFn: async () => {
      const { data, error } = await rpc("verify_certificate", { _code: code });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as VerificationResult[];
      return rows[0] ?? null;
    },
  });

  useEffect(() => {
    if (query.isLoading) return;
    void rpc("log_verification_attempt", { _code: code, _found: Boolean(query.data) });
  }, [code, query.data, query.isLoading]);

  const result = query.data ?? null;
  const state = query.isLoading
    ? "loading"
    : !result
      ? "unknown"
      : result.revoked
        ? "revoked"
        : "valid";

  return (
    <div className="bg-parchment min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="font-display text-lg font-semibold">
          Certara
        </Link>

        <Card className="mt-6 overflow-hidden">
          <CardHeader
            className={
              state === "valid"
                ? "bg-success/12"
                : state === "revoked"
                  ? "bg-destructive/12"
                  : "bg-muted"
            }
          >
            <div className="flex items-start gap-3">
              {state === "valid" ? (
                <BadgeCheck className="mt-0.5 size-7 text-success" />
              ) : state === "revoked" ? (
                <ShieldX className="mt-0.5 size-7 text-destructive" />
              ) : (
                <ShieldAlert className="mt-0.5 size-7 text-muted-foreground" />
              )}
              <div>
                <CardTitle className="font-display text-2xl">
                  {state === "loading"
                    ? "Checking certificate…"
                    : state === "valid"
                      ? "Certificate is valid"
                      : state === "revoked"
                        ? "Certificate has been revoked"
                        : "No certificate found"}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {state === "valid"
                    ? "This certificate was issued by the organization below and has not been revoked."
                    : state === "revoked"
                      ? "The issuing organization has withdrawn this certificate."
                      : state === "unknown"
                        ? `We have no record of certificate ID “${code}”.`
                        : ""}
                </p>
              </div>
            </div>
          </CardHeader>

          {result ? (
            <CardContent className="pt-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Recipient
                  </p>
                  <p className="font-display text-2xl font-semibold">{result.recipient_name}</p>
                  <p className="text-sm text-muted-foreground">{result.recipient_email_masked}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">{result.certificate_type ?? "Certificate"}</Badge>
                    <Badge variant="outline" className="uppercase">
                      {result.status}
                    </Badge>
                  </div>
                </div>
                <QrCode value={verificationUrl(result.verification_code)} size={110} />
              </div>

              <Separator className="my-5" />
              <Row label="Certificate ID" value={result.verification_code} />
              <Row label="Event" value={result.event_name} />
              <Row
                label="Event date"
                value={result.event_date ? new Date(result.event_date).toLocaleDateString() : ""}
              />
              <Row label="Issued by" value={result.organization_name} />
              <Row label="Issued on" value={new Date(result.issued_at).toLocaleString()} />
              <Row
                label="Delivered on"
                value={result.sent_at ? new Date(result.sent_at).toLocaleString() : "Not sent yet"}
              />

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <Building2 className="size-4" /> {result.organization_name}
                <CalendarDays className="size-4" /> {result.event_name}
              </div>
            </CardContent>
          ) : state === "unknown" ? (
            <CardContent className="pt-6">
              <Button variant="outline" asChild>
                <Link to="/verify">Try another certificate ID</Link>
              </Button>
            </CardContent>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
