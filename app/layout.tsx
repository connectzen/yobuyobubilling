import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yobuyobu — ISP control",
  description: "Hotspot, PPPoE, and Paystack billing for MikroTik networks",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
