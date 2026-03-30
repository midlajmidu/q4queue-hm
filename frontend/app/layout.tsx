import type { Metadata } from "next";
import { Inter, DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { ReactNode } from "react";
import "./globals.css";
import { config } from "@/lib/config";
import ClientProviders from "@/components/ClientProviders";

const inter = Inter({ subsets: ["latin"] });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-heading" });

export const metadata: Metadata = {
  title: config.appName,
  description: "Real-time Queue Management SaaS for clinics and service counters",
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
      <body className={`${inter.className} ${dmSans.variable} ${plusJakartaSans.variable}`} suppressHydrationWarning>
        <ClientProviders>
          <div className="flex flex-col">
            {children}
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
