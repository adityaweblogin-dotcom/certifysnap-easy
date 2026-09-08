import { Download, ExternalLink } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { CertificateCanvas } from "@/components/certificates/CertificateCanvas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { verificationUrl } from "@/lib/certificate";
import { downloadNodeAsPng } from "@/lib/download";
import type { TemplateRecord } from "@/services/types";

export function CertificatePreviewDialog({
  open,
  onOpenChange,
  template,
  values,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateRecord | null;
  values: Record<string, string>;
  title: string;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const code = values["certificate_id"] ?? "";

  async function handleDownload() {
    if (!canvasRef.current || !template) return;
    setBusy(true);
    try {
      await downloadNodeAsPng(canvasRef.current, `certificate-${code || "preview"}`, {
        width: template.width,
        height: template.height,
      });
      toast.success("Certificate image downloaded");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
        </DialogHeader>
        {template ? (
          <div className="overflow-x-auto">
            <div className="mx-auto w-fit rounded-lg border border-border shadow-plate">
              <CertificateCanvas ref={canvasRef} template={template} values={values} scale={0.62} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">This event has no template yet.</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Certificate ID <span className="font-medium text-foreground">{code || "—"}</span>
          </p>
          <div className="flex gap-2">
            {code ? (
              <Button variant="outline" size="sm" asChild>
                <a href={verificationUrl(code)} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 size-4" /> Verification page
                </a>
              </Button>
            ) : null}
            <Button size="sm" onClick={handleDownload} disabled={busy || !template}>
              <Download className="mr-1.5 size-4" /> Download PNG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
