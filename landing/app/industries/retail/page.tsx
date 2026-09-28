import type { Metadata } from "next";
import IndustryDetailTemplate from "@/components/landing/IndustryDetailTemplate";
import { industriesMap } from "@/lib/industriesData";

export const metadata: Metadata = {
  title: "Retail & Boutique Queue Management System — Q4Queue",
  description:
    "Transform long lines into active browsing time. Manage fitting rooms, styling suites, and click-and-collect counters with Q4Queue.",
};

export default function RetailPage() {
  return <IndustryDetailTemplate data={industriesMap.retail} />;
}
