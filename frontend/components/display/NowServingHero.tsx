"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";
import { ServingToken } from "@/types/api";

interface NowServingHeroProps {
    serving: number;
    prefix: string;
    assignedLine?: number | null;
    serviceLines: number;
    customerName?: string;
    allServingTokens?: ServingToken[];
    queueName?: string;
    isActive?: boolean;
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

    // ─── Multi-counter grid (matches the screenshot exactly) ──────────
    if (isMultiCounterMode) {
        const counters = Array.from({ length: serviceLines }, (_, i) => i + 1);

        // Responsive font + card size based on count
        const tokenSize =
            serviceLines > 20
                ? "text-xl md:text-2xl"
                : serviceLines > 12
                ? "text-2xl md:text-3xl lg:text-4xl"
                : serviceLines > 6
                ? "text-3xl md:text-4xl lg:text-5xl"
                : "text-4xl md:text-5xl lg:text-6xl";

        const cols =
            serviceLines > 20
                ? "grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
                : serviceLines > 12
                ? "grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                : serviceLines > 6
                ? "grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

        return (
            <div className="flex-1 bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 lg:p-6 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex flex-col items-center gap-1 mb-5 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-1">
                        <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
                        Now Serving
                    </p>
                    {queueName && (
                        <h1 className="text-lg font-bold text-slate-700 text-center">
                            {queueName}
                            {isActive === false && (
                                <span className="ml-2 text-[10px] font-bold tracking-widest uppercase text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
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
                                className={`flex flex-col items-center justify-center p-3 lg:p-4 rounded-xl border transition-all duration-300 ${
                                    hasToken
                                        ? "bg-white border-slate-200 shadow-sm"
                                        : "bg-slate-50/60 border-slate-100"
                                }`}
                            >
                                {/* Counter label */}
                                <span
                                    className={`text-[9px] lg:text-[10px] font-bold tracking-[0.15em] uppercase mb-2 ${
                                        hasToken ? "text-blue-600" : "text-slate-400"
                                    }`}
                                >
                                    Counter {String(counterNum).padStart(2, "0")}
                                </span>

                                {/* Token number */}
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={hasToken ? `${prefix}${activeToken.token_number}` : `empty-${counterNum}`}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.2 }}
                                        className={`font-extrabold tracking-tighter leading-none tabular-nums break-words w-full text-center px-1 ${tokenSize} ${
                                            hasToken ? "text-slate-900" : "text-slate-200"
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
                ? "text-2xl md:text-3xl"
                : activeTokens.length > 8
                ? "text-3xl md:text-4xl lg:text-5xl"
                : "text-4xl md:text-5xl lg:text-6xl";

        return (
            <div className="flex-1 bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 lg:p-6 flex flex-col overflow-hidden">
                <div className="flex flex-col items-center gap-1 mb-5 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-1">
                        <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">Now Serving</p>
                </div>
                <div className="flex flex-wrap justify-center items-stretch gap-3 flex-1 overflow-y-auto content-start">
                    <AnimatePresence>
                        {activeTokens.map((token) => (
                            <motion.div
                                key={token.id || token.token_number}
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                                layout
                                className="flex flex-col items-center justify-center p-4 lg:p-5 bg-white border border-slate-200 rounded-xl shadow-sm min-w-[140px] max-w-[200px]"
                            >
                                <span className={`font-extrabold text-slate-900 tracking-tighter leading-none tabular-nums ${tokenSize}`}>
                                    {prefix}{token.token_number}
                                </span>
                                {serviceLines > 0 && token.assigned_line && (
                                    <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
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
    const displayToken = serving === 0 ? "—" : `${prefix}${serving}`;

    return (
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 lg:p-10 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Subtle glow on new token */}
            <AnimatePresence>
                {isNew && (
                    <motion.div
                        initial={{ opacity: 0.6, scale: 0.6 }}
                        animate={{ opacity: 0, scale: 2.5 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="absolute inset-0 m-auto w-[280px] h-[280px] bg-blue-300 rounded-full blur-[80px] pointer-events-none"
                    />
                )}
            </AnimatePresence>

            {/* Queue name */}
            {queueName && (
                <div className="absolute top-5 left-0 right-0 flex justify-center items-center gap-2 px-6 z-10">
                    <h1 className="text-xl lg:text-2xl font-bold text-slate-700 text-center tracking-tight">
                        {queueName}
                    </h1>
                    {isActive === false && (
                        <span className="text-[10px] font-bold tracking-widest uppercase text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            Closed
                        </span>
                    )}
                </div>
            )}

            <div className="relative z-10 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase mb-6">
                    Now Serving
                </p>

                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={displayToken}
                        initial={{ opacity: 0, scale: 0.88, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.08, y: -20 }}
                        transition={{ type: "spring", stiffness: 280, damping: 22, mass: 0.5 }}
                        className="flex flex-col items-center"
                    >
                        <span className="text-[100px] sm:text-[130px] md:text-[160px] font-extrabold text-slate-900 tracking-tighter leading-none tabular-nums break-words w-full text-center px-4 max-w-[90vw]">
                            {displayToken}
                        </span>
                    </motion.div>
                </AnimatePresence>

                {serving !== 0 && (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-6 text-lg lg:text-xl font-semibold text-slate-400 tracking-tight text-center"
                    >
                        {serviceLines > 0 && activeTokens[0]?.assigned_line ? (
                            <span>
                                Please proceed to{" "}
                                <strong className="text-blue-600 font-bold">
                                    Counter {String(activeTokens[0].assigned_line).padStart(2, "0")}
                                </strong>
                            </span>
                        ) : (
                            <span>Please approach the counter</span>
                        )}
                    </motion.p>
                )}
            </div>
        </div>
    );
}
