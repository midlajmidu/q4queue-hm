"use client";

import React, { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import Image from "next/image";

interface DisplayHeaderProps {
    logoUrl?: string | null;
    status: "connected" | "reconnecting" | "offline" | "disconnected" | "connecting";
    isActive: boolean;
}

export function DisplayHeader({
    logoUrl,
    status,
    isActive,
}: DisplayHeaderProps) {
    const [timeString, setTimeString] = useState<string>("");
    const [dateString, setDateString] = useState<string>("");

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTimeString(
                now.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                })
            );
            setDateString(
                now.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                })
            );
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="h-[80px] bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10 relative">
            {/* Left: Logo */}
            <div className="flex items-center w-[300px]">
                {logoUrl ? (
                    <div className="relative h-10 w-32">
                        <Image src={logoUrl} alt="Company Logo" fill className="object-contain object-left" />
                    </div>
                ) : (
                    <div className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black">
                            Q
                        </div>
                        Q4Queue
                    </div>
                )}
            </div>

            {/* Center: Flexible Space */}
            <div className="flex-1" />

            {/* Right: Controls & Time */}
            <div className="flex items-center justify-end w-[300px] gap-4">
                {/* Status Badge */}
                <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border transition-colors ${
                        status === "connected"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                            : status === "reconnecting" || status === "connecting"
                            ? "bg-amber-50 text-amber-700 border-amber-200/60"
                            : "bg-red-50 text-red-600 border-red-200/60"
                    }`}
                >
                    {status === "connected" && <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-500" />}
                    <span>
                        {status === "connected"
                            ? "LIVE"
                            : status === "connecting"
                            ? "CONNECTING"
                            : status === "reconnecting"
                            ? "RECONNECTING"
                            : status === "disconnected"
                            ? "DISCONNECTED"
                            : "OFFLINE"}
                    </span>
                </div>



                {/* Time & Date */}
                <div className="flex flex-col items-end leading-none ml-2 border-l border-slate-200 pl-4">
                    <span className="text-lg font-bold text-slate-900 tracking-tight">
                        {timeString || "--:--"}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                        {dateString || "---"}
                    </span>
                </div>
            </div>
        </header>
    );
}
