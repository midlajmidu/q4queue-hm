"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Sparkles } from "lucide-react";
import { ServingToken, TableConfig } from "@/types/api";
import type { DisplayTheme } from "./displayTheme";
import { cardBg, cardBorder, cardShadow, iconBg, iconColor, labelText, primaryText, secondaryText, mutedText, gradientText, counterPillBg, counterPillStrong } from "./displayTheme";

interface NowServingHeroProps {
    serving: number;
    prefix: string;
    assignedLine?: number | null;
    serviceLines: number;
    customerName?: string;
    allServingTokens?: ServingToken[];
    queueName?: string;
    isActive?: boolean;
    theme?: DisplayTheme;
    tableConfig?: TableConfig[];
    queueType?: string;
    maxCapacity?: number;
    zoneDurationMins?: number | null;
}

export function NowServingHero({
    serving,
    prefix,
    assignedLine,
    serviceLines,
    customerName,
    allServingTokens,
    queueName,
    isActive,
    theme = "light",
    tableConfig,
    queueType,
    maxCapacity,
    zoneDurationMins,
}: NowServingHeroProps) {
    const [prevServing, setPrevServing] = useState(serving);
    const [recentlyCalled, setRecentlyCalled] = useState<Set<number>>(new Set());
    
    const isFirstLoadSingleRef = React.useRef(true);
    const isFirstLoadMultiRef = React.useRef(true);
    const prevServingTokensRef = React.useRef<number[]>([]);

    useEffect(() => {
        if (serving !== 0) {
            if (isFirstLoadSingleRef.current) {
                isFirstLoadSingleRef.current = false;
                setPrevServing(serving);
                return;
            }
            if (serving !== prevServing) {
                setPrevServing(serving);
                setRecentlyCalled(new Set([serving]));
            }
        }
    }, [serving, prevServing]);

    const activeTokens =
        allServingTokens && allServingTokens.length > 0
            ? allServingTokens
            : serving !== 0
            ? [{ id: "single", token_number: serving, customer_name: customerName, assigned_line: assignedLine } as any]
            : [];

    useEffect(() => {
        if (allServingTokens && allServingTokens.length > 0) {
            const currentTokenNumbers = allServingTokens.map(t => t.token_number);
            
            if (isFirstLoadMultiRef.current) {
                isFirstLoadMultiRef.current = false;
                prevServingTokensRef.current = currentTokenNumbers;
                return;
            }
            
            const newTokens = currentTokenNumbers.filter(t => !prevServingTokensRef.current.includes(t));
            
            if (newTokens.length > 0) {
                setRecentlyCalled(new Set(newTokens));
            }
            prevServingTokensRef.current = currentTokenNumbers;
        }
    }, [allServingTokens]);

    const isZoneMode = queueType === "zone" || ((maxCapacity ?? 0) > 0 && serviceLines === 0);
    const isMultiCounterMode = !isZoneMode && serviceLines > 1;

    // ─── Zone / Arena Occupancy Display ──────────────────────────────
    if (isZoneMode) {
        const capacity = maxCapacity || 15;
        const currentPax = activeTokens.reduce((sum: number, t: any) => sum + (Number(t.pax_count) || 1), 0);
        const spotsLeft = Math.max(0, capacity - currentPax);
        const occupancyPercent = Math.min(100, Math.round((currentPax / capacity) * 100));

        return (
            <div className={`flex-1 ${cardBg(theme)} border ${cardBorder(theme)} ${cardShadow(theme)} rounded-2xl p-4 lg:p-6 flex flex-col overflow-hidden`}>
                {/* Header with Occupancy Gauge */}
                <div className="flex flex-col items-center gap-2 mb-4 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <Users className="w-3.5 h-3.5" />
                        <span>Zone Occupancy</span>
                    </div>

                    {queueName && (
                        <h1 className={`text-2xl lg:text-3xl font-black ${primaryText(theme)} text-center tracking-tight capitalize leading-none`}>
                            {queueName}
                            {isActive === false && (
                                <span className="ml-3 text-[10px] font-semibold tracking-widest uppercase text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                                    Closed
                                </span>
                            )}
                        </h1>
                    )}

                    {/* Live Occupancy Gauge & Progress Bar */}
                    <div className="w-full max-w-md mt-1 flex flex-col items-center">
                        <div className="flex items-center justify-between w-full text-xs font-bold mb-1.5 px-1">
                            <span className={primaryText(theme)}>
                                {currentPax} / {capacity} Players Inside
                            </span>
                            <span className={spotsLeft === 0 ? "text-rose-500 font-extrabold uppercase tracking-wide" : "text-emerald-500 font-semibold"}>
                                {spotsLeft === 0 ? "Zone Full" : `${spotsLeft} Spots Free`}
                            </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden border border-slate-200/50 dark:border-white/10">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${occupancyPercent}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className={`h-full rounded-full ${
                                    occupancyPercent >= 100
                                        ? "bg-rose-500"
                                        : occupancyPercent >= 80
                                        ? "bg-amber-500"
                                        : "bg-indigo-600 dark:bg-indigo-500"
                                }`}
                            />
                        </div>
                    </div>
                </div>

                {/* Grid of Players Inside */}
                {activeTokens.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-xl border-slate-200 dark:border-white/10 my-2">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center mb-3 text-indigo-600 dark:text-indigo-400">
                            <Users className="w-8 h-8" />
                        </div>
                        <h3 className={`text-xl font-black ${primaryText(theme)} mb-1`}>Zone Open & Ready</h3>
                        <p className={`text-sm ${mutedText(theme)} max-w-sm`}>
                            No customers are currently inside. Admitting waiting guests shortly!
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto hide-scrollbar">
                        <div className={`grid ${
                            activeTokens.length > 12
                                ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
                                : activeTokens.length > 6
                                ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                                : "grid-cols-2 sm:grid-cols-3"
                        } gap-3 p-1 auto-rows-fr`}>
                            <AnimatePresence>
                                {activeTokens.map((token: any) => {
                                    const isRecent = recentlyCalled.has(token.token_number);
                                    return (
                                        <motion.div
                                            key={token.id || token.token_number}
                                            layout
                                            initial={{ opacity: 0, scale: 0.85 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.85 }}
                                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                            className={`flex flex-col items-center justify-center p-3.5 rounded-xl border relative ${
                                                isRecent
                                                    ? "bg-emerald-500/10 border-emerald-500/40 shadow-sm"
                                                    : theme === "dark"
                                                    ? "bg-white/[0.06] border-white/[0.1]"
                                                    : "bg-white border-slate-200 shadow-sm"
                                            }`}
                                        >
                                            {isRecent && (
                                                <div className="absolute -top-2.5 px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-md animate-bounce">
                                                    Just Entered
                                                </div>
                                            )}
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                Inside
                                            </span>
                                            <span className={`text-2xl sm:text-3xl font-black tracking-tight leading-none tabular-nums ${primaryText(theme)} ${isRecent ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                                                {prefix}{token.token_number}
                                            </span>
                                            {token.customer_name && (
                                                <span className={`text-xs font-semibold truncate max-w-full mt-1.5 ${mutedText(theme)}`}>
                                                    {token.customer_name}
                                                </span>
                                            )}
                                            {token.pax_count && token.pax_count > 1 && (
                                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                                    <Users className="w-3 h-3 text-slate-400" />
                                                    {token.pax_count} Players
                                                </span>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─── Multi-counter grid ──────────────────────────────────────────
    if (isMultiCounterMode) {
        const counters = Array.from({ length: serviceLines }, (_, i) => i + 1);

        const tokenSize =
            serviceLines > 16
                ? "text-lg sm:text-xl lg:text-2xl"
                : serviceLines > 8
                ? "text-xl sm:text-2xl lg:text-3xl"
                : serviceLines > 4
                ? "text-2xl sm:text-3xl lg:text-3xl xl:text-4xl"
                : "text-3xl sm:text-4xl lg:text-5xl";

        const cols =
            serviceLines > 16
                ? "grid-cols-4 lg:grid-cols-6"
                : serviceLines > 8
                ? "grid-cols-3 lg:grid-cols-4"
                : serviceLines > 4
                ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                : "grid-cols-2";

        const cardPadding =
            serviceLines > 12 ? "p-2 lg:p-3" : serviceLines > 6 ? "p-3 lg:p-4" : "p-4 lg:p-6";

        return (
            <div className={`flex-1 ${cardBg(theme)} border ${cardBorder(theme)} ${cardShadow(theme)} rounded-2xl p-4 lg:p-6 flex flex-col overflow-hidden`}>
                {/* Header */}
                <div className="flex flex-col items-center gap-1 mb-4 shrink-0">
                    <div className={`w-10 h-10 rounded-xl border ${iconBg(theme)} flex items-center justify-center mb-1`}>
                        <Users className={`w-5 h-5 ${iconColor(theme)}`} />
                    </div>
                    <p className={`text-base font-bold tracking-[0.15em] ${mutedText(theme)} uppercase leading-none`}>
                        Now Serving
                    </p>
                    {queueName && (
                        <h1 className={`text-lg font-bold ${primaryText(theme)} text-center tracking-tight capitalize mt-1 leading-none`}>
                            {queueName}
                            {isActive === false && (
                                <span className="ml-3 text-[10px] font-semibold tracking-widest uppercase text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                                    Closed
                                </span>
                            )}
                        </h1>
                    )}
                </div>

                {/* Counter grid */}
                <div className={`grid ${cols} gap-2 lg:gap-3 flex-1 overflow-hidden auto-rows-fr`}>
                    {counters.map((counterNum) => {
                        const activeToken = activeTokens.find(
                            (t: any) =>
                                (t.assigned_line === counterNum || t.shared_lines?.includes(counterNum)) &&
                                !t.completed_lines?.includes(counterNum)
                        );
                        const hasToken = !!activeToken;
                        const isRecentlyCalled = hasToken && recentlyCalled.has(activeToken.token_number);
                        const isShared = hasToken && (
                            (activeToken.shared_lines && activeToken.shared_lines.length > 0) ||
                            (activeToken.assigned_line !== counterNum)
                        );

                        return (
                            <motion.div
                                key={`counter-${counterNum}`}
                                layout
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.25 }}
                                className={`flex flex-col items-center justify-center ${cardPadding} rounded-xl border transition-all duration-300 min-w-0 relative h-full ${
                                    hasToken
                                        ? theme === "dark" ? "bg-white/[0.08] border-white/[0.12]" : "bg-white border-slate-200 shadow-md"
                                        : theme === "dark" ? "bg-white/[0.02] border-white/[0.04] opacity-40" : "bg-slate-50/50 border-slate-100 opacity-40"
                                }`}
                            >
                                {isRecentlyCalled ? (
                                    <div className="absolute -top-3 px-2 py-0.5 bg-green-500 text-white text-[9px] font-bold uppercase rounded-full shadow-lg animate-bounce">
                                        Newly Called
                                    </div>
                                ) : isShared ? (
                                    <div className="absolute -top-2.5 px-2 py-0.5 bg-indigo-500/90 text-white text-[8px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                                        Shared
                                    </div>
                                ) : null}
                                <span
                                    className={`text-[10px] lg:text-[11px] font-semibold tracking-[0.15em] uppercase mb-3 whitespace-nowrap ${
                                        hasToken ? secondaryText(theme) : mutedText(theme)
                                    }`}
                                >
                                    {tableConfig && tableConfig.length > 0 ? (
                                        (() => {
                                            const tbl = tableConfig.find(t => t.id === counterNum);
                                            return tbl ? `${tbl.name}${tbl.capacity ? ` (${tbl.capacity}p)` : ""}` : `Table ${String(counterNum).padStart(2, "0")}`;
                                        })()
                                    ) : (
                                        `Counter ${String(counterNum).padStart(2, "0")}`
                                    )}
                                </span>

                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={hasToken ? `${prefix}${activeToken.token_number}` : `empty-${counterNum}`}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.2 }}
                                        className={`font-extrabold tracking-tight leading-none tabular-nums w-full text-center px-2 whitespace-nowrap max-w-full truncate ${tokenSize} ${
                                            hasToken ? primaryText(theme) : theme === "dark" ? "text-slate-700" : "text-slate-300"
                                        } ${isRecentlyCalled ? "text-green-600 drop-shadow-md" : ""}`}
                                    >
                                        {hasToken ? `${prefix}${activeToken.token_number}` : "—"}
                                    </motion.span>
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ─── Dynamic multi-token (no fixed line count) ────────────────────
    if (activeTokens.length > 1) {
        const tokenSize =
            activeTokens.length > 15
                ? "text-xl md:text-2xl"
                : activeTokens.length > 8
                ? "text-2xl md:text-3xl lg:text-4xl"
                : "text-3xl md:text-4xl lg:text-5xl";

        return (
            <div className={`flex-1 ${cardBg(theme)} border ${cardBorder(theme)} ${cardShadow(theme)} rounded-2xl p-5 lg:p-6 flex flex-col overflow-hidden`}>
                <div className="flex flex-col items-center gap-1 mb-6 shrink-0">
                    <div className={`w-10 h-10 rounded-xl border ${iconBg(theme)} flex items-center justify-center mb-1`}>
                        <Users className={`w-5 h-5 ${iconColor(theme)}`} />
                    </div>
                    <p className={`text-base font-bold tracking-[0.15em] ${mutedText(theme)} uppercase`}>Now Serving</p>
                </div>
                <div className="flex flex-wrap justify-center items-stretch gap-4 flex-1 overflow-y-auto hide-scrollbar content-start">
                    <AnimatePresence>
                        {activeTokens.map((token) => (
                            <motion.div
                                key={token.id || token.token_number}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className={`flex flex-col items-center justify-center px-6 py-5 rounded-2xl border relative ${
                                    theme === "dark" ? "bg-white/[0.08] border-white/[0.12]" : "bg-white border-slate-200 shadow-sm"
                                } min-w-[140px] max-w-full`}
                            >
                                {recentlyCalled.has(token.token_number) && (
                                    <div className="absolute -top-3 px-2 py-0.5 bg-green-500 text-white text-[9px] font-bold uppercase rounded-full shadow-lg animate-bounce">
                                        Newly Called
                                    </div>
                                )}
                                <span className={`font-black tracking-tight leading-none tabular-nums w-full text-center px-2 whitespace-nowrap ${tokenSize} ${primaryText(theme)} ${recentlyCalled.has(token.token_number) ? "text-green-600 drop-shadow-md" : ""}`}>
                                    {prefix}{token.token_number}
                                </span>
                                {(() => {
                                    const lines = [token.assigned_line, ...(token.shared_lines || [])].filter(
                                        (l): l is number => l !== null && l !== undefined && !token.completed_lines?.includes(l)
                                    );
                                    if (lines.length === 0) return null;
                                    const label = lines.length > 1
                                        ? `Lanes ${lines.map(l => String(l).padStart(2, "0")).join(", ")}`
                                        : `Lane ${String(lines[0]).padStart(2, "0")}`;
                                    return (
                                        <span className={`text-[11px] font-semibold uppercase tracking-wider mt-3 ${mutedText(theme)}`}>
                                            {label}
                                        </span>
                                    );
                                })()}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    // ─── Single token / idle ──────────────────────────────────────────

    return (
        <div className={`flex-1 ${cardBg(theme)} border ${cardBorder(theme)} ${cardShadow(theme)} rounded-2xl p-5 flex flex-col relative overflow-hidden`}>
            {/* Queue name */}
            {queueName && (
                <div className="flex justify-center items-center gap-4 w-full mb-auto mt-4">
                    <h1 className={`text-3xl lg:text-4xl font-black ${primaryText(theme)} text-center tracking-tight capitalize`}>
                        {queueName}
                    </h1>
                    {isActive === false && (
                        <span className="text-[10px] font-semibold tracking-widest uppercase text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                            Closed
                        </span>
                    )}
                </div>
            )}

            <div className="flex flex-col items-center justify-center flex-1 w-full">
                <p className={`text-xl lg:text-2xl font-bold tracking-[0.2em] uppercase mb-4 transition-colors ${serving === 0 ? mutedText(theme) : labelText(theme)}`}>
                    Now Serving
                </p>

                <AnimatePresence mode="popLayout">
                    {serving !== 0 ? (
                        <div className="flex flex-col items-center">
                            {recentlyCalled.has(serving) && (
                                <motion.span
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="px-4 py-1.5 bg-green-500 text-white rounded-full text-sm font-bold uppercase tracking-widest mb-4 shadow-xl animate-bounce"
                                >
                                    Newly Called!
                                </motion.span>
                            )}
                            <motion.div
                                key={`${prefix}${serving}`}
                                initial={{ opacity: 0, scale: 0.85, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.1, y: -30 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.6 }}
                                className={`text-[140px] lg:text-[180px] font-black ${gradientText(theme)} leading-none tracking-tighter tabular-nums drop-shadow-2xl flex items-center justify-center`}
                            >
                                {prefix}{activeTokens[0]?.token_number || serving}
                            </motion.div>
                        </div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center"
                        >
                            <span className={`text-[80px] md:text-[100px] font-light ${theme === "dark" ? "text-slate-700" : "text-slate-300"} tracking-widest leading-none`}>
                                --
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {serving !== 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className={`mt-6 text-lg lg:text-xl font-semibold tracking-tight text-center border px-8 py-3 rounded-full shadow-xl ${counterPillBg(theme)}`}
                    >
                        {serviceLines > 0 && activeTokens[0]?.assigned_line ? (
                            <span>
                                Please proceed to{" "}
                                <strong className={`font-bold ml-1 ${counterPillStrong(theme)}`}>
                                    {tableConfig && tableConfig.length > 0 ? (
                                        tableConfig.find(t => t.id === activeTokens[0].assigned_line)?.name || `Table ${activeTokens[0].assigned_line}`
                                    ) : (
                                        `Counter ${String(activeTokens[0].assigned_line).padStart(2, "0")}`
                                    )}
                                </strong>
                            </span>
                        ) : (
                            <span>{tableConfig && tableConfig.length > 0 ? "Please proceed to your dining table" : "Please approach the counter"}</span>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
