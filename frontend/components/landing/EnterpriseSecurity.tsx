import React from "react";
import Link from "next/link";

interface SecurityBadge {
  name: string;
  label: string;
  icon: React.ReactNode;
}

const badges: SecurityBadge[] = [
  {
    name: "SOC 2 TYPE II",
    label: "SOC 2 TYPE II",
    icon: (
      <svg
        viewBox="0 0 100 100"
        className="h-16 w-16 mx-auto overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="AICPA SOC 2 badge"
      >
        {/* Outer Ring */}
        <circle cx="50" cy="50" r="46" stroke="#0F172A" strokeWidth="2.5" />
        {/* Inner Ring */}
        <circle cx="50" cy="50" r="41" stroke="#0F172A" strokeWidth="1.25" strokeDasharray="3 2" />
        {/* Horizontal Divider */}
        <line x1="18" y1="48" x2="82" y2="48" stroke="#0F172A" strokeWidth="1.5" />
        {/* Text AICPA */}
        <text
          x="50"
          y="38"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="11"
          fontWeight="800"
          letterSpacing="0.16em"
          fill="#0F172A"
        >
          AICPA
        </text>
        {/* Text SOC 2 */}
        <text
          x="50"
          y="68"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="13"
          fontWeight="900"
          letterSpacing="0.08em"
          fill="#0F172A"
        >
          SOC 2
        </text>
      </svg>
    ),
  },
  {
    name: "ISO 27001",
    label: "ISO 27001",
    icon: (
      <svg
        viewBox="0 0 100 100"
        className="h-16 w-16 mx-auto overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ISO 27001 Certified crest"
      >
        {/* Shield Frame */}
        <path
          d="M 50 12 L 84 22 C 84 56, 50 86, 50 86 C 50 86, 16 56, 16 22 Z"
          stroke="#0F172A"
          strokeWidth="2.5"
          fill="#FFFFFF"
          strokeLinejoin="round"
        />
        {/* Inner Facet Grid Globe */}
        <path
          d="M 22 46 C 36 54, 64 54, 78 46 M 26 58 C 38 66, 62 66, 74 58 M 50 46 L 50 84 M 35 48 L 38 78 M 65 48 L 62 78"
          stroke="#0F172A"
          strokeWidth="1.5"
          fill="none"
        />
        {/* Header Ribbon Banner */}
        <rect x="22" y="24" width="56" height="22" rx="2" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
        <text
          x="50"
          y="32"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="5.5"
          fontWeight="800"
          letterSpacing="0.14em"
          fill="#0F172A"
        >
          A-LIGN
        </text>
        <text
          x="50"
          y="40"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="6.5"
          fontWeight="900"
          letterSpacing="0.04em"
          fill="#0F172A"
        >
          ISO 27001
        </text>
        <text
          x="50"
          y="45"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="4"
          fontWeight="700"
          letterSpacing="0.1em"
          fill="#64748B"
        >
          CERTIFIED
        </text>
      </svg>
    ),
  },
  {
    name: "GDPR & CCPA",
    label: "GDPR & CCPA",
    icon: (
      <svg
        viewBox="0 0 100 100"
        className="h-16 w-16 mx-auto overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="GDPR European circle of stars badge"
      >
        {/* 12 European Stars Circle */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const cx = 50 + 38 * Math.cos(rad);
          const cy = 50 + 38 * Math.sin(rad);
          return (
            <polygon
              key={deg}
              points={`${cx},${cy - 3.5} ${cx + 1},${cy - 1} ${cx + 3.5},${cy - 1} ${cx + 1.5},${cy + 1} ${cx + 2},${cy + 3.5} ${cx},${cy + 2} ${cx - 2},${cy + 3.5} ${cx - 1.5},${cy + 1} ${cx - 3.5},${cy - 1} ${cx - 1},${cy - 1}`}
              fill="#0F172A"
            />
          );
        })}

        {/* Center GDPR Wordmark */}
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="15"
          fontWeight="900"
          letterSpacing="0.08em"
          fill="#0F172A"
        >
          GDPR
        </text>
      </svg>
    ),
  },
  {
    name: "HIPAA",
    label: "HIPAA",
    icon: (
      <svg
        viewBox="0 0 100 100"
        className="h-16 w-16 mx-auto overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="HIPAA healthcare compliance seal"
      >
        {/* Circle Perimeter */}
        <circle cx="50" cy="50" r="44" stroke="#0F172A" strokeWidth="2.5" />
        {/* Caduceus Staff & Wings */}
        <g transform="translate(50, 38)">
          <circle cx="0" cy="-14" r="3" fill="#0F172A" />
          <line x1="0" y1="-14" x2="0" y2="12" stroke="#0F172A" strokeWidth="2" />
          {/* Wings */}
          <path
            d="M -16 -12 C -8 -16, -2 -8, 0 -8 C 2 -8, 8 -16, 16 -12 C 10 -4, 4 -4, 0 -6 C -4 -4, -10 -4, -16 -12 Z"
            fill="#0F172A"
          />
          {/* Entwined Serpents */}
          <path
            d="M -7 -4 Q 0 -1 7 -4 Q 0 -7 -7 -4 M 7 3 Q 0 0 -7 3 Q 0 6 7 3"
            stroke="#0F172A"
            strokeWidth="1.5"
            fill="none"
          />
        </g>
        {/* HIPAA Wordmark */}
        <text
          x="50"
          y="72"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="10"
          fontWeight="900"
          letterSpacing="0.14em"
          fill="#0F172A"
        >
          HIPAA
        </text>
      </svg>
    ),
  },
  {
    name: "SSO / SAML 2.0",
    label: "SSO / SAML 2.0",
    icon: (
      <svg
        viewBox="0 0 100 100"
        className="h-16 w-16 mx-auto overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="SSO security shield badge"
      >
        {/* Security Shield */}
        <path
          d="M 50 14 L 82 24 C 82 58, 50 86, 50 86 C 50 86, 18 58, 18 24 Z"
          stroke="#0F172A"
          strokeWidth="2.5"
          fill="#FFFFFF"
          strokeLinejoin="round"
        />
        {/* SSO Wordmark */}
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="14"
          fontWeight="900"
          letterSpacing="0.08em"
          fill="#0F172A"
        >
          SSO
        </text>
      </svg>
    ),
  },
];

export default function EnterpriseSecurity() {
  return (
    <section className="bg-[#F8FAFC] py-20 md:py-28 border-y border-slate-200/80 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left-Aligned Header & CTA */}
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-slate-900 tracking-tight leading-tight">
            Enterprise security, built in
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
            We meet the world&apos;s most rigorous security standards to ensure
            your data and your guests&apos; privacy are protected at scale.
          </p>

          <div className="mt-6">
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-slate-900 hover:bg-black text-white text-sm font-semibold transition-all shadow-xs ring-2 ring-transparent hover:ring-slate-300"
            >
              Read more
            </Link>
          </div>
        </div>

        {/* Five Security Badges Horizontal Grid */}
        <div className="mt-16 sm:mt-20 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 sm:gap-10 items-end text-center">
          {badges.map((item) => (
            <div
              key={item.name}
              className="group flex flex-col items-center justify-end transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center justify-center h-20 transition-transform duration-300 group-hover:scale-105">
                {item.icon}
              </div>
              <div className="mt-4 text-xs sm:text-[13px] font-bold tracking-wider text-slate-900 uppercase">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
