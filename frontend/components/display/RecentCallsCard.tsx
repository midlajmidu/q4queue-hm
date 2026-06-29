"use client";

import React from "react";
import { History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { RecentToken } from "@/types/api";

interface RecentCallsCardProps {
    recentTokens: RecentToken[];
    prefix: string;
}

export function RecentCallsCard({ recentTokens, prefix }: RecentCallsCardProps) {
    const recentlyCalled = recentTokens
        .filter((t) => t.status === "serving" || t.status === "done");

    return (
        <div className="bg-white rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-200/60 p-6 flex flex-col lg:flex-1 h-[350px] lg:h-auto lg:min-h-[160px] overflow-hidden">
            <div className="flex items-center gap-3 mb-5 px-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center">
                    <History className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold tracking-[0.1em] text-slate-600 uppercase">
                    Recently Called
                </h3>
            </div>

            <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                    {recentlyCalled.length > 0 ? (
                        recentlyCalled.map((token, i) => {
                            const isNewest = i === 0;
                            const timeStr = token.served_at 
                                ? new Date(token.served_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : "--:--";

                            return (
                                <motion.div
                                    key={`recent-${token.token_number}-${token.status}`}
                                    initial={{ opacity: 0, x: -10, height: 0 }}
                                    animate={{ opacity: 1, x: 0, height: "auto" }}
                                    exit={{ opacity: 0, scale: 0.95, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                                        isNewest 
                                            ? "bg-blue-50/50 border border-blue-100" 
                                            : "bg-slate-50/50 border border-transparent"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xl font-bold tabular-nums ${isNewest ? "text-blue-700" : "text-slate-700"}`}>
                                            {prefix}{token.token_number}
                                        </span>
                                        {token.assigned_line && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                                C{token.assigned_line}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-semibold ${isNewest ? "text-blue-500" : "text-slate-400"}`}>
                                            {timeStr}
                                        </span>
                                        <div className={`w-2 h-2 rounded-full ${token.status === "serving" ? "bg-emerald-400" : "bg-slate-300"}`} />
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-400">
                            No tokens called yet
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
