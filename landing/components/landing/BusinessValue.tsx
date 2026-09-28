import {
  Users2,
  Eye,
  LayoutGrid,
  TrendingUp,
} from "lucide-react";

const outcomes = [
  {
    title: "Reduce physical queues",
    description:
      "Prevent lobby congestion, clear crowded corridors, and eliminate uncomfortable standing lines by distributing waiting visitors digitally.",
    icon: Users2,
    metric: "Zero lobby crowding",
  },
  {
    title: "Give customers visibility",
    description:
      "Replace the uncertainty of unknown wait times with live queue counts and dynamic estimated arrival windows right on their phones.",
    icon: Eye,
    metric: "Live wait tracking",
  },
  {
    title: "Help staff stay organized",
    description:
      "Empower counter agents to manage queues with predictable pacing, single-click customer calls, and easy ticket transfers between desks.",
    icon: LayoutGrid,
    metric: "Focused counter flow",
  },
  {
    title: "Understand demand with real-time data",
    description:
      "Track arrival surges, average service durations, and counter throughput to plan staffing accurately across peak and quiet hours.",
    icon: TrendingUp,
    metric: "Operational analytics",
  },
];

export default function BusinessValue() {
  return (
    <section id="business-value" className="py-20 md:py-28 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">
            Operational Impact
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1220] tracking-[-0.03em] leading-tight">
            Less waiting. Less crowding. Better operations.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Move beyond manual ticket dispensers and frustrated crowds. Q4Queue provides the structure your staff needs and the transparency your visitors expect.
          </p>
        </div>

        {/* 4 Outcome Columns */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {outcomes.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="p-6 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                      <Icon className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      0{idx + 1}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-900 tracking-tight leading-snug">
                    {item.title}
                  </h3>

                  <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 text-xs font-semibold text-blue-600">
                  {item.metric}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
