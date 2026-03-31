import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Q4Queue Dashboard",
  description: "Sign in to your Q4Queue organization dashboard to manage your digital lines and view real-time queue analytics.",
  robots: {
    index: false,
    follow: false,
  }
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
