"use client";

import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { motion, useSpring, useTransform, animate } from "framer-motion";

interface WaitingCountCardProps {
    count: number;
}

export function WaitingCountCard({ count }: WaitingCountCardProps) {
    // Framer motion counting animation
    const [displayCount, setDisplayCount] = useState(count);

    useEffect(() => {
        const controls = animate(displayCount, count, {
            duration: 0.8,
            ease: "easeOut",
            onUpdate(value) {
                setDisplayCount(Math.round(value));
            }
        });
        return () => controls.stop();
    }, [count]);

    return (
        <div className="bg-white rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-200/60 p-6 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0 min-h-[160px]">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <Users className="w-7 h-7" />
            </div>
            
            <h3 className="text-sm font-bold tracking-[0.15em] text-slate-400 uppercase mb-2">
                Waiting
            </h3>
            
            <div className="flex items-baseline gap-2">
                <motion.span 
                    key={displayCount}
                    initial={{ opacity: 0.8, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-6xl font-black text-slate-900 tabular-nums leading-none tracking-tight"
                >
                    {displayCount}
                </motion.span>
            </div>
            
            <span className="text-sm font-semibold text-slate-500 mt-2">
                Customers
            </span>
        </div>
    );
}
