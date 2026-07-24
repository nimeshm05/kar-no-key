import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import AmplitudeInit from "@/components/AmplitudeInit/AmplitudeInit";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "kar-no-key",
  description: "race your frens, one lyric at a time :)",
  icons: {
    icon: [
      {
        url: "/favicons/typewriter-16.svg",
        type: "image/svg+xml",
        sizes: "16x13",
      },
      {
        url: "/favicons/typewriter-32.svg",
        type: "image/svg+xml",
        sizes: "32x26",
      },
      {
        url: "/favicons/typewriter-64.svg",
        type: "image/svg+xml",
        sizes: "64x51",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AmplitudeInit />
        <div className="app-shell">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
