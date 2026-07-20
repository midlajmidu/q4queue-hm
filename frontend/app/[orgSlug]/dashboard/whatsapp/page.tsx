"use client";

import { useState } from "react";
import { WhatsAppPortal } from "@/components/organization-admin/WhatsAppPortal";
import { CallLogsPortal } from "@/components/organization-admin/CallLogsPortal";
import { MessageSquare, Phone } from "lucide-react";

export default function CommunicationDashboardPage() {
    const [activeTab, setActiveTab] = useState<"whatsapp" | "call">("whatsapp");

    return (
        <div className="w-full max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300">
            
            {/* Custom Tabs Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
                <button
                    onClick={() => setActiveTab("whatsapp")}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 text-[13px] font-semibold transition-colors ${
                        activeTab === "whatsapp"
                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                            : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                </button>
                <button
                    onClick={() => setActiveTab("call")}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 text-[13px] font-semibold transition-colors ${
                        activeTab === "call"
                            ? "border-blue-500 text-blue-600 dark:text-blue-400"
                            : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                >
                    <Phone className="w-3.5 h-3.5" />
                    Call
                </button>
            </div>

            {/* Tab Content */}
            <div className="pt-2 pb-12">
                {activeTab === "whatsapp" && <WhatsAppPortal />}
                {activeTab === "call" && <CallLogsPortal />}
            </div>
            
        </div>
    );
}
