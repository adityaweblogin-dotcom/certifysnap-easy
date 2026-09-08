import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({
  value,
  size = 120,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value || "https://example.com", {
      margin: 1,
      width: size * 2,
      color: { dark: "#111827ff", light: "#ffffffff" },
    })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => setSrc(null));
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!src) {
    return <div className={className} style={{ width: size, height: size }} aria-hidden />;
  }
  return (
    <img
      src={src}
      alt="Certificate verification QR code"
      width={size}
      height={size}
      className={className}
    />
  );
}
