import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ascend",
  description: "Align your skills with the future",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
