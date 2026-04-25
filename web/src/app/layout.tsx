import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrendBot | Weekly AI Project Ideas",
  description: "Freshly baked project ideas from this week's AI research, Reddit deep-dives, and GitHub bottlenecks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${outfit.variable} ${mono.variable} font-sans min-h-full flex flex-col bg-[#0a0a0c]`}>
        {children}
      </body>
    </html>
  );
}
