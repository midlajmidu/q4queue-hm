"use client";

import React, { useState, useRef, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import { LayoutList, GitBranch, Bookmark } from "lucide-react";
import { QueueTemplate } from "@/types/api";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateQueueModal({ isOpen, onClose, onCreated }: Props) {
    const [name, setName] = useState("");
    const [prefix, setPrefix] = useState("A");
    const [startingSequence, setStartingSequence] = useState<number>(1);
    const [queueType, setQueueType] = useState<"normal" | "service_lines">("normal");
    const [serviceLines, setServiceLines] = useState(2);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [templates, setTemplates] = useState<QueueTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            api.getOrganizationSettings().then(res => {
                if (res.queue_templates) setTemplates(res.queue_templates);
            }).catch(console.error);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setName("");
            setPrefix("A");
            setStartingSequence(1);
            setQueueType("normal");
            setServiceLines(2);
            setSelectedTemplateId("");
            setError(null);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape" && isOpen) onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        setError(null);
        try {
            await api.createQueue({
                name: name.trim(),
                prefix: prefix.trim() || "A",
                starting_sequence: startingSequence,
                service_lines: queueType === "service_lines" ? serviceLines : 0,
            });
            onCreated();
            onClose();
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setError(err.detail);
            } else {
                setError("Failed to create queue. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" style={{ maxHeight: "90vh", overflowY: "auto" }}>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Create New Queue</h3>
                <p className="text-sm text-gray-500 mb-5">Configure how this queue will serve customers.</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Templates */}
                    {templates.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                <Bookmark size={16} className="text-blue-500" />
                                Use a Template (Optional)
                            </label>
                            <select
                                value={selectedTemplateId}
                                onChange={(e) => {
                                    const id = e.target.value;
                                    setSelectedTemplateId(id);
                                    if (id) {
                                        const t = templates.find(x => x.id === id);
                                        if (t) {
                                            setName(t.name);
                                            setPrefix(t.defaultPrefix || "");
                                            setStartingSequence(t.startingNumber || 1);
                                        }
                                    } else {
                                        setName("");
                                        setPrefix("A");
                                        setStartingSequence(1);
                                    }
                                }}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                                disabled={isLoading}
                            >
                                <option value="">-- No Template --</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} (Prefix: {t.defaultPrefix || 'None'}, Starts at: {t.startingNumber || 1})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Queue Name</label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. General Consultation"
                            required
                            maxLength={150}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Prefix and Starting Sequence */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Token Prefix</label>
                            <input
                                type="text"
                                value={prefix}
                                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                                placeholder="A"
                                maxLength={10}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                disabled={isLoading}
                            />
                            <p className="mt-1 text-xs text-gray-500">e.g. A, B, VIP...</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Starting Num</label>
                            <input
                                type="number"
                                value={startingSequence}
                                onChange={(e) => setStartingSequence(parseInt(e.target.value) || 1)}
                                min={1}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                disabled={isLoading}
                            />
                            <p className="mt-1 text-xs text-gray-500">First token number.</p>
                        </div>
                    </div>

                    {/* Queue Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Queue Mode</label>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Normal */}
                            <button
                                type="button"
                                onClick={() => setQueueType("normal")}
                                className={`flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${queueType === "normal"
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300 bg-white"
                                    }`}
                            >
                                <div className={`p-1.5 rounded-lg ${queueType === "normal" ? "bg-blue-100" : "bg-gray-100"}`}>
                                    <LayoutList size={16} className={queueType === "normal" ? "text-blue-600" : "text-gray-500"} />
                                </div>
                                <div>
                                    <div className={`text-sm font-semibold ${queueType === "normal" ? "text-blue-700" : "text-gray-700"}`}>
                                        Single Counter
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">One serving station</div>
                                </div>
                            </button>

                            {/* Service Lines */}
                            <button
                                type="button"
                                onClick={() => setQueueType("service_lines")}
                                className={`flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${queueType === "service_lines"
                                    ? "border-purple-500 bg-purple-50"
                                    : "border-gray-200 hover:border-gray-300 bg-white"
                                    }`}
                            >
                                <div className={`p-1.5 rounded-lg ${queueType === "service_lines" ? "bg-purple-100" : "bg-gray-100"}`}>
                                    <GitBranch size={16} className={queueType === "service_lines" ? "text-purple-600" : "text-gray-500"} />
                                </div>
                                <div>
                                    <div className={`text-sm font-semibold ${queueType === "service_lines" ? "text-purple-700" : "text-gray-700"}`}>
                                        Service Lines
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">Multiple lanes / counters</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Number of Lines (only if service_lines mode) */}
                    {queueType === "service_lines" && (
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                            <label className="block text-sm font-semibold text-purple-800 mb-2">
                                Number of Service Lines
                            </label>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setServiceLines(Math.max(2, serviceLines - 1))}
                                    className="w-8 h-8 rounded-lg bg-white border border-purple-300 text-purple-700 font-bold text-lg flex items-center justify-center hover:bg-purple-100 transition-colors"
                                >
                                    −
                                </button>
                                <span className="text-2xl font-bold text-purple-700 min-w-[2rem] text-center">{serviceLines}</span>
                                <button
                                    type="button"
                                    onClick={() => setServiceLines(Math.min(50, serviceLines + 1))}
                                    className="w-8 h-8 rounded-lg bg-white border border-purple-300 text-purple-700 font-bold text-lg flex items-center justify-center hover:bg-purple-100 transition-colors"
                                >
                                    +
                                </button>
                                <span className="text-sm text-purple-600 ml-1">
                                    {serviceLines === 1 ? "line" : "lines"}
                                </span>
                            </div>
                            <p className="mt-2 text-xs text-purple-600">
                                Staff will manage each line independently from the dashboard.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Creating..." : "Create Queue"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
