import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vibe Check",
  description: "The Reddit of Hack Club.",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/favicon/apple-touch-icon.png",
    other: [
      {
        rel: 'android-chrome-192x192',
        url: '/favicon/android-chrome-192x192.png',
        sizes: '192x192'
      },
      {
        rel: 'android-chrome-512x512',
        url: '/favicon/android-chrome-512x512.png',
        sizes: '512x512'
      }
    ]
  },
  openGraph: {
    title: "Vibe Check",
    description: "The Reddit of Hack Club.",
    url: "https://vibe-check.hackclub.com",
    siteName: "Vibe Check",
    images: [
      {
        url: "/favicon/banner.png",
        width: 1200,
        height: 630,
        alt: "Vibe Check Leaderboard Banner",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibe Check",
    description: "The Reddit of Hack Club.",
    creator: "@hackclub",
    images: ["/favicon/banner.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
