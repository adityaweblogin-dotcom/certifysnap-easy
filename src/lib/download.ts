import { toPng } from "html-to-image";

/** Renders a certificate node to a PNG at full design size and downloads it. */
export async function downloadNodeAsPng(
  node: HTMLElement,
  filename: string,
  size: { width: number; height: number },
): Promise<void> {
  const dataUrl = await toPng(node, {
    width: size.width,
    height: size.height,
    pixelRatio: 2,
    cacheBust: true,
    style: { transform: "scale(1)", transformOrigin: "top left" },
  });
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  link.click();
}

export function downloadTextFile(content: string, filename: string, type = "text/csv"): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
