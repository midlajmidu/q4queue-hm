import type { Metadata, Viewport } from "next";
import { Inter, DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { ReactNode } from "react";
import "./globals.css";
import { config } from "@/lib/config";
import ClientProviders from "@/components/ClientProviders";
import { SEOStructuredData } from "@/components/SEOStructuredData";

const inter = Inter({ subsets: ["latin"] });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-heading" });

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(config.landingUrl),
  title: {
    default: "Q4Queue — Digital Queue Management & Smart Token System",
    template: "%s | Q4Queue"
  },
  description: "Transform your waiting experience with Q4Queue. Premium digital queue management for clinics, retail, and service counters. QR-based token system with real-time updates.",
  keywords: ["queue management system", "digital queue", "token system", "waiting list software", "clinic queue system", "hospital queue management", "QR queue system", "virtual queue", "appointment queue software"],
  authors: [{ name: "Q4Queue Team" }],
  creator: "Q4Queue",
  publisher: "Q4Queue",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: config.landingUrl,
    siteName: "Q4Queue",
    title: "Q4Queue — Smarter Queues, Happier Customers",
    description: "Multi-tenant digital queue management for modern businesses. Let your visitors wait from anywhere — no apps, no hassle.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Q4Queue — Premium Queue Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Q4Queue — Digital Queue & Token System",
    description: "Premium waiting list software for clinics and retail. Real-time updates and QR-joining.",
    images: ["/og-image.png"],
    creator: "@q4queue",
  },
  icons: {
    icon: [
      { url: "/icon.png" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${dmSans.variable} ${plusJakartaSans.variable} flex flex-col`} suppressHydrationWarning>
        <SEOStructuredData />
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
