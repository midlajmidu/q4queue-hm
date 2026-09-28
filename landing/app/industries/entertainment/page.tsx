import type { Metadata } from "next";
import IndustryDetailTemplate from "@/components/landing/IndustryDetailTemplate";
import { industriesMap } from "@/lib/industriesData";

export const metadata: Metadata = {
  title: "Entertainment Arena & Arcade Queue System — Q4Queue",
  description:
    "Power high-capacity bowling alleys, arcade arenas, VR centers, and theme parks with zero-latency virtual queueing.",
};

export default function EntertainmentPage() {
  return <IndustryDetailTemplate data={industriesMap.entertainment} />;
}
