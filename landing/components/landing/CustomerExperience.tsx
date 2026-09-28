import {
  Bell,
  Clock,
  Coffee,
} from "lucide-react";

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

          {/* Right Column: Realistic Mobile Web Waiting Screen (6 cols) */}
          <div className="lg:col-span-6 flex justify-center">
            {/* Realistic Smartphone Shell */}
            <div className="w-full max-w-[340px] rounded-[32px] border-4 border-slate-900 bg-slate-900 p-2.5 shadow-2xl">
              {/* Screen Interior */}
              <div className="bg-white rounded-[24px] overflow-hidden border border-slate-200">
                {/* Mobile Browser Top Bar */}
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate max-w-[190px] font-mono text-slate-600">
                    q4queue.com/wait/downtown
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">9:42 AM</span>
                </div>

                {/* Application Header */}
                <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                      Q4Queue
                    </div>
                    <div className="text-sm font-bold text-slate-900 leading-tight mt-0.5">
                      Downtown Clinic
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    You&apos;re in line
                  </span>
                </div>

                {/* Main Waiting Card Content */}
                <div className="p-5 text-center space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Your Token
                    </div>
                    <div className="mt-1 text-5xl font-extrabold font-mono text-slate-900 tracking-tight">
                      #48
                    </div>
                    <div className="text-xs text-slate-500 mt-1">General Consultation</div>
                  </div>

                  {/* Operational Status Box */}
                  <div className="rounded-xl bg-slate-50 border border-slate-200/90 p-3.5 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Currently serving:</span>
                      <span className="font-bold text-slate-900 font-mono">#45 (Counter 01)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Ahead of you:</span>
                      <span className="font-semibold text-blue-600">3 people ahead</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 font-medium">Estimated wait:</span>
                      <span className="font-bold text-slate-900 font-mono">~8 min</span>
                    </div>
                  </div>

                  {/* Reassurance Message */}
                  <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-left">
                    <p className="text-xs text-blue-900 font-medium leading-relaxed">
                      &ldquo;We&apos;ll let you know when it&apos;s your turn. Feel free to wait nearby.&rdquo;
                    </p>
                  </div>

                  {/* Alert Preference Action */}
                  <div className="pt-2 text-left">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pb-2">
                      <span>Vibrate on call:</span>
                      <span className="font-semibold text-emerald-600">Enabled</span>
                    </div>
                    <button className="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-500 hover:text-slate-700 bg-white">
                      Leave queue / cancel ticket
                    </button>
                  </div>
                </div>

                {/* Bottom Safe Indicator */}
                <div className="h-4 bg-slate-100 flex items-center justify-center">
                  <div className="w-24 h-1 bg-slate-300 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
