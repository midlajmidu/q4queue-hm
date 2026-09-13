"use client";

import React from "react";
import Image from "next/image";

export default function TrustBar() {
  return (
    <section className="bg-white border-b border-slate-100/90 py-10 sm:py-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Subtle, elegant uppercase subtext kicker */}
        <p className="text-center text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-[0.22em] text-slate-400 select-none mb-8 sm:mb-10">
          Trusted by operational leaders
        </p>

        {/* Static Centered Logo Container (No Scrolling) */}
        <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16 md:gap-24">
          {/* 1. Amoeba */}
          <div className="flex items-center justify-center shrink-0 opacity-80 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 cursor-default">
            <Image
              src="/images/amoeba-logo-dark.png"
              alt="Amoeba"
              width={1600}
              height={448}
              className="h-8 sm:h-10 w-auto object-contain"
              unoptimized
            />
          </div>

          {/* 2. Ziqx Logo */}
          <div className="flex items-center justify-center shrink-0 opacity-80 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 cursor-default">
            <Image
              src="/images/ziqx-logo.svg"
              alt="Ziqx"
              width={500}
              height={200}
              className="h-8 sm:h-10 w-auto object-contain"
              unoptimized
            />
          </div>

          {/* 3. Nysa Clan Logo */}
          <div className="flex items-center justify-center shrink-0 opacity-80 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 cursor-default">
            <Image
              src="/images/nysa_clan_logo.jpeg"
              alt="Nysa Clan"
              width={500}
              height={200}
              className="h-8 sm:h-10 w-auto object-contain rounded-md"
              unoptimized
            />
          </div>
        </div>
      </div>
    </section>
  );
}
