"use client";

import { motion } from "framer-motion";
import AnimatedSection from "./AnimatedSection";
import { QrCode, Smartphone, BellRing } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

const steps = [
  {
    number: "01",
    title: "Scan the QR code",
    description: "Scan the QR code to join the queue instantly — no app required.",
    icon: QrCode,
    iconBg: "bg-blue-500",
    iconShadow: "shadow-xl shadow-blue-500/25",
    sticker: "/assets/step-scan.png",
    stickerAlt: "Smartphone scanning a QR code illustration",
  },
  {
    number: "02",
    title: "Track & wait from anywhere",
    description: "Track your position in real time and wait from anywhere — stay in your car or a nearby cafe until it's your turn.",
    icon: Smartphone,
    iconBg: "bg-amber-500",
    iconShadow: "shadow-xl shadow-amber-500/25",
    sticker: "/assets/step-wait.png",
    stickerAlt: "Person relaxing while checking queue position on phone",
  },
  {
    number: "03",
    title: "Arrive at your turn",
    description: "Get notified and arrive exactly when it's your turn. A professional, stress-free queue experience that keeps patients and shoppers happy.",
    icon: BellRing,
    iconBg: "bg-emerald-500",
    iconShadow: "shadow-xl shadow-emerald-500/25",
    sticker: "/assets/step-notify.png",
    stickerAlt: "Notification bell with checkmark showing your turn has arrived",
  },
];

const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how-it-works" className="py-20 md:py-28 px-6 bg-secondary/40">
      <div className="max-w-6xl mx-auto">
        <AnimatedSection className="text-center mb-12 md:mb-20">
          <span className="inline-block text-primary font-semibold text-sm tracking-wide uppercase mb-3 px-3 py-1 rounded-full bg-primary/8 border border-primary/15">
            How It Works
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-[-0.02em] text-foreground mt-4">
            Three simple steps
          </h2>
          <p className="mt-3 text-muted-foreground text-lg max-w-xl mx-auto">
            No complexity, no friction. Get started in minutes.
          </p>
        </AnimatedSection>
        <div className="relative">
          {/* Vertical timeline line - desktop only */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />

          <div className="space-y-12 md:space-y-24">
            {steps.map((step, i) => {
              const isActive = activeStep === i;

              return (
                <motion.div
                  key={step.number}
                  className={`relative grid md:grid-cols-2 gap-10 md:gap-16 items-center transition-all duration-700 ease-out ${isActive ? "opacity-100 scale-100" : "opacity-30 scale-[0.98] grayscale-[30%]"
                    }`}
                  onViewportEnter={() => setActiveStep(i)}
                  viewport={{ amount: 0.5, margin: "-15% 0px -15% 0px" }}
                >
                  {/* Timeline dot - desktop only */}
                  <div className={`hidden md:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full items-center justify-center z-10 transition-colors duration-500 ${isActive ? "glass-card border-primary/30 shadow-md shadow-primary/10" : "bg-white/50 border border-border/50 text-muted-foreground/50"
                    }`}>
                    <span className={`text-xs font-bold ${isActive ? "text-primary" : "text-muted-foreground/50"}`}>
                      {step.number}
                    </span>
                  </div>

                  {/* Text content */}
                  <div className={i % 2 === 1 ? "md:order-2 md:pl-12" : "md:pr-12 md:text-right"}>
                    <div className={`inline-flex items-center gap-2 mb-4 ${i % 2 === 1 ? "" : "md:flex-row-reverse"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${isActive ? `${step.iconBg} ${step.iconShadow}` : "bg-muted"
                        }`}>
                        <step.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                      </div>
                      <span className={`text-xs font-heading font-bold uppercase tracking-wider transition-colors duration-500 ${isActive ? "text-primary" : "text-muted-foreground"
                        }`}>
                        Step {step.number}
                      </span>
                    </div>
                    <h3 className={`font-heading text-2xl font-bold mb-2 transition-colors duration-500 ${isActive ? "text-foreground" : "text-muted-foreground"
                      }`}>
                      {step.title}
                    </h3>
                    <p className={`leading-relaxed text-base transition-colors duration-500 ${isActive ? "text-muted-foreground" : "text-muted-foreground/60"
                      }`}>
                      {step.description}
                    </p>
                  </div>

                  {/* Sticker illustration */}
                  <div className={i % 2 === 1 ? "md:order-1 md:pr-12" : "md:pl-12"}>
                    <motion.div
                      className="flex justify-center"
                      whileHover={isActive ? { scale: 1.04 } : { scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Image
                        src={step.sticker}
                        alt={step.stickerAlt}
                        width={280}
                        height={280}
                        className={`w-full max-w-[260px] md:max-w-[280px] h-auto drop-shadow-lg select-none transition-all duration-700 ${isActive ? "filter-none mix-blend-normal" : "brightness-90 contrast-75"
                          }`}
                        draggable={false}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
