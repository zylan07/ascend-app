import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Ascend",
  description: "Align your skills with the future",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <html lang="en">
    <head>
      <link rel="icon" href="/favicon.ico" />
    </head>
    <body className="min-h-full flex flex-col font-sans">
      {children}
    </body>
  </html>
);
}
