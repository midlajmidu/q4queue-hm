"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Clock,
  Smile,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  Building2,
  Calendar,
  Layers,
  BarChart3,
  Tv,
  Bell,
  Smartphone,
  Sliders,
  Users,
  Utensils,
  Stethoscope,
  Landmark,
  ShoppingBag,
  Gamepad2,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, React.ElementType> = {
  sliders: Sliders,
  analytics: BarChart3,
  calendar: Calendar,
  layers: Layers,
  building: Building2,
  tv: Tv,
  bell: Bell,
  smartphone: Smartphone,
  shield: ShieldCheck,
  stethoscope: Stethoscope,
  "shopping-bag": ShoppingBag,
  gamepad: Gamepad2,
  landmark: Landmark,
  utensils: Utensils,
  users: Users,
  zap: Zap,
  clock: Clock,
};

function renderIcon(name?: string) {
  const IconComponent = name && iconMap[name] ? iconMap[name] : Sliders;
  if (!IconComponent) return <Sliders className="w-6 h-6" />;
  return <IconComponent className="w-6 h-6" />;
}

function renderSmallIcon(name?: string) {
  const IconComponent = name && iconMap[name] ? iconMap[name] : Sliders;
  if (!IconComponent) return <Sliders className="w-5 h-5" />;
  return <IconComponent className="w-5 h-5" />;
}

export interface IndustryData {
  slug: string;
  name: string;
  title: string;
  tagline: string;
  description: string;
  image: string;
  imageAlt: string;
  stats: {
    value: string;
    label: string;
  }[];
  whyDifferentTitle: string;
  whyDifferentText: string;
  cards: {
    title: string;
    description: string;
    iconName: string;
  }[];
  features: {
    title: string;
    description: string;
    iconName: string;
  }[];
}

export default function IndustryDetailTemplate({ data }: { data: IndustryData }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 selection:text-blue-900 pt-16">
      <Navbar />
      <main>
        {/* ── 1. HERO SECTION ── */}
        <section className="py-20 sm:py-28 bg-white border-b border-slate-200/80 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              {/* Hero Left Text */}
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold uppercase tracking-wider text-blue-700 mb-6">
                  {data.name} Solutions
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B1220] tracking-tight leading-[1.1]">
                  {data.title}
                </h1>
                <p className="mt-3 text-xs sm:text-sm font-bold uppercase tracking-widest text-blue-600">
                  {data.tagline}
                </p>
                <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl">
                  {data.description}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Button
                    size="lg"
                    asChild
                    className="h-12 px-7 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <Link href="/pricing">
                      Try Q4Queue For Free <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="h-12 px-6 border-slate-300 hover:bg-slate-50 text-slate-900 font-bold rounded-xl cursor-pointer"
                  >
                    <Link href="/pricing">View Pricing</Link>
                  </Button>
                </div>
              </div>

              {/* Hero Right Image */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-900">
                  <Image
                    src={data.image}
                    alt={data.imageAlt}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    className="object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <span className="text-xs font-bold tracking-widest uppercase text-blue-300">
                      Q4Queue Operational Standard
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">
                      Zero Lobby Congestion
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. IMPACT METRICS BAR ── */}
        <section className="py-14 bg-slate-50 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-[#0B1220] tracking-tight mb-10">
              Proven impact for {data.name} operators
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {data.stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-2xl border border-slate-200/90 text-center shadow-xs flex flex-col items-center justify-center"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                    {idx === 0 && <Clock className="w-6 h-6" />}
                    {idx === 1 && <Smile className="w-6 h-6" />}
                    {idx === 2 && <Zap className="w-6 h-6" />}
                    {idx === 3 && <ShieldCheck className="w-6 h-6" />}
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-[#0B1220] tracking-tight">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-xs sm:text-sm font-semibold text-slate-600">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. WHY ARE WE DIFFERENT SECTION ── */}
        <section className="py-20 sm:py-28 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">
                WHY ARE WE DIFFERENT
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#0B1220] tracking-tight">
                {data.whyDifferentTitle}
              </h2>
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                {data.whyDifferentText}
              </p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {data.cards.map((card, i) => (
                <div
                  key={i}
                  className="p-8 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 border border-blue-100">
                      {renderIcon(card.iconName)}
                    </div>
                    <h3 className="text-xl font-bold text-[#0B1220] tracking-tight">
                      {card.title}
                    </h3>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-blue-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Enterprise Ready</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. EVERY FEATURE TAILORED GRID ── */}
        <section className="py-20 sm:py-28 bg-[#F8FAFC] border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl mb-16">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1220] tracking-tight">
                Every feature <span className="text-blue-600">{data.name.toLowerCase()}</span> needs, all in a single system
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
              {data.features.map((f, i) => (
                <div key={i} className="flex flex-col items-start">
                  <div className="w-12 h-12 rounded-full bg-white text-blue-600 border border-slate-200 shadow-xs flex items-center justify-center mb-4">
                    {renderSmallIcon(f.iconName)}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#0B1220] tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <CTA />
      </main>
      <Footer />
    </div>
  );
}
