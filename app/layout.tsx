/**
 * Root Layout
 * Main layout component that wraps all pages
 * Sets up global styles, fonts, and metadata
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Using Inter font for HubSpot-like clean aesthetics
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Zapta - AI Agent Platform",
  description: "Create AI agents without the technical complexity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
