import type { Metadata } from "next";
import IndustryDetailTemplate from "@/components/landing/IndustryDetailTemplate";
import { industriesMap } from "@/lib/industriesData";

export const metadata: Metadata = {
  title: "Restaurant & Table Waitlist Queue System — Q4Queue",
  description:
    "Manage dining waitlists, table turnover, and guest callouts with automated WhatsApp notifications and hostess stand control.",
};

export default function RestaurantsPage() {
  return <IndustryDetailTemplate data={industriesMap.restaurants} />;
}
