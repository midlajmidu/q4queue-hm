import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Bell,
  Calendar,
  Footprints,
  Clock,
  Sparkles,
} from "lucide-react";

export default function OperationalSolutions() {
  return (
    <section className="bg-white py-20 md:py-28 border-b border-slate-200/80 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-slate-900 tracking-tight leading-tight">
            Built for your operational reality
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Whether your guests book in advance, walk in, or both — Q4Queue adapts
            perfectly to your exact service model. Here are our core solutions:
          </p>
        </div>

        {/* 3-Column Solutions Grid */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* ── CARD 1: Managing high demand (Queue Management) ── */}
          <div className="group flex flex-col">
            {/* Visual Preview Box */}
            <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-slate-300">
              {/* Background Lifestyle Image */}
              <Image
                src="/images/solution-queue-retail.jpg"
                alt="Retail showroom floor with sales rep and customer"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />

              {/* Diagonal / Curved White Backdrop Mask */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 0 0 L 68 0 C 60 35, 52 65, 42 100 L 0 100 Z"
                    fill="#F8FAFC"
                  />
                </svg>
              </div>

              {/* Floating UI Widget: Queue Status Turn Alert */}
              <div className="absolute top-6 left-5 sm:left-6 z-20 w-[84%] max-w-[270px]">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-[0_12px_32px_rgba(15,23,42,0.12)] border border-white/80 ring-1 ring-slate-100">
                  <div className="flex items-center gap-3">
                    {/* Q4Queue Brand Emblem */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-slate-900 tracking-tight truncate">
                        You&apos;re next in line!
                      </div>
                      <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500 mt-0.5 font-medium">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span>Wait 2–4 min</span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="mt-3.5 pt-2 border-t border-slate-100/80">
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden p-[1px]">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 w-[78%] transition-all duration-1000" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content & CTA */}
            <div className="mt-6 flex flex-col flex-1">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Managing high demand
              </h3>
              <p className="mt-2.5 text-sm sm:text-[15px] text-slate-600 leading-relaxed flex-1">
                Eliminate unpredictable floor traffic and ensure quality service
                for every visitor by turning physical lines into a seamless digital
                queue.
              </p>
              <div className="mt-4 pt-1">
                <Link
                  href="/get-started"
                  className="text-blue-600 hover:text-blue-700 font-semibold text-sm inline-flex items-center gap-1.5 transition-colors group/link"
                >
                  <span>Queue management</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── CARD 2: Orchestrating predictable service (Appointment Scheduling) ── */}
          <div className="group flex flex-col">
            {/* Visual Preview Box */}
            <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-slate-300">
              {/* Background Lifestyle Image */}
              <Image
                src="/images/solution-appointment-consulting.jpg"
                alt="Business advisory office with consultant meeting client"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />

              {/* Diagonal / Curved White Backdrop Mask */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 0 0 L 70 0 C 62 35, 54 65, 44 100 L 0 100 Z"
                    fill="#F8FAFC"
                  />
                </svg>
              </div>

              {/* Floating UI Widget: Calendar Scheduler Matrix */}
              <div className="absolute top-5 left-4 sm:left-5 z-20 w-[86%] max-w-[280px]">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] border border-white/80 ring-1 ring-slate-100">
                  <div className="relative pl-7">
                    {/* Time labels axis */}
                    <span className="absolute -left-1 top-0 text-[9px] font-bold text-slate-400 font-mono">
                      10:00
                    </span>
                    <span className="absolute -left-1 bottom-1 text-[9px] font-bold text-slate-400 font-mono">
                      11:00
                    </span>

                    {/* Live red/coral current time line marker */}
                    <div className="absolute left-7 right-0 top-3.5 z-10 flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 -ml-1 ring-2 ring-white" />
                      <div className="w-full h-[1.5px] bg-rose-500/80" />
                    </div>

                    {/* Booking Slots Matrix */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* Slot 1: Top Left */}
                      <div className="bg-blue-600 text-white rounded-lg p-2 shadow-sm border border-blue-500/30">
                        <div className="h-1.5 w-12 bg-white/90 rounded-full" />
                        <div className="h-1.5 w-8 bg-white/50 rounded-full mt-1.5" />
                      </div>

                      {/* Slot 2: Top Right */}
                      <div className="bg-indigo-600 text-white rounded-lg p-2 shadow-sm border border-indigo-500/30">
                        <div className="h-1.5 w-14 bg-white/90 rounded-full" />
                        <div className="h-1.5 w-10 bg-white/50 rounded-full mt-1.5" />
                      </div>

                      {/* Slot 3: Bottom Left */}
                      <div className="bg-blue-700 text-white rounded-lg p-2 shadow-sm border border-blue-600/30">
                        <div className="h-1.5 w-11 bg-white/90 rounded-full" />
                        <div className="h-1.5 w-7 bg-white/50 rounded-full mt-1.5" />
                      </div>

                      {/* Slot 4: Bottom Right */}
                      <div className="bg-blue-600 text-white rounded-lg p-2 shadow-sm border border-blue-500/30">
                        <div className="h-1.5 w-13 bg-white/90 rounded-full" />
                        <div className="h-1.5 w-9 bg-white/50 rounded-full mt-1.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content & CTA */}
            <div className="mt-6 flex flex-col flex-1">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Orchestrating predictable service
              </h3>
              <p className="mt-2.5 text-sm sm:text-[15px] text-slate-600 leading-relaxed flex-1">
                Maximize staff utilization and eliminate waiting uncertainty
                through a frictionless booking experience that smoothly
                synchronizes calendars and bays.
              </p>
              <div className="mt-4 pt-1">
                <Link
                  href="/get-started"
                  className="text-blue-600 hover:text-blue-700 font-semibold text-sm inline-flex items-center gap-1.5 transition-colors group/link"
                >
                  <span>Appointment scheduling</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── CARD 3: Unifying bookings & walk-ins (Hybrid Operations) ── */}
          <div className="group flex flex-col">
            {/* Visual Preview Box */}
            <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-100 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-slate-300">
              {/* Background Lifestyle Image */}
              <Image
                src="/images/solution-hybrid-hospitality.jpg"
                alt="Luxury boutique watch showcase counter with specialist"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />

              {/* Diagonal / Curved White Backdrop Mask */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 0 0 L 72 0 C 64 35, 55 65, 45 100 L 0 100 Z"
                    fill="#F8FAFC"
                  />
                </svg>
              </div>

              {/* Floating UI Widget: Multi-Channel Guest Roster */}
              <div className="absolute top-4 left-4 sm:left-5 z-20 w-[88%] max-w-[280px] space-y-2">
                {/* Guest 1: Booking */}
                <div className="bg-white/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.1)] border border-white/80 ring-1 ring-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-bold text-slate-900 tracking-tight">
                      Ashlynn Curtis
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                      <span className="inline-flex items-center gap-1 font-medium text-blue-600">
                        <Calendar className="w-2.5 h-2.5" /> Booking
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-[9.5px] text-slate-400">10:30 AM</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                      aria-label="Notify Ashlynn"
                    >
                      <Bell className="w-3 h-3" />
                    </button>
                    <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                {/* Guest 2: Walk-in */}
                <div className="bg-white/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.1)] border border-white/80 ring-1 ring-slate-100 flex items-center justify-between ml-2">
                  <div>
                    <div className="text-[12px] font-bold text-slate-900 tracking-tight">
                      Allison Korsgaard
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                        <Footprints className="w-2.5 h-2.5" /> Walk-in
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-[9.5px] text-slate-400">#42</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                      aria-label="Notify Allison"
                    >
                      <Bell className="w-3 h-3" />
                    </button>
                    <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                {/* Guest 3: Booking */}
                <div className="bg-white/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.1)] border border-white/80 ring-1 ring-slate-100 flex items-center justify-between ml-4">
                  <div>
                    <div className="text-[12px] font-bold text-slate-900 tracking-tight">
                      Jordyn Batosh
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                      <span className="inline-flex items-center gap-1 font-medium text-blue-600">
                        <Calendar className="w-2.5 h-2.5" /> Booking
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-[9.5px] text-slate-400">11:00 AM</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                      aria-label="Notify Jordyn"
                    >
                      <Bell className="w-3 h-3" />
                    </button>
                    <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content & CTA */}
            <div className="mt-6 flex flex-col flex-1">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Unifying bookings &amp; walk-ins
              </h3>
              <p className="mt-2.5 text-sm sm:text-[15px] text-slate-600 leading-relaxed flex-1">
                Give customers ultimate flexibility and optimize team capacity
                by consolidating scheduled appointments and spontaneous walk-ins
                in one unified flow.
              </p>
              <div className="mt-4 pt-1">
                <Link
                  href="/get-started"
                  className="text-blue-600 hover:text-blue-700 font-semibold text-sm inline-flex items-center gap-1.5 transition-colors group/link"
                >
                  <span>Hybrid flows</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
