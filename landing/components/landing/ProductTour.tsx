"use client";

import { useState } from "react";
import { PhoneCall } from "lucide-react";

export default function ProductTour() {
  const [activeTab, setActiveTab] = useState<"dispatch" | "counters" | "analytics">("dispatch");

  return (
    <section id="operations" className="py-20 md:py-28 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3">
            Operations Console
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1220] tracking-[-0.03em] leading-tight">
            Everything your team needs to keep the line moving.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Built for counter operators, reception leads, and facility managers who need real-time control over lobby flow.
          </p>

          {/* Tab Controls */}
          <div className="mt-8 inline-flex p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("dispatch")}
              className={`px-4 py-2 rounded-md transition-all ${
                activeTab === "dispatch"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Queue Dispatcher
            </button>
            <button
              onClick={() => setActiveTab("counters")}
              className={`px-4 py-2 rounded-md transition-all ${
                activeTab === "counters"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Counter Management
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-2 rounded-md transition-all ${
                activeTab === "analytics"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Throughput & Analytics
            </button>
          </div>
        </div>

        {/* Feature Showcase Box */}
        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-xl overflow-hidden">
          {/* Top Window Bar */}
          <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              </div>
              <span className="font-mono text-slate-400">q4queue.app/admin/operations</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Real-time Sync Active
              </span>
            </div>
          </div>

          {/* Tab 1: Queue Dispatcher */}
          {activeTab === "dispatch" && (
            <div className="p-6 lg:p-8 space-y-6">
              {/* Top controls banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Main Reception & Consultation Triage
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Managing 4 active service desks · 14 visitors currently registered
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700">
                    Pause Queue
                  </button>
                  <button className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5" /> Call Next Ticket
                  </button>
                </div>
              </div>

              {/* Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Active Serving Desk Highlight (5 cols) */}
                <div className="lg:col-span-5 bg-slate-950/60 rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                        Serving Counter 01
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        In Progress
                      </span>
                    </div>

                    <div className="mt-4 text-center py-4 bg-slate-900 rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-400 font-medium">Currently Serving</div>
                      <div className="text-5xl font-extrabold font-mono text-white tracking-tight mt-1">
                        #42
                      </div>
                      <div className="text-sm font-semibold text-slate-200 mt-2">
                        Sarah Mitchell
                      </div>
                      <div className="text-xs text-slate-400">General Consultation</div>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-slate-300">
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Check-in time:</span>
                        <span className="font-mono">09:32 AM</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Time at counter:</span>
                        <span className="font-mono text-emerald-400">04m 12s</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-slate-400">Assigned operator:</span>
                        <span>Dr. Evans</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-2 pt-4 border-t border-slate-800">
                    <button className="py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 text-center border border-slate-700">
                      Transfer Ticket
                    </button>
                    <button className="py-2 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white text-center shadow-xs">
                      Complete &amp; Next
                    </button>
                  </div>
                </div>

                {/* Live Waiting Roster (7 cols) */}
                <div className="lg:col-span-7 bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-between">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Up Next in Queue
                    </div>
                    <span className="text-xs text-slate-400 font-mono">11 Waiting</span>
                  </div>

                  <div className="divide-y divide-slate-800/80 text-xs">
                    {[
                      {
                        token: "#43",
                        name: "James Kelly",
                        dept: "Billing & Registration",
                        wait: "06 min",
                        status: "Next",
                      },
                      {
                        token: "#44",
                        name: "Priya Sharma",
                        dept: "Consultation Follow-up",
                        wait: "09 min",
                        status: "Waiting",
                      },
                      {
                        token: "#45",
                        name: "Alexander Wright",
                        dept: "Pharmacy Dispense",
                        wait: "12 min",
                        status: "Waiting",
                      },
                      {
                        token: "#46",
                        name: "David Chen",
                        dept: "General Consultation",
                        wait: "15 min",
                        status: "Waiting",
                      },
                    ].map((row) => (
                      <div
                        key={row.token}
                        className="px-4 py-3 flex items-center justify-between hover:bg-slate-900/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {row.token}
                          </span>
                          <div>
                            <div className="font-semibold text-white">{row.name}</div>
                            <div className="text-[11px] text-slate-400">{row.dept}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-[11px] text-slate-400">
                            <span>Wait: </span>
                            <span className="font-mono text-slate-200">{row.wait}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              row.status === "Next"
                                ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {row.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <span>Showing next 4 of 11 waiting visitors</span>
                    <span className="text-blue-400 font-semibold cursor-pointer hover:underline">
                      View full queue →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Counter Management */}
          {activeTab === "counters" && (
            <div className="p-6 lg:p-8 space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Counter Assignment &amp; Routing
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assign staff to designated desks, route service categories, and balance lobby load.
                  </p>
                </div>
                <button className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white">
                  + Add Counter
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    counter: "Counter 01",
                    agent: "Dr. Evans",
                    category: "General Consultation",
                    status: "Serving #42",
                    todayServed: 18,
                  },
                  {
                    counter: "Counter 02",
                    agent: "James Miller (Front Desk)",
                    category: "Billing & Registration",
                    status: "Serving #39",
                    todayServed: 22,
                  },
                  {
                    counter: "Counter 03",
                    agent: "Elena Rostova",
                    category: "Pharmacy & Labs",
                    status: "Available",
                    todayServed: 15,
                  },
                ].map((c) => (
                  <div
                    key={c.counter}
                    className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{c.counter}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          c.status.includes("Serving")
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{c.agent}</div>
                      <div className="text-[11px] text-slate-400">{c.category}</div>
                    </div>
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span>Served today:</span>
                      <span className="font-mono font-bold text-slate-200">{c.todayServed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Throughput & Analytics */}
          {activeTab === "analytics" && (
            <div className="p-6 lg:p-8 space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Throughput &amp; Wait Time Metrics
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real operational data to understand peak arrival hours and counter efficiency.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">Export CSV / PDF</span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium">Total Served Today</div>
                  <div className="text-2xl font-bold text-white mt-1 font-mono">47</div>
                  <div className="text-[11px] text-emerald-400 mt-1">↑ 12% vs last week</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium">Avg Wait Time</div>
                  <div className="text-2xl font-bold text-white mt-1 font-mono">08m 42s</div>
                  <div className="text-[11px] text-emerald-400 mt-1">Within 10m target</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium">Peak Hour</div>
                  <div className="text-2xl font-bold text-white mt-1 font-mono">10:00 - 11:30</div>
                  <div className="text-[11px] text-slate-400 mt-1">18 arrivals/hr</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-xs text-slate-400 font-medium">No-Show Rate</div>
                  <div className="text-2xl font-bold text-white mt-1 font-mono">1.8%</div>
                  <div className="text-[11px] text-slate-400 mt-1">Minimal queue leakage</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4 Architectural SaaS Callouts */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs mb-3">
              01
            </div>
            <h4 className="text-sm font-bold text-slate-900">One-click Ticket Call</h4>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Staff call the next visitor instantly or recall unresponsive customers without voice paging.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs mb-3">
              02
            </div>
            <h4 className="text-sm font-bold text-slate-900">Multi-Counter Routing</h4>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Route specific service categories (e.g. Billing vs Consultation) to dedicated counter agents.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs mb-3">
              03
            </div>
            <h4 className="text-sm font-bold text-slate-900">TV &amp; Lobby Display Mode</h4>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Broadcast currently called tokens on waiting room monitors via any smart TV web browser.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs mb-3">
              04
            </div>
            <h4 className="text-sm font-bold text-slate-900">Live Wait Recalculation</h4>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Wait times automatically adjust based on active counter throughput and average service durations.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
