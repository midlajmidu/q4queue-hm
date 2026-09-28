import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import PricingSection from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Pricing & 14-Day Free Trial — Q4Queue",
  description:
    "Simple, transparent queue pricing. Start your 14-day free trial today with full operational features. Custom enterprise options available.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      <main className="pt-16">
        <PricingSection />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
