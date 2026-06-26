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
    iconColor?: "indigo" | "emerald" | "blue" | "amber" | "rose" | "teal";
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
    
    const colors = {
        indigo: "bg-indigo-50 text-indigo-600",
        emerald: "bg-emerald-50 text-emerald-600",
        blue: "bg-blue-50 text-blue-600",
        amber: "bg-amber-50 text-amber-600",
        rose: "bg-rose-50 text-rose-600",
        teal: "bg-teal-50 text-teal-600",
    };

    return (
        <PremiumCard hoverEffect className="p-5 flex flex-col justify-between h-full group relative overflow-hidden">
            {WatermarkIcon && (
                <div className="absolute -right-4 -bottom-4 z-0 text-slate-900 opacity-10 pointer-events-none transform group-hover:scale-110 transition-transform duration-500">
                    <WatermarkIcon className="w-28 h-28" strokeWidth={1.5} />
                </div>
            )}
            
            <div className="flex items-center gap-2.5 mb-3 relative z-10">
                <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
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
                    <div className="mt-1 text-sm text-slate-500">
                        {subtitle}
                    </div>
                )}
            </div>
        </PremiumCard>
    );
}
