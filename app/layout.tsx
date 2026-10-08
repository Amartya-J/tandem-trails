import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tandem Trails — Multiplayer Platform Adventure",
  description: "Run, leap, and open the way together across 16 original levels in four colorful worlds.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
