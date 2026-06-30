"use client";

import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { animate } from "framer-motion";

interface WaitingCountCardProps {
    count: number;
}

export function WaitingCountCard({ count }: WaitingCountCardProps) {
    const [displayCount, setDisplayCount] = useState(count);

    useEffect(() => {
        const controls = animate(displayCount, count, {
            duration: 0.7,
            ease: "easeOut",
            onUpdate(value) {
                setDisplayCount(Math.round(value));
            },
        });
        return () => controls.stop();
    }, [count]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 flex flex-col items-center justify-center shrink-0">
            <div className="flex items-center gap-3 w-full mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Users className="w-4.5 h-4.5 text-blue-500" />
                </div>
                <h3 className="text-xs font-bold tracking-[0.15em] text-slate-500 uppercase">
                    Waiting
                </h3>
            </div>

            <div className="text-7xl font-black text-slate-900 tabular-nums leading-none tracking-tight my-2">
                {displayCount}
            </div>

            <p className="text-sm font-medium text-slate-400 mt-1">Customers</p>
        </div>
    );
}
