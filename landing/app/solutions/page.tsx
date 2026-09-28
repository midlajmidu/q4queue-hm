import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import CTA from "@/components/landing/CTA";
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Building2,
  Users2,
  Clock,
  Award,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Business Solutions & Outcomes — Q4Queue",
  description:
    "Less waiting. Less crowding. Better operations. Proven customer flow infrastructure delivering -45% wait drops across healthcare, retail, banking, and leisure.",
};

export default function SolutionsPage() {
  const metrics = [
    { value: "-45%", label: "Average lobby wait times", sub: "Based on 2.8M+ served parties" },
    { value: "Zero", label: "Crowded lobby stanchions", sub: "Complete physical barrier elimination" },
    { value: "+28%", label: "In-venue browsing & retail sales", sub: "Unshackled guests spend freely" },
    { value: "4.9/5", label: "Average customer CSAT rating", sub: "Verified post-service reviews" },
  ];

  const industries = [
    {
      name: "Entertainment & Leisure",
      subtext: "AMOEBA • HM LEISURE • ARCADES",
      headline: "Eliminating 90-minute waitlist walkaways during peak weekend rushes",
      stat: "2.8M+ guests served",
      desc: "Guests explore gaming zones and restaurants freely until their bowling lane or VR station is called.",
    },
    {
      name: "Healthcare & Clinics",
      subtext: "CLINICAL TRIAGE NETWORKS",
      headline: "Triage walk-in patients by acuity while eliminating waiting rooms",
      stat: "100% HIPAA compliant",
      desc: "Vulnerable patients wait in personal vehicles or outdoor gardens while clinicians prep exam rooms.",
    },
    {
      name: "Retail & Flagships",
      subtext: "LUXURY STUDIOS & FLAGSHIPS",
      headline: "Empowering VIP shoppers to browse while styling suites sync",
      stat: "+28% browse time",
      desc: "Free clients from fitting room queues to discover seasonal collections with personal stylist alerts.",
    },
    {
      name: "Banking & Finance",
      subtext: "RETAIL BRANCHES & WEALTH HUBS",
      headline: "Routing branch walk-ins between tellers and wealth advisors",
      stat: "8 min avg service cycle",
      desc: "Separate routine cash transactions from scheduled private advisory desks for a tranquil branch atmosphere.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar />

      <main>
        {/* Page Hero Header */}
        <section className="pt-32 sm:pt-36 lg:pt-40 pb-20 sm:pb-24 bg-slate-950 text-white relative overflow-hidden border-b border-slate-800">
          {/* Ambient Lighting */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: "0%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "900px",
              height: "450px",
              background:
                "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.22) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-[11.5px] font-semibold tracking-wide text-emerald-300 mb-6 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Proven Operational ROI</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              <span className="bg-gradient-to-b from-white via-slate-100 to-slate-300/85 bg-clip-text text-transparent">
                Less waiting. Less crowding.
              </span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-300 bg-clip-text text-transparent">
                Better operations.
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-300/90 max-w-2xl mx-auto leading-relaxed">
              Eliminate physical lobby congestion by 45%, eradicate walkaways, and optimize staff throughput
              across multi-department physical facilities.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/get-started"
                className="h-12 px-7 rounded-xl bg-white text-slate-950 font-bold text-sm shadow-md hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
              >
                <span>Calculate your venue ROI</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/operations"
                className="h-12 px-6 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/[0.14] text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <span>Tour operations console</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </section>

        {/* Quantified Metrics Ribbon */}
        <section className="py-14 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {metrics.map((m) => (
                <div key={m.label} className="text-center sm:text-left">
                  <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                    {m.value}
                  </div>
                  <div className="mt-2 text-sm font-bold text-slate-800">{m.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Industry Solutions Showcase */}
        <section className="py-20 sm:py-28 bg-[#F8FAFC] border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                Industry Implementations
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Engineered for complex customer flows
              </h2>
              <p className="mt-3 text-slate-600 text-base sm:text-lg leading-relaxed">
                See how global operators in family leisure, luxury retail, clinical triage, and civic halls deploy Q4Queue.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
              {industries.map((ind) => (
                <div
                  key={ind.name}
                  className="p-8 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-400">
                      <span className="text-slate-900 uppercase tracking-wider">{ind.name}</span>
                      <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                        {ind.stat}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                      {ind.headline}
                    </h3>
                    <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                      {ind.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <Link
                      href="/get-started"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <span>Request industry blueprint</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cross-Pillar Jump Bar */}
        <section className="py-12 bg-slate-100/80 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Ready to review the visitor flow or the staff console?
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Explore the smartphone pass journey or operator dispatch console.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/product"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 transition-all"
              >
                Visitor Journey →
              </Link>
              <Link
                href="/operations"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xs"
              >
                Operations Console →
              </Link>
            </div>
          </div>
        </section>

        <CTA />
      </main>

      <Footer />
    </div>
  );
}
