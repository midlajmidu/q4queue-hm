"use client";

import React, { useState, useRef, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import type { QueueResponse, TableConfig } from "@/types/api";
import { Clock, CheckCircle2, AlertCircle, Utensils, Trash2, PlusCircle } from "lucide-react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void;
    queue: QueueResponse | null;
}

export default function EditQueueModal({ isOpen, onClose, onUpdated, queue }: Props) {
    const [name, setName] = useState("");
    const [prefix, setPrefix] = useState("A");
    const [startingSequence, setStartingSequence] = useState<number>(1);
    const [openTime, setOpenTime] = useState("");
    const [closeTime, setCloseTime] = useState("");
    const [queueType, setQueueType] = useState<"normal" | "service_lines">("normal");
    const [serviceLines, setServiceLines] = useState(2);
    const [tables, setTables] = useState<TableConfig[]>([]);

    const isDineQueue = Boolean(queue?.table_config && queue.table_config.length > 0);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && queue) {
            setName(queue.name || "");
            setPrefix(queue.prefix || (queue.table_config?.length ? "T" : "A"));
            setStartingSequence(queue.starting_sequence || 1);
            setOpenTime(queue.open_time || "");
            setCloseTime(queue.close_time || "");
            if (queue.table_config && queue.table_config.length > 0) {
                setTables(queue.table_config);
            } else if ((queue.service_lines || 0) > 0) {
                setQueueType("service_lines");
                setServiceLines(queue.service_lines || 2);
            } else {
                setQueueType("normal");
                setServiceLines(2);
            }
            setError(null);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, queue]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape" && isOpen) onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    const addTable = () => {
        setTables(prev => [
            ...prev,
            { id: prev.length + 1, name: `Table ${prev.length + 1}`, capacity: 4, section: "Main" }
        ]);
    };

    const updateTable = (index: number, updates: Partial<TableConfig>) => {
        setTables(prev => {
            const next = [...prev];
            next[index] = { ...next[index], ...updates };
            return next;
        });
    };

    const removeTable = (index: number) => {
        if (tables.length <= 1) {
            setError("At least one table is required.");
            return;
        }
        setTables(prev => {
            const filtered = prev.filter((_, i) => i !== index);
            return filtered.map((t, i) => ({ ...t, id: i + 1 }));
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!queue || !name.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            const payload: Parameters<typeof api.updateQueue>[1] = { 
                name: name.trim(), 
                prefix: prefix.trim() || (isDineQueue ? "T" : "A"),
                starting_sequence: startingSequence || 1,
                open_time: openTime || undefined,
                close_time: closeTime || undefined,
            };

            if (isDineQueue) {
                payload.service_lines = tables.length;
                payload.table_config = tables.map((t, idx) => ({
                    id: idx + 1,
                    name: t.name.trim() || `Table ${idx + 1}`,
                    capacity: Number(t.capacity) || 4,
                    section: t.section?.trim() || undefined,
                }));
            } else {
                payload.service_lines = queueType === "service_lines" ? serviceLines : 0;
            }

            await api.updateQueue(queue.id, payload);
            onUpdated();
            onClose();
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setError(err.detail);
            } else {
                setError("Failed to update queue. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !queue) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative bg-white dark:bg-slate-900 border border-transparent dark:border-white/10 rounded-2xl shadow-2xl ${isDineQueue ? "max-w-lg" : "max-w-md"} w-full p-6 ring-1 ring-slate-900/5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto`}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                            {isDineQueue ? "Dining Floor Settings" : "Queue Settings"}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {isDineQueue ? "Configure table capacities, section names, and operating hours." : "Configure queue parameters and automated daily session schedule."}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            {isDineQueue ? "Floor / Section Name" : "Queue Name"}
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={isDineQueue ? "e.g. Dining Floor" : "e.g. General Consultation"}
                            required
                            maxLength={150}
                            className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-shadow"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Token Prefix</label>
                            <input
                                type="text"
                                value={prefix}
                                onChange={(e) => setPrefix(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
                                placeholder={isDineQueue ? "T" : "A"}
                                maxLength={3}
                                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-shadow"
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Start Sequence</label>
                            <input
                                type="number"
                                min="1"
                                value={startingSequence}
                                onChange={(e) => setStartingSequence(parseInt(e.target.value) || 1)}
                                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-shadow"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Daily Automated Operating Schedule */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            Daily Operating Hours
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Open Time</label>
                                <input
                                    type="time"
                                    value={openTime}
                                    onChange={(e) => setOpenTime(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none"
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Close Time</label>
                                <input
                                    type="time"
                                    value={closeTime}
                                    onChange={(e) => setCloseTime(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                            Supports overnight operating hours (e.g. 09:00 AM to 03:00 AM next day).
                        </p>
                    </div>

                    {/* Queue Mode / Table Setup */}
                    {isDineQueue ? (
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Utensils className="w-3.5 h-3.5 text-amber-500" />
                                    Tables & Seating ({tables.length})
                                </label>
                                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                                    Total {tables.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0)} Seats
                                </span>
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 rounded-xl border border-slate-200 dark:border-white/10 p-2 bg-slate-50/50 dark:bg-slate-800/40">
                                {tables.map((tbl, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-white/10">
                                        <div className="w-6 h-6 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center text-[11px] font-black shrink-0">
                                            T{idx + 1}
                                        </div>
                                        <input
                                            type="text"
                                            value={tbl.name}
                                            onChange={(e) => updateTable(idx, { name: e.target.value })}
                                            placeholder={`Table ${idx + 1}`}
                                            className="w-24 px-2 py-1 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:border-amber-500"
                                        />
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-slate-400 font-bold">Pax:</span>
                                            <div className="flex items-center gap-0.5">
                                                {[2, 4, 6, 8].map(cap => (
                                                    <button
                                                        key={cap}
                                                        type="button"
                                                        onClick={() => updateTable(idx, { capacity: cap })}
                                                        className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors ${
                                                            tbl.capacity === cap
                                                                ? "bg-amber-500 text-white"
                                                                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                                                        }`}
                                                    >
                                                        {cap}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            value={tbl.section || ""}
                                            onChange={(e) => updateTable(idx, { section: e.target.value })}
                                            placeholder="Section"
                                            className="flex-1 min-w-[60px] px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeTable(idx)}
                                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                            title="Delete Table"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={addTable}
                                className="w-full py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 rounded-lg border border-amber-200 dark:border-amber-900/40 flex items-center justify-center gap-1.5"
                            >
                                <PlusCircle className="w-3.5 h-3.5" />
                                Add Table
                            </button>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Queue Mode</label>
                            <div className="grid grid-cols-2 gap-3">
                                {/* Normal */}
                                <button
                                    type="button"
                                    onClick={() => setQueueType("normal")}
                                    className={`flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${queueType === "normal"
                                        ? "border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60"
                                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                                        }`}
                                >
                                    <div>
                                        <div className={`text-sm font-semibold ${queueType === "normal" ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-300"}`}>
                                            Single Counter
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">One serving station</div>
                                    </div>
                                </button>

                                {/* Service Lines */}
                                <button
                                    type="button"
                                    onClick={() => setQueueType("service_lines")}
                                    className={`flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${queueType === "service_lines"
                                        ? "border-purple-500 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/60"
                                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                                        }`}
                                >
                                    <div>
                                        <div className={`text-sm font-semibold ${queueType === "service_lines" ? "text-purple-700 dark:text-purple-300" : "text-slate-700 dark:text-slate-300"}`}>
                                            Service Lanes
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Multiple lanes / counters</div>
                                    </div>
                                </button>
                            </div>
                            {queueType === "service_lines" && (
                                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/60 rounded-xl border border-purple-100 dark:border-purple-900/40 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-sm font-semibold text-purple-900 dark:text-purple-300 mb-1.5">Number of Service Lanes</label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="20"
                                        value={serviceLines}
                                        onChange={(e) => setServiceLines(parseInt(e.target.value) || 2)}
                                        className="w-full rounded-xl border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-purple-900 dark:text-purple-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                        disabled={isLoading}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-sm font-medium p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

