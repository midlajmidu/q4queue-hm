"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { config } from "@/lib/config";
import AnimatedSection from "./AnimatedSection";

const CTA = () => {
  const router = useRouter();
  return (
    <section className="py-20 md:py-28 px-6">
      <AnimatedSection className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden px-8 py-14 md:px-16 md:py-16 text-center bg-gradient-to-br from-primary via-accent to-blue-900"
        >
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/8 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,white/5,transparent_70%)]" />

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,white/5_1px,transparent_1px),linear-gradient(to_bottom,white/5_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-30" />

          <div className="relative">
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.02em] text-primary-foreground">
              Ready to ditch the line?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80 max-w-lg mx-auto leading-relaxed">
              Set up your first queue in under 5 minutes.
            </p>

            {/* Early adopter badge */}
            <div className="mt-8 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-primary-foreground/80 text-sm font-heading font-medium px-4 py-2 rounded-full border border-white/15">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Now accepting early adopters
            </div>

            <div className="mt-6">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => window.location.href = `${config.landingUrl}/get-started`}
                className="gap-2 text-base px-10 rounded-full font-semibold shadow-xl hover:scale-[1.02] transition-all duration-300"
              >
                Start Your Free Trial <ArrowRight className="w-4 h-4" />
              </Button>
              <div className="mt-4 flex items-center justify-center gap-4 text-sm text-primary-foreground/60">
                {["1 week free trial", "No credit card", "Setup in 2 min"].map((text) => (
                  <span key={text} className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
};

export default CTA;
