import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import CTA from "@/components/landing/CTA";
import {
  QrCode,
  Smartphone,
  Bell,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Visitor Journey & Virtual Queueing — Q4Queue",
  description:
    "One queue. Every customer. Total control. Empower guests to check in via QR or kiosk and track wait times live in their smartphone browser.",
};

export default function ProductPage() {
  const steps = [
    {
      num: "01",
      title: "Zero-friction Arrival & Check-in",
      tag: "INSTANT QR INTAKE",
      description:
        "Visitors scan a dynamic QR code placed at your entryway or check in through a sleek tablet stand. No native app download, account creation, or login required.",
      features: [
        "Instant web token generation in < 3 seconds",
        "Multi-language language support (12+ languages)",
        "Service type & specialist department triage",
        "SMS ticket backup for feature phone users",
      ],
      previewPill: "Ticket #A-42 Generated",
    },
    {
      num: "02",
      title: "Autonomous Remote Waiting",
      tag: "REAL-TIME SYNC",
      description:
        "Guests are completely free to wait in their vehicle, visit a nearby coffee shop, or browse store merchandise while monitoring real-time queue position on their phone.",
      features: [
        "Dynamically recalculated wait time window",
        "Live count of guests currently ahead",
        "One-tap 'Need 5 more minutes' buffer request",
        "Low-bandwidth optimized web activity pass",
      ],
      previewPill: "2 Parties Ahead • ~4 min wait",
    },
    {
      num: "03",
      title: "Precision Proximity Calling",
      tag: "AUTOMATED ALERTS",
      description:
        "When an operator opens a desk, the system dispatches an instant audible turn alert and SMS chime with clear directional signage to the exact counter window.",
      features: [
        "Audible chime and vibration web alert",
        "Desk number and staff member name display",
        "Grace period timer before re-queueing",
        "Synchronized lobby digital display boards",
      ],
      previewPill: "Now Calling Counter 03",
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
                "radial-gradient(ellipse at center, rgba(37, 99, 235, 0.25) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-[11.5px] font-semibold tracking-wide text-blue-200 mb-6 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Visitor Journey Architecture</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              <span className="bg-gradient-to-b from-white via-slate-100 to-slate-300/85 bg-clip-text text-transparent">
                One queue. Every customer.
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                Total control.
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-300/90 max-w-2xl mx-auto leading-relaxed">
              Transform physical lines into an autonomous, transparent digital journey.
              Empower your guests to wait comfortably anywhere while your staff maintains real-time pacing.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/get-started"
                className="h-12 px-7 rounded-xl bg-white text-slate-950 font-bold text-sm shadow-md hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
              >
                <span>Deploy digital queue</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/operations"
                className="h-12 px-6 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/[0.14] text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <span>See operations console</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </section>

        {/* 3-Step Journey Breakdown */}
        <section className="py-20 sm:py-28 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
                End-to-End Visitor Architecture
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                How visitors experience Q4Queue
              </h2>
              <p className="mt-3 text-slate-600 text-base sm:text-lg leading-relaxed">
                Zero app downloads. Zero confusing ticket machines. A frictionless 3-step digital flow that keeps visitors delighted.
              </p>
            </div>

            <div className="mt-14 space-y-8 lg:space-y-12">
              {steps.map((step, idx) => (
                <div
                  key={step.num}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center p-8 sm:p-10 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:border-slate-300 transition-all"
                >
                  <div className="lg:col-span-7">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-8 h-8 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-xs">
                        {step.num}
                      </span>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/70">
                        {step.tag}
                      </span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-slate-600 leading-relaxed text-sm sm:text-base">
                      {step.description}
                    </p>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {step.features.map((feat) => (
                        <div key={feat} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium text-slate-700">
                            {feat}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <div className="rounded-2xl bg-slate-950 p-6 text-white border border-slate-800 shadow-xl">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-semibold text-slate-300">
                        <span>Live Preview</span>
                        <span className="text-emerald-400 font-mono text-[11px]">Active</span>
                      </div>
                      <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                        <div className="text-xs text-slate-400 uppercase font-medium">Visitor Screen</div>
                        <div className="text-xl font-extrabold text-blue-400 mt-1 font-mono">
                          {step.previewPill}
                        </div>
                      </div>
                    </div>
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
                Looking for operator tools or business outcomes?
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Tour our staff consoles or explore measured venue ROI.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/operations"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 transition-all"
              >
                Operations Console →
              </Link>
              <Link
                href="/solutions"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xs"
              >
                Business Outcomes →
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
