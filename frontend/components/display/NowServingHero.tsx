"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";
import { ServingToken } from "@/types/api";
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
}: NowServingHeroProps) {
    const [prevServing, setPrevServing] = useState(serving);
    const isNew = serving !== 0 && serving !== prevServing;

    useEffect(() => {
        if (serving !== 0 && serving !== prevServing) {
            setPrevServing(serving);
        }
    }, [serving, prevServing]);

    const activeTokens =
        allServingTokens && allServingTokens.length > 0
            ? allServingTokens
            : serving !== 0
            ? [{ id: "single", token_number: serving, customer_name: customerName, assigned_line: assignedLine } as any]
            : [];

    const isMultiCounterMode = serviceLines > 1;

    // ─── Multi-counter grid ──────────────────────────────────────────
    if (isMultiCounterMode) {
        const counters = Array.from({ length: serviceLines }, (_, i) => i + 1);

        const tokenSize =
            serviceLines > 20
                ? "text-xl md:text-2xl"
                : serviceLines > 12
                ? "text-2xl md:text-3xl"
                : serviceLines > 6
                ? "text-3xl md:text-4xl"
                : "text-4xl md:text-5xl";

        const cols =
            serviceLines > 20
                ? "grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
                : serviceLines > 12
                ? "grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                : serviceLines > 6
                ? "grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

        return (
            <div className={`flex-1 ${cardBg(theme)} border ${cardBorder(theme)} ${cardShadow(theme)} rounded-2xl p-5 lg:p-6 flex flex-col overflow-hidden`}>
                {/* Header */}
                <div className="flex flex-col items-center gap-1 mb-5 shrink-0">
                    <div className={`w-10 h-10 rounded-xl border ${iconBg(theme)} flex items-center justify-center mb-1`}>
                        <Users className={`w-5 h-5 ${iconColor(theme)}`} />
                    </div>
                    <p className={`text-base font-bold tracking-[0.15em] ${mutedText(theme)} uppercase`}>
                        Now Serving
                    </p>
                    {queueName && (
                        <h1 className={`text-lg font-bold ${primaryText(theme)} text-center tracking-tight capitalize`}>
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
                <div className={`grid ${cols} gap-3 lg:gap-4 flex-1 overflow-y-auto content-start`}>
                    {counters.map((counterNum) => {
                        const activeToken = activeTokens.find(
                            (t) => t.assigned_line === counterNum
                        );
                        const hasToken = !!activeToken;

                        return (
                            <motion.div
                                key={`counter-${counterNum}`}
                                layout
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.25 }}
                                className={`flex flex-col items-center justify-center p-4 lg:p-6 rounded-xl border transition-all duration-300 min-w-0 ${
                                    hasToken
                                        ? theme === "dark" ? "bg-white/[0.08] border-white/[0.12]" : "bg-white border-slate-200 shadow-md"
                                        : theme === "dark" ? "bg-white/[0.02] border-white/[0.04] opacity-40" : "bg-slate-50/50 border-slate-100 opacity-40"
                                }`}
                            >
                                <span
                                    className={`text-[10px] lg:text-[11px] font-semibold tracking-[0.15em] uppercase mb-3 whitespace-nowrap ${
                                        hasToken ? secondaryText(theme) : mutedText(theme)
                                    }`}
                                >
                                    Counter {String(counterNum).padStart(2, "0")}
                                </span>

                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={hasToken ? `${prefix}${activeToken.token_number}` : `empty-${counterNum}`}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.2 }}
                                        className={`font-extrabold tracking-tight leading-none tabular-nums w-full text-center px-2 whitespace-nowrap ${tokenSize} ${
                                            hasToken ? primaryText(theme) : theme === "dark" ? "text-slate-700" : "text-slate-300"
                                        }`}
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
                <div className="flex flex-wrap justify-center items-stretch gap-4 flex-1 overflow-y-auto content-start">
                    <AnimatePresence>
                        {activeTokens.map((token) => (
                            <motion.div
                                key={token.id || token.token_number}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className={`flex flex-col items-center justify-center px-6 py-5 rounded-2xl border ${
                                    theme === "dark" ? "bg-white/[0.08] border-white/[0.12]" : "bg-white border-slate-200 shadow-sm"
                                } min-w-[140px] max-w-full`}
                            >
                                <span className={`font-black tracking-tight leading-none tabular-nums w-full text-center px-2 whitespace-nowrap ${tokenSize} ${primaryText(theme)}`}>
                                    {prefix}{token.token_number}
                                </span>
                                {token.assigned_line && (
                                    <span className={`text-[11px] font-semibold uppercase tracking-wider mt-3 ${mutedText(theme)}`}>
                                        Counter {String(token.assigned_line).padStart(2, "0")}
                                    </span>
                                )}
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
                                    Counter {String(activeTokens[0].assigned_line).padStart(2, "0")}
                                </strong>
                            </span>
                        ) : (
                            <span>Please approach the counter</span>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
