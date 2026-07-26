import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden py-16 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200 shadow-sm flex items-center justify-center mb-6">
                <Icon className="text-slate-400" size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-slate-800 mb-2">{title}</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto mb-6 leading-relaxed">
                {description}
            </p>
            {action && (
                <div>
                    {action}
                </div>
            )}
        </div>
    );
}
