"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, Clock, Users, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { ServingToken, TableConfig } from "@/types/api";
import type { DisplayTheme } from "./displayTheme";
import { cardBg, cardBorder, cardShadow, iconBg, iconColor, primaryText, mutedText } from "./displayTheme";

interface NowServingDineTableProps {
    prefix: string;
    queueName?: string;
    isActive?: boolean;
    theme?: DisplayTheme;
    tableConfig?: TableConfig[];
    allServingTokens?: ServingToken[];
    serving?: number;
    assignedLine?: number | null;
    customerName?: string;
    recentTokens?: any[];
    isMobile?: boolean;
}

function formatCallTime(isoString?: string | null): { timeStr: string; elapsedStr: string } {
    if (!isoString) return { timeStr: "--:--", elapsedStr: "" };
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return { timeStr: "--:--", elapsedStr: "" };
        const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });

        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        let elapsedStr = "Just now";
        if (diffMins >= 1 && diffMins < 60) {
            elapsedStr = `${diffMins}m ago`;
        } else if (diffMins >= 60) {
            const hours = Math.floor(diffMins / 60);
            elapsedStr = `${hours}h ago`;
        }
        return { timeStr, elapsedStr };
    } catch {
        return { timeStr: "--:--", elapsedStr: "" };
    }
}

