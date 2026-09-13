import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface AdvantagePillar {
  title: string;
  description: string;
  linkText: string;
  href: string;
  illustration: React.ReactNode;
}

const pillars: AdvantagePillar[] = [
  {
    title: "Fast deployment, total control",
    description:
      "Deploy across hundreds of sites in days, not months. Train frontline teams quickly and scale broadly while tailoring every touchpoint, data field, and setting for your customer journey.",
    linkText: "Resources",
    href: "/get-started",
    illustration: (
      <svg
        viewBox="0 0 160 120"
        className="w-full h-36 max-w-[190px] overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Fast deployment rocket illustration"
      >
        {/* Exhaust clouds */}
        <path
          d="M 14 96 C 8 92, 10 82, 18 82 C 20 74, 30 74, 34 79 C 40 76, 50 80, 48 88 C 54 90, 54 98, 46 100 L 18 100 C 12 100, 10 98, 14 96 Z"
          fill="#F8FAFC"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="28" cy="92" r="3" fill="#0F172A" />
        <circle cx="38" cy="88" r="2" fill="#0F172A" />

        {/* Browser Window Frame */}
        <rect
          x="12"
          y="28"
          width="92"
          height="62"
          rx="6"
          fill="#FFFFFF"
          stroke="#0F172A"
          strokeWidth="2"
        />
        <line
          x1="12"
          y1="40"
          x2="104"
          y2="40"
          stroke="#0F172A"
          strokeWidth="1.5"
        />
        {/* Window dots */}
        <circle cx="18" cy="34" r="1.5" fill="#0F172A" />
        <circle cx="24" cy="34" r="1.5" fill="#0F172A" />
        <circle cx="30" cy="34" r="1.5" fill="#0F172A" />

        {/* Window thumbnail graphic */}
        <polygon
          points="20,68 34,50 48,68"
          fill="#F1F5F9"
          stroke="#0F172A"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <polygon
          points="38,68 52,45 66,68"
          fill="#F1F5F9"
          stroke="#0F172A"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Configuration Pills */}
        <g transform="translate(56, 44)">
          <rect
            x="0"
            y="0"
            width="42"
            height="10"
            rx="5"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="1.5"
          />
          <text
            x="21"
            y="7"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="5.5"
            fontWeight="700"
            letterSpacing="0.06em"
            fill="#0F172A"
          >
            REMINDER
          </text>

          <rect
            x="0"
            y="14"
            width="42"
            height="10"
            rx="5"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="1.5"
          />
          <text
            x="21"
            y="21"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="5.5"
            fontWeight="700"
            letterSpacing="0.06em"
            fill="#0F172A"
          >
            CHECK IN
          </text>

          <rect
            x="0"
            y="28"
            width="42"
            height="10"
            rx="5"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="1.5"
          />
          <text
            x="21"
            y="35"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="5.5"
            fontWeight="700"
            letterSpacing="0.06em"
            fill="#0F172A"
          >
            SURVEY
          </text>
        </g>

        {/* Rocket Launch Angle */}
        <g transform="translate(100, 22) rotate(15)">
          <path
            d="M 12 36 Q 24 18 34 8 Q 24 24 16 44 Z"
            fill="#0F172A"
          />
          <path
            d="M 16 18 Q 30 16 38 6 Q 36 20 28 32 Z"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="2"
          />
          <circle cx="28" cy="18" r="2.5" fill="#0F172A" />
          <path
            d="M 10 32 L 6 42 L 18 36 Z"
            fill="#0F172A"
          />
        </g>
      </svg>
    ),
  },
  {
    title: "Effortless frontline operations",
    description:
      "Automate manual scheduling and check-ins with an easy-to-use app. Your team can manage real-time traffic effortlessly, using actionable customer insights to make stressful shifts a thing of the past.",
    linkText: "Automation",
    href: "/get-started",
    illustration: (
      <svg
        viewBox="0 0 160 120"
        className="w-full h-36 max-w-[190px] overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Frontline staff illustration"
      >
        {/* Floating Checkmark Badge */}
        <g transform="translate(42, 34)">
          <circle
            cx="0"
            cy="0"
            r="10"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="2"
          />
          <path
            d="M -4 0 L -1 3 L 4 -3"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>

        {/* Sparkle Star */}
        <path
          d="M 112 28 Q 112 33 116 33 Q 112 33 112 38 Q 112 33 108 33 Q 112 33 112 28 Z"
          fill="#0F172A"
        />
        <circle cx="124" cy="42" r="1.5" fill="#0F172A" />

        {/* Mini Floating Card */}
        <g transform="translate(36, 62)">
          <rect
            x="0"
            y="0"
            width="18"
            height="14"
            rx="2.5"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="1.5"
          />
          <line x1="4" y1="5" x2="14" y2="5" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4" y1="9" x2="11" y2="9" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Frontline Team Member */}
        <g transform="translate(80, 52)">
          {/* Head */}
          <circle
            cx="0"
            cy="0"
            r="15"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="2"
          />
          {/* Hair */}
          <path
            d="M -15 -2 C -15 -14, 15 -14, 15 -2 C 10 -8, -10 -8, -15 -2 Z"
            fill="#0F172A"
          />

          {/* Shoulders / Torso */}
          <path
            d="M -26 48 C -26 26, 26 26, 26 48 Z"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="2"
          />
          {/* Collar */}
          <path
            d="M -8 26 L 0 34 L 8 26"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Lanyard & ID badge */}
          <line x1="-3" y1="26" x2="-1" y2="44" stroke="#0F172A" strokeWidth="1.5" />
          <line x1="3" y1="26" x2="1" y2="44" stroke="#0F172A" strokeWidth="1.5" />
          <rect
            x="-5"
            y="38"
            width="10"
            height="12"
            rx="2"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="1.5"
          />

          {/* Digital Tablet held in hand */}
          <g transform="translate(10, 10)">
            <rect
              x="0"
              y="0"
              width="22"
              height="34"
              rx="4"
              fill="#0F172A"
            />
            <circle cx="11" cy="28" r="1.5" fill="#FFFFFF" />
          </g>
        </g>
      </svg>
    ),
  },
  {
    title: "Data-driven customer journey",
    description:
      "Engage your customers before, during, and after each visit. Actionable analytics and reporting optimize operations, eliminate drop-offs, and secure enduring brand loyalty.",
    linkText: "Analytics",
    href: "/get-started",
    illustration: (
      <svg
        viewBox="0 0 160 120"
        className="w-full h-36 max-w-[190px] overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Analytics and growth illustration"
      >
        {/* Lightbulb Idea Spark */}
        <g transform="translate(54, 30)">
          <path
            d="M -6 -10 C -10 -5, -10 2, -5 6 L -4 10 L 4 10 L 5 6 C 10 2, 10 -5, 6 -10 C 2 -14, -2 -14, -6 -10 Z"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <line x1="-3" y1="13" x2="3" y2="13" stroke="#0F172A" strokeWidth="1.75" />
          {/* Spark rays */}
          <line x1="-9" y1="-14" x2="-6" y2="-11" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="9" y1="-14" x2="6" y2="-11" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="0" y1="-17" x2="0" y2="-14" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Growth Callouts */}
        <g transform="translate(108, 38)">
          <text
            x="0"
            y="0"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="11"
            fontWeight="800"
            fill="#0F172A"
          >
            ↗ +14%
          </text>
        </g>

        <g transform="translate(38, 92)">
          <text
            x="0"
            y="0"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontSize="10"
            fontWeight="800"
            fill="#0F172A"
          >
            ↗ +8%
          </text>
        </g>

        {/* Donut Chart with Detached Slice */}
        <g transform="translate(90, 68)">
          {/* Large Main Donut Slice */}
          <path
            d="M 0 -28 A 28 28 0 1 1 -28 0 L -14 0 A 14 14 0 1 0 0 -14 Z"
            fill="#FFFFFF"
            stroke="#0F172A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Detached Accent Slice */}
          <path
            d="M -7 -32 A 28 28 0 0 0 -32 -7 L -17 -3 A 14 14 0 0 1 -4 -17 Z"
            fill="#0F172A"
          />
        </g>

        {/* Star Accents */}
        <path
          d="M 124 64 Q 124 68 128 68 Q 124 68 124 72 Q 124 68 120 68 Q 124 68 124 64 Z"
          fill="#0F172A"
        />
        <circle cx="118" cy="80" r="1.5" fill="#0F172A" />
      </svg>
    ),
  },
  {
    title: "Seamless API & tech integrations",
    description:
      "Connect seamlessly with your existing tech stack. Our robust, developer-friendly API ensures secure data exchange, bridging your queue workflows and core CRM or ERP systems.",
    linkText: "Integrations",
    href: "/get-started",
    illustration: (
      <svg
        viewBox="0 0 160 120"
        className="w-full h-36 max-w-[190px] overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="API and integrations illustration"
      >
        {/* Central Geometric Bridge Node */}
        <g transform="translate(80, 60)">
          {/* Butterfly / Infinity bridge node */}
          <path
            d="M -14 -16 C -9 -16, -5 -6, -5 0 C -5 6, -9 16, -14 16 C -19 16, -23 6, -23 0 C -23 -6, -19 -16, -14 -16 Z"
            fill="#0F172A"
          />
          <path
            d="M 14 -16 C 9 -16, 5 -6, 5 0 C 5 6, 9 16, 14 16 C 19 16, 23 6, 23 0 C 23 -6, 19 -16, 14 -16 Z"
            fill="#0F172A"
          />
          <circle cx="0" cy="0" r="4" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
        </g>

        {/* Circuit traces and nodes */}
        {/* Left Side */}
        <path
          d="M 38 34 L 62 34 L 62 50"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="38" cy="34" r="3" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />

        <path
          d="M 26 60 L 52 60"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="26" cy="60" r="3" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />

        <path
          d="M 34 86 L 58 86 L 58 70"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="34" cy="86" r="3" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />

        {/* Right Side */}
        <path
          d="M 122 34 L 98 34 L 98 50"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="122" cy="34" r="3" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />

        <path
          d="M 134 60 L 108 60"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="134" cy="60" r="3" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />

        <path
          d="M 126 86 L 102 86 L 102 70"
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="126" cy="86" r="3" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />

        {/* Top & Bottom Central Nodes */}
        <path d="M 80 18 L 80 38" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
        <circle cx="80" cy="18" r="3" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />

        <path d="M 80 102 L 80 82" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
        <circle cx="80" cy="102" r="3" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
      </svg>
    ),
  },
];

export default function Advantage() {
  return (
    <section className="bg-white py-20 md:py-28 border-b border-slate-200/80 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-slate-900 tracking-tight leading-tight">
            The Q4Queue advantage
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            A secure, enterprise-grade solution for customer loyalty and growth
            that&apos;s easy to implement, customize, and use. Ideal for businesses
            managing 10 to 600 service points and multiple networks.
          </p>
        </div>

        {/* 4-Pillar Grid */}
        <div className="mt-14 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {pillars.map((item) => (
            <div key={item.title} className="group flex flex-col justify-between">
              <div>
                {/* Custom SVG Illustration Stage */}
                <div className="h-36 sm:h-40 flex items-center justify-start mb-6 transition-transform duration-300 group-hover:scale-105">
                  {item.illustration}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Link CTA */}
              <div className="mt-5 pt-1">
                <Link
                  href={item.href}
                  className="text-blue-600 hover:text-blue-700 font-semibold text-sm inline-flex items-center gap-1.5 transition-colors group/link"
                >
                  <span>{item.linkText}</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
