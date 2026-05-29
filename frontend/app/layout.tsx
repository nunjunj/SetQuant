import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SetQuant — Thai Insider Filings",
  description: "Real-time SEC filing tracker for Thai stock market insider transactions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
