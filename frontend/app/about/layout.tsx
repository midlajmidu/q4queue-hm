import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Q4Queue",
  description:
    "Learn why we built q4queue — digital queues for clinics, banks, and service counters. Real-time updates, minimal setup, no app required.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
