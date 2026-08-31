"use client";

import { useState } from "react";
import { WhatsAppPortal } from "@/components/organization-admin/WhatsAppPortal";
import { CallLogsSection } from "@/components/dashboard/CallLogsSection";
import { MessageSquareText, Phone } from "lucide-react";

export default function CommunicationDashboardPage() {
    const [channel, setChannel] = useState<"whatsapp" | "calls">("whatsapp");

    return (
        <div className="w-full max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300 space-y-5">
            {/* Top Channel Switcher */}
            <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl p-2 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-white/5">
                    <button
                        onClick={() => setChannel("whatsapp")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                            channel === "whatsapp"
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                    >
                        <MessageSquareText size={16} className={channel === "whatsapp" ? "text-emerald-500" : ""} />
                        <span>WhatsApp Messaging</span>
                    </button>
                    <button
                        onClick={() => setChannel("calls")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                            channel === "calls"
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                    >
                        <Phone size={16} className={channel === "calls" ? "text-indigo-500" : ""} />
                        <span>Voice Calls & Telephony</span>
                    </button>
                </div>
            </div>

            {channel === "whatsapp" ? <WhatsAppPortal /> : <CallLogsSection />}
        </div>
    );
}
