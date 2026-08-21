import type { Metadata } from "next";
import "./globals.css";

const TITLE = "SetQuant — Thai Insider Filings";
const DESCRIPTION =
  "Real-time SEC filing tracker for Thai stock market insider transactions.";
const SITE_URL = "https://setquant.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "SetQuant",
    url: SITE_URL,
    type: "website",
  },
  // No OG image asset ships with the app — pointing at a missing file would
  // render a broken card, so the summary card carries text only.
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
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
