"use client";

import { ArrowRight, Sparkles, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AnimatedSection from "./AnimatedSection";

const CTA = () => {
  const router = useRouter();
  return (
    <section className="py-20 md:py-28 px-6">
      <AnimatedSection className="max-w-5xl mx-auto">
        <div className="relative rounded-[2rem] overflow-hidden px-8 py-16 md:px-16 md:py-20 text-center">
          {/* ── Multi-layer gradient background ── */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#1e3a5f]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

          {/* ── Animated glow orbs ── */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/15 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[100px]" />

          {/* ── Dot grid pattern ── */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* ── Decorative border glow ── */}
          <div className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/[0.08]" />

          {/* ── Content ── */}
          <div className="relative z-10">
            {/* Floating badge */}
            <motion.div
              className="inline-flex items-center gap-2 bg-white/[0.08] backdrop-blur-md text-white/70 text-xs font-semibold px-4 py-2 rounded-full border border-white/[0.1] mb-8"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Now accepting early adopters
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </motion.div>

            {/* Headline */}
            <motion.h2
              className="font-heading text-3xl md:text-4xl lg:text-[3.05rem] font-extrabold tracking-[-0.03em] leading-[1.15] text-white max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Stop managing lines manually.{" "}
              <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
                Start your digital queue today.
              </span>
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              className="mt-5 text-lg md:text-xl text-white/50 max-w-lg mx-auto leading-relaxed font-medium"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Set up your first queue in under 5 minutes. No credit card required.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              className="mt-10"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button
                size="lg"
                onClick={() => router.push("/get-started")}
                className="group relative text-base px-10 h-14 rounded-full font-heading font-bold shadow-2xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 bg-white text-indigo-950 hover:bg-white/95"
              >
                Start Your Free Trial
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {[
                { icon: Zap, text: "1 week free trial" },
                { icon: Shield, text: "No credit card required" },
                { icon: Sparkles, text: "Set up in 2 minutes" },
              ].map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="flex items-center gap-2 text-sm text-white/40 font-medium"
                >
                  <span className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center">
                    <Icon className="w-3 h-3 text-emerald-300/80" />
                  </span>
                  {text}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
};

export default CTA;
