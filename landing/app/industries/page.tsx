import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Industries from "@/components/landing/Industries";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Industry Solutions — Q4Queue",
  description:
    "Discover how Q4Queue powers customer queue management across banking, healthcare, retail, entertainment, civic government, and hospitality.",
};

export default function AllIndustriesPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 selection:text-blue-900 pt-16">
      <Navbar />
      <main>
        <Industries />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
