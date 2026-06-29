"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

    const displayToken = serving === 0 ? "—" : `${prefix}${serving}`;

    // Determine the active tokens to display.
    // If allServingTokens is provided and not empty, use it.
    // Otherwise, fall back to the singular `serving` prop.
    const activeTokens = allServingTokens && allServingTokens.length > 0 
        ? allServingTokens 
        : (serving !== 0 ? [{ id: 'single', token_number: serving, customer_name: customerName, assigned_line: assignedLine } as any] : []);

    const isMultiCounterMode = serviceLines > 1;

    // If there are multiple service lines, render a fixed grid of all counters
    if (isMultiCounterMode) {
        const counters = Array.from({ length: serviceLines }, (_, i) => i + 1);

        // Determine text size based on the number of counters to ensure they fit nicely
        const tokenTextClass = serviceLines > 15 
            ? 'text-3xl md:text-4xl lg:text-5xl' 
            : serviceLines > 8 
                ? 'text-4xl md:text-5xl lg:text-6xl' 
                : 'text-5xl md:text-6xl lg:text-7xl';
        
        const minWidth = serviceLines > 15 
            ? 'min-w-[100px] lg:min-w-[120px]' 
            : serviceLines > 8 
                ? 'min-w-[120px] lg:min-w-[140px]' 
                : 'min-w-[140px] lg:min-w-[180px]';
        
        return (
            <div className="flex-1 bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-4 lg:p-6 flex flex-col items-center justify-start relative overflow-y-auto">
                {queueName && (
                    <div className="flex items-center gap-3 mb-2 shrink-0">
                        <h1 className="text-xl lg:text-3xl font-bold text-slate-800 tracking-tight text-center">
                            {queueName}
                        </h1>
                        {isActive === false && (
                            <span className="text-[10px] font-bold tracking-widest uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200/60">
                                Closed
                            </span>
                        )}
                    </div>
                )}
                <h2 className="text-sm font-bold tracking-[0.2em] text-slate-400 uppercase mb-4 lg:mb-6 shrink-0 mt-2 lg:mt-4">
                    Now Serving
                </h2>
                <div className="flex flex-wrap justify-center items-stretch gap-3 lg:gap-4 w-full pb-4 content-start">
                    {counters.map(counterNum => {
                        const activeToken = activeTokens.find(t => t.assigned_line === counterNum);
                        const hasToken = !!activeToken;

                        return (
                            <motion.div 
                                key={`counter-${counterNum}`}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                className={`flex flex-col items-center justify-center p-3 lg:p-4 rounded-2xl flex-1 ${minWidth} max-w-[280px] transition-all duration-300 ${
                                    hasToken 
                                        ? 'bg-blue-50 border border-blue-200 shadow-sm' 
                                        : 'bg-slate-50 border border-slate-100'
                                }`}
                            >
                                <div className={`mb-2 lg:mb-3 text-[10px] lg:text-xs font-bold uppercase tracking-widest px-2 lg:px-3 py-1 rounded-full ${
                                    hasToken 
                                        ? 'text-blue-700 bg-blue-100/80' 
                                        : 'text-slate-400 bg-slate-200/50'
                                }`}>
                                    Counter {counterNum}
                                </div>

                                <div className={`font-extrabold tracking-tighter leading-none tabular-nums ${tokenTextClass} ${
                                    hasToken ? 'text-blue-950' : 'text-slate-300'
                                }`}>
                                    {hasToken ? `${prefix}${activeToken.token_number}` : '—'}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Fallback: If no multi-counter mode but multiple tokens active, render them dynamically
    if (activeTokens.length > 1) {
        // Determine text size based on the number of tokens to ensure they fit nicely
        const tokenTextClass = activeTokens.length > 15 
            ? 'text-3xl md:text-4xl lg:text-5xl' 
            : activeTokens.length > 8 
                ? 'text-4xl md:text-5xl lg:text-6xl' 
                : 'text-5xl md:text-6xl lg:text-7xl';
        
        const minWidth = activeTokens.length > 15 
            ? 'min-w-[100px]' 
            : activeTokens.length > 8 
                ? 'min-w-[120px]' 
                : 'min-w-[160px]';
        
        return (
            <div className="flex-1 bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-4 lg:p-6 flex flex-col items-center justify-start relative overflow-y-auto lg:overflow-hidden">
                {queueName && (
                    <div className="flex items-center gap-3 mb-2 shrink-0">
                        <h1 className="text-xl lg:text-3xl font-bold text-slate-800 tracking-tight text-center">
                            {queueName}
                        </h1>
                        {isActive === false && (
                            <span className="text-[10px] font-bold tracking-widest uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200/60">
                                Closed
                            </span>
                        )}
                    </div>
                )}
                <h2 className="text-sm font-bold tracking-[0.2em] text-slate-400 uppercase mb-4 lg:mb-6 shrink-0 mt-2 lg:mt-4">
                    Now Serving
                </h2>
                
                <div className="flex flex-wrap justify-center items-stretch gap-3 lg:gap-4 w-full h-full pb-4 content-start lg:content-center">
                    <AnimatePresence>
                        {activeTokens.map(token => (
                            <motion.div 
                                key={token.id || token.token_number}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                layout
                                className={`flex flex-col items-center justify-center p-3 lg:p-4 bg-slate-50 border border-slate-100 rounded-2xl flex-1 ${minWidth} max-w-[280px]`}
                            >
                                <div className={`font-extrabold text-slate-900 tracking-tighter leading-none tabular-nums ${tokenTextClass}`}>
                                    {prefix}{token.token_number}
                                </div>

                                {serviceLines > 0 && token.assigned_line && (
                                    <div className="mt-2 text-[10px] lg:text-xs font-semibold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                                        Counter {token.assigned_line}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    // Default view for single token or no tokens
    return (
        <div className="flex-1 bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-6 lg:p-10 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Top Queue Name */}
            {queueName && (
                <div className="absolute top-6 lg:top-8 left-0 right-0 flex justify-center items-center gap-3 px-6 z-20">
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight text-center">
                        {queueName}
                    </h1>
                    {isActive === false && (
                        <span className="text-[10px] font-bold tracking-widest uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200/60">
                            Closed
                        </span>
                    )}
                </div>
            )}

            {/* Subtle background glow/pulse */}
            <AnimatePresence>
                {isNew && (
                    <motion.div
                        initial={{ opacity: 0.8, scale: 0.8 }}
                        animate={{ opacity: 0, scale: 2 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute inset-0 m-auto w-[300px] h-[300px] bg-blue-400 rounded-full blur-[80px]"
                    />
                )}
            </AnimatePresence>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                 <div className="w-[600px] h-[600px] rounded-full bg-blue-100/40 blur-[100px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center">
                <h2 className="text-sm font-bold tracking-[0.2em] text-slate-400 uppercase mb-6">
                    Now Serving
                </h2>

                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={displayToken}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.1, y: -20 }}
                        transition={{ 
                            type: "spring", 
                            stiffness: 300, 
                            damping: 25,
                            mass: 0.5
                        }}
                        className="flex flex-col items-center"
                    >
                        <div className="text-[100px] sm:text-[140px] md:text-[180px] font-extrabold text-slate-900 tracking-tighter leading-none tabular-nums">
                            {displayToken}
                        </div>
                        

                    </motion.div>
                </AnimatePresence>

                {serving !== 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-6 lg:mt-8 text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-500 tracking-tight text-center"
                    >
                        {serviceLines > 0 && activeTokens[0]?.assigned_line ? (
                            <span>Please proceed to <strong className="text-blue-600 font-bold whitespace-nowrap">Counter {activeTokens[0].assigned_line}</strong></span>
                        ) : (
                            <span>Please approach the counter</span>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
