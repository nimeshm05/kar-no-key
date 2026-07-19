import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import AmplitudeInit from "@/components/AmplitudeInit/AmplitudeInit";
import GradientBlob from "@/components/GradientBlob/GradientBlob";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <GradientBlob />
        <AmplitudeInit />
        <div className="app-shell">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
