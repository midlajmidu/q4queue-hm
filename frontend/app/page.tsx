"use client";

import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background bg-page-pro">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <CTA />
      <FAQ />
      <Footer />
    </div>
  );
}
