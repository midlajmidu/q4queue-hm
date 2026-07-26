import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: React.ReactNode;
    icon: LucideIcon;
    trend?: "up" | "down" | "neutral";
    trendValue?: number;
    iconColor?: "indigo" | "emerald" | "sky" | "amber" | "rose" | "teal" | "slate" | "blue";
    watermarkIcon?: LucideIcon;
}

export function MetricCard({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend,
    trendValue,
    iconColor = "indigo",
    watermarkIcon: WatermarkIcon
}: MetricCardProps) {
    
    const bgColors: Record<string, string> = {
        indigo: "bg-gradient-to-br from-indigo-50/80 via-white to-white border-indigo-100/60",
        emerald: "bg-gradient-to-br from-emerald-50/80 via-white to-white border-emerald-100/60",
        sky: "bg-gradient-to-br from-sky-50/80 via-white to-white border-sky-100/60",
        amber: "bg-gradient-to-br from-amber-50/80 via-white to-white border-amber-100/60",
        rose: "bg-gradient-to-br from-rose-50/80 via-white to-white border-rose-100/60",
        teal: "bg-gradient-to-br from-teal-50/80 via-white to-white border-teal-100/60",
        slate: "bg-gradient-to-br from-slate-50/80 via-white to-white border-slate-100/60",
        blue: "bg-gradient-to-br from-blue-50/80 via-white to-white border-blue-100/60",
    };

    const iconBgColors: Record<string, string> = {
        indigo: "bg-indigo-50 text-indigo-600",
        emerald: "bg-emerald-50 text-emerald-600",
        sky: "bg-sky-50 text-sky-600",
        amber: "bg-amber-50 text-amber-600",
        rose: "bg-rose-50 text-rose-600",
        teal: "bg-teal-50 text-teal-600",
        slate: "bg-slate-100 text-slate-600",
        blue: "bg-blue-50 text-blue-600",
    };

    const topBorderColors: Record<string, string> = {
        indigo: "border-t-indigo-400",
        emerald: "border-t-emerald-400",
        sky: "border-t-sky-400",
        amber: "border-t-amber-400",
        rose: "border-t-rose-400",
        teal: "border-t-teal-400",
        slate: "border-t-slate-400",
        blue: "border-t-blue-400",
    };

    const watermarkColors: Record<string, string> = {
        indigo: "text-indigo-600 opacity-[0.06]",
        emerald: "text-emerald-600 opacity-[0.06]",
        sky: "text-sky-600 opacity-[0.06]",
        amber: "text-amber-600 opacity-[0.06]",
        rose: "text-rose-600 opacity-[0.06]",
        teal: "text-teal-600 opacity-[0.06]",
        slate: "text-slate-600 opacity-[0.06]",
        blue: "text-blue-600 opacity-[0.06]",
    };

    const bgClass = bgColors[iconColor] || bgColors.indigo;
    const iconBgClass = iconBgColors[iconColor] || iconBgColors.indigo;
    const topBorderClass = topBorderColors[iconColor] || topBorderColors.indigo;
    const watermarkClass = watermarkColors[iconColor] || watermarkColors.indigo;

    return (
        <div className={`rounded-2xl border shadow-sm overflow-hidden p-5 flex flex-col justify-between h-full group relative ${bgClass} hover:shadow-md transition-all duration-200`}>
            {WatermarkIcon && (
                <div className={`absolute -right-4 -bottom-4 z-0 pointer-events-none ${watermarkClass}`}>
                    <WatermarkIcon className="w-28 h-28" strokeWidth={1.5} />
                </div>
            )}

            {/* Top row: icon + title */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-sm font-medium text-slate-500 leading-none">{title}</h3>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBgClass}`}>
                    <Icon size={16} strokeWidth={2} />
                </div>
            </div>

            {/* Value + trend */}
            <div className="relative z-10">
                <div className="flex items-baseline gap-2.5">
                    <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
                    {trend && trendValue !== 0 && trendValue !== undefined && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            trend === "up"
                                ? "bg-emerald-50 text-emerald-600"
                                : trend === "down"
                                ? "bg-rose-50 text-rose-600"
                                : "bg-slate-100 text-slate-500"
                        }`}>
                            {trend === "up" ? "↑" : trend === "down" ? "↓" : "−"} {Math.abs(trendValue || 0)}%
                        </span>
                    )}
                </div>
                {subtitle && (
                    <div className="mt-1.5 text-xs font-medium text-slate-400">
                        {subtitle}
                    </div>
                )}
            </div>
        </div>
    );
}
