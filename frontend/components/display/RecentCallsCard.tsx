"use client";

import React from "react";
import { Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { RecentToken } from "@/types/api";

interface RecentCallsCardProps {
    recentTokens: RecentToken[];
    prefix: string;
}

export function RecentCallsCard({ recentTokens, prefix }: RecentCallsCardProps) {
    const recentlyCalled = recentTokens
        .filter((t) => t.status === "serving" || t.status === "done")
        .slice(0, 5);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 flex flex-col lg:flex-1 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <h3 className="text-xs font-bold tracking-[0.15em] text-slate-500 uppercase">
                    Recently Called
                </h3>
            </div>

            {/* List */}
            <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
                <AnimatePresence initial={false}>
                    {recentlyCalled.length > 0 ? (
                        recentlyCalled.map((token, i) => {
                            const isNewest = i === 0;
                            const timeStr = token.served_at
                                ? new Date(token.served_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                  })
                                : "--:--";

                            return (
                                <motion.div
                                    key={`recent-${token.token_number}-${token.status}`}
                                    initial={{ opacity: 0, x: -10, height: 0 }}
                                    animate={{ opacity: 1, x: 0, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                                >
                                    {/* Token number */}
                                    <span
                                        className={`text-xl font-bold tabular-nums ${
                                            isNewest ? "text-blue-600" : "text-slate-700"
                                        }`}
                                    >
                                        {prefix}{token.token_number}
                                    </span>

                                    {/* Counter label */}
                                    {token.assigned_line ? (
                                        <span className="text-[11px] font-semibold text-slate-500 flex-1 text-center">
                                            Counter {String(token.assigned_line).padStart(2, "0")}
                                        </span>
                                    ) : (
                                        <span className="flex-1" />
                                    )}

                                    {/* Time */}
                                    <span
                                        className={`text-xs font-semibold tabular-nums ${
                                            isNewest ? "text-blue-400" : "text-slate-400"
                                        }`}
                                    >
                                        {timeStr}
                                    </span>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="flex-1 flex items-center justify-center py-6 text-sm font-medium text-slate-300">
                            No tokens called yet
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
