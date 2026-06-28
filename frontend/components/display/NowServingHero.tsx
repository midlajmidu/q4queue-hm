"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NowServingHeroProps {
    serving: number;
    prefix: string;
    assignedLine?: number | null;
    serviceLines: number;
    customerName?: string;
}

export function NowServingHero({
    serving,
    prefix,
    assignedLine,
    serviceLines,
    customerName,
}: NowServingHeroProps) {
    const [prevServing, setPrevServing] = useState(serving);
    const isNew = serving !== 0 && serving !== prevServing;

    useEffect(() => {
        if (serving !== 0 && serving !== prevServing) {
            setPrevServing(serving);
        }
    }, [serving, prevServing]);

    const displayToken = serving === 0 ? "—" : `${prefix}${serving}`;

    return (
        <div className="flex-1 bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-10 flex flex-col items-center justify-center relative overflow-hidden">
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
                        <div className="text-[140px] md:text-[180px] font-extrabold text-slate-900 tracking-tighter leading-none tabular-nums">
                            {displayToken}
                        </div>
                        
                        {customerName && (
                            <div className="mt-4 text-2xl font-bold text-slate-700 bg-slate-100 px-6 py-2 rounded-full">
                                {customerName}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {serving !== 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-8 text-2xl lg:text-3xl font-semibold text-slate-500 tracking-tight"
                    >
                        {serviceLines > 0 && assignedLine ? (
                            <span>Please proceed to <strong className="text-blue-600 font-bold">Counter {assignedLine}</strong></span>
                        ) : (
                            <span>Please approach the counter</span>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
