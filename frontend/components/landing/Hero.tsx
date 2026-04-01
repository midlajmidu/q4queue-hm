"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Users, Clock, Zap } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const stats = [
  { label: "Active Queues", value: "2,400+", icon: Zap },
  { label: "Customers Served", value: "1.2M+", icon: Users },
  { label: "Avg. Time Saved", value: "15 min", icon: Clock },
];

const Hero = () => {
  const router = useRouter();

  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Left — Text content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 mb-6"
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
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground">
            Smarter Queue Management.<br />
            <span
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #475569 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Happier customers.
            </span>
          </h1>

          {/* Subhead */}
          <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
            Let your customers wait from anywhere. <strong className="text-foreground font-semibold">q4queue</strong> turns physical lines into a <span className="text-primary font-bold">digital queue management system</span> — no app install, no hardware, no hassle.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              onClick={() => router.push('/get-started')}
              className="group text-base px-8 rounded-full font-heading font-semibold shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              Start Free Trial <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 rounded-full font-heading font-semibold gap-2 hover:bg-primary/5 border-border/60 transition-all duration-300">
              <Play className="w-4 h-4" /> Watch Demo
            </Button>
          </div>

          {/* Social proof row */}
          <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-primary/12 via-accent/8 to-primary/4 rounded-full blur-[100px]" />

          {/* Browser window mockup */}
          <div className="relative z-[2] glass-card rounded-2xl overflow-hidden">
            {/* Browser chrome bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-white/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/70" />
                <div className="w-3 h-3 rounded-full bg-amber-400/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/70" />
              </div>
              <div className="flex-1 px-3">
                <div className="bg-white/40 rounded-md py-1 px-3 border border-border/20 flex items-center justify-center">
                  <span className="text-[11px] text-muted-foreground/60 font-medium">app.q4queue.com/dashboard</span>
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
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
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
            className="absolute -top-3 -right-3 z-[3] hidden lg:block"
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
            className="absolute -bottom-5 -left-3 z-[3] hidden lg:block"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bg-white rounded-full border border-border/40 pl-1.5 pr-4 py-1.5 shadow-lg shadow-black/5 flex items-center gap-2">
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
            className="absolute -bottom-3 -right-2 z-[3] hidden lg:block"
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
        className="relative max-w-3xl mx-auto mt-14 md:mt-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <div className="rounded-2xl border border-border/40 bg-white/60 backdrop-blur-xl shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/40">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="flex items-center gap-3.5 px-6 py-5 md:justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <stat.icon className="w-4 h-4 text-gray-500" strokeWidth={2} />
                </div>
                <div>
                  <span className="font-heading text-sm font-bold text-foreground block leading-tight">
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
    </section>
  );
};

export default Hero;
