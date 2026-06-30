"use client";

import React from "react";
import { Info } from "lucide-react";
import { motion } from "framer-motion";

interface FooterTickerProps {
    announcement: string | null;
}

export function FooterTicker({ announcement }: FooterTickerProps) {
    return (
        <footer className="w-full bg-white border-t border-slate-200 flex flex-col justify-center items-center shadow-[0_-4px_20px_rgb(0,0,0,0.02)] z-10 relative overflow-hidden py-3 gap-2 shrink-0">
            
            {/* Announcement Section */}
            {announcement && (
                <div className="w-full flex items-center relative overflow-hidden h-8">
                    <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 flex items-center pl-6">
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Info className="w-3 h-3" />
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
                            className="text-base font-medium text-slate-700 tracking-wide"
                        >
                            {announcement}
                        </motion.div>
                    </div>
                </div>
            )}

            {/* Centered Modern Branding */}
            <div className="flex items-center justify-center">
                <span className="text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase flex items-center gap-2">
                    Powered by 
                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 text-xs tracking-widest">
                        Q4QUEUE
                        
                    </span>
                </span>
            </div>
        </footer>
    );
}
