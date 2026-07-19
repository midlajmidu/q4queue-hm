"use client";

import React, { useState, useEffect } from "react";
import { CalendarClock } from "lucide-react";
import type { WaitingToken } from "@/types/api";
import { motion, AnimatePresence } from "framer-motion";
import type { DisplayTheme } from "./displayTheme";
import { cardBg, cardBorder, cardShadow, iconBg, iconColor, labelText, secondaryText, mutedText, dividerBorder, dotActive, dotInactive } from "./displayTheme";

interface UpcomingQueueCardProps {
    waitingTokens: WaitingToken[];
    prefix: string;
    theme?: DisplayTheme;
}

export function UpcomingQueueCard({ waitingTokens, prefix, theme = "light" }: UpcomingQueueCardProps) {
    // Limit to 10 people total
    const displayTokens = waitingTokens.slice(0, 10);
    const ITEMS_PER_PAGE = 5;
    const totalPages = Math.ceil(displayTokens.length / ITEMS_PER_PAGE);
    const [page, setPage] = useState(0);

    useEffect(() => {
        if (totalPages <= 1) {
            setPage(0);
            return;
        }
        const interval = setInterval(() => {
            setPage((p) => (p + 1) % totalPages);
        }, 8000);
        return () => clearInterval(interval);
    }, [totalPages, displayTokens.length]);

    const visibleTokens = displayTokens.slice(
        page * ITEMS_PER_PAGE,
        (page + 1) * ITEMS_PER_PAGE
    );

    return (
        <div className={`${cardBg(theme)} border ${cardBorder(theme)} ${cardShadow(theme)} rounded-2xl px-6 py-6 flex flex-col lg:flex-1 overflow-hidden relative`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg border ${iconBg(theme)} flex items-center justify-center`}>
                        <CalendarClock className={`w-4 h-4 ${iconColor(theme)}`} />
                    </div>
                    <h3 className={`text-lg lg:text-xl font-bold tracking-[0.15em] ${labelText(theme)} uppercase`}>
                        Upcoming
                    </h3>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                                    i === page ? dotActive(theme) : dotInactive(theme)
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="flex-1 flex flex-col min-h-0 relative">
                {displayTokens.length > 0 ? (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`page-${page}-${displayTokens[0]?.token_number}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4 }}
                            className="flex flex-col w-full"
                        >
                            {visibleTokens.map((token, i) => {
                                const globalIndex = page * ITEMS_PER_PAGE + i;
                                const joinTime = token.created_at
                                    ? new Date(token.created_at).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                      })
                                    : "--:--";

                                return (
                                    <div
                                        key={`upcoming-${token.token_number}`}
                                        className={`flex items-center justify-between px-6 py-6 border-b ${dividerBorder(theme)} last:border-b-0`}
                                    >
                                        <div className="flex items-center gap-6">
                                            <span className={`text-sm font-bold tracking-widest ${mutedText(theme)} tabular-nums min-w-[20px]`}>
                                                {globalIndex + 1}
                                            </span>
                                            <div className="flex items-center gap-4">
                                                <span className={`text-3xl font-black ${secondaryText(theme)} tabular-nums`}>
                                                    {prefix}{token.token_number}
                                                </span>
                                                {globalIndex === 0 && (
                                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
                                                        You are Next
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {token.assigned_line && (
                                                <span className={`text-xs font-medium ${mutedText(theme)}`}>
                                                    Counter {String(token.assigned_line).padStart(2, "0")}
                                                </span>
                                            )}
                                            <span className={`text-sm font-bold tracking-wider ${mutedText(theme)} tabular-nums`}>
                                                {joinTime}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                        <CalendarClock className={`w-12 h-12 ${mutedText(theme)} mb-4 opacity-50`} />
                        <span className={`text-base lg:text-lg font-bold tracking-[0.15em] uppercase ${mutedText(theme)}`}>
                            No upcoming
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
