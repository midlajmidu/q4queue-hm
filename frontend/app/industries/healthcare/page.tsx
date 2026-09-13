import type { Metadata } from "next";
import IndustryDetailTemplate from "@/components/landing/IndustryDetailTemplate";
import { industriesMap } from "@/lib/industriesData";

export const metadata: Metadata = {
  title: "Healthcare & Patient Queue Management System — Q4Queue",
  description:
    "Eliminate clinic lobby overcrowding, streamline triage, and provide real-time status updates for waiting patients with Q4Queue.",
};

export default function HealthcarePage() {
  return <IndustryDetailTemplate data={industriesMap.healthcare} />;
}
