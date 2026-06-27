"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AlertTriangle, Info, ShieldAlert, X } from "lucide-react";

export function OrganizationAnnouncementsBanner() {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        // Load dismissed announcements from localStorage
        try {
            const saved = localStorage.getItem("qrq_dismissed_org_announcements");
            if (saved) setDismissed(new Set(JSON.parse(saved)));
        } catch (e) { }

        const fetchAnnouncements = async () => {
            try {
                const data = await api.getActiveOrgAnnouncements?.() || await (api as any).request("/organization/announcements/active");
                setAnnouncements(data);
            } catch (err) {
                console.debug("Failed to fetch organization announcements", err);
            }
        };

        fetchAnnouncements();
        const interval = setInterval(fetchAnnouncements, 60000); 
        return () => clearInterval(interval);
    }, []);

    const activeAnnouncements = announcements.filter(a => !dismissed.has(a.id));

    useEffect(() => {
        if (activeAnnouncements.length <= 1) return;
        const slideInterval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % activeAnnouncements.length);
        }, 5000); // Change slide every 5 seconds
        return () => clearInterval(slideInterval);
    }, [activeAnnouncements.length]);

    const dismissAnnouncement = (id: string) => {
        const newDismissed = new Set(dismissed);
        newDismissed.add(id);
        setDismissed(newDismissed);
        localStorage.setItem("qrq_dismissed_org_announcements", JSON.stringify(Array.from(newDismissed)));
    };

    if (activeAnnouncements.length === 0) return null;

    let displayIndex = currentIndex;
    if (displayIndex >= activeAnnouncements.length) {
        displayIndex = 0;
    }

    const ann = activeAnnouncements[displayIndex];

    let Icon = Info;
    let barColor = "bg-indigo-500/80";
    let iconColor = "text-indigo-600";
    let badgeBg = "bg-indigo-50/80 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    
    if (ann.type === "warning") {
        Icon = AlertTriangle;
        barColor = "bg-amber-500/80";
        iconColor = "text-amber-600";
        badgeBg = "bg-amber-50/80 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    } else if (ann.type === "critical") {
        Icon = ShieldAlert;
        barColor = "bg-rose-500/80";
        iconColor = "text-rose-600";
        badgeBg = "bg-rose-50/80 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
    }

    return (
        <div className="fixed top-6 sm:top-10 left-1/2 -translate-x-1/2 flex flex-col items-center w-full z-[100] pointer-events-none px-4">
            <div 
                key={ann.id + "-" + displayIndex}
                className="group relative w-full sm:w-fit sm:min-w-[420px] max-w-2xl bg-white/30 dark:bg-[#1a1a1a]/40 backdrop-blur-3xl backdrop-saturate-150 border border-white/40 dark:border-white/10 rounded-[24px] p-5 md:p-6 flex flex-col gap-3 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1),inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-all duration-500 animate-in slide-in-from-right-8 fade-in zoom-in-95 overflow-hidden pointer-events-auto"
            >
                <div className="flex items-start gap-4 w-full">
                    {/* Minimal Left Indicator */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${barColor} opacity-90`} />

                    {/* Apple-style solid crisp icon badge */}
                    <div className={`shrink-0 mt-0.5 flex items-center justify-center w-11 h-11 rounded-full ${badgeBg} shadow-sm`}>
                        <Icon size={22} strokeWidth={2} />
                    </div>
                    
                    <div className="flex-1 pr-8 pt-0.5">
                        <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-[15px] font-semibold text-slate-900 tracking-tight leading-none">{ann.title}</h3>
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${badgeBg} opacity-80`}>
                                {ann.type}
                            </span>
                        </div>
                        <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{ann.message}</div>
                    </div>
                    
                    <button 
                        onClick={() => dismissAnnouncement(ann.id)}
                        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
                        aria-label="Dismiss"
                    >
                        <X size={16} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Pagination Dots */}
                {activeAnnouncements.length > 1 && (
                    <div className="flex justify-center items-center gap-1.5 w-full mt-1">
                        {activeAnnouncements.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentIndex(i)}
                                className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none ${i === displayIndex ? 'w-4 bg-slate-600 dark:bg-slate-400' : 'w-1.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'}`}
                                aria-label={`Go to slide ${i + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
