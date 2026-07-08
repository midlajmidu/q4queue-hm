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
    default: "Q4Queue Dashboard",
    template: "%s | Q4Queue"
  },
  description: "Q4Queue Management Dashboard",
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
      <body className={`${inter.className} ${inter.variable} bg-slate-50 text-slate-900 antialiased`} suppressHydrationWarning>
        <ClientProviders>
          <div className="flex flex-col">
            {children}
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
