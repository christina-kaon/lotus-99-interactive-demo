import type { Metadata } from "next";
import "./globals.css";
import { IS_EN } from "./locale";

export const metadata: Metadata = {
  title: IS_EN ? "3 A.M.: The Silent New York" : "凌晨三点：静默纽约",
  description: IS_EN ? "Lotus 99 · a chapter-based mystery group-chat experience" : "Lotus 99 · 章节式悬疑群聊体验",
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
    <html lang={IS_EN ? "en" : "zh-CN"}>
      <body>{children}</body>
    </html>
  );
}
