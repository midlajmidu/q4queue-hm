import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CustomerSpotlight() {
  return (
    <section className="bg-white py-20 md:py-28 border-b border-slate-200/80 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* ── LEFT COLUMN: Quote, Attribution & Scale Metrics ── */}
          <div className="lg:col-span-6 flex flex-col justify-between h-full">
            <div>
              {/* Brand Header */}
              <div className="flex items-center gap-3.5">
                <Image
                  src="/images/amoeba-logo-dark.png"
                  alt="Amoeba Bowling & Gaming Center"
                  width={220}
                  height={60}
                  className="h-8 sm:h-9 w-auto object-contain"
                />
                <span className="text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase border-l border-slate-200 pl-3.5">
                  HM LEISURE INDIA
                </span>
              </div>

              {/* Flagship Pull Quote */}
              <blockquote className="mt-8 sm:mt-10">
                <p className="text-2xl sm:text-3xl lg:text-[36px] font-extrabold text-slate-900 tracking-tight leading-[1.25]">
                  &ldquo;Q4Queue has been invaluable for helping us manage intense
                  weekend rushes and eliminate waiting line chaos across our
                  bowling alleys and arcade arenas.&rdquo;
                </p>
              </blockquote>

              {/* Attribution */}
              <div className="mt-6 sm:mt-8">
                <div className="text-base font-bold text-slate-900 tracking-tight">
                  Vikram Malhotra
                </div>
                <div className="text-sm font-medium text-slate-500 mt-0.5">
                  VP of Operations, Amoeba Bowling &amp; Gaming Center (HM Leisure)
                </div>
              </div>
            </div>

            {/* Scale Metric KPIs Row */}
            <div className="mt-14 sm:mt-16 pt-8 border-t border-slate-100 grid grid-cols-2 gap-8">
              <div>
                <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-none font-sans">
                  2.8M+
                </div>
                <div className="mt-2.5 text-xs sm:text-sm font-medium text-slate-500 leading-snug max-w-[170px]">
                  guests queued &amp; served seamlessly
                </div>
              </div>

              <div>
                <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-none font-sans">
                  45+
                </div>
                <div className="mt-2.5 text-xs sm:text-sm font-medium text-slate-500 leading-snug max-w-[170px]">
                  entertainment centers &amp; bowling lanes powered
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Venue Photo & Narrative ── */}
          <div className="lg:col-span-6 flex flex-col">
            {/* High-Resolution Venue Photography Container */}
            <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm bg-slate-100 group">
              <Image
                src="/images/amoeba-venue-spotlight.jpg"
                alt="Amoeba Bowling and Gaming Center concourse with digital queue screens"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Partnership Narrative Paragraph */}
            <p className="mt-6 text-sm sm:text-[15px] text-slate-600 leading-relaxed">
              Our deployment with HM Leisure India demonstrates how removing
              physical queue congestion creates an engaging environment where
              guests spend more time playing and dining instead of waiting in line.
            </p>

            {/* Case Study CTA Link */}
            <div className="mt-3">
              <Link
                href="/get-started"
                className="text-blue-600 hover:text-blue-700 font-semibold text-sm inline-flex items-center gap-1.5 transition-colors group/link"
              >
                <span>Learn more about how Amoeba collaborates with Q4Queue</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/link:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
