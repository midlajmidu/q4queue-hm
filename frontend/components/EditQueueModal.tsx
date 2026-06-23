"use client";

import React, { useState, useRef, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import type { QueueResponse } from "@/types/api";

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
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && queue) {
            setName(queue.name || "");
            setPrefix(queue.prefix || "A");
            setStartingSequence(queue.starting_sequence || 1);
            setOpenTime(queue.open_time || "");
            setCloseTime(queue.close_time || "");
            if ((queue.service_lines || 0) > 0) {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!queue || !name.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            await api.updateQueue(queue.id, { 
                name: name.trim(), 
                prefix: prefix.trim() || "A",
                starting_sequence: startingSequence || 1,
                open_time: openTime || undefined,
                close_time: closeTime || undefined,
                service_lines: queueType === "service_lines" ? serviceLines : 0,
            });
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
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 ring-1 ring-slate-900/5">
                <h3 className="text-xl font-bold text-slate-800 mb-6 tracking-tight">Edit Queue Settings</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Queue Name</label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. General Consultation"
                            required
                            maxLength={150}
                            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-shadow"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Token Prefix</label>
                            <input
                                type="text"
                                value={prefix}
                                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                                placeholder="A"
                                maxLength={10}
                                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-shadow"
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Sequence</label>
                            <input
                                type="number"
                                min="1"
                                value={startingSequence}
                                onChange={(e) => setStartingSequence(parseInt(e.target.value))}
                                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-shadow"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Open Time (Optional)</label>
                            <input
                                type="time"
                                value={openTime}
                                onChange={(e) => setOpenTime(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-shadow"
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Close Time (Optional)</label>
                            <input
                                type="time"
                                value={closeTime}
                                onChange={(e) => setCloseTime(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-shadow"
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Queue Type */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Queue Mode</label>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Normal */}
                            <button
                                type="button"
                                onClick={() => setQueueType("normal")}
                                className={`flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${queueType === "normal"
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-slate-200 hover:border-slate-300 bg-white"
                                    }`}
                            >
                                <div>
                                    <div className={`text-sm font-semibold ${queueType === "normal" ? "text-blue-700" : "text-slate-700"}`}>
                                        Single Counter
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">One serving station</div>
                                </div>
                            </button>

                            {/* Service Lines */}
                            <button
                                type="button"
                                onClick={() => setQueueType("service_lines")}
                                className={`flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${queueType === "service_lines"
                                    ? "border-purple-500 bg-purple-50"
                                    : "border-slate-200 hover:border-slate-300 bg-white"
                                    }`}
                            >
                                <div>
                                    <div className={`text-sm font-semibold ${queueType === "service_lines" ? "text-purple-700" : "text-slate-700"}`}>
                                        Service Lines
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">Multiple lanes / counters</div>
                                </div>
                            </button>
                        </div>
                        {queueType === "service_lines" && (
                            <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100 animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-semibold text-purple-900 mb-1.5">Number of Service Lines</label>
                                <input
                                    type="number"
                                    min="2"
                                    max="20"
                                    value={serviceLines}
                                    onChange={(e) => setServiceLines(parseInt(e.target.value) || 2)}
                                    className="w-full rounded-xl border border-purple-200 px-3.5 py-2.5 text-sm text-purple-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                    disabled={isLoading}
                                />
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-700 text-sm font-medium p-3 rounded-xl border border-red-200">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
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
