import type { Metadata } from "next";
import IndustryDetailTemplate from "@/components/landing/IndustryDetailTemplate";
import { industriesMap } from "@/lib/industriesData";

export const metadata: Metadata = {
  title: "Government & Municipal Queue Management System — Q4Queue",
  description:
    "Streamline high-volume municipal halls, passport offices, permit desks, and civic centers with automated citizen dispatch.",
};

export default function GovernmentPage() {
  return <IndustryDetailTemplate data={industriesMap.government} />;
}
