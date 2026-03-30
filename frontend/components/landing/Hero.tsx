"use client";

import { ArrowRight, Play, QrCode, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { config } from "@/lib/config";

const stats = [
  {
    icon: Zap,
    value: "Live",
    label: "Real-time updates",
    color: "blue",
    iconBg: "bg-blue-500",
    iconGlow: "shadow-blue-500/30",
    accentFrom: "from-blue-500/10",
    accentTo: "to-blue-500/5",
    borderHover: "hover:border-blue-200",
    valueCls: "text-blue-600",
  },
  {
    icon: QrCode,
    value: "No App",
    label: "Scan to join",
    color: "violet",
    iconBg: "bg-violet-500",
    iconGlow: "shadow-violet-500/30",
    accentFrom: "from-violet-500/10",
    accentTo: "to-violet-500/5",
    borderHover: "hover:border-violet-200",
    valueCls: "text-violet-600",
  },
  {
    icon: Clock,
    value: "Instant",
    label: "Setup in seconds",
    color: "emerald",
    iconBg: "bg-emerald-500",
    iconGlow: "shadow-emerald-500/30",
    accentFrom: "from-emerald-500/10",
    accentTo: "to-emerald-500/5",
    borderHover: "hover:border-emerald-200",
    valueCls: "text-emerald-600",
  },
];

const Hero = () => {
  const router = useRouter();

  return (
    <section className="relative pt-20 pb-4 md:pt-28 md:pb-6 px-6 overflow-hidden bg-hero-glow">
      {/* Decorative grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(220_16%_90%/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(220_16%_90%/0.5)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_70%,transparent_100%)]" />

      {/* Floating orbs */}
      <div className="absolute top-10 left-[5%] w-96 h-96 bg-primary/10 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute bottom-10 right-[5%] w-72 h-72 bg-accent/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[500px] h-[400px] bg-primary/5 rounded-full blur-[160px]" />

      <div className="relative max-w-6xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left — Copy */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Beta badge */}
          <motion.div
            className="inline-flex items-center gap-2 bg-primary/8 text-primary text-sm font-heading font-semibold px-5 py-2.5 rounded-full mb-6 border border-primary/15 backdrop-blur-sm shadow-sm shadow-primary/5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            Now in public beta
          </motion.div>

          {/* Headline */}
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground">
            Smarter queues,
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #475569 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              happier customers.
            </span>
          </h1>

          {/* Subhead */}
          <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
            Let your visitors wait from anywhere. <strong className="text-foreground font-semibold">q4queue</strong> turns physical lines into
            digital queues — no app install, no hardware, no hassle.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a
              href={`${config.landingUrl}/get-started`}
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full bg-primary text-primary-foreground font-heading font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300"
            >
              Set Up Your Queue <ArrowRight className="w-4 h-4" />
            </a>
            <Button variant="outline" size="lg" className="text-base px-8 rounded-full font-heading font-semibold gap-2 hover:bg-primary/5 border-border/60 transition-all duration-300">
              <Play className="w-4 h-4" /> Watch Demo
            </Button>
          </div>

          {/* Social proof row */}
          <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
            {["1 week free trial", "No sign up required", "Set up in minutes"].map((text, i) => (
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
              <div className="flex-1 mx-3">
                <div className="h-7 rounded-lg bg-secondary/60 flex items-center px-3 gap-2 max-w-xs mx-auto">
                  <svg className="w-3 h-3 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                  <span className="text-[11px] text-muted-foreground/60 font-medium">app.q4queue.com/dashboard</span>
                </div>
              </div>
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
