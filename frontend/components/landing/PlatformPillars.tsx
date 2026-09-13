"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  QrCode,
  Layers,
  TrendingDown,
  Sparkles,
  Smartphone,
  Sliders,
  BarChart3,
  CheckCircle2,
  Clock,
  Users2,
} from "lucide-react";

export default function PlatformPillars() {
  const pillars = [
    {
      id: "product",
      tag: "VISITOR JOURNEY",
      tagColor: "text-blue-600 bg-blue-50 border-blue-200/80",
      accentBorder: "group-hover:border-blue-500/40",
      accentGlow: "from-blue-600/10 via-blue-500/5 to-transparent",
      headline: "One queue. Every customer. Total control.",
      body: "Instant smartphone QR check-in, real-time web pass tracking, and automated SMS arrival buffers with zero app downloads required.",
      href: "/product",
      anchorHref: "#how-it-works",
      ctaText: "Explore Customer Flow",
      icon: Smartphone,
      microMockup: (
        <div className="rounded-xl bg-slate-900 text-white p-3.5 border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-200">Live Queue Pass</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
              #A-42
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Estimated wait</div>
              <div className="text-sm font-extrabold text-white font-mono">~4 mins</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-medium">Position</div>
              <div className="text-xs font-bold text-emerald-400">2 ahead of you</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "operations",
      tag: "STAFF & COUNTER OPS",
      tagColor: "text-indigo-600 bg-indigo-50 border-indigo-200/80",
      accentBorder: "group-hover:border-indigo-500/40",
      accentGlow: "from-indigo-600/10 via-indigo-500/5 to-transparent",
      headline: "Everything your team needs to keep the line moving.",
      body: "Tactile web-based operator consoles for tellers and counter leads to call, recall, transfer, and balance load with one click.",
      href: "/operations",
      anchorHref: "#operations",
      ctaText: "Tour Operations Console",
      icon: Sliders,
      microMockup: (
        <div className="rounded-xl bg-slate-900 text-white p-3.5 border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-[11px] font-bold text-slate-200">Counter 03 • Fast Desk</span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
              Ready
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold text-center shadow-xs">
              Call Next Ticket
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700">
              Transfer
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "solutions",
      tag: "MEASURED IMPACT",
      tagColor: "text-emerald-700 bg-emerald-50 border-emerald-200/80",
      accentBorder: "group-hover:border-emerald-500/40",
      accentGlow: "from-emerald-600/10 via-emerald-500/5 to-transparent",
      headline: "Less waiting. Less crowding. Better operations.",
      body: "Eliminate physical lobby congestion by 45%, eradicate walkaways, and benchmark multi-counter service cycle velocities in real time.",
      href: "/solutions",
      anchorHref: "#business-value",
      ctaText: "View Business Outcomes",
      icon: BarChart3,
      microMockup: (
        <div className="rounded-xl bg-slate-900 text-white p-3.5 border border-slate-800 shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold text-slate-200">Avg Lobby Wait</span>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
              -45% Drop
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Lobby Crowding</div>
              <div className="text-xs font-bold text-white">Zero Stanchions</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-medium">CSAT Lift</div>
              <div className="text-xs font-bold text-blue-400">4.9 / 5.0 Rating</div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="py-20 md:py-24 bg-white border-b border-slate-200/80 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-blue-700 text-[11px] font-bold tracking-wider uppercase mb-3.5 shadow-2xs">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>The Complete Queue Platform</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-slate-900 tracking-tight leading-tight">
            Three connected systems. Zero friction.
          </h2>
          <p className="mt-3.5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            From the moment a guest arrives to the instant their ticket is resolved,
            Q4Queue orchestrates every second of the customer journey.
          </p>
        </div>

        {/* 3-Pillar Interactive Grid */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.id}
                className={`group relative rounded-2xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1.5 ${pillar.accentBorder}`}
              >
                {/* Subtle Top Ambient Gradient Header */}
                <div
                  className={`absolute inset-x-0 top-0 h-28 rounded-t-2xl bg-gradient-to-b ${pillar.accentGlow} pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />

                <div className="relative z-10">
                  {/* Tag & Icon Row */}
                  <div className="flex items-center justify-between mb-5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold tracking-wider uppercase border ${pillar.tagColor}`}
                    >
                      {pillar.tag}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                  </div>

                  {/* Headline */}
                  <h3 className="text-xl sm:text-[22px] font-extrabold text-slate-900 tracking-tight leading-snug">
                    {pillar.headline}
                  </h3>

                  {/* Body description */}
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    {pillar.body}
                  </p>

                  {/* Micro-Mockup Preview Widget */}
                  <div className="mt-6 mb-6">
                    {pillar.microMockup}
                  </div>
                </div>

                {/* Bottom Action Link */}
                <div className="relative z-10 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={pillar.href}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors group/btn"
                  >
                    <span>{pillar.ctaText}</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
                  </Link>

                  <Link
                    href={pillar.anchorHref}
                    className="text-[11px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Jump to section ↓
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
