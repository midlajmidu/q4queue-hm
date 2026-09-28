import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import CTA from "@/components/landing/CTA";
import {
  Sliders,
  Layers,
  ArrowRight,
  Sparkles,
  PhoneCall,
  LayoutDashboard,
  CheckCircle2,
  Users2,
  Volume2,
  Repeat,
  ShieldAlert,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Staff Operations Console — Q4Queue",
  description:
    "Everything your team needs to keep the line moving. Tactile operator consoles to call, recall, transfer, and balance load with one click.",
};

export default function OperationsPage() {
  const capabilities = [
    {
      title: "One-Click Ticket Calling & Recalls",
      tag: "DISPATCH VELOCITY",
      description:
        "Front-line staff summon the next party with a single keystroke or screen tap. Built-in recall timers automatically manage absent visitors without blocking active lanes.",
      icon: PhoneCall,
      highlight: "< 1.2s dispatch latency",
    },
    {
      title: "Multi-Service Counter Routing",
      tag: "LOAD BALANCING",
      description:
        "Dynamically route specialized requests (e.g. VIP styling, urgent clinical triage, notary verification) to qualified counter operators without inter-department chaos.",
      icon: Layers,
      highlight: "Dynamic skill-based triage",
    },
    {
      title: "Seamless Cross-Desk Transfers",
      tag: "WARM HANDOFFS",
      description:
        "Transfer a visitor from intake registration directly to an exam room or teller desk with full consultation notes intact, eliminating repetitive customer questioning.",
      icon: Repeat,
      highlight: "Full audit trail preserved",
    },
    {
      title: "Audible Chimes & Digital Signage Sync",
      tag: "MULTI-CHANNEL ALERTS",
      description:
        "Broadcast customizable counter chimes and visual display feeds across overhead TV screens in waiting lounges, ensuring no customer misses their call.",
      icon: Volume2,
      highlight: "HDMI & smart TV compatible",
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
                "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.25) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.12] text-[11.5px] font-semibold tracking-wide text-indigo-200 mb-6 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Operations Control Suite</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              <span className="bg-gradient-to-b from-white via-slate-100 to-slate-300/85 bg-clip-text text-transparent">
                Everything your team needs
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-blue-300 to-sky-300 bg-clip-text text-transparent">
                to keep the line moving.
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-300/90 max-w-2xl mx-auto leading-relaxed">
              Built for counter operators, triage clinicians, and branch managers who need instant velocity,
              predictable pacing, and total lobby visibility.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/get-started"
                className="h-12 px-7 rounded-xl bg-white text-slate-950 font-bold text-sm shadow-md hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
              >
                <span>Launch staff console</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/product"
                className="h-12 px-6 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 hover:text-white border border-white/[0.14] text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                <span>Explore visitor flow</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        </section>

        {/* Staff Console Grid */}
        <section className="py-20 sm:py-28 bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">
                Operator Ergonomics
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Designed for high-throughput teams
              </h2>
              <p className="mt-3 text-slate-600 text-base sm:text-lg leading-relaxed">
                Whether you run 3 teller windows or a 50-counter civic center, Q4Queue eliminates front-desk chaos with tactile web-based controls.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
              {capabilities.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div
                    key={cap.title}
                    className="p-8 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:shadow-xl hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200/70">
                          {cap.tag}
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-indigo-600 flex items-center justify-center shadow-2xs">
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                        {cap.title}
                      </h3>
                      <p className="mt-3 text-slate-600 leading-relaxed text-sm">
                        {cap.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Performance Spec:</span>
                      <span className="text-indigo-600 font-mono">{cap.highlight}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Cross-Pillar Jump Bar */}
        <section className="py-12 bg-slate-100/80 border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Want to see the visitor journey or measured business outcomes?
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Explore the smartphone pass experience or view venue case studies.
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
