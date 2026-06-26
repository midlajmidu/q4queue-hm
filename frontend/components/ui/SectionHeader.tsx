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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-start gap-3">
                {Icon && (
                    <div className="mt-1">
                        <Icon className="text-slate-400" size={20} />
                    </div>
                )}
                <div>
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</h2>
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
