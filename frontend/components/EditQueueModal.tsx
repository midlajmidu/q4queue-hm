"use client";

import React, { useState, useRef, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import type { QueueResponse, TableConfig } from "@/types/api";
import { useBranch } from "@/context/BranchContext";
import { Clock, CheckCircle2, AlertCircle, Utensils, Trash2, PlusCircle, X, Users, Layers, Building2, Coffee, Sparkles, ChevronRight } from "lucide-react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void;
    queue: QueueResponse | null;
}

export default function EditQueueModal({ isOpen, onClose, onUpdated, queue }: Props) {
    const { hasAppointmentFeature } = useBranch();
    const [name, setName] = useState("");
    const [prefix, setPrefix] = useState("A");
    const [startingSequence, setStartingSequence] = useState<number>(1);
    const [openTime, setOpenTime] = useState("");
    const [closeTime, setCloseTime] = useState("");
    const [queueType, setQueueType] = useState<"normal" | "service_lines" | "zone">("normal");
    const [maxCapacity, setMaxCapacity] = useState<number>(15);
    const [zoneDurationMins, setZoneDurationMins] = useState<number>(30);
    const [serviceLines, setServiceLines] = useState(2);
    const [appointmentEnabled, setAppointmentEnabled] = useState(false);
    const [tables, setTables] = useState<TableConfig[]>([]);

    // Multi-floor state for Dine-in queue
    const [floorsSetup, setFloorsSetup] = useState<Array<{ id: string; name: string }>>([
        { id: "ground", name: "Ground Floor (Down)" },
    ]);
    const [activeSetupFloorId, setActiveSetupFloorId] = useState<string>("ground");
    const [isAddingFloor, setIsAddingFloor] = useState(false);
    const [newFloorInputName, setNewFloorInputName] = useState("");

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
            setAppointmentEnabled(!!queue.appointment_enabled);
            if (queue.table_config && queue.table_config.length > 0) {
                // Discover floors from localStorage or from existing table sections
                let detectedFloors: Array<{ id: string; name: string }> = [];
                try {
                    const stored = localStorage.getItem(`floor_layout_${queue.id}`);
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed.floors) && parsed.floors.length > 0) {
                            detectedFloors = parsed.floors.map((f: any) => ({
                                id: String(f.id),
                                name: String(f.name || (f.id === "ground" ? "Ground Floor" : f.id)),
                            }));
                        }
                    }
                } catch (_) {}

                const rawSections = Array.from(new Set(queue.table_config.map(t => t.section).filter(Boolean))) as string[];
                if (detectedFloors.length > 0) {
                    rawSections.forEach(sec => {
                        if (!detectedFloors.some(f => f.id === sec)) {
                            detectedFloors.push({
                                id: sec,
                                name: sec === "ground" ? "Ground Floor (Down)" : sec === "floor_2" ? "First Floor (Up)" : sec,
                            });
                        }
                    });
                    setFloorsSetup(detectedFloors);
                    setActiveSetupFloorId(detectedFloors[0].id);
                } else if (rawSections.length > 1) {
                    const built = rawSections.map(sec => ({
                        id: sec,
                        name: sec === "ground" ? "Ground Floor (Down)" : sec === "floor_2" ? "First Floor (Up)" : sec,
                    }));
                    setFloorsSetup(built);
                    setActiveSetupFloorId(built[0].id);
                } else {
                    setFloorsSetup([{ id: "ground", name: "Ground Floor (Down)" }]);
                    setActiveSetupFloorId("ground");
                }

                setTables(queue.table_config.map(t => ({
                    ...t,
                    section: t.section || "ground",
                })));
            } else if (queue.queue_type === "zone" || (queue.max_capacity && queue.max_capacity > 0)) {
                setQueueType("zone");
                setMaxCapacity(queue.max_capacity || 15);
                setZoneDurationMins(queue.zone_duration_mins || 30);
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

    const addFloorSetup = (customName?: string) => {
        if (floorsSetup.length >= 5) {
            setError("Maximum 5 floors or areas supported.");
            return;
        }
        const nextNum = floorsSetup.length + 1;
        const defaultNames = ["First Floor (Up)", "Second Floor (Up)", "Outdoor Terrace", "Rooftop Lounge"];
        const floorName = (customName || newFloorInputName).trim() || defaultNames[nextNum - 2] || `Floor ${nextNum}`;
        const newId = `floor_${Date.now()}`;

        setFloorsSetup(prev => [...prev, { id: newId, name: floorName }]);
        setActiveSetupFloorId(newId);
        setIsAddingFloor(false);
        setNewFloorInputName("");

        // If currently 1 floor and >= 4 tables, automatically split half to the new floor
        if (floorsSetup.length === 1 && tables.length >= 4) {
            const moveCount = Math.floor(tables.length / 2);
            setTables(prev => {
                const updated = [...prev];
                for (let i = updated.length - moveCount; i < updated.length; i++) {
                    updated[i] = { ...updated[i], section: newId };
                }
                return updated;
            });
        }
    };

    const removeFloorSetup = (id: string) => {
        if (floorsSetup.length <= 1) {
            setError("At least one floor or area is required.");
            return;
        }
        const remaining = floorsSetup.filter(f => f.id !== id);
        const fallbackId = remaining[0].id;
        setTables(prev => prev.map(t => (t.section === id ? { ...t, section: fallbackId } : t)));
        setFloorsSetup(remaining);
        if (activeSetupFloorId === id) {
            setActiveSetupFloorId(fallbackId);
        }
    };

    const quickSplitFloors = (counts: number[]) => {
        let targetFloors = [...floorsSetup];
        if (targetFloors.length < 2) {
            const newFloorId = "floor_2";
            targetFloors = [
                { id: "ground", name: "Ground Floor (Down)" },
                { id: newFloorId, name: "First Floor (Up)" },
            ];
            setFloorsSetup(targetFloors);
            setActiveSetupFloorId("ground");
        }

        const totalNeeded = counts.reduce((a, b) => a + b, 0);
        setTables(prev => {
            let pool = [...prev];
            if (pool.length < totalNeeded) {
                const diff = totalNeeded - pool.length;
                for (let i = 0; i < diff; i++) {
                    const nid = pool.length + 1;
                    pool.push({ id: nid, name: `Table ${nid}`, capacity: 4, section: "ground" });
                }
            } else if (pool.length > totalNeeded) {
                pool = pool.slice(0, totalNeeded);
            }

            let startIdx = 0;
            const updated: TableConfig[] = [];
            targetFloors.forEach((fl, flIdx) => {
                const targetC = counts[flIdx] || 0;
                for (let i = 0; i < targetC && startIdx < pool.length; i++, startIdx++) {
                    updated.push({
                        ...pool[startIdx],
                        id: updated.length + 1,
                        section: fl.id,
                    });
                }
            });
            return updated;
        });
    };

    const moveTableToFloor = (index: number, targetFloorId: string) => {
        setTables(prev => {
            const next = [...prev];
            next[index] = { ...next[index], section: targetFloorId };
            return next;
        });
    };

    const addTable = () => {
        if (tables.length >= 50) {
            setError("Maximum 50 tables allowed for now.");
            return;
        }
        setTables(prev => [
            ...prev,
            { id: prev.length + 1, name: `Table ${prev.length + 1}`, capacity: 4, section: activeSetupFloorId }
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
                appointment_enabled: hasAppointmentFeature ? appointmentEnabled : false,
            };

            if (isDineQueue) {
                const formattedTables = tables.map((t, idx) => ({
                    id: idx + 1,
                    name: t.name.trim() || `Table ${idx + 1}`,
                    capacity: Number(t.capacity) || 4,
                    section: t.section || "ground",
                }));
                payload.table_config = formattedTables;
                payload.service_lines = formattedTables.length;

                // Sync localStorage floor layout so 3D scene renders updated multi-floor assignments
                try {
                    const storedKey = `floor_layout_${queue.id}`;
                    const existingRaw = localStorage.getItem(storedKey);
                    let currentLayout = existingRaw ? JSON.parse(existingRaw) : null;
                    if (!currentLayout || !Array.isArray(currentLayout.floors)) {
                        currentLayout = {
                            version: 2,
                            floors: floorsSetup.map((fl, fIdx) => ({
                                id: fl.id,
                                name: fl.name,
                                floor_number: fIdx + 1,
                                room_width: 28,
                                room_depth: 28,
                                theme: fIdx === 0 ? "city_daylight" : "dark_modern",
                                tables: [],
                                walls: [],
                                decorations: [],
                            })),
                        };
                    }

                    const updatedFloors = floorsSetup.map((fl, fIdx) => {
                        const existingFloor = currentLayout.floors.find((f: any) => f.id === fl.id);
                        const floorTables = formattedTables.filter(t => (t.section || "ground") === fl.id);
                        const autoPlaced = floorTables.map((t, idx) => {
                            const cols = Math.min(5, Math.ceil(Math.sqrt(floorTables.length)));
                            const col = idx % cols;
                            const row = Math.floor(idx / cols);
                            const stepX = 28 / (cols + 1);
                            const stepZ = 28 / (Math.ceil(floorTables.length / cols) + 1);
                            return {
                                id: t.id,
                                name: t.name,
                                capacity: t.capacity,
                                section: fl.id,
                                shape: (t.capacity >= 8 ? "banquet" : t.capacity >= 6 ? "round" : "square") as any,
                                x: Math.round((stepX * (col + 1)) * 10) / 10,
                                z: Math.round((stepZ * (row + 1)) * 10) / 10,
                                rotation: 0,
                            };
                        });

                        return {
                            id: fl.id,
                            name: fl.name,
                            floor_number: fIdx + 1,
                            room_width: existingFloor?.room_width || 28,
                            room_depth: existingFloor?.room_depth || 28,
                            theme: existingFloor?.theme || (fIdx === 0 ? "city_daylight" : "dark_modern"),
                            tables: autoPlaced,
                            walls: existingFloor?.walls || [],
                            decorations: existingFloor?.decorations || [],
                            hasEntranceCounter: existingFloor?.hasEntranceCounter ?? (fIdx === 0),
                        };
                    });

                    localStorage.setItem(storedKey, JSON.stringify({
                        version: 2,
                        floors: updatedFloors,
                        selectedFloorId: floorsSetup[0].id,
                    }));
                } catch (_) {}
            } else {
                payload.queue_type = queueType;
                payload.service_lines = queueType === "service_lines" ? serviceLines : 0;
                payload.max_capacity = queueType === "zone" ? maxCapacity : 0;
                payload.zone_duration_mins = queueType === "zone" && zoneDurationMins ? zoneDurationMins : null;
            }

            await api.updateQueue(queue.id, payload);
            onUpdated();
            onClose();
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : "Failed to update queue settings.";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !queue) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in" 
                onClick={onClose} 
            />

            {/* Slide-over Drawer Container */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-6 md:pl-10">
                <div className={`w-screen ${isDineQueue ? "max-w-xl md:max-w-2xl" : "max-w-lg md:max-w-xl"} bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/80 dark:border-white/10 flex flex-col h-full animate-in slide-in-from-right duration-300 ease-out`}>
                    
                    {/* Sticky Drawer Header */}
                    <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-white/5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-start justify-between gap-4 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-xl ${isDineQueue ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400" : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"} flex items-center justify-center shrink-0`}>
                                {isDineQueue ? (
                                    <Utensils className="w-5 h-5" />
                                ) : (
                                    <Clock className="w-5 h-5" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                                    {isDineQueue ? "Dining Floor Settings" : "Queue Settings"}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                    {isDineQueue ? "Configure table capacities and operating hours." : "Configure queue parameters and automated daily session schedule."}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Form Body with Scrollable Area and Sticky Footer */}
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-5">
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
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                        <Utensils className="w-3.5 h-3.5 text-amber-500" />
                                        Table Floor & Area Setup
                                    </label>
                                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-900/40">
                                        {floorsSetup.length} {floorsSetup.length === 1 ? "Floor" : "Floors"} · {tables.length} Tables · {tables.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0)} Seats
                                    </span>
                                </div>

                                {/* Floor Overview Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                                    {floorsSetup.map((fl, fIdx) => {
                                        const count = tables.filter(t => (t.section || "ground") === fl.id).length;
                                        const isActive = activeSetupFloorId === fl.id;
                                        return (
                                            <div
                                                key={fl.id}
                                                onClick={() => setActiveSetupFloorId(fl.id)}
                                                className={`p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                                                    isActive
                                                        ? "border-amber-500 bg-amber-500/10 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-1 ring-amber-500/30"
                                                        : "border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-slate-300"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold truncate flex items-center gap-1.5">
                                                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                                                        {fl.name}
                                                    </span>
                                                    {floorsSetup.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeFloorSetup(fl.id);
                                                            }}
                                                            className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer"
                                                            title="Remove Floor"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between mt-1 text-[11px]">
                                                    <span className="text-slate-500 dark:text-slate-400 font-medium">{count} tables</span>
                                                    {isActive && (
                                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                            ● Active
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Quick Split Action Buttons */}
                                <div className="p-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-900/40 mb-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                            Quick Table Split Presets
                                        </span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Instant distribution</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => quickSplitFloors([8, 12])}
                                            className="px-2.5 py-1 text-xs font-black rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                        >
                                            <span>⚡ 8 Down / 12 Up (20 Tables)</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => quickSplitFloors([10, 10])}
                                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:border-amber-400 transition-all cursor-pointer"
                                        >
                                            10 / 10 Even Split
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const half = Math.ceil(tables.length / 2);
                                                quickSplitFloors([half, Math.max(0, tables.length - half)]);
                                            }}
                                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:border-amber-400 transition-all cursor-pointer"
                                        >
                                            Split Current 50/50
                                        </button>
                                    </div>
                                </div>

                                {/* Add New Floor / Area Control */}
                                <div className="mb-3">
                                    {isAddingFloor ? (
                                        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 animate-in fade-in">
                                            <input
                                                type="text"
                                                value={newFloorInputName}
                                                onChange={(e) => setNewFloorInputName(e.target.value)}
                                                placeholder="e.g. First Floor (Up), Terrace, VIP Room"
                                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-500"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        addFloorSetup();
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => addFloorSetup()}
                                                className="px-3 py-1 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition-colors"
                                            >
                                                Add
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAddingFloor(false);
                                                    setNewFloorInputName("");
                                                }}
                                                className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingFloor(true)}
                                            disabled={floorsSetup.length >= 5}
                                            className="w-full py-1.5 px-3 rounded-xl border border-dashed border-amber-300 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                                        >
                                            <PlusCircle className="w-3.5 h-3.5" />
                                            + Add New Floor / Area (Max 5)
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Floor Filter Tabs */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setActiveSetupFloorId("all")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                                        activeSetupFloorId === "all"
                                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                >
                                    All Tables ({tables.length})
                                </button>
                                {floorsSetup.map(fl => {
                                    const count = tables.filter(t => (t.section || "ground") === fl.id).length;
                                    const isSel = activeSetupFloorId === fl.id;
                                    return (
                                        <button
                                            key={fl.id}
                                            type="button"
                                            onClick={() => setActiveSetupFloorId(fl.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                                                isSel
                                                    ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            }`}
                                        >
                                            <span>{fl.name}</span>
                                            <span className={`text-[10px] px-1 rounded-full ${isSel ? "bg-black/20 text-slate-950" : "bg-slate-200 dark:bg-slate-700"}`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Tables list filtered by active floor */}
                            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 rounded-xl border border-slate-200 dark:border-white/10 p-2 bg-slate-50/50 dark:bg-slate-800/40">
                                {tables
                                    .map((tbl, originalIdx) => ({ tbl, originalIdx }))
                                    .filter(({ tbl }) => activeSetupFloorId === "all" || (tbl.section || "ground") === activeSetupFloorId)
                                    .map(({ tbl, originalIdx }) => (
                                        <div key={originalIdx} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white dark:bg-slate-800 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-white/10">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="w-6 h-6 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center text-[11px] font-black shrink-0">
                                                    T{originalIdx + 1}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={tbl.name}
                                                    onChange={(e) => updateTable(originalIdx, { name: e.target.value })}
                                                    placeholder={`Table ${originalIdx + 1}`}
                                                    className="flex-1 min-w-[70px] px-2 py-1 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:border-amber-500"
                                                />

                                                {/* Floor Assignment Dropdown */}
                                                {floorsSetup.length > 1 && (
                                                    <select
                                                        value={tbl.section || "ground"}
                                                        onChange={(e) => moveTableToFloor(originalIdx, e.target.value)}
                                                        className="text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded px-1.5 py-1 border border-transparent hover:border-amber-400 focus:outline-none cursor-pointer max-w-[120px] truncate"
                                                        title="Assign to Floor"
                                                    >
                                                        {floorsSetup.map(fl => (
                                                            <option key={fl.id} value={fl.id}>
                                                                {fl.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-slate-400 font-bold">Pax:</span>
                                                    <div className="flex items-center gap-0.5">
                                                        {[2, 4, 6, 8, 10].map(cap => (
                                                            <button
                                                                key={cap}
                                                                type="button"
                                                                onClick={() => updateTable(originalIdx, { capacity: cap })}
                                                                className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors ${
                                                                    tbl.capacity === cap
                                                                        ? "bg-amber-500 text-white font-black"
                                                                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                                                                }`}
                                                            >
                                                                {cap}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTable(originalIdx)}
                                                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                                    title="Delete Table"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>

                            <button
                                type="button"
                                onClick={addTable}
                                disabled={tables.length >= 50}
                                className="w-full py-2 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 rounded-lg border border-amber-200 dark:border-amber-900/40 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PlusCircle className="w-3.5 h-3.5" />
                                {tables.length >= 50
                                    ? "Maximum 50 Tables Reached"
                                    : `Add Table to ${floorsSetup.find(f => f.id === activeSetupFloorId)?.name || "Floor"} (${tables.length}/50)`}
                            </button>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Queue Mode</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {/* Normal */}
                                <button
                                    type="button"
                                    onClick={() => setQueueType("normal")}
                                    className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border-2 text-left transition-all ${queueType === "normal"
                                        ? "border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60"
                                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                                        }`}
                                >
                                    <div>
                                        <div className={`text-xs font-bold ${queueType === "normal" ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-300"}`}>
                                            Single Counter
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">1 serving station</div>
                                    </div>
                                </button>

                                {/* Service Lines */}
                                <button
                                    type="button"
                                    onClick={() => setQueueType("service_lines")}
                                    className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border-2 text-left transition-all ${queueType === "service_lines"
                                        ? "border-indigo-500 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60"
                                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                                        }`}
                                >
                                    <div>
                                        <div className={`text-xs font-bold ${queueType === "service_lines" ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}`}>
                                            Service Lanes
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Multiple lanes</div>
                                    </div>
                                </button>

                                {/* Zone / Capacity */}
                                <button
                                    type="button"
                                    onClick={() => setQueueType("zone")}
                                    className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border-2 text-left transition-all ${queueType === "zone"
                                        ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60"
                                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                                        }`}
                                >
                                    <div>
                                        <div className={`text-xs font-bold flex items-center gap-1.5 ${queueType === "zone" ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}`}>
                                            <Users className="w-3.5 h-3.5" />
                                            <span>Zone / Capacity</span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Capacity pool</div>
                                    </div>
                                </button>
                            </div>

                            {queueType === "service_lines" && (
                                <div className="mt-3 p-3.5 bg-indigo-50/70 dark:bg-indigo-950/60 rounded-xl border border-indigo-100 dark:border-indigo-900/40 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1.5">Number of Service Lanes</label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="20"
                                        value={serviceLines}
                                        onChange={(e) => setServiceLines(parseInt(e.target.value) || 2)}
                                        className="w-full rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-indigo-900 dark:text-indigo-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                        disabled={isLoading}
                                    />
                                </div>
                            )}

                            {queueType === "zone" && (
                                <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">Max Capacity</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="500"
                                                value={maxCapacity}
                                                onChange={(e) => setMaxCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">Duration (Mins)</label>
                                            <input
                                                type="number"
                                                min="5"
                                                max="360"
                                                value={zoneDurationMins}
                                                onChange={(e) => setZoneDurationMins(Math.max(5, parseInt(e.target.value) || 30))}
                                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                                        Controls maximum concurrent occupancy for the zone.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Appointment Booking Checkbox */}
                    {hasAppointmentFeature && (
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={appointmentEnabled}
                                    onChange={(e) => setAppointmentEnabled(e.target.checked)}
                                    disabled={isLoading}
                                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-800 dark:text-white block">
                                        Add this into appointment booking
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-snug">
                                        When checked, this queue will be available for customers to choose and book online on the public booking portal.
                                    </span>
                                </div>
                            </label>
                        </div>
                    )}

                    {error && (
                        <div className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-sm font-medium p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                        </div>

                        {/* Sticky Drawer Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !name.trim()}
                                className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

