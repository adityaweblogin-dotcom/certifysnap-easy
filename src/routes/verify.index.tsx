import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/verify/")({
  head: () => ({
    meta: [
      { title: "Verify a certificate — Certara" },
      {
        name: "description",
        content: "Enter a certificate ID or scan its QR code to check that a certificate is genuine.",
      },
      { property: "og:title", content: "Verify a certificate — Certara" },
      { property: "og:description", content: "Check the authenticity of any issued certificate." },
    ],
  }),
  component: VerifyLanding,
});

function VerifyLanding() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  return (
    <div className="bg-parchment flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <ShieldCheck className="size-6 text-accent" />
          <CardTitle className="font-display text-2xl">Verify a certificate</CardTitle>
          <CardDescription>
            Enter the certificate ID printed on the certificate, or scan its QR code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = code.trim();
              if (trimmed.length > 0) navigate({ to: "/verify/$code", params: { code: trimmed } });
            }}
          >
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="CERT-2026-XXXXXXXX"
              maxLength={64}
            />
            <Button type="submit">Verify</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
