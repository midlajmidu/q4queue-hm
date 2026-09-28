"use client";

import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AnimatedSection from "@/components/landing/AnimatedSection";
import { motion } from "framer-motion";
import {
  Users,
  Smartphone,
  Shield,
  Zap,
  Clock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const values = [
  {
    icon: Zap,
    title: "Simplicity first",
    description: "No hardware, no apps to install. Get a queue running in minutes, not days.",
    iconBg: "from-blue-500/10 to-blue-400/5",
    iconColor: "text-blue-600",
  },
  {
    icon: Shield,
    title: "Built for critical operations",
    description: "Designed for clinics, banks, and service counters where reliability and clarity matter every day.",
    iconBg: "from-emerald-500/10 to-emerald-400/5",
    iconColor: "text-emerald-600",
  },
  {
    icon: Clock,
    title: "Respect everyone's time",
    description: "Customers wait from anywhere; staff see the full picture. Less stress, fewer missed turns.",
    iconBg: "from-amber-500/10 to-amber-400/5",
    iconColor: "text-amber-600",
  },
];

const stats = [
  { value: "99.9%", label: "Target uptime", sublabel: "For patient & customer-critical queues" },
  { value: "< 5 min", label: "Typical setup", sublabel: "New location ready in minutes" },
  { value: "Real-time", label: "Updates", sublabel: "Live position and notifications" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 px-6 overflow-hidden bg-hero-glow">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(220_16%_90%/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(220_16%_90%/0.5)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_70%,transparent_100%)]" />
        <div className="absolute top-10 left-[10%] w-64 h-64 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-[10%] w-48 h-48 bg-accent/10 rounded-full blur-[100px]" />

        <div className="relative max-w-4xl mx-auto text-center">
          <AnimatedSection>
            <span className="inline-block text-primary font-semibold text-sm tracking-wide uppercase mb-4 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15">
              About Q4Queue
            </span>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold tracking-[-0.025em] text-foreground mt-2 leading-[1.1]">
              We turn physical lines into{" "}
              <span className="text-gradient">calm, digital queues.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Q4Queue is a real-time queue management platform built for clinics, banks, and any business where waiting in line is part of the experience. We give operations teams control and customers clarity — without extra hardware or app downloads.
            </p>
          </AnimatedSection>
        </div>
      </section>


      {/* Why we built it + Who it's for */}
      <section className="py-16 md:py-24 px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="mb-14">
            <span className="text-primary font-semibold text-sm tracking-wide uppercase">
              Why Q4Queue exists
            </span>
            <h2 className="font-heading text-2xl md:text-4xl font-bold tracking-tight text-foreground mt-2">
              Long queues create stress for everyone
            </h2>
            <p className="mt-4 text-muted-foreground text-lg leading-relaxed max-w-3xl">
              Unmanaged lines lead to uncertainty for customers and pressure on staff. We built Q4Queue so that queues can be visible, fair, and easy to manage — with a modern SaaS experience for your team and a friction-free experience for the people waiting. No kiosks, no app installs; just a QR code and a phone.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <motion.div
              className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  For operations teams
                </h3>
              </div>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                Run multiple queues and sessions from one dashboard. See wait times and bottlenecks in real time, move tickets between queues when needed, and keep the front desk organized — especially on busy days.
              </p>
              <ul className="mt-5 space-y-2">
                {["Single dashboard for all queues", "Real-time analytics and wait times", "Sessions and multi-location support"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  For your visitors
                </h3>
              </div>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                Join with a single scan. See their position in the queue, get notified when their turn is near, and wait from anywhere — no account, no app, no extra steps.
              </p>
              <ul className="mt-5 space-y-2">
                {["Scan QR to join — no app required", "Live position and ETA", "Notifications when their turn is near"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-14">
            <span className="inline-block text-primary font-semibold text-sm tracking-wide uppercase mb-3 px-3 py-1 rounded-full bg-primary/8 border border-primary/15">
              What we stand for
            </span>
            <h2 className="font-heading text-2xl md:text-4xl font-bold tracking-tight text-foreground mt-2">
              Principles that shape our product
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {values.map((item, i) => (
              <motion.div
                key={item.title}
                className="group rounded-2xl border border-border/60 bg-card p-6 md:p-7 shadow-sm hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.iconBg} border border-border/60 flex items-center justify-center mb-4`}>
                  <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-12 md:py-16 px-6 border-y border-border/40 bg-secondary/20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-sm"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 md:divide-x divide-border/60">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center md:text-left first:md:pl-0 last:md:pr-0 md:px-8">
                  <p className="font-heading text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 font-medium text-foreground">{stat.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{stat.sublabel}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 px-6 bg-background">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Ready to simplify your queues?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Join clinics and service teams who use Q4Queue to keep operations smooth and visitors informed.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                asChild
                className="gap-2 rounded-full font-heading font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25"
              >
                <Link href="/get-started">
                  Get started <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="rounded-full font-heading font-semibold">
                <Link href="/#features">View features</Link>
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}
