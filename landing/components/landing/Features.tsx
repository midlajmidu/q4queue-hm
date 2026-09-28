import {
  QrCode,
  Smartphone,
  Layers,
  Bell,
  SplitSquareVertical,
  LayoutDashboard,
  BarChart3,
  Network,
} from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
}

const features: Feature[] = [
  {
    title: "Digital Queue",
    description: "Instant QR check-in and self-service token generation with zero hardware requirements.",
    icon: QrCode,
  },
  {
    title: "Real-time Queue Tracking",
    description: "Dynamic position updates and wait estimates served directly to the customer's phone browser.",
    icon: Smartphone,
  },
  {
    title: "Counter Management",
    description: "Dedicated operator consoles to call, recall, transfer, and complete tickets with a single click.",
    icon: Layers,
  },
  {
    title: "Customer Notifications",
    description: "Instant browser turn alerts and proximity warnings so visitors arrive promptly at their designated desk.",
    icon: Bell,
  },
  {
    title: "Multiple Service Types",
    description: "Categorize walk-ins by department, triage urgency, or specialist service desks within the same lobby.",
    icon: SplitSquareVertical,
  },
  {
    title: "Live Dashboard",
    description: "Real-time administrative visibility across all waiting visitors, active counters, and operator statuses.",
    icon: LayoutDashboard,
  },
  {
    title: "Queue Analytics",
    description: "Track throughput, peak arrival curves, and average consultation times to optimize staffing schedules.",
    icon: BarChart3,
  },
  {
    title: "Multi-location Support",
    description: "Manage multiple branch offices, clinic sites, or regional facilities from a unified admin console.",
    icon: Network,
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-[#F8FAFC] border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3">
            Core Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1220] tracking-[-0.03em] leading-tight">
            Designed for operational reliability.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Everything your organization needs to eliminate physical lines, streamline counter handoffs, and keep operations running smoothly.
          </p>
        </div>

        {/* 8-Feature Grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="p-5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}