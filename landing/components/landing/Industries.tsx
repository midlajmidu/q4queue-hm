"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Building2,
} from "lucide-react";

interface IndustryShowcase {
  id: string;
  tabLabel: string;
  tag: string;
  partnerBrand?: {
    name: string;
    subtext?: string;
  };
  headline: string;
  description: string;
  milestones: string[];
  metrics: {
    value: string;
    label: string;
  }[];
  image: string;
  imageAlt: string;
  previewWidget: {
    title: string;
    details: string;
    countdownLabel: string;
    timeRemaining: string;
    progressPercent: string;
    primaryAction: string;
    secondaryAction: string;
  };
}

const showcases: IndustryShowcase[] = [
  {
    id: "entertainment",
    tabLabel: "Entertainment & Leisure",
    tag: "HIGH-CAPACITY ATTRACTIONS",
    partnerBrand: {
      name: "Entertainment & Family Centers",
      subtext: "AMOEBA • HM LEISURE • ARCADES",
    },
    headline:
      "Eliminating 90-minute waitlist walkaways during peak weekend rushes",
    description:
      "Guests join a virtual queue via smartphone or kiosk, exploring arcades and dining zones freely until their bowling lane or VR arena is prepped.",
    milestones: [
      "Real-time lane turnover sync directly from pit manager tablets",
      "Automated 2-way SMS alerts with 5-minute arrival grace buffer",
      "Zero lobby clustering or physical barrier stanchions",
    ],
    metrics: [
      { value: "2.8M+", label: "guests served" },
      { value: "-45%", label: "wait walkaways" },
    ],
    image: "/images/amoeba-venue-spotlight.jpg",
    imageAlt: "Amoeba Bowling & Gaming Center neon illuminated lanes",
    previewWidget: {
      title: "Malhotra Party",
      details: "4 Bowlers • Shoe Station Desk A",
      countdownLabel: "Claim window active",
      timeRemaining: "4:32 remaining",
      progressPercent: "74%",
      primaryAction: "Confirm Arrival",
      secondaryAction: "+5m",
    },
  },
  {
    id: "retail",
    tabLabel: "Retail & Flagships",
    tag: "IN-STORE LUXURY & BOUTIQUES",
    partnerBrand: {
      name: "Luxury Flagships & Studios",
      subtext: "LORO PIANA • STUDS • FLAGSHIPS",
    },
    headline:
      "Empowering VIP shoppers to browse while styling suites sync",
    description:
      "Free clientele from waiting lines to discover new collections while stylists prepare private fitting suites or bespoke consultations.",
    milestones: [
      "One-tap check-in via discreet tablet stands or QR passes",
      "Automated client-to-stylist routing based on preference profile",
      "Instant click-and-collect fulfillment alerts for quick pickup",
    ],
    metrics: [
      { value: "+28%", label: "in-store browse" },
      { value: "4.9/5", label: "client CSAT" },
    ],
    image: "/images/solution-queue-retail.jpg",
    imageAlt: "Luxury retail showroom floor with personal stylist consultation",
    previewWidget: {
      title: "Elena Vance (Stylist)",
      details: "Fitting Room 03 • 5 Items Prepped",
      countdownLabel: "Stylist Ready",
      timeRemaining: "Suite Prepared",
      progressPercent: "100%",
      primaryAction: "Enter Suite",
      secondaryAction: "Notify Staff",
    },
  },
  {
    id: "healthcare",
    tabLabel: "Healthcare & Clinics",
    tag: "CLINICAL TRIAGE & DIAGNOSTICS",
    partnerBrand: {
      name: "Outpatient & Triage Centers",
      subtext: "CLINICS • URGENT CARE • LABS",
    },
    headline:
      "Restoring lobby safety and peace for waiting patients",
    description:
      "Patients check in seamlessly and wait comfortably in their vehicles or outdoor gardens until called for triage or bloodwork.",
    milestones: [
      "HIPAA-compliant tokenized queue identifiers",
      "Urgency priority triage override for critical arrivals",
      "Automated SMS recall with counter direction guidelines",
    ],
    metrics: [
      { value: "14 min", label: "avg handle time" },
      { value: "-60%", label: "lobby overcrowding" },
    ],
    image: "/images/solution-healthcare-clinical.jpg",
    imageAlt: "Modern clinical reception desk with quiet waiting area",
    previewWidget: {
      title: "Token #H-204",
      details: "Blood Work & Lab Station 02",
      countdownLabel: "Triage Call",
      timeRemaining: "Counter Ready",
      progressPercent: "95%",
      primaryAction: "Proceed to Station",
      secondaryAction: "Delay 5m",
    },
  },
  {
    id: "banking",
    tabLabel: "Banking & Advisory",
    tag: "FINANCIAL SERVICES & ADVISORY",
    partnerBrand: {
      name: "Financial Branches & Advisory",
      subtext: "WEALTH MANAGEMENT • BANKING",
    },
    headline:
      "Seamless VIP routing and appointment check-in for bank branches",
    description:
      "Walk-in banking customers and pre-scheduled wealth management clients are automatically routed to the right specialized officer.",
    milestones: [
      "Dynamic counter balancing based on transaction complexity",
      "VIP priority dispatch for premium account holders",
      "Integrated teller desk calling console with WebRTC direct call",
    ],
    metrics: [
      { value: "-35%", label: "wait duration" },
      { value: "98%", label: "on-time visits" },
    ],
    image: "/images/solution-banking-advisory.jpg",
    imageAlt: "Modern financial branch desk with advisor meeting",
    previewWidget: {
      title: "Advisory Desk 04",
      details: "Commercial Loan Consultation",
      countdownLabel: "Officer Assigned",
      timeRemaining: "Serving Now",
      progressPercent: "100%",
      primaryAction: "Begin Session",
      secondaryAction: "Re-assign",
    },
  },
  {
    id: "government",
    tabLabel: "Public & Civic Services",
    tag: "MUNICIPAL & CIVIC CENTERS",
    partnerBrand: {
      name: "Civic Halls & Public Desks",
      subtext: "PASSPORT • PERMITS • CIVIC HALLS",
    },
    headline:
      "Transforming high-volume municipal halls with smart triage",
    description:
      "Handle thousands of daily civic walk-ins across multiple departments with automated counter routing and clear digital TV screens.",
    milestones: [
      "Multi-service ticket generation at entrance kiosks",
      "Lobby Smart TV status screens with audible chime calls",
      "Comprehensive daily throughput analytics for supervisors",
    ],
    metrics: [
      { value: "10k+", label: "daily visitors" },
      { value: "< 2 min", label: "avg check-in" },
    ],
    image: "/images/solution-government-civic.jpg",
    imageAlt: "Civic service hall with digital queue screens",
    previewWidget: {
      title: "Counter 12 (Permits)",
      details: "Ticket #G-108 • Document Review",
      countdownLabel: "Please approach window",
      timeRemaining: "Window open",
      progressPercent: "85%",
      primaryAction: "Approach Window",
      secondaryAction: "Help",
    },
  },
];

