import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import CustomerSpotlight from "@/components/landing/CustomerSpotlight";
import Industries from "@/components/landing/Industries";
import HowItWorks from "@/components/landing/HowItWorks";
import CustomerExperience from "@/components/landing/CustomerExperience";
import BusinessValue from "@/components/landing/BusinessValue";
import PricingSection from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <CustomerSpotlight />
        <HowItWorks />
        <CustomerExperience />
        <BusinessValue />
        <PricingSection />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
