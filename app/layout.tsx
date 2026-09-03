import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "metriX | Social Intelligence",
  description: "Social listening and AI-powered analytics for brands and organizations."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
