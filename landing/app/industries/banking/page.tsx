import type { Metadata } from "next";
import IndustryDetailTemplate from "@/components/landing/IndustryDetailTemplate";
import { industriesMap } from "@/lib/industriesData";

export const metadata: Metadata = {
  title: "Bank Queue Management System — Q4Queue",
  description:
    "Reduce bank wait times, increase teller efficiency, and boost customer satisfaction with Q4Queue's Bank Queue Management System.",
};

export default function BankingPage() {
  return <IndustryDetailTemplate data={industriesMap.banking} />;
}
