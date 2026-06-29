"use client";

import React from "react";
import { ListOrdered } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WaitingToken } from "@/types/api";

interface UpcomingQueueCardProps {
    waitingTokens: WaitingToken[];
    prefix: string;
}

export function UpcomingQueueCard({ waitingTokens, prefix }: UpcomingQueueCardProps) {
    // Show all waiting tokens (remove .slice constraint)
    const upcoming = waitingTokens;

    return (
        <div className="bg-white rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-200/60 p-6 flex flex-col lg:flex-1 h-[350px] lg:h-auto lg:min-h-[160px] overflow-hidden">
            <div className="flex items-center gap-3 mb-5 px-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center">
                    <ListOrdered className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold tracking-[0.1em] text-slate-600 uppercase">
                    Upcoming
                </h3>
            </div>

            <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                    {upcoming.length > 0 ? (
                        upcoming.map((token, i) => (
                            <motion.div
                                key={`upcoming-${token.token_number}`}
                                initial={{ opacity: 0, x: 10, height: 0 }}
                                animate={{ opacity: 1, x: 0, height: "auto" }}
                                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.02 }}
                                className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-bold text-slate-400 w-4">
                                        #{i + 1}
                                    </span>
                                    <span className="text-lg font-bold text-slate-700 tabular-nums">
                                        {prefix}{token.token_number}
                                    </span>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-sm font-medium text-slate-400">
                            Queue is empty
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
