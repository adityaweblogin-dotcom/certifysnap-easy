import { forwardRef } from "react";

import { QrCode } from "@/components/certificates/QrCode";
import { elementText, verificationUrl } from "@/lib/certificate";
import type { TemplateElement, TemplateRecord } from "@/services/types";

export interface CertificateCanvasProps {
  template: Pick<
    TemplateRecord,
    "elements" | "background_url" | "background_color" | "width" | "height"
  >;
  values: Record<string, string>;
  scale?: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onElementPointerDown?: (id: string, event: React.PointerEvent<HTMLDivElement>) => void;
  showGuides?: boolean;
}

/** Shared certificate renderer used by preview, designer and download. */
export const CertificateCanvas = forwardRef<HTMLDivElement, CertificateCanvasProps>(
  function CertificateCanvas(
    {
      template,
      values,
      scale = 1,
      selectedId,
      onSelect,
      onElementPointerDown,
      showGuides = false,
    },
    ref,
  ) {
    const code = values["certificate_id"] ?? "";

    return (
      <div
        style={{ width: template.width * scale, height: template.height * scale }}
        className="relative overflow-hidden"
      >
        <div
          ref={ref}
          data-certificate-canvas
          style={{
            width: template.width,
            height: template.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            backgroundColor: template.background_color,
            backgroundImage: template.background_url ? `url(${template.background_url})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          className="relative select-none"
        >
          {template.elements.map((el: TemplateElement) => {
            const isSelected = selectedId === el.id;
            const common: React.CSSProperties = {
              position: "absolute",
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
              outline: isSelected
                ? "2px solid var(--color-ring)"
                : showGuides
                  ? "1px dashed color-mix(in oklch, var(--color-muted-foreground) 45%, transparent)"
                  : undefined,
              cursor: onElementPointerDown ? "move" : "default",
            };

            if (el.type === "qr") {
              return (
                <div
                  key={el.id}
                  style={common}
                  onPointerDown={(event) => onElementPointerDown?.(el.id, event)}
                  onClick={() => onSelect?.(el.id)}
                >
                  <QrCode value={verificationUrl(code)} size={Math.min(el.width, el.height)} />
                </div>
              );
            }

            if (el.type === "image") {
              return (
                <div
                  key={el.id}
                  style={common}
                  onPointerDown={(event) => onElementPointerDown?.(el.id, event)}
                  onClick={() => onSelect?.(el.id)}
                >
                  {el.src ? (
                    <img
                      src={el.src}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : null}
                </div>
              );
            }

            if (el.type === "shape") {
              return (
                <div
                  key={el.id}
                  style={{
                    ...common,
                    backgroundColor: el.background ?? "#1f2937",
                    borderRadius: el.radius ?? 0,
                  }}
                  onPointerDown={(event) => onElementPointerDown?.(el.id, event)}
                  onClick={() => onSelect?.(el.id)}
                />
              );
            }

            return (
              <div
                key={el.id}
                style={{
                  ...common,
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    el.align === "left" ? "flex-start" : el.align === "right" ? "flex-end" : "center",
                  fontSize: el.fontSize ?? 18,
                  fontFamily: el.fontFamily ?? "Inter",
                  fontWeight: el.fontWeight ?? "400",
                  fontStyle: el.fontStyle ?? "normal",
                  textDecoration: el.textDecoration ?? "none",
                  color: el.color ?? "#111827",
                  letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                  lineHeight: el.lineHeight ?? 1.25,
                  textAlign: el.align ?? "center",
                  whiteSpace: "pre-wrap",
                }}
                onPointerDown={(event) => onElementPointerDown?.(el.id, event)}
                onClick={() => onSelect?.(el.id)}
              >
                <span style={{ width: "100%" }}>{elementText(el, values)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
