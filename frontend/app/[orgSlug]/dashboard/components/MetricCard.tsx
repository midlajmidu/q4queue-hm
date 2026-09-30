import React from "react";
import { Icons, type IconProps } from "./DashboardIcons";

export function MetricCard({
  label, value, Icon, trend, color, bg, border, valueColor,
  pulse, muted, isLoading, suffix = "", subtext, comparisonLabel,
  title
}: {
  label: string; value: number | string;
  Icon: (p: IconProps) => React.ReactNode;
  trend: { up: boolean; pct: number } | null;
  color: string; bg: string; border: string; valueColor: string;
  pulse?: boolean; muted?: boolean; isLoading?: boolean; suffix?: string;
  subtext?: string; comparisonLabel?: string;
  title?: string;
}) {
  const gradientId = `wave-grad-${label.replace(/[^a-zA-Z0-9]/g, '')}`;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div className="shim" style={{ width: "40%", height: 12, borderRadius: 4 }} />
          <div className="shim" style={{ width: 36, height: 36, borderRadius: 10 }} />
        </div>
        <div className="shim" style={{ width: "35%", height: 36, marginTop: 8, borderRadius: 6 }} />
        <div className="shim" style={{ width: "60%", height: 12, marginTop: 12, borderRadius: 4 }} />
      </div>
    );
  }

  const isIndigo = color === "#4f46e5" || color === "#6366f1";
  const isBlue = color === "#2563eb" || color === "#3b82f6";
  const isGreen = color === "#059669" || color === "#10b981" || color === "#16a34a";
  const isRed = color === "#dc2626" || color === "#ef4444";
  const isAmber = color === "#d97706" || color === "#eab308" || color === "#ca8a04";

  const containerDarkClass = isIndigo ? "dark:!bg-indigo-500/15 dark:!border-indigo-500/30"
    : isBlue ? "dark:!bg-blue-500/15 dark:!border-blue-500/30"
    : isGreen ? "dark:!bg-emerald-500/15 dark:!border-emerald-500/30"
    : isRed ? "dark:!bg-rose-500/15 dark:!border-rose-500/30"
    : isAmber ? "dark:!bg-amber-500/15 dark:!border-amber-500/30"
    : "dark:!bg-white/10 dark:!border-white/15";

  const iconDarkClass = isIndigo ? "dark:!text-indigo-400"
    : isBlue ? "dark:!text-blue-400"
    : isGreen ? "dark:!text-emerald-400"
    : isRed ? "dark:!text-rose-400"
    : isAmber ? "dark:!text-amber-400"
    : "dark:!text-slate-300";

  return (
    <div 
      className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-2xl transition-all duration-300 relative overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm" 
      style={{ 
        padding: "24px", 
        display: "flex", 
        flexDirection: "column",
      }}
    >
      {/* Static Gradient Wave Background (Clean & Legible) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0">
        <svg className="absolute right-0 bottom-0 w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={muted ? "0.02" : "0.04"} />
              <stop offset="100%" stopColor={color} stopOpacity={muted ? "0.08" : "0.15"} />
            </linearGradient>
            <linearGradient id={`${gradientId}-2`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={muted ? "0.01" : "0.02"} />
              <stop offset="100%" stopColor={color} stopOpacity={muted ? "0.04" : "0.10"} />
            </linearGradient>
          </defs>
          
          {/* Back Wave */}
          <path 
            d="M0,70 C100,50 150,90 250,70 C320,55 370,75 400,70 L400,100 L0,100 Z" 
            fill={`url(#${gradientId}-2)`} 
          />
          
          {/* Front Wave */}
          <path 
            d="M0,80 C100,100 150,60 250,80 C320,95 370,75 400,85 L400,100 L0,100 Z" 
            fill={`url(#${gradientId})`} 
          />
        </svg>
      </div>

      {/* Header: Label & Icon */}
      <div className="relative z-10 flex items-start justify-between gap-3 mb-4" style={{ minHeight: 44 }}>
        <span 
          className="font-semibold leading-tight text-slate-600 dark:text-slate-400 text-[13px] tracking-tight pt-[2px]" 
          title={title}
        >
          {label}
        </span>
        <div 
          className={`shrink-0 flex items-center justify-center relative shadow-sm transition-transform duration-300 group-hover:scale-105 ${containerDarkClass} ${iconDarkClass}`} 
          style={{ width: 38, height: 38, background: bg, border: `1px solid ${border}`, borderRadius: 10, color: color }}
        >
          {pulse && (
            <span className="absolute w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900" style={{ top: -2, right: -2, background: color }} />
          )}
          <Icon size={18} color="currentColor" />
        </div>
      </div>

      {/* Value */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8, position: "relative", zIndex: 10 }}>
        <span 
          className="mono tnum tracking-tight text-[36px] font-extrabold leading-none dark:text-white"
          style={{ color: valueColor }}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {suffix && <span className="text-[18px] font-semibold text-slate-500 dark:text-slate-400">{suffix}</span>}
      </div>

      {/* Footer: Trend & Subtext */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, position: "relative", zIndex: 10, minHeight: 44 }}>
        {trend ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold ${
              trend.up
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30"
                : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30"
            }`}>
              {trend.up ? <Icons.TrendingUp size={14} strokeWidth={2.5} /> : <Icons.TrendingDown size={14} strokeWidth={2.5} />}
              <span className="tnum font-bold">{trend.pct}%</span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 font-medium">{comparisonLabel || "vs last session"}</span>
          </div>
        ) : (
          comparisonLabel ? (
            <div className="text-slate-500 dark:text-slate-400 font-medium text-[13px] h-[26px] flex items-center">
              {comparisonLabel}
            </div>
          ) : null
        )}
        
        {subtext && (
          <div className="text-[12px] text-slate-500 dark:text-slate-400 font-semibold">
            {subtext}
          </div>
        )}
      </div>

    </div>
  );
}
