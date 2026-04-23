import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Course Recommender",
  description: "AI-powered course recommendations",
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
