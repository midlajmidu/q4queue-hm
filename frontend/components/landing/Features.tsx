"use client";

import { Shield, QrCode, BarChart3, Bell, Users, Globe } from "lucide-react";
import { motion } from "framer-motion";

/* ─── Feature data ─────────────────────────────────────────────────────────── */
const features = [
  {
    icon: QrCode,
    title: "QR Code Check in",
    description:
      "Visitors scan a QR code at your entrance and instantly join your queue. No apps, no forms — just scan and go.",
    accent: "#3b82f6",
    accentRing: "rgba(59,130,246,0.15)",
    gradFrom: "#eff6ff",
    gradTo: "#dbeafe",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Automatic alerts when a visitor's turn is approaching. SMS, browser push, or in-app — they'll never miss their spot.",
    accent: "#8b5cf6",
    accentRing: "rgba(139,92,246,0.15)",
    gradFrom: "#f5f3ff",
    gradTo: "#ede9fe",
  },
  {
    icon: BarChart3,
    title: "Real time Analytics",
    description:
      "Track wait times, peak hours, and visitor flow. Make data-driven decisions to optimize your operations.",
    accent: "#10b981",
    accentRing: "rgba(16,185,129,0.15)",
    gradFrom: "#ecfdf5",
    gradTo: "#d1fae5",
  },
  {
    icon: Users,
    title: "Multi Queue Support",
    description:
      "Run multiple queues simultaneously — clinics, restaurants, retail. One platform, unlimited queues.",
    accent: "#f59e0b",
    accentRing: "rgba(245,158,11,0.15)",
    gradFrom: "#fffbeb",
    gradTo: "#fef3c7",
  },
  {
    icon: Globe,
    title: "Works Everywhere",
    description:
      "No hardware needed. Works on any device with a browser — phone, tablet, or desktop.",
    accent: "#06b6d4",
    accentRing: "rgba(6,182,212,0.15)",
    gradFrom: "#ecfeff",
    gradTo: "#cffafe",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "End to end encryption, GDPR compliant, and 99.9% uptime SLA. Built for businesses that demand reliability.",
    accent: "#ec4899",
    accentRing: "rgba(236,72,153,0.15)",
    gradFrom: "#fdf2f8",
    gradTo: "#fce7f3",
  },
];

/* ─── Animation variants ───────────────────────────────────────────────────── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const rowAnim = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/* ─── Reusable card ─────────────────────────────────────────────────────────── */
interface FeatureProps {
  f: {
    icon: React.ElementType;
    title: string;
    description: string;
    accent: string;
    accentRing: string;
    gradFrom: string;
    gradTo: string;
  };
  reverse: boolean;
}

const FeatureCard = ({ f, reverse }: FeatureProps) => (
  <div
    className="relative rounded-2xl overflow-hidden h-full"
    style={{
      background: "rgba(255,255,255,0.035)",
      border: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
    }}
  >
    {/* Noise texture */}
    <div
      className="absolute inset-0 opacity-[0.025] pointer-events-none"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundSize: "128px 128px",
      }}
    />
    {/* Bottom accent wash */}
    <div
      className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-[60px] opacity-[0.15] pointer-events-none"
      style={{ background: f.accent }}
    />

    <div className={`relative p-6 md:p-7 flex items-start gap-4 ${reverse ? "flex-row-reverse" : ""}`}>
      {/* Icon */}
      <div className="flex-shrink-0">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: `linear-gradient(145deg, ${f.gradFrom}, ${f.gradTo})`,
            border: `1px solid ${f.accentRing}`,
            boxShadow: `0 0 0 4px ${f.accentRing}, 0 4px 12px ${f.accentRing}`,
          }}
        >
          <f.icon className="w-[18px] h-[18px]" style={{ color: f.accent }} strokeWidth={2.2} />
        </div>
      </div>
      {/* Text */}
      <div className={`flex-1 min-w-0 ${reverse ? "text-right" : ""}`}>
        <h3 className="font-heading text-base font-bold text-white mb-2 tracking-tight">
          {f.title}
        </h3>
        <p className="text-white/90 text-sm md:text-[15px] leading-relaxed">
          {f.description}
        </p>
      </div>
    </div>
  </div>
);

