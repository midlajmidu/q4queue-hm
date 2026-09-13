import Image from "next/image";
import { Bell, Clock, Coffee } from "lucide-react";

export default function CustomerExperience() {
  return (
    <section className="py-20 md:py-28 bg-[#F8FAFC] border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Product Narrative (6 cols) */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-4">
              Visitor Experience
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1220] tracking-[-0.03em] leading-tight">
              Let customers wait on their terms.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              Nobody enjoys sitting in an overcrowded lobby. Q4Queue transforms waiting from an idle physical chore into an autonomous, transparent digital flow.
            </p>

            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Coffee className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Wait anywhere comfortably</h3>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                    Visitors are free to step outside, visit a nearby cafe, or wait in their car without losing their place.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Real-time status transparency</h3>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                    Live updates show exactly how many people are ahead and the dynamically recalculated wait time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Proximity notifications</h3>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                    Visual and audio alerts notify the visitor when their counter is ready so they arrive right on time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Actual Token Mobile Screen Image (6 cols) */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-[340px] rounded-[32px] border-4 border-slate-900 bg-slate-900 p-2 shadow-2xl">
              <div className="rounded-[24px] overflow-hidden bg-white">
                <Image
                  src="/images/token-mobile-screen.png"
                  alt="Q4Queue Visitor Mobile Screen"
                  width={700}
                  height={1400}
                  className="w-full h-auto object-cover"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
