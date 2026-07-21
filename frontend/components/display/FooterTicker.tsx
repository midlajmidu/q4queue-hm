"use client";

import React from "react";
import { Info } from "lucide-react";
import { motion } from "framer-motion";
import type { DisplayTheme } from "./displayTheme";

interface FooterTickerProps {
    announcement: string | null;
    theme?: DisplayTheme;
}

export function FooterTicker({ announcement, theme = "light" }: FooterTickerProps) {
    const isDark = theme === "dark";
    return (
        <footer className={`w-full ${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200"} border-t flex flex-col justify-center items-center z-10 relative overflow-hidden py-3 shrink-0`}>
            {/* Announcement Section */}
            {announcement && (
                <div className="w-full flex items-center relative overflow-hidden h-8 mb-2">
                    <div className={`absolute left-0 top-0 bottom-0 w-20 ${isDark ? "bg-gradient-to-r from-slate-950 to-transparent" : "bg-gradient-to-r from-slate-50 to-transparent"} z-10 flex items-center pl-6`}>
                        <Info className={`w-3.5 h-3.5 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                    </div>
                    
                    {/* Marquee Animation */}
                    <div className="flex whitespace-nowrap overflow-hidden w-full pl-24 pr-8">
                        <motion.div
                            animate={{ x: ["100%", "-100%"] }}
                            transition={{ 
                                repeat: Infinity, 
                                ease: "linear", 
                                duration: Math.max(20, announcement.length * 0.15) 
                            }}
                            className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"} tracking-wide`}
                        >
                            {announcement}
                        </motion.div>
                    </div>
                </div>
            )}

            {/* Centered Modern Branding */}
            <div className="flex items-center justify-center">
                <span className={`text-[10px] font-medium tracking-[0.2em] ${isDark ? "text-slate-600" : "text-slate-400"} uppercase flex items-center gap-2`}>
                    Powered by 
                    <img src="/q4queue-new_logo.png" alt="Q4Queue Logo" className="h-3 w-auto object-contain opacity-80" />
                </span>
            </div>
        </footer>
    );
}
