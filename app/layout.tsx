import type { Metadata, Viewport } from "next";
import { content } from "./content";
import "./globals.css";

export const metadata: Metadata = {
  title: `${content.title} — ${content.subtitle}`,
  description: content.description,
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": 0,
      "max-image-preview": "none",
      "max-snippet": 0,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#010317",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={content.language}>
      <body>{children}</body>
    </html>
  );
}
