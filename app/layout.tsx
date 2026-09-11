import type { Metadata } from "next";
import "./globals.css";
import { IS_EN } from "./locale";

const TITLE = IS_EN ? "3 A.M.: The Silent New York" : "凌晨三点：静默纽约";
const DESCRIPTION = IS_EN ? "Lotus 99 · a chapter-based mystery group-chat experience" : "Lotus 99 · 章节式悬疑群聊体验";
// Production hosts of the two language builds; Vercel's own production URL wins when exposed.
const SITE_URL = IS_EN ? "https://lotus-99-interactive-demo-en.vercel.app" : "https://lotus-99-interactive-demo-one.vercel.app";
const COVER = { url: "/cover-2x3.png", width: 1200, height: 1800, alt: TITLE };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: { title: TITLE, description: DESCRIPTION, images: [COVER] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [COVER] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={IS_EN ? "en" : "zh-CN"}>
      <body>{children}</body>
    </html>
  );
}
