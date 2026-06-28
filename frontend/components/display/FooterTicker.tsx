"use client";

import React from "react";
import { Info } from "lucide-react";
import { motion } from "framer-motion";

interface FooterTickerProps {
    announcement: string | null;
}

export function FooterTicker({ announcement }: FooterTickerProps) {
    return (
        <footer className="h-16 bg-white border-t border-slate-200 flex items-center shrink-0 shadow-[0_-4px_20px_rgb(0,0,0,0.02)] z-10 relative overflow-hidden">
            
            {/* Announcement Section */}
            <div className="flex-1 flex items-center h-full relative overflow-hidden">
                {announcement && (
                    <>
                        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 flex items-center pl-6">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Info className="w-4 h-4" />
                            </div>
                        </div>
                        
                        {/* Marquee Animation */}
                        <div className="flex whitespace-nowrap overflow-hidden w-full pl-20 pr-8">
                            <motion.div
                                animate={{ x: ["100%", "-100%"] }}
                                transition={{ 
                                    repeat: Infinity, 
                                    ease: "linear", 
                                    duration: Math.max(15, announcement.length * 0.15) 
                                }}
                                className="text-lg font-medium text-slate-700 tracking-wide"
                            >
                                {announcement}
                            </motion.div>
                        </div>
                    </>
                )}
            </div>

            {/* Right Branding */}
            <div className="h-full px-8 bg-slate-50 border-l border-slate-200 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Powered by <strong className="text-slate-600">Q4Queue</strong>
                </span>
            </div>
        </footer>
    );
}
