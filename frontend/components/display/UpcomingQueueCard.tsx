"use client";

import React from "react";
import { CalendarClock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WaitingToken } from "@/types/api";

interface UpcomingQueueCardProps {
    waitingTokens: WaitingToken[];
    prefix: string;
}

export function UpcomingQueueCard({ waitingTokens, prefix }: UpcomingQueueCardProps) {
    const upcoming = waitingTokens.slice(0, 6);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 flex flex-col lg:flex-1 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                    <CalendarClock className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <h3 className="text-xs font-bold tracking-[0.15em] text-slate-500 uppercase">
                    Upcoming
                </h3>
            </div>

            {/* List */}
            <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
                <AnimatePresence initial={false}>
                    {upcoming.length > 0 ? (
                        upcoming.map((token, i) => {
                            const joinTime = token.created_at
                                ? new Date(token.created_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                  })
                                : "--:--";

                            return (
                                <motion.div
                                    key={`upcoming-${token.token_number}`}
                                    initial={{ opacity: 0, x: 10, height: 0 }}
                                    animate={{ opacity: 1, x: 0, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.25, delay: i * 0.02 }}
                                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                                >
                                    {/* Token number */}
                                    <span className="text-xl font-bold text-blue-600 tabular-nums">
                                        {prefix}{token.token_number}
                                    </span>

                                    {/* Counter label (if multi-line) */}
                                    {token.assigned_line ? (
                                        <span className="text-[11px] font-semibold text-slate-500 flex-1 text-center">
                                            Counter {String(token.assigned_line).padStart(2, "0")}
                                        </span>
                                    ) : (
                                        <span className="flex-1" />
                                    )}

                                    {/* Join time */}
                                    <span className="text-xs font-semibold text-slate-400 tabular-nums">
                                        {joinTime}
                                    </span>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="flex-1 flex items-center justify-center py-6 text-sm font-medium text-slate-300">
                            Queue is empty
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
