"use client";

import React from "react";
import { AlertCircle, Sparkles } from "lucide-react";

interface EntitlementLimitNoticeProps {
    message: string;
    onContactSales?: () => void;
    className?: string;
}

export function EntitlementLimitNotice({
    message,
    onContactSales,
    className = "",
}: EntitlementLimitNoticeProps) {
    if (!message) return null;

    const isLimit =
        /limit reached|free trial limit|plan limit|limit of|upgrade your plan|capacity .* reached|admissions are closed/i.test(
            message
        );

    if (isLimit) {
        return (
            <div
                className={`flex flex-col gap-2.5 p-3.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 dark:border-amber-400/20 rounded-xl text-amber-900 dark:text-amber-200 text-xs font-medium animate-in fade-in duration-200 ${className}`}
            >
                <div className="flex items-start gap-2.5 leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1">{message}</div>
                </div>

                {onContactSales && (
                    <div className="flex justify-end pt-0.5">
                        <button
                            type="button"
                            onClick={onContactSales}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-[11px] font-semibold rounded-lg shadow-sm shadow-amber-600/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Contact Sales to Upgrade</span>
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className={`flex items-start gap-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-medium px-3.5 py-2.5 rounded-lg border border-red-100 dark:border-red-900/40 leading-relaxed ${className}`}
        >
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{message}</span>
        </div>
    );
}
