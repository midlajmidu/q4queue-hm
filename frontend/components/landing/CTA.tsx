"use client";

import React from "react";
import Link from "next/link";
import { CirclePlay } from "lucide-react";

export default function CTA() {
  return (
    <section className="relative py-24 sm:py-32 lg:py-40 bg-[radial-gradient(ellipse_at_bottom_left,rgba(244,114,182,0.18)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(167,139,250,0.22)_0%,transparent_50%),linear-gradient(to_bottom,#ffffff,#faf5ff)] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl">
          {/* Editorial Display Headline */}
          <h2 className="text-4xl sm:text-6xl lg:text-[76px] font-extrabold text-slate-900 tracking-tight leading-[1.06]">
            Turn the wait into a competitive advantage
          </h2>

          {/* Dual Action Bar */}
          <div className="mt-10 sm:mt-12 flex flex-wrap items-center gap-5 sm:gap-7">
            {/* Primary Action Button */}
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-slate-900 hover:bg-black text-white text-base font-semibold transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              Start 14-Day Free Trial
            </Link>

            {/* Secondary Interactive Video Action */}
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2.5 text-slate-900 hover:text-blue-600 text-base font-semibold transition-colors group cursor-pointer"
            >
              <CirclePlay className="w-5 h-5 text-slate-900 group-hover:text-blue-600 transition-colors stroke-[2]" />
              <span>Watch how it works</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
