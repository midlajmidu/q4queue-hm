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
    <div className="min-h-screen relative bg-hero-glow overflow-hidden">
      {/* Background grid — same as login page */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(220_16%_90%/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(220_16%_90%/0.5)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/8 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-20 right-[10%] w-56 h-56 bg-accent/8 rounded-full blur-[100px] animate-pulse pointer-events-none" />

      <div className="relative z-10">
        <Navbar />
        <Hero />
        <Features />
        <HowItWorks />
        <CTA />
        <FAQ />
        <Footer />
      </div>
    </div>
  );
}
