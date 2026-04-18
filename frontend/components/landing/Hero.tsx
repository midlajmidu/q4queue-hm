"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Users, Clock, Zap, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const stats = [
  { label: "Active Queues", value: "2,400+", icon: Zap },
  { label: "Customers Served", value: "1.2M+", icon: Users },
  { label: "Avg. Time Saved", value: "15 min", icon: Clock },
];

const Hero = () => {
  const router = useRouter();
  const [showDemo, setShowDemo] = useState(false);

  // Close modal on Escape key
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
    <section className="relative pt-24 pb-10 md:pt-32 md:pb-16 px-6 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-16 items-center">
        {/* Left — Text content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="lg:pr-2"
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary/8 border border-primary/15 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-xs font-heading font-bold text-primary uppercase tracking-wider">
              Trusted by 500+ businesses
            </span>
          </motion.div>

          {/* Headline */}
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-[2.95rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground">
            Smarter Queue Management.<br />
            <span
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #043579ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Happier customers.
            </span>
          </h1>

          {/* Subhead */}
          <p className="mt-4 text-sm md:text-[15px] text-muted-foreground leading-[1.7] max-w-[480px]">
            Let your customers wait from anywhere. <strong className="text-foreground font-semibold">q4queue</strong> turns physical lines into a <span className="text-primary font-bold">digital queue management system</span> no app install, no hardware, no hassle.
          </p>

          {/* CTAs */}
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              onClick={() => router.push('/get-started')}
              className="group text-base px-8 h-12 rounded-full font-heading font-semibold shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              Start Free Trial <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowDemo(true)}
              className="text-base px-8 h-12 rounded-full font-heading font-semibold gap-2.5 hover:bg-primary/5 border-border/60 transition-all duration-300"
            >
              <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Play className="w-3.5 h-3.5 text-primary fill-primary" />
              </span>
              Watch Demo
            </Button>
          </div>

          {/* Social proof row */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
            {["1 week free trial", "No signup required", "Set up in under 2 minutes"].map((text, i) => (
              <motion.span
                key={text}
                className="flex items-center gap-1.5 font-medium"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
              >
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                {text}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Right — Dashboard mockup */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          {/* Background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-primary/8 via-accent/5 to-primary/3 rounded-full blur-[140px]" />

          {/* Browser window mockup */}
          <div className="relative z-[2] rounded-2xl overflow-hidden border border-border/25 bg-white/75 backdrop-blur-xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.10),0_10px_25px_-10px_rgba(0,0,0,0.06)]">
            {/* Browser chrome bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-gradient-to-b from-white/80 to-white/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/70" />
                <div className="w-3 h-3 rounded-full bg-amber-400/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/70" />
              </div>
              <div className="flex-1 px-3">
                <div className="bg-white/50 rounded-lg py-1.5 px-3 border border-border/20 flex items-center justify-center">
                  <span className="text-[11px] text-muted-foreground/60 font-medium tracking-wide">app.q4queue.com/dashboard</span>
                </div>
              </div>
            </div>

            {/* Dashboard content with accessibility hidden image for alt keywords */}
            <div className="sr-only">
              <Image
                src="/og-image.png"
                alt="Q4Queue Digital Queue Management Dashboard for clinics and retail with token system"
                width={10}
                height={10}
              />
            </div>
            {/* Dashboard content */}
            <div className="p-5 bg-white/30 space-y-4">
              {/* Dashboard header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-heading font-bold text-foreground">Queue Dashboard</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Downtown Clinic · Today</p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "In Queue", value: "12", color: "text-primary" },
                  { label: "Avg Wait", value: "8m", color: "text-amber-600" },
                  { label: "Served Today", value: "47", color: "text-emerald-600" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-white/60 border border-border/30 p-3 text-center">
                    <p className={`font-heading text-xl font-extrabold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Queue list */}
              <div className="rounded-xl bg-white/60 border border-border/30 overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/30">
                  <p className="text-[11px] font-heading font-semibold text-foreground">Current Queue</p>
                  <p className="text-[10px] text-muted-foreground font-medium">12 waiting</p>
                </div>
                {[
                  { name: "Sarah M.", position: "#1", status: "Serving", statusBg: "bg-blue-50 text-blue-600", time: "2m ago" },
                  { name: "James K.", position: "#2", status: "Next", statusBg: "bg-amber-50 text-amber-600", time: "5m ago" },
                  { name: "Priya R.", position: "#3", status: "Waiting", statusBg: "bg-secondary text-muted-foreground", time: "7m ago" },
                  { name: "Alex W.", position: "#4", status: "Waiting", statusBg: "bg-secondary text-muted-foreground", time: "9m ago" },
                ].map((person, i) => (
                  <motion.div
                    key={person.name}
                    className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/20 last:border-b-0 hover:bg-white/40 transition-colors"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0 ring-2 ring-white">
                        {person.name[0]}
                      </span>
                      <div>
                        <p className="text-[12px] font-semibold text-foreground leading-tight">{person.name}</p>
                        <p className="text-[10px] text-muted-foreground">{person.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground/50">{person.position}</span>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${person.statusBg}`}>
                        {person.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Notification toast — top-right */}
          <motion.div
            className="absolute -top-3 -right-6 z-[3] hidden lg:block"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bg-white rounded-xl border border-border/40 px-4 py-3 shadow-lg shadow-black/5 max-w-[200px]">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-heading font-bold text-foreground leading-tight">Token #47 served</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Counter 2 · Just now</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Active users — bottom-left */}
          <motion.div
            className="absolute -bottom-4 -left-6 z-[3] hidden lg:block"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bg-white rounded-full border border-border/40 pl-1.5 pr-4 py-1.5 shadow-lg shadow-black/5 flex items-center gap-2.5">
              {/* Avatar stack */}
              <div className="flex -space-x-2">
                {["bg-primary", "bg-violet-500", "bg-emerald-500", "bg-amber-500"].map((bg, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full ${bg} border-2 border-white flex items-center justify-center`}>
                    <span className="text-[8px] font-bold text-white">{["S", "J", "P", "A"][i]}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[11px] font-heading font-bold text-foreground leading-tight">+8 more</p>
                <p className="text-[9px] text-muted-foreground">in queue now</p>
              </div>
            </div>
          </motion.div>

          {/* Uptime pill — bottom-right */}
          <motion.div
            className="absolute -bottom-2 -right-4 z-[3] hidden lg:block"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bg-white rounded-full border border-border/40 px-3.5 py-2 shadow-lg shadow-black/5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-heading font-bold text-foreground">99.9% uptime</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Stats bar */}
      <motion.div
        className="relative max-w-3xl mx-auto mt-10 md:mt-14"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div className="rounded-2xl border border-border/40 bg-white/60 backdrop-blur-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="flex items-center gap-4 px-7 py-5 md:justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/60 flex items-center justify-center shrink-0">
                  <stat.icon className="w-[18px] h-[18px] text-gray-500" strokeWidth={2} />
                </div>
                <div>
                  <span className="font-heading text-[15px] font-bold text-foreground block leading-tight">
                    {stat.value}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {stat.label}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
      {/* ── Demo Video Modal ── */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowDemo(false)}
            />

            {/* Modal content */}
            <motion.div
              className="relative w-[90vw] max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Close button */}
              <button
                onClick={() => setShowDemo(false)}
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-all duration-200 hover:scale-110"
                aria-label="Close demo video"
              >
                <X className="w-5 h-5" />
              </button>

              {/* YouTube embed */}
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
};

export default Hero;
