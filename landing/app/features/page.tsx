import Navbar from "@/components/landing/Navbar";
import Features from "@/components/landing/Features";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "Premium Features - Q4Queue",
  description: "Explore all premium capabilities of Q4Queue including WhatsApp notifications, direct portal calling, live TV display, dynamic TOTP QR tokens, and enterprise analytics.",
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 selection:text-blue-900 pt-16">
      <Navbar />
      <main>
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