/* ─── Component ────────────────────────────────────────────────────────────── */
const Features = () => {
  return (
    <section id="features" className="relative overflow-hidden">

      {/* ── Top wave divider ──────────────────────────────────────── */}
      <div className="relative w-full -mb-px">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto block"
          preserveAspectRatio="none"
        >
          <path d="M0 120V60C240 20 480 0 720 10C960 20 1200 60 1440 40V120H0Z" fill="#090e17" />
          <path
            d="M0 60C240 20 480 0 720 10C960 20 1200 60 1440 40"
            stroke="url(#wave-top-stroke)"
            strokeWidth="1.5"
            fill="none"
          />
          <defs>
            <linearGradient id="wave-top-stroke" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.3" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="0.7" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ── Main section body ─────────────────────────────────────── */}
      <div
        className="relative px-6 py-10 md:py-14"
        style={{
          background: "linear-gradient(160deg, #090e17 0%, #111a2f 40%, #0c1322 70%, #090e17 100%)",
        }}
      >
        {/* Fine dot grid */}
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.25) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Radial vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, #090e17 100%)" }}
        />
        {/* Ambient glows */}
        <div className="absolute top-[-80px] left-1/4 w-[600px] h-[600px] rounded-full blur-[180px] pointer-events-none" style={{ background: "rgba(59,130,246,0.09)" }} />
        <div className="absolute top-1/2 right-[-100px] w-[500px] h-[500px] rounded-full blur-[160px] pointer-events-none" style={{ background: "rgba(99,102,241,0.07)" }} />
        <div className="absolute bottom-[-60px] left-1/3 w-[400px] h-[400px] rounded-full blur-[140px] pointer-events-none" style={{ background: "rgba(16,185,129,0.05)" }} />

        <div className="relative max-w-6xl mx-auto">

          {/* ── Header ─────────────────────────────────────────────── */}
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as const }}
          >
            <div
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-2 mb-10"
              style={{
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.2)",
                boxShadow: "0 0 20px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" style={{ boxShadow: "0 0 6px rgba(96,165,250,0.9)" }} />
              <span className="text-[11px] font-heading font-semibold uppercase tracking-[0.18em] text-blue-100">
                Features
              </span>
            </div>

            <h2 className="font-heading text-3xl md:text-[2.75rem] lg:text-[3rem] font-extrabold tracking-tight text-white leading-[1.08] mb-5">
              Everything you need to
              <br className="hidden sm:block" />
              <span className="relative inline-block mt-1">
                <span
                  className="relative z-10 px-4 py-1.5 rounded-xl inline-block"
                  style={{
                    background: "rgba(59, 130, 246, 0.15)",
                    boxShadow: "inset 0 0 0 1px rgba(59, 130, 246, 0.3), 0 4px 12px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <span
                    style={{
                      background: "linear-gradient(135deg, #60a5fa 0%, #a5b4fc 45%, #60a5fa 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    manage queues
                  </span>
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 320 10" fill="none" aria-hidden>
                  <path d="M2 6C70 2.5 160 2.5 318 6" stroke="url(#ul-grad)" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M2 6C70 2.5 160 2.5 318 6" stroke="url(#ul-glow)" strokeWidth="6" strokeLinecap="round" opacity="0.35" />
                  <defs>
                    <linearGradient id="ul-grad" x1="0" x2="320" y1="0" y2="0" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#3b82f6" stopOpacity="0.05" />
                      <stop offset="0.4" stopColor="#6366f1" />
                      <stop offset="0.6" stopColor="#818cf8" />
                      <stop offset="1" stopColor="#3b82f6" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="ul-glow" x1="0" x2="320" y1="0" y2="0" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#6366f1" stopOpacity="0" />
                      <stop offset="0.5" stopColor="#818cf8" />
                      <stop offset="1" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h2>

            <p className="mt-6 text-blue-100/80 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              A comprehensive suite of tools built for operational excellence
              and seamless customer experiences.
            </p>
          </motion.div>

          {/* ── Compact Grid ─────────────────────────────────────────── */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {features.map((f) => (
              <motion.div key={f.title} variants={rowAnim} className="h-full">
                <FeatureCard f={f} reverse={false} />
              </motion.div>
            ))}
          </motion.div>

          {/* ── Trust badges ───────────────────────────────────────── */}
          <motion.div
            className="mt-12 md:mt-16"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            <div
              className="w-full h-px mb-8 mx-auto"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent)",
              }}
            />
            <div className="flex items-center justify-center gap-8 flex-wrap">
              {["99.9% Uptime", "SOC 2 Compliant", "GDPR Ready", "256 bit Encryption"].map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-heading font-medium tracking-widest text-blue-200/80 uppercase">
                    {label}
                  </span>
                  {i < 3 && <span className="hidden md:block w-px h-3 bg-white/10 ml-4" />}
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── Bottom wave divider ───────────────────────────────────── */}
      <div className="relative w-full -mt-px">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto block"
          preserveAspectRatio="none"
        >
          <path d="M0 0V70C240 100 480 120 720 105C960 90 1200 50 1440 80V0H0Z" fill="#090e17" />
          <path
            d="M0 70C240 100 480 120 720 105C960 90 1200 50 1440 80"
            stroke="url(#wave-bottom-stroke)"
            strokeWidth="1.5"
            fill="none"
          />
          <defs>
            <linearGradient id="wave-bottom-stroke" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" stopOpacity="0" />
              <stop offset="0.3" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="0.7" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

    </section>
  );
};

export default Features;