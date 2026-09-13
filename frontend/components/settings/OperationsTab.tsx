"use client";

import React, { useState, useEffect } from "react";
import { Clock, Settings2, Plus, ArrowRight, CheckCircle2, Layers, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { QueueResponse } from "@/types/api";
import EditQueueModal from "@/components/EditQueueModal";

export function OperationsTab() {
    const [existingQueues, setExistingQueues] = useState<QueueResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedQueueToEdit, setSelectedQueueToEdit] = useState<QueueResponse | null>(null);
    const router = useRouter();
    const params = useParams();
    const orgSlug = (params?.orgSlug as string) || "";

    // Automated Sessions State
    const [autoSessionEnabled, setAutoSessionEnabled] = useState(false);
    const [autoSessionTime, setAutoSessionTime] = useState("09:00");
    const [isSavingAutoSession, setIsSavingAutoSession] = useState(false);
    const [isTriggeringNow, setIsTriggeringNow] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [settings, branchQueues] = await Promise.all([
                api.getOrganizationSettings(),
                api.listQueues().catch(() => [] as QueueResponse[])
            ]);
            setAutoSessionEnabled(settings.auto_session_enabled || false);
            setAutoSessionTime(settings.auto_session_time || "09:00");
            setExistingQueues((branchQueues || []).filter(q => !q.is_deleted));
        } catch (err) {
            toast.error("Failed to load operations settings");
        } finally {
            setIsLoading(false);
        }
    };

    const saveAutoSessionSettings = async (enabled: boolean, time: string) => {
        setIsSavingAutoSession(true);
        try {
            const currentSettings = await api.getOrganizationSettings();
            await api.updateOrganizationSettings({
                name: currentSettings.name,
                address: currentSettings.address || undefined,
                phone_number: currentSettings.phone_number || undefined,
                auto_session_enabled: enabled,
                auto_session_time: time || null,
                queue_templates: currentSettings.queue_templates
            });
            toast.success("Automated daily session settings saved");
        } catch (err: any) {
            toast.error(err?.detail || "Failed to update settings");
        } finally {
            setIsSavingAutoSession(false);
        }
    };

    const handleTriggerNow = async () => {
        setIsTriggeringNow(true);
        try {
            await api.triggerAutoSession();
            toast.success("Daily session rollover triggered! Active sessions updated for all branch queues.");
            loadData();
        } catch (err: any) {
            toast.error(err?.detail || "Failed to trigger daily session rollover");
        } finally {
            setIsTriggeringNow(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            
            {/* Header Section */}
            <div>
                <h1 className="text-[22px] font-bold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                        <Settings2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    Workflow Operations
                </h1>
                <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl text-[14px] leading-relaxed">
                    Configure automated daily session rollovers and manage daily operating hours for all branch queues.
                </p>
            </div>

            {/* Automated Daily Sessions Master Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all overflow-hidden">
                <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex gap-4 items-start">
                        <div className="mt-0.5 w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">
                                    Automated Daily Sessions
                                </h2>
                                {autoSessionEnabled ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Active
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-bold tracking-wider uppercase">
                                        Disabled
                                    </span>
                                )}
                            </div>
                            <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1.5 max-w-xl leading-relaxed">
                                Automatically resets daily queues and starts new active sessions every day at your scheduled opening time.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 shrink-0 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        {autoSessionEnabled && (
                            <div className="flex flex-col items-end">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Daily Auto Trigger Time
                                </label>
                                <input 
                                    type="time"
                                    disabled={isSavingAutoSession}
                                    value={autoSessionTime}
                                    onChange={(e) => {
                                        setAutoSessionTime(e.target.value);
                                        saveAutoSessionSettings(autoSessionEnabled, e.target.value);
                                    }}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none shadow-sm"
                                />
                            </div>
                        )}
                        <div className="flex flex-col items-center">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                {autoSessionEnabled ? "Enabled" : "Disabled"}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    disabled={isSavingAutoSession}
                                    checked={autoSessionEnabled}
                                    onChange={(e) => {
                                        const enabled = e.target.checked;
                                        setAutoSessionEnabled(enabled);
                                        saveAutoSessionSettings(enabled, autoSessionTime);
                                    }}
                                />
                                <div className={`w-[48px] h-[26px] rounded-full transition-colors duration-200 relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${autoSessionEnabled ? 'bg-emerald-500 after:translate-x-5.5' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                            </label>
                        </div>
                        <button
                            onClick={handleTriggerNow}
                            disabled={isTriggeringNow}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                            title="Instantly trigger automated session creation for all branch queues"
                        >
                            {isTriggeringNow ? "Rollover in Progress..." : "Run Session Rollover Now"}
                        </button>
                    </div>
                </div>

                {/* Queue Summary Bar */}
                <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Queues Included in Daily Auto-Session:</span>
                        {existingQueues.length > 0 ? (
                            existingQueues.map(q => (
                                <span key={q.id} className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 text-[11px] inline-flex items-center gap-1.5 shadow-2xs">
                                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{q.prefix}</span> {q.name}
                                </span>
                            ))
                        ) : (
                            <span className="text-slate-400 italic">No queues found in this branch</span>
                        )}
                    </div>
                    <span className="text-[12px] font-semibold text-slate-500">
                        {existingQueues.length} Active Queue(s)
                    </span>
                </div>
            </div>

            <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />

            {/* Branch Queues Automated Configuration Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-[18px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CalendarRange className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Queue Automated Daily Schedules
                    </h2>
                    <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1">
                        Configure operating hours, token prefixes, and starting sequences directly within each queue.
                    </p>
                </div>
                <button 
                    onClick={() => router.push(`/${orgSlug}/dashboard/queues?action=create`)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[14px] font-semibold rounded-xl transition-all shadow-sm shadow-indigo-600/20 active:scale-95 shrink-0"
                >
                    <Plus size={16} />
                    Add Queue to Branch
                </button>
            </div>

            {/* Queue Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {existingQueues.length === 0 && !isLoading && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm mb-4">
                            <Layers className="w-6 h-6 text-slate-400" />
                        </div>
                        <h3 className="text-[16px] font-bold text-slate-900 dark:text-white mb-1">No Queues Configured</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-[14px] max-w-sm mb-6">Create branch queues to enable automated daily sessions.</p>
                        <button 
                            onClick={() => router.push(`/${orgSlug}/dashboard/queues?action=create`)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[14px] font-semibold rounded-xl transition-all shadow-sm"
                        >
                            <Plus size={16} />
                            Create Queue
                        </button>
                    </div>
                )}

                {existingQueues.map(queue => (
                    <div 
                        key={queue.id} 
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-center shadow-2xs">
                                    <span className="text-[16px] font-extrabold text-indigo-700 dark:text-indigo-300 font-mono uppercase">
                                        {queue.prefix || "A"}
                                    </span>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                    queue.is_active 
                                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40" 
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                }`}>
                                    {queue.is_active ? "Active Queue" : "Inactive"}
                                </span>
                            </div>

                            <h3 className="text-[16px] font-bold text-slate-900 dark:text-white mb-1">
                                {queue.name}
                            </h3>

                            {/* Schedule & Parameters Details */}
                            <div className="my-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Daily Operating Hours:</span>
                                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                                        {queue.open_time && queue.close_time 
                                            ? `${queue.open_time} – ${queue.close_time}`
                                            : "Full Day (24h)"}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Starting Token #:</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                        {queue.prefix}{queue.starting_sequence || 1}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Queue Type:</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        {(queue.service_lines || 0) > 0 ? `${queue.service_lines} Counter Lanes` : "Standard Queue"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-[12px] font-medium text-slate-500 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                Ready for Auto-Session
                            </span>
                            <button
                                onClick={() => setSelectedQueueToEdit(queue)}
                                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors inline-flex items-center gap-1"
                            >
                                Edit Settings
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Queue Modal */}
            {selectedQueueToEdit && (
                <EditQueueModal
                    isOpen={!!selectedQueueToEdit}
                    queue={selectedQueueToEdit}
                    onClose={() => setSelectedQueueToEdit(null)}
                    onUpdated={() => {
                        setSelectedQueueToEdit(null);
                        loadData();
                    }}
                />
            )}

        </div>
    );
}

