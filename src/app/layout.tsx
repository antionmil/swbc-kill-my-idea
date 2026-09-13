import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Newsreader, Libre_Franklin, Chivo_Mono } from "next/font/google";
import "./globals.css";

/* Newsreader for the verdict and the experiments, Libre Franklin for labels,
   Chivo Mono for costs. None of the three appears on days 6 to 10 — and this
   is the first light site since day 8, which matters more than the typeface. */
const display = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display-loaded",
  display: "swap",
});
const body = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
  variable: "--font-body-loaded",
  display: "swap",
});
const mono = Chivo_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-loaded",
  display: "swap",
});

const SITE = "https://killmyidea.onedaybuilt.com";
const TITLE = "Kill My Idea";
const DESC =
  "Describe the thing you have not built yet. Get the five fastest experiments that would prove it wrong, cheapest first, each with the number that would end it.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESC,
  openGraph: {
    title: TITLE,
    description: DESC,
    url: SITE,
    siteName: TITLE,
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
