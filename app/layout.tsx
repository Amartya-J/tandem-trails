import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tandem Trails — A Painted Co-op Platform Adventure",
  description: "Dash through four living storybook worlds with friends. Collect lights, open gates together, and leave nobody behind.",
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
