"use client";

import { useState } from "react";
import { WhatsAppPortal } from "@/components/organization-admin/WhatsAppPortal";
import { MessageSquare } from "lucide-react";

export default function CommunicationDashboardPage() {
    const [activeTab, setActiveTab] = useState<"whatsapp">("whatsapp");

    return (
        <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
            
            {/* Header Area */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Communication Hub
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage WhatsApp notifications for this branch.
                </p>
            </div>

            {/* Custom Tabs Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab("whatsapp")}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-colors ${
                        activeTab === "whatsapp"
                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                            : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                </button>
            </div>

            {/* Tab Content */}
            <div className="pt-2">
                {activeTab === "whatsapp" && <WhatsAppPortal />}
            </div>
            
        </div>
    );
}
