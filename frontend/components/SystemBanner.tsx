"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SystemAnnouncementDetail } from "@/types/api";

const typeConfig: Record<string, {
  bg: string;
  text: string;
  iconBg: string;
  iconColor: string;
  border: string;
  closeHover: string;
}> = {
  critical: {
    bg: "bg-red-50/95 border-red-200",
    text: "text-red-900",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    border: "border-red-200/60",
    closeHover: "hover:bg-red-100/80",
  },
  warning: {
    bg: "bg-amber-50/95 border-amber-200",
    text: "text-amber-900",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    border: "border-amber-200/60",
    closeHover: "hover:bg-amber-100/80",
  },
  info: {
    bg: "bg-indigo-50/95 border-indigo-200",
    text: "text-indigo-900",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    border: "border-indigo-200/60",
    closeHover: "hover:bg-indigo-100/80",
  },
};

const AlertIcons: Record<string, React.ReactNode> = {
  critical: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
};

export default function SystemBanner() {
    const [announcements, setAnnouncements] = useState<SystemAnnouncementDetail[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    useEffect(() => {
        api.getActiveSystemAnnouncements()
            .then(data => setAnnouncements(data || []))
            .catch(console.error);
            
        const intervalId = setInterval(() => {
            api.getActiveSystemAnnouncements()
                .then(data => setAnnouncements(data || []))
                .catch(console.error);
        }, 1000 * 60 * 5); // 5 minutes
        
        return () => clearInterval(intervalId);
    }, []);

    const handleDismiss = (id: string) => {
        setDismissed(prev => new Set(prev).add(id));
    };

    const activeAnnouncements = announcements.filter(a => !dismissed.has(a.id));

    if (activeAnnouncements.length === 0) return null;

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 flex flex-col items-center w-full max-w-screen-md gap-3 z-[100] px-4 pointer-events-none">
            {activeAnnouncements.map((announcement, index) => {
                const config = typeConfig[announcement.type] || typeConfig.info;
                const Icon = AlertIcons[announcement.type] || AlertIcons.info;

                return (
                    <div 
                        key={announcement.id} 
                        className={`relative flex items-center justify-between gap-3 max-w-fit px-2 py-2 rounded-full shadow-[0_12px_40px_rgb(0,0,0,0.12)] backdrop-blur-xl border ${config.border} ${config.bg} overflow-hidden transform transition-all duration-500 animate-in fade-in slide-in-from-top-12 ease-out pointer-events-auto`}
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        {/* Elegant Icon Container */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${config.iconBg} ${config.iconColor}`}>
                            {Icon}
                        </div>

                        {/* Text Content */}
                        <p className={`m-0 px-1 text-[13.5px] font-semibold tracking-tight ${config.text} whitespace-nowrap`}>
                            {announcement.message}
                        </p>

                        {/* Minimal Divider */}
                        <div className={`w-[1px] h-4 opacity-20 bg-current ${config.text}`} />

                        {/* Dismiss button */}
                        <button
                            onClick={() => handleDismiss(announcement.id)}
                            className={`shrink-0 w-7 h-7 rounded-full border-none bg-transparent flex items-center justify-center opacity-60 hover:opacity-100 ${config.text} ${config.closeHover} transition-all duration-200`}
                            aria-label="Dismiss alert"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18"/><path d="M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
