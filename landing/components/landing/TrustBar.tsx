"use client";

import React from "react";
import Image from "next/image";
import Marquee from "react-fast-marquee";

export default function TrustBar() {
  return (
    <section className="bg-white border-b border-slate-100/90 py-10 sm:py-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-8 sm:mb-9">
        {/* Subtle, elegant uppercase subtext kicker */}
        <p className="text-center text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-[0.22em] text-slate-400 select-none">
          Trusted by industry leaders across hospitality, retail &amp; healthcare
        </p>
      </div>

      {/* ── Continuous Moving Logo Marquee (logos19 Pattern) ── */}
      <div className="relative w-full">
        <Marquee
          gradient
          gradientWidth={72}
          gradientColor="white"
          autoFill
          pauseOnHover
          speed={36}
          className="py-1"
        >
          {/* 1. Delta Air Lines */}
          <div className="mx-8 sm:mx-11 lg:mx-13 flex items-center justify-center shrink-0 opacity-60 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 cursor-default">
            <svg viewBox="0 0 135 22" className="h-7 sm:h-8 w-auto fill-slate-900" aria-label="Delta">
              <polygon points="10,2 1,20 19,20" fill="#E01933" />
              <polygon points="10,2 14,11 6,11" fill="#990012" opacity="0.85" />
              <text x="27" y="17" fontFamily="system-ui, -apple-system, sans-serif" fontSize="14.5" fontWeight="900" letterSpacing="0.22em" fill="#0F172A">
                DELTA
              </text>
            </svg>
          </div>

          {/* 2. Loro Piana */}
          <div className="mx-8 sm:mx-11 lg:mx-13 flex items-center justify-center shrink-0 opacity-60 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 cursor-default">
            <svg viewBox="0 0 140 26" className="h-7.5 sm:h-8.5 w-auto fill-slate-900" aria-label="Loro Piana">
              <g transform="translate(1, 1) scale(0.68)">
                <rect x="2" y="2" width="28" height="32" rx="3" fill="none" stroke="#0F172A" strokeWidth="2" />
                <path d="M7 6 L25 6 M7 11 L25 11 M16 11 L16 32 M7 22 L25 22" stroke="#0F172A" strokeWidth="1.5" />
                <circle cx="16" cy="3" r="2" fill="#0F172A" />
              </g>
              <text x="30" y="19" fontFamily="'Times New Roman', Times, serif" fontStyle="italic" fontSize="17" fontWeight="700" letterSpacing="0.04em" fill="#0F172A">
                Loro Piana
              </text>
            </svg>
          </div>

          {/* 3. British Airways */}
          <div className="mx-8 sm:mx-11 lg:mx-13 flex items-center justify-center shrink-0 opacity-60 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 cursor-default">
            <svg viewBox="0 0 132 26" className="h-7.5 sm:h-8.5 w-auto" aria-label="British Airways">
              <path d="M76 4 C92 1, 122 4, 130 11 C117 8, 96 9, 82 13 Z" fill="#EB2226" />
              <text x="0" y="13" fontFamily="'Georgia', serif" fontSize="11" fontWeight="700" letterSpacing="0.12em" fill="#0F172A">
                BRITISH
              </text>
              <text x="0" y="24" fontFamily="'Georgia', serif" fontSize="10" fontWeight="600" letterSpacing="0.14em" fill="#0F172A">
                AIRWAYS
              </text>
            </svg>
          </div>

          {/* 4. HM Leisure India (Featured Client) */}
          <div className="mx-8 sm:mx-11 lg:mx-13 flex items-center justify-center shrink-0 opacity-75 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 cursor-default">
            <svg viewBox="0 0 148 28" className="h-8 sm:h-9 w-auto" aria-label="HM Leisure India">
              <g transform="translate(0, 2)">
                <rect x="1" y="1" width="24" height="24" rx="5" fill="#0F172A" />
                <path d="M6 7 L6 19 M12 7 L12 19 M6 13 L12 13" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" />
                <path d="M15 19 L15 7 L18.5 13 L22 7 L22 19" fill="none" stroke="#60A5FA" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <text x="32" y="15" fontFamily="system-ui, -apple-system, sans-serif" fontSize="12" fontWeight="800" letterSpacing="0.12em" fill="#0F172A">
                HM LEISURE
              </text>
              <text x="33" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontSize="7.5" fontWeight="700" letterSpacing="0.32em" fill="#2563EB">
                INDIA
              </text>
            </svg>
          </div>

          {/* 5. AMOEBA Bowling & Gaming Center (Real Brand Logo) */}
          <div className="mx-8 sm:mx-11 lg:mx-13 flex items-center justify-center shrink-0 opacity-75 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 cursor-default">
            <Image
              src="/images/amoeba-logo-dark.png"
              alt="Amoeba Bowling & Gaming Center"
              width={1600}
              height={448}
              className="h-8 sm:h-9 w-auto object-contain"
              unoptimized
            />
          </div>

          {/* 6. STUDS */}
          <div className="mx-8 sm:mx-11 lg:mx-13 flex items-center justify-center shrink-0 opacity-60 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 cursor-default">
            <svg viewBox="0 0 95 20" className="h-5.5 sm:h-6.5 w-auto" aria-label="STUDS">
              <text x="0" y="17" fontFamily="system-ui, -apple-system, sans-serif" fontSize="18" fontWeight="900" letterSpacing="0.15em" fill="#0F172A">
                STUDS
              </text>
            </svg>
          </div>

          {/* 7. lululemon */}
          <div className="mx-8 sm:mx-11 lg:mx-13 flex items-center justify-center shrink-0 opacity-60 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 cursor-default">
            <svg viewBox="0 0 130 22" className="h-7 sm:h-8 w-auto" aria-label="lululemon">
              <g transform="translate(0, 0)">
                <circle cx="11" cy="11" r="10" fill="none" stroke="#0F172A" strokeWidth="2" />
                <path d="M8 15 C7 11.5, 7 8, 11 8 C15 8, 15 11.5, 14 15 M9.5 15 C9.5 12.5, 10 10, 11 10 C12 10, 12.5 12.5, 12.5 15" fill="none" stroke="#0F172A" strokeWidth="1.6" />
              </g>
              <text x="27" y="16" fontFamily="system-ui, -apple-system, sans-serif" fontSize="14" fontWeight="700" letterSpacing="-0.02em" fill="#0F172A">
                lululemon
              </text>
            </svg>
          </div>

          {/* 8. Google */}
          <div className="mx-8 sm:mx-11 lg:mx-13 flex items-center justify-center shrink-0 opacity-60 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 cursor-default">
            <svg viewBox="0 0 96 24" className="h-7.5 sm:h-8.5 w-auto" aria-label="Google">
              <text x="0" y="19" fontFamily="'Product Sans', system-ui, -apple-system, sans-serif" fontSize="19" fontWeight="600" letterSpacing="-0.03em" fill="#0F172A">
                Google
              </text>
            </svg>
          </div>

          {/* 9. ROLEX */}
          <div className="mx-8 sm:mx-11 lg:mx-13 flex items-center justify-center shrink-0 opacity-60 hover:opacity-100 transition-all duration-300 grayscale hover:grayscale-0 cursor-default">
            <svg viewBox="0 0 76 28" className="h-8.5 sm:h-9.5 w-auto" aria-label="Rolex">
              <g transform="translate(22, 0) scale(0.85)">
                <circle cx="2" cy="5" r="1.6" fill="#0F172A" />
                <circle cx="10" cy="2" r="1.8" fill="#0F172A" />
                <circle cx="19" cy="0.8" r="2" fill="#0F172A" />
                <circle cx="28" cy="2" r="1.8" fill="#0F172A" />
                <circle cx="36" cy="5" r="1.6" fill="#0F172A" />
                <path d="M2 6.5 L12 16 L19 4 L26 16 L36 6.5 L33 19 L5 19 Z" fill="#0F172A" />
                <rect x="5" y="19.5" width="28" height="1.8" fill="#0F172A" />
              </g>
              <text x="38" y="27" textAnchor="middle" fontFamily="'Times New Roman', Times, serif" fontSize="9.5" fontWeight="900" letterSpacing="0.26em" fill="#0F172A">
                ROLEX
              </text>
            </svg>
          </div>
        </Marquee>
      </div>
    </section>
  );
}
