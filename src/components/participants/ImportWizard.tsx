import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  autoMap,
  isBlockingIssue,
  OPTIONAL_TARGETS,
  parseDelimited,
  REQUIRED_TARGETS,
  SAMPLE_CSV,
  validateRows,
  type ColumnMapping,
  type ParsedSheet,
} from "@/lib/csv";
import { downloadTextFile } from "@/lib/download";
import { bulkImportParticipants } from "@/services/participants";

const NONE = "__none__";

export function ImportWizard({
  open,
  onOpenChange,
  eventId,
  existingEmails,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  existingEmails: string[];
  onImported: () => void;
}) {
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const report = useMemo(
    () => (sheet ? validateRows(sheet, mapping, existingEmails) : null),
    [sheet, mapping, existingEmails],
  );
  const blocking = report?.issues.filter(isBlockingIssue) ?? [];
  const canImport = Boolean(report && report.valid.length > 0 && blocking.length === 0);

  async function handleFile(file: File) {
    try {
      const parsed = await parseDelimited(file);
      if (parsed.headers.length === 0) throw new Error("No columns detected in this file");
      setSheet(parsed);
      setMapping(autoMap(parsed.headers));
      setFileName(file.name);
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function handleImport() {
    if (!report || !canImport) return;
    setImporting(true);
    try {
      const result = await bulkImportParticipants(eventId, report.valid, fileName || "csv-upload");
      toast.success(`${result.imported} participants imported`);
      onImported();
      onOpenChange(false);
      setSheet(null);
      setMapping({});
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Import participants</DialogTitle>
        </DialogHeader>

        {!sheet ? (
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center transition-colors hover:bg-muted/50">
              <FileSpreadsheet className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Choose a CSV file</p>
                <p className="text-sm text-muted-foreground">
                  Name and email are required. Any extra columns become certificate fields.
                </p>
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                  event.target.value = "";
                }}
              />
              <Button size="sm" variant="outline" asChild>
                <span>
                  <Upload className="mr-1.5 size-4" /> Select file
                </span>
              </Button>
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadTextFile(SAMPLE_CSV, "participants-sample.csv")}
            >
              <Download className="mr-1.5 size-4" /> Download sample CSV
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">1. Map your columns</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {[...REQUIRED_TARGETS, ...OPTIONAL_TARGETS].map((target) => {
                  const required = (REQUIRED_TARGETS as readonly string[]).includes(target);
                  return (
                    <div key={target} className="space-y-1.5">
                      <Label className="flex items-center gap-2">
                        {target}
                        {required ? (
                          <Badge variant="secondary" className="text-[10px]">
                            required
                          </Badge>
                        ) : null}
                      </Label>
                      <Select
                        value={mapping[target] ?? NONE}
                        onValueChange={(value) =>
                          setMapping((prev) => {
                            const next = { ...prev };
                            if (value === NONE) delete next[target];
                            else next[target] = value;
                            return next;
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Not mapped" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Not mapped</SelectItem>
                          {sheet.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">2. Preview</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Certificate type</TableHead>
                      <TableHead>Extra fields</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(report?.valid ?? []).slice(0, 5).map((draft) => (
                      <TableRow key={draft.email}>
                        <TableCell className="font-medium">{draft.name}</TableCell>
                        <TableCell>{draft.email}</TableCell>
                        <TableCell>{draft.certificate_type ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {Object.entries(draft.data)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(" · ") || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-3 text-sm text-muted-foreground">
                  {report?.totalRows ?? 0} rows read · {report?.valid.length ?? 0} ready to import ·{" "}
                  {blocking.length} need fixing
                </p>
              </CardContent>
            </Card>

            {blocking.length > 0 ? (
              <Card className="border-destructive/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <AlertTriangle className="size-4" /> 3. Fix these rows before importing
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-56 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Row</TableHead>
                        <TableHead>Column</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Problem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blocking.slice(0, 60).map((issue, index) => (
                        <TableRow key={`${issue.row}-${issue.column}-${index}`}>
                          <TableCell>{issue.row}</TableCell>
                          <TableCell>{issue.column}</TableCell>
                          <TableCell className="max-w-40 truncate">{issue.value || "—"}</TableCell>
                          <TableCell className="text-destructive">{issue.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <p className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="size-4" /> All rows pass validation.
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSheet(null);
                  setMapping({});
                }}
              >
                Choose another file
              </Button>
              <Button onClick={handleImport} disabled={!canImport || importing}>
                Import {report?.valid.length ?? 0} participants
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
