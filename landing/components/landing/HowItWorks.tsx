import { QrCode, Smartphone, MonitorCheck, CheckCircle } from "lucide-react";

const workflowSteps = [
  {
    step: "01",
    tag: "Arrival & Check-in",
    title: "Customer joins the queue",
    description:
      "Arriving visitors scan a QR code at your entrance or check in via a simple tablet screen. No app installation or account sign-up is required.",
    icon: QrCode,
    uiMockup: (
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md border border-slate-800 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <span className="font-semibold text-slate-300">Self Check-in</span>
          <span className="text-[10px] text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900">
            Instant Scan
          </span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700/60 flex items-center justify-between">
            <span className="text-slate-200">Select Service:</span>
            <span className="text-blue-400 font-semibold">General Consultation</span>
          </div>
          <div className="bg-blue-600 p-2 rounded text-center font-bold text-white tracking-wide">
            Issue Digital Token
          </div>
        </div>
        <div className="mt-2.5 text-[10px] text-slate-400 text-center">
          QR Token assigned in &lt; 5 seconds
        </div>
      </div>
    ),
  },
  {
    step: "02",
    tag: "Remote Waiting",
    title: "Customer waits anywhere",
    description:
      "Customers track their exact queue position and estimated wait time live in their browser. They can wait in their car, a nearby cafe, or outdoors.",
    icon: Smartphone,
    uiMockup: (
      <div className="bg-white text-slate-900 p-4 rounded-xl shadow-md border border-slate-200 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="font-bold text-slate-900">Your Live Token</span>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            In Line
          </span>
        </div>
        <div className="mt-3 text-center py-2 bg-slate-50 rounded-lg border border-slate-100">
          <div className="text-[11px] text-slate-500 uppercase font-medium">Your Number</div>
          <div className="text-3xl font-extrabold text-blue-600 font-mono">#48</div>
          <div className="text-[11px] text-slate-600 mt-1 font-medium">
            Currently Serving: <span className="font-bold text-slate-900">#45</span> (3 ahead)
          </div>
        </div>
        <div className="mt-2 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-500" />
          Est. wait: ~8 min · Real-time sync
        </div>
      </div>
    ),
  },
  {
    step: "03",
    tag: "Service & Dispatch",
    title: "Your team serves the next customer",
    description:
      "Counter staff call the next customer with one click from their dashboard. The customer is alerted immediately, and counter screens update.",
    icon: MonitorCheck,
    uiMockup: (
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md border border-slate-800 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="font-semibold text-slate-300">Counter 02 Terminal</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
            Staff Ready
          </span>
        </div>
        <div className="mt-3 p-2.5 rounded bg-slate-800/80 border border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Next in line:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">Token #43</span>
          </div>
          <div className="text-[11px] text-slate-300 mt-0.5">James K. · Billing Desk</div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-2 rounded text-[11px] text-center">
            Call #43
          </button>
          <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-2 rounded text-[11px] text-center border border-slate-700">
            Transfer
          </button>
        </div>
      </div>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-[#F8FAFC] border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3">
            Product Workflow
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B1220] tracking-[-0.03em] leading-tight">
            One queue. Every customer. Total control.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Eliminate lobby chaos in three seamless operational steps — from digital arrival to counter completion.
          </p>
        </div>

        {/* 3-Step Connected Workflow */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
          {/* Connector line for desktop */}
          <div className="hidden lg:block absolute top-1/2 left-[15%] right-[15%] h-0.5 -translate-y-24 bg-gradient-to-r from-blue-200 via-slate-300 to-blue-200 z-0 pointer-events-none" />

          {workflowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="relative z-10 flex flex-col justify-between bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                        {step.step}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {step.tag}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <Icon className="w-4 h-4 stroke-[2]" />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* UI Mockup Representation */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  {step.uiMockup}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
