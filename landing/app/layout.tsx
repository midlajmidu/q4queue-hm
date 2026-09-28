import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#2563EB",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Q4Queue — Digital Queue Management & Operations Platform",
  description:
    "Turn waiting lines into better experiences. Q4Queue helps clinics, banks, service centers, and high-footfall businesses manage digital queues, counter flow, and live customer updates.",
  keywords: [
    "digital queue management",
    "queue system",
    "token management system",
    "virtual waiting room",
    "clinic queue management",
    "bank queue system",
    "customer flow software",
  ],
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Q4Queue — Digital Queue Management Platform",
    description: "Replace physical waiting lines with a smarter digital queue.",
    type: "website",
    url: "https://q4queue.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth antialiased" suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col bg-background text-foreground selection:bg-blue-100 selection:text-blue-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
