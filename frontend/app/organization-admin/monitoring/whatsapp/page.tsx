"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { MessageSquare, ExternalLink } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";

export default function WhatsAppMonitoringPage() {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const { selectedBranchId } = useBranchFilter();

    useEffect(() => {
        const loadData = () => {
            api.getOrgAdminWhatsApp(selectedBranchId || undefined)
                .then(res => {
                    setMessages(res);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        };
        
        loadData();
        const interval = setInterval(loadData, 15000); // 15s polling
        return () => clearInterval(interval);
    }, [selectedBranchId]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Premium Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500">
                        WhatsApp Status
                    </h1>
                    <div className="flex items-center flex-wrap gap-2.5 text-sm text-slate-500 mt-2">
                        <span className="leading-none font-medium text-slate-500">Monitor recent WhatsApp notification events across branches.</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare size={18} className="text-indigo-600" />
                        Recent Notification Events
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <th className="p-4">Time</th>
                                <th className="p-4">Branch</th>
                                <th className="p-4">Event Type</th>
                                <th className="p-4">Customer Phone</th>
                                <th className="p-4">Template</th>
                                <th className="p-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {messages.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No recent WhatsApp notifications.
                                    </td>
                                </tr>
                            ) : (
                                messages.map((m: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-4 text-sm text-slate-500">
                                            {new Date(m.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-4 font-medium text-slate-900">{m.branch}</td>
                                        <td className="p-4 text-slate-700">{m.event_type}</td>
                                        <td className="p-4 font-mono text-slate-600">{m.customer_phone}</td>
                                        <td className="p-4 text-slate-600">{m.template_name}</td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                m.status === 'sent' ? 'bg-green-100 text-green-800' : 
                                                m.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                'bg-amber-100 text-amber-800'
                                            }`}>
                                                {m.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
