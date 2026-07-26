import React from "react";
import { LucideIcon } from "lucide-react";

interface SectionHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    action?: React.ReactNode;
}

export function SectionHeader({ title, description, icon: Icon, action }: SectionHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-start gap-3">
                {Icon && (
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="text-slate-400" size={16} />
                    </div>
                )}
                <div>
                    <h2 className="text-sm font-semibold text-slate-800 leading-tight">{title}</h2>
                    {description && (
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{description}</p>
                    )}
                </div>
            </div>
            {action && (
                <div className="shrink-0">
                    {action}
                </div>
            )}
        </div>
    );
}
