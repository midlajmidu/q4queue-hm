import React from "react";

interface OutcomeStat {
  value: string;
  label: string;
}

const outcomeStats: OutcomeStat[] = [
  {
    value: "20%",
    label: "Decrease in no-shows",
  },
  {
    value: "35%",
    label: "Increase in satisfaction",
  },
  {
    value: "30%",
    label: "Reduction in operating costs",
  },
  {
    value: "20%",
    label: "Increase in revenue",
  },
];

export default function ProvenOutcomes() {
  return (
    <section className="relative bg-[#0B1220] py-16 sm:py-20 lg:py-24 border-y border-slate-800/80 overflow-hidden">
      {/* Subtle Ambient Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.1)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-white tracking-tight leading-tight">
            Proven business outcomes
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Measuring the average business impact of global enterprises using Q4Queue for smart queue management
          </p>
        </div>

        {/* 4 Quantitative Metric Columns */}
        <div className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 text-center">
          {outcomeStats.map((item) => (
            <div
              key={item.label}
              className="group flex flex-col items-center justify-center p-4 transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-white tracking-tight leading-none drop-shadow-xs">
                {item.value}
              </div>
              <div className="mt-2.5 sm:mt-3 text-xs sm:text-sm font-medium text-slate-300 leading-snug max-w-[170px]">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
