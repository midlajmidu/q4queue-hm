import React from "react";
import { PremiumCard } from "./PremiumCard";
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
    
    // Background gradient "wallpaper" vibe
    const bgColors: Record<string, string> = {
        indigo: "bg-gradient-to-br from-indigo-50/80 via-white to-white border-indigo-100",
        emerald: "bg-gradient-to-br from-emerald-50/80 via-white to-white border-emerald-100",
        sky: "bg-gradient-to-br from-sky-50/80 via-white to-white border-sky-100",
        amber: "bg-gradient-to-br from-amber-50/80 via-white to-white border-amber-100",
        rose: "bg-gradient-to-br from-rose-50/80 via-white to-white border-rose-100",
        teal: "bg-gradient-to-br from-teal-50/80 via-white to-white border-teal-100",
        slate: "bg-gradient-to-br from-slate-50/80 via-white to-white border-slate-100",
        blue: "bg-gradient-to-br from-blue-50/80 via-white to-white border-blue-100",
    };

    const textColors: Record<string, string> = {
        indigo: "text-indigo-500",
        emerald: "text-emerald-500",
        sky: "text-sky-500",
        amber: "text-amber-500",
        rose: "text-rose-500",
        teal: "text-teal-500",
        slate: "text-slate-500",
        blue: "text-blue-500",
    };

    const watermarkColors: Record<string, string> = {
        indigo: "text-indigo-600 opacity-[0.04]",
        emerald: "text-emerald-600 opacity-[0.04]",
        sky: "text-sky-600 opacity-[0.04]",
        amber: "text-amber-600 opacity-[0.04]",
        rose: "text-rose-600 opacity-[0.04]",
        teal: "text-teal-600 opacity-[0.04]",
        slate: "text-slate-600 opacity-[0.04]",
        blue: "text-blue-600 opacity-[0.04]",
    };

    const bgClass = bgColors[iconColor] || bgColors.indigo;
    const textClass = textColors[iconColor] || textColors.indigo;
    const watermarkClass = watermarkColors[iconColor] || watermarkColors.indigo;

    return (
        <PremiumCard hoverEffect className={`p-5 flex flex-col justify-between h-full group relative overflow-hidden ${bgClass}`}>
            {WatermarkIcon && (
                <div className={`absolute -right-4 -bottom-4 z-0 pointer-events-none transform group-hover:scale-110 transition-transform duration-500 ${watermarkClass}`}>
                    <WatermarkIcon className="w-28 h-28" strokeWidth={1.5} />
                </div>
            )}
            
            <div className="flex items-center gap-2.5 mb-3 relative z-10">
                <div className={`${textClass} group-hover:opacity-80 transition-opacity`}>
                    <Icon size={16} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-medium text-slate-600">{title}</h3>
            </div>
            
            <div className="relative z-10">
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-slate-900">{value}</span>
                    {trend && (
                        <span className={`text-xs font-medium ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-600" : "text-slate-500"}`}>
                            {trend === "up" ? "↑" : trend === "down" ? "↓" : "−"} {Math.abs(trendValue || 0)}%
                        </span>
                    )}
                </div>
                {subtitle && (
                    <div className="mt-1 text-xs font-medium text-slate-500">
                        {subtitle}
                    </div>
                )}
            </div>
        </PremiumCard>
    );
}
