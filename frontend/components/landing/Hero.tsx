"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Play,
  X,
  Check,
  Star,
  Bell,
  QrCode,
  MessageSquare,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Clock,
  ChevronRight,
  Activity,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Shared easing ───────────────────────────────────────────────── */
const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ─── Component ───────────────────────────────────────────────────── */

export default function Hero() {
  const router = useRouter();
  const [showDemo, setShowDemo] = useState(false);

  /* ESC to close video modal */
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setShowDemo(false);
  }, []);

  useEffect(() => {
    if (showDemo) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [showDemo, handleEsc]);

  return (
    <section
      className="relative overflow-x-clip pt-32 sm:pt-36 lg:pt-40 pb-24 sm:pb-32 lg:pb-36"
      style={{
        background:
          "linear-gradient(180deg, #030712 0%, #060B18 30%, #0A1636 70%, #070E22 100%)",
      }}
    >
      {/* ── Fine Dot Grid Texture with Radial Fade Mask ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 25%, black 40%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 25%, black 40%, transparent 85%)",
        }}
      />

      {/* ── Centered Atmospheric Sapphire Bloom ── */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "4%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "1100px",
          height: "650px",
          background:
            "radial-gradient(ellipse at 50% 20%, rgba(37, 99, 235, 0.24) 0%, rgba(59, 130, 246, 0.08) 45%, transparent 72%)",
          filter: "blur(30px)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: "42%",
          left: "50%",
          transform: "translate(-50%, -20%)",
          width: "1000px",
          height: "550px",
          background:
            "radial-gradient(ellipse at center, rgba(37, 99, 235, 0.16) 0%, rgba(30, 64, 175, 0.05) 50%, transparent 70%)",
        }}
      />

      {/* ── Hero Content Header ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8 text-center">
        {/* Eyebrow Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease }}
          className="flex items-center justify-center mb-6 sm:mb-7"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.12] text-[11.5px] font-semibold tracking-wide text-blue-200 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-all select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>Next-Gen Virtual Queueing &amp; Flow</span>
          </div>
        </motion.div>

        {/* Editorial Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
          className="text-center text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-extrabold tracking-[-0.035em] leading-[1.08] max-w-[920px] mx-auto"
        >
          <span className="bg-gradient-to-b from-white via-slate-100 to-slate-300/85 bg-clip-text text-transparent">
            Turn waiting lines
          </span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(56,189,248,0.25)]">
            into better experiences.
          </span>
        </motion.h1>

        {/* Authoritative Supporting Copy */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.35, ease }}
          className="text-center mt-5 sm:mt-6 text-[17px] sm:text-[19px] text-slate-300/90 leading-relaxed max-w-[640px] mx-auto font-normal"
        >
          Replace physical waiting lines with intelligent digital customer flow. Empower guests to wait anywhere while giving your staff total operational control.
        </motion.p>

        {/* Tactile Enterprise CTA Group */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 mt-8 sm:mt-9"
        >
          <Button
            size="lg"
            onClick={() => router.push("/pricing")}
            className="h-[50px] px-8 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-[15px] shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_12px_28px_-6px_rgba(255,255,255,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start 14-Day Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <button
            type="button"
            onClick={() => setShowDemo(true)}
            className="inline-flex items-center justify-center gap-2.5 h-[50px] px-6 rounded-xl text-[15px] font-semibold text-slate-200 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.14] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="w-5 h-5 rounded-md bg-blue-600/30 border border-blue-400/40 flex items-center justify-center">
              <Play className="w-2.5 h-2.5 fill-current text-blue-400 ml-0.5" />
            </span>
            <span>See how it works</span>
          </button>
        </motion.div>

        {/* Modernized Social Proof & Trust Strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.65, ease }}
          className="flex items-center justify-center flex-wrap gap-2.5 sm:gap-3.5 mt-8 sm:mt-9"
        >
          {/* Rating Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm text-[12.5px] text-white/80">
            <div className="flex items-center gap-0.5 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="font-semibold text-white">4.9/5</span>
            <span className="text-white/40">from 1,200+ venues</span>
          </div>

          {/* Feature 1 */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.07] text-[12px] text-slate-300 font-medium">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>Zero hardware needed</span>
          </div>

          {/* Feature 2 */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.07] text-[12px] text-slate-300 font-medium">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>3-minute setup</span>
          </div>

          {/* Feature 3 */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.07] text-[12px] text-slate-300 font-medium">
            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
            <span>Any mobile or tablet device</span>
          </div>
        </motion.div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          MULTI-DEVICE PRODUCT SHOWCASE
         ════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 mt-12 sm:mt-16 lg:mt-20 overflow-x-clip">
        <div className="relative mx-auto max-w-[1240px] xl:max-w-[1380px] px-3 sm:px-6 lg:px-8">
          {/* Main composition container */}
          <div className="relative">

            {/* ── 1. MAIN TABLET DEVICE (Centered Showcase) ── */}
            <motion.div
              initial={{ opacity: 0, y: 45 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.75, ease }}
              className="relative mx-auto max-w-[760px] lg:max-w-[820px] z-10 w-full"
            >
              {/* Device outer frame — realistic graphite/titanium bezel */}
              <div
                className="relative rounded-[20px] sm:rounded-[28px] md:rounded-[32px] p-2.5 sm:p-3.5 md:p-4"
                style={{
                  background:
                    "linear-gradient(155deg, #1C2333 0%, #101522 50%, #0A0D15 100%)",
                  boxShadow:
                    "0 35px 95px -15px rgba(0,0,0,0.8), 0 15px 45px -10px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.12), inset 0 -1px 1px rgba(0,0,0,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Front camera pinhole on top bezel */}
                <div className="absolute top-[4px] sm:top-[6px] left-1/2 -translate-x-1/2 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#151B28] border border-white/10 flex items-center justify-center">
                    <div className="w-0.5 h-0.5 rounded-full bg-blue-500/60" />
                  </div>
                </div>

                {/* Tablet Screen Surface */}
                <div
                  className="relative rounded-[12px] sm:rounded-[16px] md:rounded-[20px] overflow-hidden bg-white border border-slate-200/80 shadow-inner"
                >
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: "2880/1800" }}>
                    <Image
                      src="/images/dashboard.png?v=staff"
                      alt="Q4Queue Real-time Staff Operations Dashboard"
                      width={2880}
                      height={1800}
                      className="w-full h-auto block select-none pointer-events-none"
                      priority
                      unoptimized
                    />


                    {/* Subtle diagonal specular screen reflection */}
                    <div
                      className="absolute inset-0 pointer-events-none z-20 rounded-[12px] sm:rounded-[16px] md:rounded-[20px]"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%, transparent 100%)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Tablet sub-label */}
              <div className="mt-3.5 text-center">
                <span className="text-[11px] font-medium tracking-wide text-white/40">
                  Staff Operations Console · Real-Time Queue Management
                </span>
              </div>
            </motion.div>

            {/* ── 2. SMARTPHONE DEVICE — Customer Mobile Experience (Overlapping Lower-Right on Desktop, Centered on Mobile) ── */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.95, ease }}
              className="relative mt-8 sm:mt-10 mx-auto lg:mt-0 lg:absolute lg:bottom-[-20px] xl:bottom-[-25px] lg:right-6 xl:right-16 z-30 w-[205px] sm:w-[235px] md:w-[245px] lg:w-[252px] max-w-[85vw]"
            >
              {/* Outer phone frame with subtle titanium bevel & side buttons */}
              <div className="relative">
                {/* Hardware side buttons (iPhone 16 Pro styling) - hidden on mobile to prevent overflow */}
                <div className="hidden sm:block absolute -left-[2px] top-[72px] w-[2.5px] h-[16px] bg-[#2A344A] rounded-l-xs shadow-xs" />
                <div className="hidden sm:block absolute -left-[2px] top-[102px] w-[2.5px] h-[32px] bg-[#2A344A] rounded-l-xs shadow-xs" />
                <div className="hidden sm:block absolute -left-[2px] top-[142px] w-[2.5px] h-[32px] bg-[#2A344A] rounded-l-xs shadow-xs" />
                <div className="hidden sm:block absolute -right-[2px] top-[110px] w-[2.5px] h-[46px] bg-[#2A344A] rounded-r-xs shadow-xs" />

                {/* Phone Outer Chassis */}
                <div
                  className="relative rounded-[32px] sm:rounded-[40px] p-[6px] sm:p-[8px]"
                  style={{
                    background: "linear-gradient(155deg, #222B3D 0%, #121824 50%, #0A0D15 100%)",
                    boxShadow:
                      "0 32px 85px -12px rgba(0,0,0,0.8), 0 16px 40px -8px rgba(0,0,0,0.45), inset 0 1px 1.5px rgba(255,255,255,0.22), inset 0 -1px 1px rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {/* Dynamic Island */}
                  <div className="absolute top-[10px] sm:top-[13px] left-1/2 -translate-x-1/2 w-[54px] sm:w-[68px] h-[13px] sm:h-[16px] rounded-full bg-[#000000] z-30 flex items-center justify-end pr-2 sm:pr-2.5 shadow-xs">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#161D2B] border border-white/10 flex items-center justify-center">
                      <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-blue-500/40" />
                    </div>
                  </div>

                  {/* Phone Screen */}
                  <div
                    className="relative rounded-[26px] sm:rounded-[32px] overflow-hidden bg-[#EEF2F6] border border-slate-200/80 select-none shadow-inner"
                    style={{ aspectRatio: "896/1650" }}
                  >
                    {/* iOS Status Bar (crisp white on top of blue header) */}
                    <div className="absolute top-0 inset-x-0 z-20 px-4 sm:px-5 pt-1.5 sm:pt-2 pb-1 flex items-center justify-between text-white/95 pointer-events-none">
                      <span className="text-[7.5px] sm:text-[8.5px] font-semibold tracking-tight">9:41</span>
                      <div className="flex items-center gap-1">
                        {/* Signal bars */}
                        <div className="flex gap-[1.5px] items-end h-2">
                          <div className="w-[1.5px] h-[2.5px] sm:h-[3px] rounded-xs bg-white" />
                          <div className="w-[1.5px] h-[3.5px] sm:h-[4.5px] rounded-xs bg-white" />
                          <div className="w-[1.5px] h-[5px] sm:h-[6px] rounded-xs bg-white" />
                          <div className="w-[1.5px] h-[6.5px] sm:h-[7.5px] rounded-xs bg-white" />
                        </div>
                        {/* 5G */}
                        <span className="text-[6.5px] sm:text-[7px] font-bold tracking-tighter">5G</span>
                        {/* Battery */}
                        <div className="w-3 sm:w-3.5 h-[6.5px] sm:h-[7.5px] rounded-[2px] border border-white/90 relative p-[1px] flex items-center">
                          <div className="h-full w-[80%] rounded-[1px] bg-white" />
                        </div>
                      </div>
                    </div>

                    {/* Actual Token Page Image from Production Dashboard (2x Retina) */}
                    <Image
                      src="/images/token-mobile-screen.png?v=j10"
                      alt="Q4Queue Live Customer Token Tracking View"
                      width={896}
                      height={1650}
                      className="w-full h-auto block select-none pointer-events-none"
                      priority
                      unoptimized
                    />

                    {/* Subtle Live Beacon Pulsing Effect over Live badge */}
                    <span
                      className="absolute pointer-events-none z-20"
                      style={{ top: "5.9%", left: "83.5%", transform: "translate(-50%, -50%)" }}
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                    </span>

                    {/* Subtle Live Updates Pulse over the Live Updates Active pill */}
                    <span
                      className="absolute pointer-events-none z-20"
                      style={{ top: "74.3%", left: "34.5%", transform: "translate(-50%, -50%)" }}
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                    </span>

                    {/* Subtle diagonal glass reflection shine */}
                    <div
                      className="absolute inset-0 pointer-events-none z-20 rounded-[26px] sm:rounded-[32px]"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 45%, transparent 100%)",
                      }}
                    />

                    {/* iOS Home Indicator Bar */}
                    <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 w-16 sm:w-24 h-1 rounded-full bg-slate-400/45 z-20 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Phone Sub-label */}
              <div className="mt-2.5 text-center">
                <span className="text-[10px] font-medium tracking-wide text-white/40">
                  Customer Live Token View
                </span>
              </div>

              {/* ── Signature Floating Push Alert on Phone (Waitwhile-style) ── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.25, ease }}
                className="absolute hidden xl:block z-40 pointer-events-none"
                style={{
                  left: "95px",
                  top: "142px",
                  width: "196px",
                }}
              >
                <div
                  className="rounded-2xl p-2.5 select-none"
                  style={{
                    background: "rgba(255, 255, 255, 0.98)",
                    backdropFilter: "blur(24px)",
                    boxShadow:
                      "0 24px 60px -10px rgba(0, 0, 0, 0.45), 0 8px 24px -4px rgba(0, 0, 0, 0.2), inset 0 1px 1.5px rgba(255, 255, 255, 1)",
                    border: "1px solid rgba(226, 232, 240, 0.95)",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Primary Blue brand emblem */}
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40">
                      <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current" aria-hidden="true">
                        <circle cx="5.2" cy="5.2" r="2.3" />
                        <circle cx="10.8" cy="5.2" r="2.3" />
                        <circle cx="5.2" cy="10.8" r="2.3" />
                        <circle cx="10.8" cy="10.8" r="2.3" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-slate-900 tracking-tight leading-tight">
                        You&apos;re next in line!
                      </div>
                      <div className="text-[8.5px] text-blue-600 font-semibold leading-tight mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span>Estimated Wait 1–4 min</span>
                      </div>
                    </div>
                  </div>
                  {/* Primary Blue Progress Bar */}
                  <div className="mt-2 w-full h-1.5 bg-blue-50 rounded-full overflow-hidden border border-blue-100">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full shadow-xs" style={{ width: "70%" }} />
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* ── 3. SVG CONNECTOR NETWORK LINES (Waitwhile Architecture Graph) ── */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none hidden xl:block z-10"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Left Tree: Confirmation & Reminder into Junction */}
              <path
                d="M 120 150 L 142 150 L 142 185"
                stroke="rgba(96, 165, 250, 0.45)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M 115 220 L 142 220 L 142 185"
                stroke="rgba(96, 165, 250, 0.45)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              {/* Left Junction Dot */}
              <circle cx="142" cy="185" r="2.5" fill="#3B82F6" stroke="#93C5FD" strokeWidth="1" />

              {/* Connection from Junction to Drop-off card */}
              <path
                d="M 142 185 L 172 185"
                stroke="rgba(96, 165, 250, 0.45)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="172" cy="185" r="2.5" fill="#3B82F6" stroke="#93C5FD" strokeWidth="1" />

              {/* Branch Down from Junction to Activity Node */}
              <path
                d="M 142 185 L 142 268 L 74 268"
                stroke="rgba(96, 165, 250, 0.45)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="74" cy="268" r="2.5" fill="#3B82F6" stroke="#93C5FD" strokeWidth="1" />

              {/* Connection from Activity Node down into WAIT TIME Card */}
              <path
                d="M 58 284 L 58 318"
                stroke="rgba(96, 165, 250, 0.45)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="58" cy="318" r="2" fill="#3B82F6" stroke="#93C5FD" strokeWidth="1" />

              {/* Right Network: Tablet top bezel to Staff notes */}
              <path
                d="M 960 18 L 1000 18 L 1000 60 L 1030 60"
                stroke="rgba(96, 165, 250, 0.45)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="960" cy="18" r="2.5" fill="#3B82F6" stroke="#93C5FD" strokeWidth="1" />

              {/* Line continuing from Staff notes to Clock */}
              <path
                d="M 1130 60 L 1160 60"
                stroke="rgba(96, 165, 250, 0.45)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="1160" cy="60" r="2.5" fill="#3B82F6" stroke="#93C5FD" strokeWidth="1" />

              {/* Right Network: Behind Phone/Tablet to Feedback */}
              <path
                d="M 1176 260 L 1210 260"
                stroke="rgba(96, 165, 250, 0.45)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="1192" cy="260" r="2.5" fill="#3B82F6" stroke="#93C5FD" strokeWidth="1" />

              {/* Branch Down to MessageSquare Node */}
              <path
                d="M 1192 260 L 1192 380 L 1222 380"
                stroke="rgba(96, 165, 250, 0.45)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="1222" cy="380" r="2.5" fill="#3B82F6" stroke="#93C5FD" strokeWidth="1" />
            </svg>

            {/* ── 4. FLOATING MICRO-SURFACES & PILLS (Left Side) ── */}

            {/* Top-Left: Glowing Primary Blue TrendingUp Node */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.9, ease }}
              className="absolute hidden xl:flex items-center justify-center z-20 pointer-events-none"
              style={{ left: "132px", top: "65px" }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-[0_0_24px_rgba(37,99,235,0.85)] border border-blue-300/50">
                <TrendingUp className="w-4 h-4 stroke-[2.5]" />
              </div>
            </motion.div>

            {/* Confirmation Pill */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.0, ease }}
              className="absolute hidden xl:block z-20 pointer-events-none"
              style={{ left: "15px", top: "135px" }}
            >
              <div className="px-3.5 py-1.5 rounded-full text-white text-[11px] font-semibold tracking-wide shadow-lg border border-blue-400/50 backdrop-blur-md bg-gradient-to-r from-[#0C1B3E]/95 via-[#11275A]/95 to-[#0C1B3E]/95 flex items-center gap-2 shadow-[0_4px_20px_rgba(37,99,235,0.3)]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60A5FA]" />
                <span>Confirmation</span>
              </div>
            </motion.div>

            {/* Reminder Pill */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.05, ease }}
              className="absolute hidden xl:block z-20 pointer-events-none"
              style={{ left: "25px", top: "205px" }}
            >
              <div className="px-3.5 py-1.5 rounded-full text-white text-[11px] font-semibold tracking-wide shadow-lg border border-blue-400/50 backdrop-blur-md bg-gradient-to-r from-[#0C1B3E]/95 via-[#11275A]/95 to-[#0C1B3E]/95 flex items-center gap-2 shadow-[0_4px_20px_rgba(37,99,235,0.3)]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60A5FA]" />
                <span>Reminder</span>
              </div>
            </motion.div>

            {/* Lower-Left: Glowing Primary Blue Activity Node */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 1.15, ease }}
              className="absolute hidden xl:flex items-center justify-center z-20 pointer-events-none"
              style={{ left: "42px", top: "252px" }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-[0_0_22px_rgba(37,99,235,0.85)] border border-blue-300/50">
                <Activity className="w-4 h-4 stroke-[2.5]" />
              </div>
            </motion.div>

            {/* Floating Drop-off Donut Chart Card */}
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, delay: 1.1, ease }}
              className="absolute hidden xl:block z-30 pointer-events-none"
              style={{ left: "162px", top: "124px", width: "154px" }}
            >
              <div
                className="rounded-2xl p-3 select-none"
                style={{
                  background: "rgba(255, 255, 255, 0.98)",
                  backdropFilter: "blur(24px)",
                  boxShadow:
                    "0 22px 55px -10px rgba(0, 0, 0, 0.38), 0 0 25px -5px rgba(37, 99, 235, 0.12), inset 0 1px 1.5px rgba(255, 255, 255, 1)",
                  border: "1px solid rgba(226, 232, 240, 0.95)",
                }}
              >
                {/* Header: Title & Trend Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-900 tracking-tight">Drop-off Rate</span>
                  <span className="inline-flex items-center text-[8.5px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60">
                    <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
                    -18%
                  </span>
                </div>

                {/* Donut Chart with Perfectly Centered Metric */}
                <div className="relative w-[92px] h-[92px] mx-auto mt-2.5 flex items-center justify-center">
                  <svg viewBox="0 0 84 84" className="w-full h-full -rotate-[75deg]">
                    {/* Background subtle ring */}
                    <circle
                      cx="42"
                      cy="42"
                      r="30"
                      fill="none"
                      stroke="#F1F5F9"
                      strokeWidth="8"
                    />
                    {/* Segment 1: Deep Sapphire (52%) */}
                    <circle
                      cx="42"
                      cy="42"
                      r="30"
                      fill="none"
                      stroke="#1D4ED8"
                      strokeWidth="8"
                      strokeDasharray="91.8 188.5"
                      strokeDashoffset="0"
                    />
                    {/* Segment 2: Vibrant Blue (31%) */}
                    <circle
                      cx="42"
                      cy="42"
                      r="30"
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="8"
                      strokeDasharray="54.7 188.5"
                      strokeDashoffset="-95.8"
                    />
                    {/* Segment 3: Soft Periwinkle (17%) */}
                    <circle
                      cx="42"
                      cy="42"
                      r="30"
                      fill="none"
                      stroke="#93C5FD"
                      strokeWidth="8"
                      strokeDasharray="30 188.5"
                      strokeDashoffset="-154.5"
                    />
                  </svg>

                  {/* Central Metric Display - True Optical Center */}
                  <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
                    <div className="inline-flex items-baseline justify-center">
                      <span className="text-[19px] font-black text-slate-900 leading-none tracking-tight">
                        2.4
                      </span>
                      <span className="text-[11px] font-extrabold text-blue-600 leading-none ml-0.5">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Structured 3-Column Breakdown */}
                <div className="grid grid-cols-3 gap-1 mt-2.5 pt-2 border-t border-slate-100 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-[11.5px] font-extrabold text-slate-900 tracking-tight leading-none">52%</span>
                    <span className="text-[8px] font-medium text-slate-500 mt-1 flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-700 shrink-0" />
                      Walk
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11.5px] font-extrabold text-slate-900 tracking-tight leading-none">31%</span>
                    <span className="text-[8px] font-medium text-slate-500 mt-1 flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      Wait
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11.5px] font-extrabold text-slate-900 tracking-tight leading-none">17%</span>
                    <span className="text-[8px] font-medium text-slate-500 mt-1 flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                      Left
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating WAIT TIME Card */}
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, delay: 1.2, ease }}
              className="absolute hidden xl:block z-20 pointer-events-none"
              style={{ left: "12px", top: "318px", width: "124px" }}
            >
              <div
                className="rounded-xl p-2.5 select-none"
                style={{
                  background: "rgba(255, 255, 255, 0.98)",
                  backdropFilter: "blur(20px)",
                  boxShadow:
                    "0 18px 40px -8px rgba(0, 0, 0, 0.35), 0 0 20px -4px rgba(37, 99, 235, 0.12)",
                  border: "1px solid rgba(226, 232, 240, 0.9)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-blue-600 tracking-wider uppercase">
                    WAIT TIME
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[14px] font-bold text-slate-900 tracking-tight leading-none">
                    9 min
                  </span>
                  <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1 py-0.5 rounded flex items-center gap-0.5">
                    <TrendingDown className="w-2 h-2" />
                    -12%
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Floating "How would you rate your experience?" Card */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.25, ease }}
              className="absolute hidden xl:block z-30 pointer-events-none"
              style={{ left: "120px", bottom: "45px", width: "230px" }}
            >
              <div
                className="rounded-2xl p-3 select-none"
                style={{
                  background: "rgba(255, 255, 255, 0.98)",
                  backdropFilter: "blur(24px)",
                  boxShadow:
                    "0 24px 60px -12px rgba(0, 0, 0, 0.45), 0 0 30px -5px rgba(37, 99, 235, 0.14), inset 0 1px 1.5px rgba(255, 255, 255, 1)",
                  border: "1px solid rgba(226, 232, 240, 0.95)",
                }}
              >
                <div className="text-[10.5px] font-semibold text-slate-800 tracking-tight">
                  How would you rate your experience?
                </div>
                <div className="flex items-center gap-1.5 mt-2.5">
                  {[1, 2, 3].map((num) => (
                    <div
                      key={num}
                      className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-semibold text-[11px] flex items-center justify-center shadow-2xs"
                    >
                      {num}
                    </div>
                  ))}
                  {/* Button 4 is active in Brand Primary Blue */}
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shadow-md shadow-blue-600/35 ring-2 ring-blue-500/40">
                    4
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-semibold text-[11px] flex items-center justify-center shadow-2xs">
                    5
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── 5. FLOATING MICRO-SURFACES & PILLS (Right Side) ── */}

            {/* Staff notes Pill */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1, ease }}
              className="absolute hidden xl:block z-20 pointer-events-none"
              style={{ left: "1030px", top: "45px" }}
            >
              <div className="px-3.5 py-1.5 rounded-full text-white text-[11px] font-semibold tracking-wide shadow-lg border border-blue-400/50 backdrop-blur-md bg-gradient-to-r from-[#0C1B3E]/95 via-[#11275A]/95 to-[#0C1B3E]/95 flex items-center gap-2 shadow-[0_4px_20px_rgba(37,99,235,0.3)]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60A5FA]" />
                <span>Staff notes</span>
              </div>
            </motion.div>

            {/* Top-Right: Glowing Primary Blue Clock Node */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 1.15, ease }}
              className="absolute hidden xl:flex items-center justify-center z-20 pointer-events-none"
              style={{ left: "1160px", top: "44px" }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-[0_0_24px_rgba(37,99,235,0.85)] border border-blue-300/50">
                <Clock className="w-4 h-4 stroke-[2.5]" />
              </div>
            </motion.div>

            {/* Feedback Pill */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.25, ease }}
              className="absolute hidden xl:block z-20 pointer-events-none"
              style={{ right: "10px", top: "245px" }}
            >
              <div className="px-3.5 py-1.5 rounded-full text-white text-[11px] font-semibold tracking-wide shadow-lg border border-blue-400/50 backdrop-blur-md bg-gradient-to-r from-[#0C1B3E]/95 via-[#11275A]/95 to-[#0C1B3E]/95 flex items-center gap-2 shadow-[0_4px_20px_rgba(37,99,235,0.3)]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_#60A5FA]" />
                <span>Feedback</span>
              </div>
            </motion.div>

            {/* Lower-Right: Glowing Primary Blue MessageSquare Node */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 1.3, ease }}
              className="absolute hidden xl:flex items-center justify-center z-20 pointer-events-none"
              style={{ right: "36px", top: "364px" }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-[0_0_22px_rgba(37,99,235,0.85)] border border-blue-300/50">
                <MessageSquare className="w-4 h-4 stroke-[2.5]" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Demo Video Modal ── */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
              onClick={() => setShowDemo(false)}
            />
            <motion.div
              className="relative w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl bg-black border border-slate-700"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <button
                onClick={() => setShowDemo(false)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Close demo"
              >
                <X className="w-4 h-4" />
              </button>
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/anway8BdW6I?si=AxgSdclEctwbudLi&autoplay=1"
                title="Q4Queue Demo Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
