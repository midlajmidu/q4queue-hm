"use client";

import React, { useState, useMemo } from "react";
import { api, ApiError } from "@/lib/api";
import { ServingToken, WaitingToken, TableConfig } from "@/types/api";
import { 
    PhoneCall, 
    FastForward, 
    Check, 
    Users, 
    Utensils, 
    Sparkles, 
    Clock, 
    AlertTriangle,
    List,
    LayoutGrid,
    UserPlus
} from "lucide-react";
import { toast } from "sonner";

interface Props {
    queueId: string;
    tables: TableConfig[];
    allServingTokens: ServingToken[];
    prefix: string;
    onUpdate: () => void;
    isPaused?: boolean;
    isReadOnly?: boolean;
    waitingTokens?: WaitingToken[];
}

function getElapsedMinutes(isoString?: string | null): number {
    if (!isoString) return 0;
    const diffMs = Date.now() - new Date(isoString).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
}

export default function DineTableGrid({
    queueId,
    tables,
    allServingTokens,
    prefix,
    onUpdate,
    isPaused = false,
    isReadOnly = false,
    waitingTokens = [],
}: Props) {
    const [loadingTable, setLoadingTable] = useState<number | null>(null);
    const [selectedSection, setSelectedSection] = useState<string>("all");
    const [mobileExpandAll, setMobileExpandAll] = useState(false);
    const [expandedTable, setExpandedTable] = useState<number | null>(null);

    // Map table_id -> serving token
    const tableMap = useMemo(() => {
        const map = new Map<number, ServingToken>();
        for (const t of allServingTokens) {
            const completed = t.completed_lines ?? [];
            if (t.assigned_line !== null && t.assigned_line !== undefined && !completed.includes(t.assigned_line)) {
                map.set(t.assigned_line, t);
            }
        }
        return map;
    }, [allServingTokens]);

    // Unique sections
    const sections = useMemo(() => {
        const set = new Set<string>();
        tables.forEach(t => {
            if (t.section) set.add(t.section);
        });
        return Array.from(set);
    }, [tables]);

    // Filtered tables
    const filteredTables = useMemo(() => {
        if (selectedSection === "all") return tables;
        return tables.filter(t => (t.section || "Main Dining") === selectedSection);
    }, [tables, selectedSection]);

    // Call / Seat next customer to this table
    const seatNextToTable = async (tableId: number, tableCapacity: number) => {
        setLoadingTable(tableId);
        try {
            // Find best matching waiting party (where pax <= tableCapacity)
            const match = waitingTokens.find(w => (w.pax_count || 1) <= tableCapacity);
            if (match) {
                await api.serveSpecificToken(queueId, match.token_number, tableId);
                toast.success(`Seated Party #${prefix}${match.token_number} at Table ${tableId}`);
            } else {
                // Fallback to calling next in queue to this line
                const res = await api.callNext(queueId, "done", tableId);
                if ("message" in res) {
                    toast.info(res.message);
                } else {
                    toast.success(`Called next customer to Table ${tableId}`);
                }
            }
            onUpdate();
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : `Failed to seat customer at Table ${tableId}`;
            toast.error(msg);
        } finally {
            setLoadingTable(null);
        }
    };

    // Free / Clear Table (Bill Paid)
    const freeTable = async (tableId: number, tableName: string) => {
        setLoadingTable(tableId);
        try {
            await api.clearLine(queueId, tableId);
            toast.success(`${tableName} cleared & marked Available`);
            onUpdate();
        } catch {
            toast.error(`Failed to clear ${tableName}`);
        } finally {
            setLoadingTable(null);
        }
    };

    // Skip current party on table
    const skipTable = async (tableId: number) => {
        setLoadingTable(tableId);
        try {
            const res = await api.callNext(queueId, "skipped", tableId);
            if ("message" in res) {
                toast.info(res.message);
            } else {
                toast.success(`Skipped current and called next to Table ${tableId}`);
            }
            onUpdate();
        } catch {
            toast.error(`Failed to skip table ${tableId}`);
        } finally {
            setLoadingTable(null);
        }
    };

    const occupiedCount = allServingTokens.length;

    return (
        <div style={{ marginBottom: 24 }}>
            {/* Header: Title, Counts, Section Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--q-text)", margin: 0 }}>
                        Floor Tables
                    </h2>
                    <p style={{ fontSize: 12, color: "var(--q-text-muted)", margin: "2px 0 0" }}>
                        {occupiedCount} of {tables.length} tables occupied • {tables.length - occupiedCount} available
                    </p>
                </div>

                {/* Section filter tabs */}
                <div className="flex items-center gap-2 flex-wrap">
                    {sections.length > 1 && (
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setSelectedSection("all")}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                                    selectedSection === "all"
                                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                }`}
                            >
                                All ({tables.length})
                            </button>
                            {sections.map(sec => {
                                const count = tables.filter(t => (t.section || "Main Dining") === sec).length;
                                return (
                                    <button
                                        key={sec}
                                        type="button"
                                        onClick={() => setSelectedSection(sec)}
                                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                                            selectedSection === sec
                                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                        }`}
                                    >
                                        {sec} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Mobile Toggle */}
                    <button
                        type="button"
                        onClick={() => { setMobileExpandAll(prev => !prev); setExpandedTable(null); }}
                        className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 shadow-sm"
                    >
                        {mobileExpandAll ? <><List size={14} /> Compact</> : <><LayoutGrid size={14} /> Expand</>}
                    </button>
                </div>
            </div>

            {/* Desktop Grid (md and up) — Exact layout of ServiceLinesGrid */}
            <div className="hidden md:grid" style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                gap: 12,
            }}>
                {filteredTables.map((tbl) => {
                    const token = tableMap.get(tbl.id);
                    const isOccupied = !!token;
                    const isLoading = loadingTable === tbl.id;
                    const elapsedMins = isOccupied ? getElapsedMinutes(token?.served_at) : 0;
                    const isLingering = isOccupied && elapsedMins >= 60;

                    return (
                        <div
                            key={tbl.id}
                            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl p-3.5 transition-all duration-300 min-h-[140px] ${
                                isOccupied
                                    ? isLingering
                                        ? "bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/60 shadow-[0_4px_20px_rgb(244,63,94,0.08)]"
                                        : "bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-500/30 shadow-[0_4px_20px_rgb(245,158,11,0.06)]"
                                    : "bg-slate-50/50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:bg-white dark:hover:bg-slate-900"
                            }`}
                            style={isOccupied ? {
                                boxShadow: isLingering
                                    ? "0 0 0 1px rgba(244, 63, 94, 0.2), 0 4px 15px -2px rgba(244, 63, 94, 0.1)"
                                    : "0 0 0 1px rgba(245, 158, 11, 0.15), 0 4px 15px -2px rgba(245, 158, 11, 0.1)"
                            } : {}}
                        >
                            {/* Header: Table Name & Status Pill */}
                            <div className="flex items-center justify-between mb-2 relative z-10">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={`text-[11px] font-black uppercase tracking-[0.08em] truncate ${
                                        isOccupied
                                            ? isLingering ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                                            : "text-slate-500 dark:text-slate-400"
                                    }`}>
                                        {tbl.name || `Table ${tbl.id}`}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                        {tbl.capacity}p
                                    </span>
                                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                        isOccupied
                                            ? isLingering
                                                ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 animate-pulse"
                                                : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                                            : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                                    }`}>
                                        {isOccupied ? (
                                            <>
                                                <Clock size={10} />
                                                <span>{elapsedMins}m</span>
                                            </>
                                        ) : (
                                            "Available"
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Card Body */}
                            {isOccupied && token ? (
                                <div className="flex flex-col flex-1 relative z-10">
                                    {/* Token Number */}
                                    <div className="text-[24px] font-black tracking-tight text-slate-900 dark:text-white leading-none mb-1">
                                        <span className={isLingering ? "text-rose-500 font-bold" : "text-amber-500 font-bold"}>{prefix}</span>{token.token_number}
                                    </div>
                                    <div className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-3 truncate flex items-center gap-1.5">
                                        <span className="truncate">{token.customer_name || "Guest"}</span>
                                        {(token.pax_count && token.pax_count > 1) && (
                                            <span className="inline-flex items-center gap-1 font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] ml-1 shadow-xs border border-slate-200 dark:border-slate-700" title={`Total Guests: ${token.pax_count}`}>
                                                <Users size={10} />
                                                {token.pax_count}p
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {!isReadOnly && (
                                        <div className="flex items-center gap-1.5 mt-auto">
                                            <button
                                                type="button"
                                                onClick={() => skipTable(tbl.id)}
                                                disabled={isLoading || isPaused}
                                                title={isPaused ? "Queue is on a break" : "Skip customer"}
                                                className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-600 hover:text-amber-700 dark:text-amber-400 text-[11px] font-bold transition-colors disabled:opacity-50 px-1"
                                            >
                                                <FastForward size={11} />
                                                <span>Skip</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => freeTable(tbl.id, tbl.name || `Table ${tbl.id}`)}
                                                disabled={isLoading}
                                                title="Free Table (Bill Paid)"
                                                className="flex-[1.5] flex items-center justify-center gap-1 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold shadow-xs shadow-emerald-500/20 transition-all disabled:opacity-50 px-2 cursor-pointer"
                                            >
                                                <Check size={13} />
                                                <span>Free Table</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center justify-center flex-1 my-2">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-1 text-slate-400 dark:text-slate-500">
                                            <Utensils size={16} />
                                        </div>
                                        <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">
                                            Vacant Table
                                        </span>
                                    </div>
                                    <div className="mt-auto relative z-10">
                                        {!isReadOnly && (
                                            <div className="flex items-center gap-1.5 opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                                <button
                                                    type="button"
                                                    onClick={() => seatNextToTable(tbl.id, tbl.capacity)}
                                                    disabled={isLoading || isPaused}
                                                    title={isPaused ? "Queue is on a break" : undefined}
                                                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-600 dark:bg-emerald-500/10 dark:hover:bg-emerald-500 text-emerald-700 hover:text-white dark:text-emerald-300 text-[11px] font-bold disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                                                >
                                                    <PhoneCall size={12} />
                                                    {isLoading ? "Seating..." : "Seat Next"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Mobile Cards (below md) */}
            <div className="md:hidden flex flex-col gap-2">
                {filteredTables.map((tbl) => {
                    const token = tableMap.get(tbl.id);
                    const isOccupied = !!token;
                    const isLoading = loadingTable === tbl.id;
                    const isExpanded = mobileExpandAll || expandedTable === tbl.id;
                    const elapsedMins = isOccupied ? getElapsedMinutes(token?.served_at) : 0;

                    return (
                        <div key={tbl.id} className="overflow-hidden rounded-xl transition-all duration-300">
                            {/* Collapsed Compact Card */}
                            <div
                                className={`w-full flex items-center justify-between px-4 py-3 transition-all duration-300 ${
                                    isOccupied
                                        ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"
                                        : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50"
                                } ${isExpanded ? "rounded-t-xl rounded-b-none" : "rounded-xl"}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center font-bold text-xs shadow-xs border border-slate-200 dark:border-slate-700">
                                        T{tbl.id}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                            <span>{tbl.name}</span>
                                            <span className="text-[10px] text-slate-400 font-normal">({tbl.capacity}p)</span>
                                        </div>
                                        {isOccupied && token && (
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                <span className="font-mono font-bold text-amber-600 mr-1">{prefix}{token.token_number}</span>
                                                {token.customer_name || "Guest"}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isOccupied ? (
                                        <button
                                            type="button"
                                            onClick={() => freeTable(tbl.id, tbl.name)}
                                            disabled={isLoading || isReadOnly}
                                            className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 rounded-lg shadow-xs"
                                        >
                                            Free
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => seatNextToTable(tbl.id, tbl.capacity)}
                                            disabled={isLoading || isReadOnly || isPaused}
                                            className="px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 rounded-lg"
                                        >
                                            Seat
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
