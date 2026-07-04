"use client";

import React, { useState, useEffect } from "react";
import { History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { RecentToken } from "@/types/api";
import type { DisplayTheme } from "./displayTheme";
import { cardBg, cardBorder, cardShadow, iconBg, iconColor, labelText, primaryText, secondaryText, mutedText, dividerBorder, dotActive, dotInactive, badgeBg, badgeText } from "./displayTheme";

interface RecentCallsCardProps {
    recentTokens: RecentToken[];
    prefix: string;
    theme?: DisplayTheme;
}

export function RecentCallsCard({ recentTokens, prefix, theme = "light" }: RecentCallsCardProps) {
    const recentlyCalled = recentTokens
        .filter((t) => t.status === "serving" || t.status === "done");

    const ITEMS_PER_PAGE = 4;
    const totalPages = Math.ceil(recentlyCalled.length / ITEMS_PER_PAGE);
    const [page, setPage] = useState(0);

    useEffect(() => {
        if (totalPages <= 1) {
            setPage(0);
            return;
        }
        const interval = setInterval(() => {
            setPage(p => (p + 1) % totalPages);
        }, 8000);
        return () => clearInterval(interval);
    }, [totalPages, recentlyCalled.length]);

    const visibleTokens = recentlyCalled.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

    return (
        <div className={`${cardBg(theme)} border ${cardBorder(theme)} ${cardShadow(theme)} rounded-2xl px-5 py-4 flex flex-col lg:flex-1 overflow-hidden relative`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg border ${iconBg(theme)} flex items-center justify-center`}>
                        <History className={`w-3.5 h-3.5 ${iconColor(theme)}`} />
                    </div>
                    <h3 className={`text-[11px] font-semibold tracking-[0.15em] ${labelText(theme)} uppercase`}>
                        Recently Called
                    </h3>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${i === page ? dotActive(theme) : dotInactive(theme)}`} />
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col min-h-0 relative">
                {recentlyCalled.length > 0 ? (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`page-${page}-${recentlyCalled[0]?.token_number}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4 }}
                            className="flex flex-col gap-1 w-full"
                        >
                            {visibleTokens.map((token, i) => {
                                const timeStr = token.served_at 
                                    ? new Date(token.served_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : "--:--";
                                
                                const isNewest = page === 0 && i === 0;

                                return (
                                    <div
                                        key={`recent-${token.token_number}-${token.status}`}
                                        className={`flex items-center justify-between px-4 py-3.5 border-b ${dividerBorder(theme)} last:border-0`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`text-2xl font-black tabular-nums ${isNewest ? primaryText(theme) : secondaryText(theme)}`}>
                                                {prefix}{token.token_number}
                                            </span>
                                            {token.assigned_line && (
                                                <span className={`text-[10px] font-semibold uppercase tracking-wider ${badgeText(theme)} border ${badgeBg(theme)} px-2.5 py-1 rounded-md`}>
                                                    C{token.assigned_line}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[11px] font-bold tracking-wider ${mutedText(theme)} tabular-nums`}>
                                                {timeStr}
                                            </span>
                                            {isNewest && (
                                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                        <History className={`w-6 h-6 ${mutedText(theme)} mb-3`} />
                        <span className={`text-xs font-medium tracking-[0.15em] uppercase ${mutedText(theme)}`}>No calls yet</span>
                    </div>
                )}
            </div>
        </div>
    );
}
