import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import PlatformPillars from "@/components/landing/PlatformPillars";
import OperationalSolutions from "@/components/landing/OperationalSolutions";
import ProvenOutcomes from "@/components/landing/ProvenOutcomes";
import Advantage from "@/components/landing/Advantage";
import CustomerSpotlight from "@/components/landing/CustomerSpotlight";
import Industries from "@/components/landing/Industries";
import EnterpriseSecurity from "@/components/landing/EnterpriseSecurity";
import HowItWorks from "@/components/landing/HowItWorks";
import ProductTour from "@/components/landing/ProductTour";
import CustomerExperience from "@/components/landing/CustomerExperience";
import BusinessValue from "@/components/landing/BusinessValue";
import Features from "@/components/landing/Features";
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
        <PlatformPillars />
        <OperationalSolutions />
        <ProvenOutcomes />
        <Advantage />
        <CustomerSpotlight />
        <Industries />
        <EnterpriseSecurity />
        <HowItWorks />
        <ProductTour />
        <CustomerExperience />
        <BusinessValue />
        <Features />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
