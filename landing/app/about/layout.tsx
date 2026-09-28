import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Q4Queue — Our Mission for Smoother Queues",
  description: "Learn why we built Q4Queue and how our mission to eliminate physical lines is helping clinics and businesses prioritize customer experience.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
