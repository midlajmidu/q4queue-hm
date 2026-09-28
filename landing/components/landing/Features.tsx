"use client";

import {
  MessageSquare,
  PhoneCall,
  Clock,
  BarChart3,
  Tv,
  QrCode,
  Layers,
  Scan,
  Sparkles,
  ShieldCheck,
  LayoutDashboard,
  Building2,
  Sliders,
  Users,
} from "lucide-react";

interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const features: FeatureItem[] = [
  {
    id: "whatsapp",
    title: "WhatsApp Notification on Every Update",
    description:
      "Automated WhatsApp status alerts sent directly to visitors. Real-time ticket confirmation, turn warnings, and counter calls with zero app install.",
    icon: MessageSquare,
  },
  {
    id: "voice-calling",
    title: "Direct Calling Through Staff Portal",
    description:
      "Integrated WebRTC voice calling inside the staff counter dashboard to reach waiting visitors directly in one click.",
    icon: PhoneCall,
  },
  {
    id: "session-based",
    title: "Session-Based Queue Management",
    description:
      "Structured shift lifecycles with session token caps, automatic cutoff timers, and historical shift summaries.",
    icon: Clock,
  },
  {
    id: "deep-analytics",
    title: "Deep Complete Analytics & Reports",
    description:
      "Comprehensive data metrics tracking peak walk-in curves, staff counter handle times, and one-click CSV export.",
    icon: BarChart3,
  },
  {
    id: "live-tv",
    title: "Live TV Display & Audio Chimes",
    description:
      "Transform any Smart TV into a lobby display with real-time ticket status grids and audible turn chime announcements.",
    icon: Tv,
  },
  {
    id: "totp-qr",
    title: "Dynamic TOTP Anti-Screenshot QR",
    description:
      "Time-based rotating security QR codes that rotate every 10 seconds to prevent screenshot sharing and queue gaming.",
    icon: QrCode,
  },
  {
    id: "multi-queue",
    title: "Multi-Queue & Multi-Counter Support",
    description:
      "Route visitors to specialized sub-services (Billing, Consultation, VIP) with intelligent dynamic counter allocation.",
    icon: Layers,
  },
  {
    id: "qr-checkin",
    title: "Frictionless QR Code Check-in",
    description:
      "Visitors scan a simple entrance QR code with their smartphone camera to grab a digital token in under 3 seconds.",
    icon: Scan,
  },
  {
    id: "premium-experience",
    title: "Premium Live Experience & ETA",
    description:
      "Sleek mobile status page for visitors featuring live position countdowns and dynamic estimated wait time recalculations.",
    icon: Sparkles,
  },
  {
    id: "enterprise-security",
    title: "Enterprise Security & Audit Trail",
    description:
      "Bank-grade architecture with role-based access control (RBAC), multi-tenant organization isolation, and audit logs.",
    icon: ShieldCheck,
  },
  {
    id: "live-dashboard",
    title: "Live Operations Command Dashboard",
    description:
      "Real-time administrative control room giving live visibility into total waiting visitors, counter speed, and queue velocity.",
    icon: LayoutDashboard,
  },
  {
    id: "multi-branch",
    title: "Multi-Branch Network & Timezones",
    description:
      "Centralized organization management across multi-site networks with branch-specific timezones and operating policies.",
    icon: Building2,
  },
  {
    id: "smart-counter",
    title: "Smart Counter Routing & Priority Triage",
    description:
      "Intelligently balance work across active counters based on staff availability, ticket complexity, and VIP priority flags.",
    icon: Sliders,
  },
  {
    id: "staff-management",
    title: "Staff Performance & Desk Delegation",
    description:
      "Monitor staff serving speeds, track individual desk handle times, delegate counters, and prevent lobby bottlenecks.",
    icon: Users,
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Minimal Left-Aligned Section Header */}
        <div className="max-w-3xl mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#0B1220] tracking-tight leading-[1.15]">
            From basics to <span className="text-blue-600">advanced</span>.
            <br />
            Queue management system that adapts to your needs.
          </h2>
        </div>

        {/* Minimal 4-Column Feature Grid (No heavy cards, no card borders) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12 lg:gap-y-14">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex flex-col items-start group">
                {/* Soft Round Icon Circle */}
                <div className="w-13 h-13 rounded-full bg-blue-50/90 border border-blue-100 text-blue-600 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300 shadow-2xs">
                  <Icon className="w-6 h-6 stroke-[1.8]" />
                </div>

                {/* Minimal Title */}
                <h3 className="text-base sm:text-lg font-bold text-[#0B1220] tracking-tight leading-snug">
                  {item.title}
                </h3>

                {/* Minimal Concise Description */}
                <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}