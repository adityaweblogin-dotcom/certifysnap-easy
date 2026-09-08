import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Braces,
  Copy,
  Image as ImageIcon,
  QrCode as QrIcon,
  Save,
  Square,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CertificateCanvas } from "@/components/certificates/CertificateCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { CORE_FIELDS } from "@/lib/certificate";
import { saveTemplate, uploadTemplateAsset } from "@/services/templates";
import type { TemplateElement, TemplateRecord } from "@/services/types";

const FONTS = ["Inter", "Georgia", "Fraunces", "Times New Roman", "Courier New", "Arial"];
const WEIGHTS = ["300", "400", "500", "600", "700", "800"];

function newId() {
  return crypto.randomUUID().slice(0, 8);
}

export function TemplateDesigner({
  template,
  previewValues,
  tokens,
  participantColumns,
  canEdit,
  onSaved,
}: {
  template: TemplateRecord;
  previewValues: Record<string, string>;
  tokens: string[];
  participantColumns: string[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [elements, setElements] = useState<TemplateElement[]>(template.elements ?? []);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>(template.field_map ?? {});
  const [background, setBackground] = useState<string | null>(template.background_url);
  const [backgroundColor, setBackgroundColor] = useState(template.background_color);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const scale = 0.62;
  const dragState = useRef<{ id: string; startX: number; startY: number; elX: number; elY: number } | null>(
    null,
  );

  const selected = useMemo(
    () => elements.find((el) => el.id === selectedId) ?? null,
    [elements, selectedId],
  );

  const patchElement = useCallback((id: string, patch: Partial<TemplateElement>) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)));
    setDirty(true);
  }, []);

  const handlePointerDown = useCallback(
    (id: string, event: React.PointerEvent<HTMLDivElement>) => {
      if (!canEdit) return;
      setSelectedId(id);
      const el = elements.find((item) => item.id === id);
      if (!el) return;
      dragState.current = {
        id,
        startX: event.clientX,
        startY: event.clientY,
        elX: el.x,
        elY: el.y,
      };

      const move = (moveEvent: PointerEvent) => {
        const state = dragState.current;
        if (!state) return;
        const dx = (moveEvent.clientX - state.startX) / scale;
        const dy = (moveEvent.clientY - state.startY) / scale;
        patchElement(state.id, {
          x: Math.round(Math.max(0, state.elX + dx)),
          y: Math.round(Math.max(0, state.elY + dy)),
        });
      };
      const up = () => {
        dragState.current = null;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [canEdit, elements, patchElement, scale],
  );

  function addElement(type: TemplateElement["type"]) {
    const base: TemplateElement = {
      id: newId(),
      type,
      x: 120,
      y: 120,
      width: type === "qr" ? 100 : 380,
      height: type === "qr" ? 100 : 48,
      fontSize: 22,
      fontFamily: "Inter",
      fontWeight: "500",
      color: "#111827",
      align: "center",
      ...(type === "text" ? { text: "New text" } : {}),
      ...(type === "field" ? { field: "name", text: "{{name}}" } : {}),
      ...(type === "shape" ? { background: "#1f2937", height: 4, radius: 2 } : {}),
    };
    setElements((prev) => [...prev, base]);
    setSelectedId(base.id);
    setDirty(true);
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy = { ...selected, id: newId(), x: selected.x + 20, y: selected.y + 20 };
    setElements((prev) => [...prev, copy]);
    setSelectedId(copy.id);
    setDirty(true);
  }

  function removeSelected() {
    if (!selected) return;
    setElements((prev) => prev.filter((el) => el.id !== selected.id));
    setSelectedId(null);
    setDirty(true);
  }

  async function handleUpload(file: File, target: "background" | "image") {
    try {
      const url = await uploadTemplateAsset(file, template.event_id);
      if (target === "background") {
        setBackground(url);
      } else {
        const el: TemplateElement = {
          id: newId(),
          type: "image",
          src: url,
          x: 80,
          y: 480,
          width: 180,
          height: 90,
        };
        setElements((prev) => [...prev, el]);
        setSelectedId(el.id);
      }
      setDirty(true);
      toast.success("Image added");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveTemplate(template.id, {
        elements,
        field_map: fieldMap,
        background_url: background,
        background_color: backgroundColor,
      });
      setDirty(false);
      onSaved();
      toast.success("Template saved");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => addElement("text")}>
            <Type className="mr-1.5 size-4" /> Text
          </Button>
          <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => addElement("field")}>
            <Braces className="mr-1.5 size-4" /> Dynamic field
          </Button>
          <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => addElement("shape")}>
            <Square className="mr-1.5 size-4" /> Line / shape
          </Button>
          <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => addElement("qr")}>
            <QrIcon className="mr-1.5 size-4" /> QR code
          </Button>
          <label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={!canEdit}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file, "image");
                event.target.value = "";
              }}
            />
            <Button size="sm" variant="outline" disabled={!canEdit} asChild>
              <span>
                <ImageIcon className="mr-1.5 size-4" /> Logo / signature
              </span>
            </Button>
          </label>
          <label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              disabled={!canEdit}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file, "background");
                event.target.value = "";
              }}
            />
            <Button size="sm" variant="outline" disabled={!canEdit} asChild>
              <span>
                <Upload className="mr-1.5 size-4" /> Upload design
              </span>
            </Button>
          </label>
          <div className="ml-auto flex items-center gap-2">
            {dirty ? <span className="text-xs text-warning">Unsaved changes</span> : null}
            <Button size="sm" onClick={handleSave} disabled={!canEdit || saving}>
              <Save className="mr-1.5 size-4" /> Save template
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-4">
          <div className="mx-auto w-fit rounded-lg shadow-plate">
            <CertificateCanvas
              template={{
                elements,
                background_url: background,
                background_color: backgroundColor,
                width: template.width,
                height: template.height,
              }}
              values={previewValues}
              scale={scale}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onElementPointerDown={handlePointerDown}
              showGuides
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Drag any element to reposition it. Preview uses the first participant's data.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selected ? "Element settings" : "Select an element"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selected ? (
              <>
                {selected.type === "field" ? (
                  <div className="space-y-1.5">
                    <Label>Participant field</Label>
                    <Select
                      value={selected.field ?? "name"}
                      onValueChange={(value) =>
                        patchElement(selected.id, { field: value, text: `{{${value}}}` })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tokens.map((token) => (
                          <SelectItem key={token} value={token}>
                            {token}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {selected.type === "text" || selected.type === "field" ? (
                  <div className="space-y-1.5">
                    <Label>Content</Label>
                    <Textarea
                      rows={2}
                      value={selected.text ?? ""}
                      onChange={(event) => patchElement(selected.id, { text: event.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use tokens like {"{{name}}"} or {"{{certificate_id}}"}.
                    </p>
                  </div>
                ) : null}

                {selected.type === "shape" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Colour</Label>
                      <Input
                        type="color"
                        value={selected.background ?? "#1f2937"}
                        onChange={(event) =>
                          patchElement(selected.id, { background: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Corner radius</Label>
                      <Input
                        type="number"
                        value={selected.radius ?? 0}
                        onChange={(event) =>
                          patchElement(selected.id, { radius: Number(event.target.value) })
                        }
                      />
                    </div>
                  </div>
                ) : null}

                {selected.type === "text" || selected.type === "field" ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Font</Label>
                        <Select
                          value={selected.fontFamily ?? "Inter"}
                          onValueChange={(value) => patchElement(selected.id, { fontFamily: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONTS.map((font) => (
                              <SelectItem key={font} value={font}>
                                {font}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Weight</Label>
                        <Select
                          value={selected.fontWeight ?? "400"}
                          onValueChange={(value) => patchElement(selected.id, { fontWeight: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEIGHTS.map((weight) => (
                              <SelectItem key={weight} value={weight}>
                                {weight}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Size</Label>
                        <Input
                          type="number"
                          value={selected.fontSize ?? 18}
                          onChange={(event) =>
                            patchElement(selected.id, { fontSize: Number(event.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Colour</Label>
                        <Input
                          type="color"
                          value={selected.color ?? "#111827"}
                          onChange={(event) => patchElement(selected.id, { color: event.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Letter spacing</Label>
                        <Input
                          type="number"
                          value={selected.letterSpacing ?? 0}
                          onChange={(event) =>
                            patchElement(selected.id, { letterSpacing: Number(event.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Line height</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={selected.lineHeight ?? 1.25}
                          onChange={(event) =>
                            patchElement(selected.id, { lineHeight: Number(event.target.value) })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(
                        [
                          ["left", AlignLeft],
                          ["center", AlignCenter],
                          ["right", AlignRight],
                        ] as const
                      ).map(([align, Icon]) => (
                        <Button
                          key={align}
                          size="sm"
                          variant={selected.align === align ? "default" : "outline"}
                          onClick={() => patchElement(selected.id, { align })}
                        >
                          <Icon className="size-4" />
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant={selected.fontStyle === "italic" ? "default" : "outline"}
                        onClick={() =>
                          patchElement(selected.id, {
                            fontStyle: selected.fontStyle === "italic" ? "normal" : "italic",
                          })
                        }
                      >
                        Italic
                      </Button>
                      <Button
                        size="sm"
                        variant={selected.textDecoration === "underline" ? "default" : "outline"}
                        onClick={() =>
                          patchElement(selected.id, {
                            textDecoration:
                              selected.textDecoration === "underline" ? "none" : "underline",
                          })
                        }
                      >
                        Underline
                      </Button>
                    </div>
                  </>
                ) : null}

                <Separator />
                <div className="grid grid-cols-4 gap-2">
                  {(["x", "y", "width", "height"] as const).map((key) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs uppercase">{key}</Label>
                      <Input
                        type="number"
                        value={selected[key]}
                        onChange={(event) =>
                          patchElement(selected.id, { [key]: Number(event.target.value) })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={duplicateSelected}>
                    <Copy className="mr-1.5 size-4" /> Duplicate
                  </Button>
                  <Button size="sm" variant="outline" onClick={removeSelected}>
                    <Trash2 className="mr-1.5 size-4" /> Delete
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click an element on the certificate to edit its text, font, colour and position.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Canvas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Background colour</Label>
              <Input
                type="color"
                value={backgroundColor}
                onChange={(event) => {
                  setBackgroundColor(event.target.value);
                  setDirty(true);
                }}
              />
            </div>
            {background ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBackground(null);
                  setDirty(true);
                }}
              >
                Remove uploaded design
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Field mapping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Connect certificate tokens to the participant data column that fills them.
            </p>
            {[...CORE_FIELDS, ...participantColumns].map((token) => (
              <div key={token} className="grid grid-cols-[1fr_1fr] items-center gap-2">
                <span className="truncate text-sm">{`{{${token}}}`}</span>
                <Select
                  value={fieldMap[token] ?? token}
                  onValueChange={(value) => {
                    setFieldMap((prev) => ({ ...prev, [token]: value }));
                    setDirty(true);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set([...CORE_FIELDS, ...participantColumns, token])].map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