export default function Industries() {
  const [activeTabId, setActiveTabId] = useState("entertainment");
  const current =
    showcases.find((item) => item.id === activeTabId) || showcases[0];

  return (
    <section
      id="solutions"
      className="py-20 sm:py-28 bg-white border-b border-slate-200/80 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B1220] tracking-tight leading-[1.15]">
            A trusted partner of industry leaders around the world.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            From high-capacity entertainment arenas and luxury flagships to clinical triage and municipal halls, see how operators deploy Q4Queue to master customer flow.
          </p>
        </div>

        {/* Premium Minimal Segmented Tab Navigation Bar */}
        <div className="mb-12">
          <div className="inline-flex flex-wrap items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/80">
            {showcases.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm transition-all duration-200 cursor-pointer font-semibold ${
                    isActive
                      ? "bg-white text-[#0B1220] shadow-sm border border-slate-200/80 scale-[1.02]"
                      : "text-slate-600 hover:text-[#0B1220] hover:bg-white/60"
                  }`}
                >
                  {tab.tabLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Showcase: Sleek Split-Screen Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* LEFT COLUMN (5 Cols): Operational Blueprint */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full">
            <div>
              {/* Partner Brand Identity */}
              <div className="flex items-center gap-2 text-slate-500 mb-3">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-bold tracking-wider text-[#0B1220] uppercase">
                  {current.partnerBrand?.name}
                </span>
                {current.partnerBrand?.subtext && (
                  <span className="text-[10px] font-semibold text-slate-400 border-l border-slate-200 pl-2">
                    {current.partnerBrand.subtext}
                  </span>
                )}
              </div>

              {/* Tag */}
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
                  {current.tag}
                </span>
              </div>

              {/* Headline */}
              <h3 className="mt-2 text-xl sm:text-2xl font-bold text-[#0B1220] tracking-tight leading-snug">
                {current.headline}
              </h3>

              {/* Description */}
              <p className="mt-3 text-sm sm:text-[15px] text-slate-600 leading-relaxed font-normal">
                {current.description}
              </p>

              {/* Workflow Milestones */}
              <div className="mt-6 space-y-3">
                {current.milestones.map((milestone) => (
                  <div key={milestone} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-slate-700 font-medium leading-normal">
                      {milestone}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics & Action Link */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-8">
                {current.metrics.map((metric) => (
                  <div key={metric.label}>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1220] tracking-tight">
                      {metric.value}
                    </div>
                    <div className="text-xs font-medium text-slate-500 mt-0.5">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/get-started"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors group/link"
              >
                <span>Explore blueprint</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/link:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN (7 Cols): Venue Photo & Live Widget Overlay */}
          <div className="lg:col-span-7">
            <div className="relative h-[340px] sm:h-[420px] w-full rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-900">
              {/* Architectural Venue Image */}
              <Image
                key={current.image}
                src={current.image}
                alt={current.imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover object-center transition-all duration-700"
              />

              {/* Ambient Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent pointer-events-none" />

              {/* Top Right Live Tag */}
              <div className="absolute top-4 right-4 z-20">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Operations Live</span>
                </div>
              </div>

              {/* Live Ticket Pass Overlay Widget */}
              <div className="absolute bottom-4 inset-x-4 sm:bottom-5 sm:left-5 sm:right-auto z-20 sm:max-w-[360px] w-auto">
                <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4.5 border border-white/90 shadow-xl ring-1 ring-slate-900/5">
                  <div>
                    <h4 className="text-base font-extrabold text-[#0B1220] tracking-tight leading-snug">
                      {current.previewWidget.title}
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      {current.previewWidget.details}
                    </p>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-100">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{current.previewWidget.countdownLabel}</span>
                      </div>
                      <span className="font-mono text-[10.5px] text-slate-400 shrink-0">
                        {current.previewWidget.timeRemaining}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: current.previewWidget.progressPercent }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