export function NowServingDineTable({
    prefix,
    queueName,
    isActive = true,
    theme = "light",
    tableConfig = [],
    allServingTokens = [],
    serving = 0,
    assignedLine,
    customerName,
    recentTokens = [],
    isMobile = false,
}: NowServingDineTableProps) {
    // Re-calculate relative elapsed times every 10 seconds
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 10000);
        return () => clearInterval(id);
    }, []);

    const isDark = theme === "dark";

    // Build the sorted list of called tokens (newest called first)
    const dineTokens = useMemo(() => {
        const active = (allServingTokens && allServingTokens.length > 0)
            ? allServingTokens.filter(t => t && t.token_number)
            : (serving !== 0 && assignedLine !== undefined)
            ? [{
                id: "single",
                token_number: serving,
                assigned_line: assignedLine,
                served_at: new Date().toISOString(),
                customer_name: customerName,
              } as ServingToken]
            : [];

        if (active.length > 0) {
            return [...active].sort((a, b) => {
                const timeA = a.served_at ? new Date(a.served_at).getTime() : 0;
                const timeB = b.served_at ? new Date(b.served_at).getTime() : 0;
                if (timeB !== timeA) return timeB - timeA;
                return (b.token_number || 0) - (a.token_number || 0);
            });
        }

        // Fallback: Check recent tokens that were assigned to a table
        if (recentTokens && recentTokens.length > 0) {
            const validRecent = recentTokens
                .filter((t: any) => t.assigned_line && (t.status === "serving" || t.status === "done"))
                .map((t: any) => ({
                    id: `recent-${t.token_number}`,
                    token_number: t.token_number,
                    assigned_line: t.assigned_line,
                    served_at: t.served_at || t.completed_at || t.created_at,
                    customer_name: t.customer_name,
                    pax_count: t.pax_count,
                    status: t.status,
                } as any));

            return validRecent.sort((a: any, b: any) => {
                const timeA = a.served_at ? new Date(a.served_at).getTime() : 0;
                const timeB = b.served_at ? new Date(b.served_at).getTime() : 0;
                if (timeB !== timeA) return timeB - timeA;
                return (b.token_number || 0) - (a.token_number || 0);
            });
        }

        return [];
    }, [allServingTokens, serving, assignedLine, customerName, recentTokens]);

    const lastCalledToken = dineTokens.length > 0 ? dineTokens[0] : null;

    const getTableDisplayName = (line: number | string | null | undefined, sharedLines?: number[]) => {
        if (!line) return "—";
        const formatName = (tbl?: TableConfig, idFallback?: any) => {
            if (tbl && tbl.name != null) {
                const str = String(tbl.name).trim();
                return /^\d+$/.test(str) ? `Table ${str}` : str;
            }
            return `Table ${idFallback}`;
        };
        const mainTable = Array.isArray(tableConfig) ? tableConfig.find(t => String(t.id) === String(line)) : undefined;
        const mainName = formatName(mainTable, line);

        if (sharedLines && sharedLines.length > 0) {
            const extraNames = sharedLines.map(id => {
                const extra = Array.isArray(tableConfig) ? tableConfig.find(t => String(t.id) === String(id)) : undefined;
                return formatName(extra, id);
            }).join(" + ");
            return `${mainName} + ${extraNames}`;
        }
        return mainName;
    };

    const getTableCapacityBadge = (line: number | null | undefined, sharedLines?: number[]) => {
        if (!line) return null;
        const mainTable = Array.isArray(tableConfig) ? tableConfig.find(t => String(t.id) === String(line)) : undefined;

        if (sharedLines && sharedLines.length > 0) {
            let totalCap = mainTable?.capacity || 0;
            for (const id of sharedLines) {
                const extra = Array.isArray(tableConfig) ? tableConfig.find(t => String(t.id) === String(id)) : undefined;
                if (extra?.capacity) totalCap += extra.capacity;
            }
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                    {totalCap > 0 ? `${totalCap} Seats (Merged)` : "Merged"}
                </span>
            );
        }

        if (mainTable?.capacity) {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-white/10 whitespace-nowrap">
                    {mainTable.capacity} Seats
                </span>
            );
        }
        return null;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // MOBILE VIEW
    // ─────────────────────────────────────────────────────────────────────────
    if (isMobile) {
        return (
            <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-white/[0.04] border-white/[0.06]" : "bg-white border-slate-200 shadow-sm"}`}>
                {/* Header */}
                <div className={`flex items-center justify-between gap-2.5 px-4 pt-3.5 pb-2.5 border-b ${isDark ? "border-white/[0.04]" : "border-slate-100"}`}>
                    <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${isDark ? "bg-white/[0.06] border-white/[0.06]" : "bg-slate-50 border-slate-200"}`}>
                            <Utensils className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <h2 className="text-xs font-semibold tracking-[0.15em] text-slate-500 uppercase">
                            Now Serving
                        </h2>
                    </div>
                    {dineTokens.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {dineTokens.length} Seated
                        </span>
                    )}
                </div>

                {/* Content */}
                {dineTokens.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                        No tables currently called
                    </div>
                ) : (
                    <div className="p-3 space-y-2.5">
                        {/* Spotlight: Last Called */}
                        {lastCalledToken && (
                            <div className="p-3 rounded-lg border bg-emerald-500/[0.08] border-emerald-500/30 dark:bg-emerald-500/[0.12] dark:border-emerald-500/40">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Last Called
                                    </span>
                                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                        {formatCallTime(lastCalledToken.served_at).timeStr}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                                        {prefix}{lastCalledToken.token_number}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                            {getTableDisplayName(lastCalledToken.assigned_line, lastCalledToken.shared_lines)}
                                        </span>
                                        {getTableCapacityBadge(lastCalledToken.assigned_line, lastCalledToken.shared_lines)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* List format */}
                        <div className={`divide-y rounded-lg border overflow-hidden ${isDark ? "divide-white/[0.04] border-white/[0.06] bg-white/[0.02]" : "divide-slate-100 border-slate-200 bg-slate-50/50"}`}>
                            {dineTokens.slice(1).map((token: any, idx: number) => {
                                const { timeStr, elapsedStr } = formatCallTime(token.served_at);
                                return (
                                    <div key={token.id || idx} className="p-2.5 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm tabular-nums">
                                                {prefix}{token.token_number}
                                            </span>
                                            <span className="font-medium text-slate-600 dark:text-slate-300">
                                                {getTableDisplayName(token.assigned_line, token.shared_lines)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                            <span>{timeStr}</span>
                                            {elapsedStr && <span>• {elapsedStr}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DESKTOP TV DISPLAY VIEW (Rich Table Format)
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className={`flex-1 ${cardBg(theme)} border ${cardBorder(theme)} ${cardShadow(theme)} rounded-2xl p-5 lg:p-6 flex flex-col overflow-hidden`}>
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-4 pb-3.5 border-b border-slate-200/80 dark:border-white/[0.06] shrink-0">
                <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl border ${iconBg(theme)} flex items-center justify-center shrink-0`}>
                        <Utensils className={`w-5 h-5 ${iconColor(theme)}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] lg:text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-400 uppercase">
                                Now Serving • Table Calls
                            </span>
                            {!isActive && (
                                <span className="text-[9px] font-semibold tracking-widest uppercase text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                    Closed
                                </span>
                            )}
                        </div>
                        <h1 className={`text-xl lg:text-2xl font-black ${primaryText(theme)} tracking-tight leading-none capitalize`}>
                            {queueName || "Dining Floor"}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-slate-100/60 dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                            {dineTokens.length} {dineTokens.length === 1 ? "Table Active" : "Tables Active"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {dineTokens.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-2xl border-slate-200 dark:border-white/10 my-auto">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400">
                        <Utensils className="w-8 h-8" />
                    </div>
                    <h3 className={`text-xl font-black ${primaryText(theme)} mb-1`}>Dining Floor Ready</h3>
                    <p className={`text-sm ${mutedText(theme)} max-w-md`}>
                        No tables are currently called. Waiting guests will appear on this board as soon as their table is assigned.
                    </p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0 gap-3">
                    {/* Spotlight Hero Card: WHO WAS CALLED LAST */}
                    {lastCalledToken && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="shrink-0 rounded-2xl border p-4 bg-gradient-to-r from-emerald-500/[0.12] via-emerald-500/[0.05] to-transparent border-emerald-500/30 dark:border-emerald-500/40 relative overflow-hidden shadow-sm"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Left: Last Called Badge + Token No */}
                                <div className="flex items-center gap-4 lg:gap-6">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                            <span className="text-[10px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                                                LAST CALLED • PLEASE PROCEED
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums drop-shadow-sm">
                                                {prefix}{lastCalledToken.token_number}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="hidden md:block h-12 w-px bg-slate-200 dark:bg-white/10" />

                                    {/* Center: Table Assigned */}
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                                            Assigned Table
                                        </span>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xl lg:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                                {getTableDisplayName(lastCalledToken.assigned_line, lastCalledToken.shared_lines)}
                                            </span>
                                            {getTableCapacityBadge(lastCalledToken.assigned_line, lastCalledToken.shared_lines)}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Time Called & Party Size */}
                                <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-2 md:pt-0 border-slate-200/60 dark:border-white/10 shrink-0">
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 text-sm font-bold">
                                        <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="tabular-nums">{formatCallTime(lastCalledToken.served_at).timeStr}</span>
                                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                            {formatCallTime(lastCalledToken.served_at).elapsedStr}
                                        </span>
                                    </div>
                                    {lastCalledToken.pax_count && lastCalledToken.pax_count > 0 && (
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                            <Users className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{lastCalledToken.pax_count} {lastCalledToken.pax_count === 1 ? "Guest" : "Guests"}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Main Tabular View */}
                    <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.02] overflow-hidden shadow-sm">
                        {/* Table Column Headers */}
                        <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-slate-100/80 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/[0.08] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0 select-none">
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-3">Token No</div>
                            <div className="col-span-4">Table Assigned</div>
                            <div className="col-span-2">Time Called</div>
                            <div className="col-span-2 text-right">Party Size</div>
                        </div>

                        {/* Table Rows */}
                        <div className="flex-1 overflow-y-auto hide-scrollbar divide-y divide-slate-100 dark:divide-white/[0.04]">
                            <AnimatePresence>
                                {dineTokens.map((token: any, index: number) => {
                                    const isFirst = index === 0;
                                    const { timeStr, elapsedStr } = formatCallTime(token.served_at);
                                    const tableName = getTableDisplayName(token.assigned_line, token.shared_lines);
                                    const capBadge = getTableCapacityBadge(token.assigned_line, token.shared_lines);
                                    const pax = token.pax_count || 1;

                                    return (
                                        <motion.div
                                            key={token.id || `${token.token_number}-${index}`}
                                            layout
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className={`grid grid-cols-12 gap-3 px-5 py-3.5 items-center transition-colors ${
                                                isFirst
                                                    ? "bg-emerald-500/[0.05] dark:bg-emerald-500/[0.08]"
                                                    : "hover:bg-slate-50/80 dark:hover:bg-white/[0.02]"
                                            }`}
                                        >
                                            {/* Column 1: Order / Rank */}
                                            <div className="col-span-1 text-center">
                                                {isFirst ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-[11px] font-black shadow-sm">
                                                        1
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-semibold text-slate-400">
                                                        {index + 1}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Column 2: Token Number */}
                                            <div className="col-span-3 flex items-center gap-2.5">
                                                <span className={`text-2xl lg:text-3xl font-black tabular-nums tracking-tight ${primaryText(theme)} ${isFirst ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                                                    {prefix}{token.token_number}
                                                </span>
                                                {isFirst && (
                                                    <span className="hidden xl:inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                                        Latest
                                                    </span>
                                                )}
                                            </div>

                                            {/* Column 3: Table Assigned */}
                                            <div className="col-span-4 flex items-center gap-2 flex-wrap">
                                                <span className="text-base lg:text-lg font-bold text-slate-800 dark:text-slate-100">
                                                    {tableName}
                                                </span>
                                                {capBadge}
                                            </div>

                                            {/* Column 4: Time Called */}
                                            <div className="col-span-2 flex flex-col leading-tight">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                                                    {timeStr}
                                                </span>
                                                {elapsedStr && (
                                                    <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                                                        {elapsedStr}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Column 5: Party Size */}
                                            <div className="col-span-2 text-right">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300">
                                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{pax} {pax === 1 ? "Guest" : "Guests"}</span>
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
