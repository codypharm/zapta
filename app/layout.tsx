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
  icons: {
    icon: [
      { url: '/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/favicon_io/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon_io/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: '/favicon_io/site.webmanifest',
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
