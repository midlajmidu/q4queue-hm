import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ReactNode } from "react";
import "./globals.css";
import { config } from "@/lib/config";
import ClientProviders from "@/components/ClientProviders";

const inter = Inter({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700"], 
  variable: "--font-sans" 
});

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
    description: "Multi-tenant digital queue management for modern businesses. Let your customers wait from anywhere — no apps, no hassle.",
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
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${inter.variable}`} suppressHydrationWarning>
        <ClientProviders>
          <div className="flex flex-col">
            {children}
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
