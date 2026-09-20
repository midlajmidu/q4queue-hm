"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { QueueResponse, QueueSnapshot, ServingToken, WaitingToken, TableConfig } from "@/types/api";
import { 
    Utensils, 
    Users, 
    Clock, 
    CheckCircle2, 
    Sparkles, 
    UserPlus, 
    ChevronRight, 
    Phone, 
    Search, 
    Filter, 
    X, 
    RefreshCw, 
    LogOut, 
    AlertCircle,
    Check,
    ArrowRight,
    Volume2,
    CalendarClock,
    Zap,
    AlertTriangle,
    SlidersHorizontal,
    PanelRightClose,
    PanelRightOpen,
    Link2,
    Layers,
    CheckCheck,
    HelpCircle
} from "lucide-react";
import { toast } from "sonner";

interface Props {
    queueId: string;
    sessionId: string;
    state: QueueSnapshot | null;
    initialQueue: QueueResponse | null;
    isReadOnly: boolean;
    isPaused: boolean;
    isActive: boolean;
    onRefresh: () => void;
}

function getElapsedMinutes(isoString?: string | null): number {
    if (!isoString) return 0;
    const diffMs = Date.now() - new Date(isoString).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
}

export default function DineOperationsView({
    queueId,
    sessionId,
    state,
    initialQueue,
    isReadOnly,
    isPaused,
    isActive,
    onRefresh,
}: Props) {
    // 30s timer ticker for live dining durations
    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 30000);
        return () => clearInterval(interval);
    }, []);

    // Filter states
    const [statusFilter, setStatusFilter] = useState<"all" | "vacant" | "dining" | "alert">("all");
    const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

    // Multi-table Combine Mode state (e.g. for oversized parties)
    const [combineModeToken, setCombineModeToken] = useState<WaitingToken | null>(null);
    const [combinedTableIds, setCombinedTableIds] = useState<number[]>([]);

    // Docked Waitlist panel state (desktop sticky, mobile collapsible)
    const [showDockedWaitlist, setShowDockedWaitlist] = useState(true);
    const [waitlistSearch, setWaitlistSearch] = useState("");
    const [waitlistPaxFilter, setWaitlistPaxFilter] = useState<"all" | "1-2" | "3-4" | "5+">("all");

    // Fast Walk-in modal state
    const [showWalkInModal, setShowWalkInModal] = useState(false);
    const [walkInPax, setWalkInPax] = useState<number>(2);
    const [walkInName, setWalkInName] = useState("");
    const [walkInPhone, setWalkInPhone] = useState("");
    const [walkInTargetTable, setWalkInTargetTable] = useState<number | null>(null);
    const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState(false);

    // Action loading states
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Normalized tables list
    const tables: TableConfig[] = useMemo(() => {
        if (initialQueue?.table_config && initialQueue.table_config.length > 0) {
            return initialQueue.table_config;
        }
        const count = Math.max(initialQueue?.service_lines || state?.service_lines || 1, 1);
        return Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            name: `Table ${i + 1}`,
            capacity: 4,
            section: "Main Dining",
        }));
    }, [initialQueue, state?.service_lines]);


    // Current serving tokens mapped by assigned table line AND shared table lines
    const servingByLine = useMemo(() => {
        const map = new Map<number, ServingToken>();
        (state?.all_serving_tokens || []).forEach(token => {
            const comps = (token as any).completed_lines || [];
            if (token.assigned_line != null && !comps.includes(token.assigned_line)) {
                map.set(token.assigned_line, token);
            }
            if (Array.isArray((token as any).shared_lines)) {
                (token as any).shared_lines.forEach((lineId: number) => {
                    if (!comps.includes(lineId)) {
                        map.set(lineId, token);
                    }
                });
            }
        });
        return map;
    }, [state?.all_serving_tokens]);

    // Waiting tokens
    const waitingTokens: WaitingToken[] = useMemo(() => {
        return state?.waiting_tokens || [];
    }, [state?.waiting_tokens]);

    // Global keyboard listener ('N' for Fast Walk-in, 'Escape' to clear modes)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
                return;
            }
            if (e.key === "n" || e.key === "N") {
                e.preventDefault();
                setWalkInTargetTable(null);
                setWalkInPax(2);
                setShowWalkInModal(true);
            } else if (e.key === "Escape") {
                if (showWalkInModal) {
                    setShowWalkInModal(false);
                } else if (combineModeToken) {
                    setCombineModeToken(null);
                    setCombinedTableIds([]);
                } else if (selectedTableId !== null) {
                    setSelectedTableId(null);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showWalkInModal, selectedTableId, combineModeToken]);

    // Overall telemetry metrics
    const stats = useMemo(() => {
        let occupied = 0;
        let totalGuests = 0;
        let alertTables = 0;
        let totalElapsedMins = 0;

        tables.forEach(tbl => {
            const token = servingByLine.get(tbl.id);
            if (token) {
                occupied++;
                totalGuests += (token.pax_count || 1);
                const elapsed = getElapsedMinutes(token.served_at);
                totalElapsedMins += elapsed;
                if (elapsed >= 60) {
                    alertTables++;
                }
            }
        });

        const vacant = tables.length - occupied;
        const totalCapacity = tables.reduce((acc, t) => acc + (t.capacity || 4), 0);
        const vacantCapacity = tables
            .filter(t => !servingByLine.has(t.id))
            .reduce((acc, t) => acc + (t.capacity || 4), 0);

        const avgDuration = occupied > 0 ? Math.round(totalElapsedMins / occupied) : 0;
        const waitingGuests = waitingTokens.reduce((acc, t) => acc + (t.pax_count || 1), 0);

        return {
            totalTables: tables.length,
            occupiedTables: occupied,
            vacantTables: vacant,
            alertTables,
            totalCapacity,
            vacantCapacity,
            totalSeatedGuests: totalGuests,
            waitingParties: waitingTokens.length,
            waitingGuests,
            avgDuration,
        };
    }, [tables, servingByLine, waitingTokens]);

    // Filtered tables by Status
    const filteredTables = useMemo(() => {
        return tables.filter(t => {
            const isOccupied = servingByLine.has(t.id);
            if (statusFilter === "vacant" && isOccupied) return false;
            if (statusFilter === "dining" && !isOccupied) return false;
            if (statusFilter === "alert") {
                if (!isOccupied) return false;
                const token = servingByLine.get(t.id);
                if (getElapsedMinutes(token?.served_at) < 60) return false;
            }
            return true;
        });
    }, [tables, statusFilter, servingByLine]);

    // Smart Match: Oldest waitlist party where pax <= table.capacity
    const getSmartMatch = useCallback((tableCapacity: number) => {
        return waitingTokens.find(token => {
            const pax = token.pax_count || 1;
            return pax <= tableCapacity;
        });
    }, [waitingTokens]);

    // Filtered Waitlist for Docked Panel
    const filteredWaitlist = useMemo(() => {
        return waitingTokens.filter(token => {
            const pax = token.pax_count || 1;

            if (selectedTableId !== null && !combineModeToken) {
                const targetTbl = tables.find(t => t.id === selectedTableId);
                if (targetTbl && pax > targetTbl.capacity) {
                    return false;
                }
            }

            if (waitlistPaxFilter === "1-2" && pax > 2) return false;
            if (waitlistPaxFilter === "3-4" && (pax < 3 || pax > 4)) return false;
            if (waitlistPaxFilter === "5+" && pax < 5) return false;

            if (waitlistSearch.trim()) {
                const q = waitlistSearch.toLowerCase();
                const nameMatch = token.customer_name?.toLowerCase().includes(q);
                const phoneMatch = token.customer_phone?.includes(q);
                const numMatch = String(token.token_number).includes(q);
                if (!nameMatch && !phoneMatch && !numMatch) return false;
            }
            return true;
        });
    }, [waitingTokens, selectedTableId, combineModeToken, tables, waitlistPaxFilter, waitlistSearch]);

    // ── Actions ─────────────────────────────────────────────────────

    const handleSeatToken = async (tokenNumber: number, tableId: number, tableName: string) => {
        if (isReadOnly) return;
        setActionLoadingId(`seat-${tableId}`);
        try {
            await api.serveSpecificToken(queueId, tokenNumber, tableId);
            toast.success(`Seated Party #${tokenNumber} at ${tableName}`);
            setSelectedTableId(null);
            setCombineModeToken(null);
            setCombinedTableIds([]);
            onRefresh();
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : "Failed to seat guest";
            toast.error(msg);
        } finally {
            setActionLoadingId(null);
        }
    };

    // Seat party across combined tables
    const handleSeatCombined = async () => {
        if (!combineModeToken || combinedTableIds.length === 0 || isReadOnly) return;
        const primaryTableId = combinedTableIds[0];
        const sharedTableIds = combinedTableIds.slice(1);
        const tableNames = combinedTableIds
            .map(id => tables.find(t => t.id === id)?.name || `T${id}`)
            .join(" + ");

        setActionLoadingId(`seat-combined`);
        try {
            // Seat on the primary table in backend
            await api.serveSpecificToken(queueId, combineModeToken.token_number, primaryTableId);
            // Share all additional merged tables
            for (const lineId of sharedTableIds) {
                await api.shareToken(queueId, combineModeToken.token_number, lineId);
            }
            toast.success(`Seated Party #${combineModeToken.token_number} across combined [${tableNames}]`);
            setCombineModeToken(null);
            setCombinedTableIds([]);
            setSelectedTableId(null);
            onRefresh();
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : "Failed to seat combined tables";
            toast.error(msg);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleFreeTable = async (tableId: number, tableName: string) => {
        if (isReadOnly) return;
        setActionLoadingId(`free-${tableId}`);
        try {
            await api.clearLine(queueId, tableId);
            toast.success(`${tableName} is now marked Vacant.`);
            if (selectedTableId === tableId) setSelectedTableId(null);
            onRefresh();
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : "Failed to free table";
            toast.error(msg);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleRemoveFromWaitlist = async (tokenId: string, tokenNumber: number) => {
        if (isReadOnly) return;
        setActionLoadingId(`remove-${tokenId}`);
        try {
            await api.removeToken(tokenId);
            toast.success(`Party #${tokenNumber} removed from waitlist.`);
            if (combineModeToken?.id === tokenId) {
                setCombineModeToken(null);
                setCombinedTableIds([]);
            }
            onRefresh();
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : "Failed to remove token";
            toast.error(msg);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleWalkInSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;
        setIsSubmittingWalkIn(true);
        try {
            const res = await api.adminJoin(queueId, {
                name: walkInName.trim() || `Walk-in (${walkInPax}p)`,
                phone: walkInPhone.trim() || "",
                pax_count: walkInPax,
                session_id: sessionId,
            });

            if (walkInTargetTable !== null) {
                await api.serveSpecificToken(queueId, res.token_number, walkInTargetTable);
                const tableObj = tables.find(t => t.id === walkInTargetTable);
                toast.success(`Party #${res.token_number} (${walkInPax} Pax) seated at ${tableObj?.name || `Table ${walkInTargetTable}`}`);
            } else {
                toast.success(`Walk-in Party #${res.token_number} (${walkInPax} Pax) added to Waitlist.`);
            }

            setShowWalkInModal(false);
            setWalkInName("");
            setWalkInPhone("");
            setWalkInPax(2);
            setWalkInTargetTable(null);
            onRefresh();
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : "Failed to register walk-in guest";
            toast.error(msg);
        } finally {
            setIsSubmittingWalkIn(false);
        }
    };

    const suitableVacantTablesForWalkIn = useMemo(() => {
        return tables.filter(tbl => !servingByLine.has(tbl.id) && tbl.capacity >= walkInPax);
    }, [tables, servingByLine, walkInPax]);

    const activeSelectedTable = useMemo(() => {
        if (selectedTableId === null) return null;
        return tables.find(t => t.id === selectedTableId) || null;
    }, [tables, selectedTableId]);

    // Vacant tables list
    const vacantTables = useMemo(() => {
        return tables.filter(tbl => !servingByLine.has(tbl.id));
    }, [tables, servingByLine]);

    return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {/* ── 1. Compact Operational Telemetry Header ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-3 sm:p-4 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Telemetry Metrics */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        {/* Floor Stand Brand Chip */}
                        <div className="flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-white/10">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-black text-xs shadow-xs">
                                <Utensils className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Host Stand</div>
                                <div className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                                    {stats.totalTables} Tables
                                </div>
                            </div>
                        </div>

                        {/* Vacant Badge (Filter toggle) */}
                        <button
                            type="button"
                            onClick={() => setStatusFilter(statusFilter === "vacant" ? "all" : "vacant")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                statusFilter === "vacant"
                                    ? "bg-emerald-500 text-white border-emerald-600 shadow-xs shadow-emerald-500/20"
                                    : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/40 hover:bg-emerald-100/70"
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${statusFilter === "vacant" ? "bg-white" : "bg-emerald-500 animate-pulse"}`} />
                            <span>{stats.vacantTables} Vacant ({stats.vacantCapacity} Seats)</span>
                        </button>

                        {/* Occupied Badge (Filter toggle) */}
                        <button
                            type="button"
                            onClick={() => setStatusFilter(statusFilter === "dining" ? "all" : "dining")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                statusFilter === "dining"
                                    ? "bg-amber-500 text-white border-amber-600 shadow-xs shadow-amber-500/20"
                                    : "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/40 hover:bg-amber-100/70"
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${statusFilter === "dining" ? "bg-white" : "bg-amber-500"}`} />
                            <span>{stats.occupiedTables} Seated ({stats.totalSeatedGuests} Guests)</span>
                        </button>

                        {/* Alert / Lingering Badge (>60m) */}
                        {stats.alertTables > 0 && (
                            <button
                                type="button"
                                onClick={() => setStatusFilter(statusFilter === "alert" ? "all" : "alert")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                    statusFilter === "alert"
                                        ? "bg-rose-600 text-white border-rose-700 shadow-xs shadow-rose-600/20"
                                        : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 animate-pulse"
                                }`}
                            >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                                <span>{stats.alertTables} Lingering (&gt;60m)</span>
                            </button>
                        )}

                        {/* Waitlist Counter */}
                        <button
                            type="button"
                            onClick={() => setShowDockedWaitlist(!showDockedWaitlist)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                showDockedWaitlist
                                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-500/20"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200"
                            }`}
                        >
                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Waitlist: {stats.waitingParties} ({stats.waitingGuests} Guests)</span>
                        </button>
                    </div>

                    {/* Quick Fast Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setWalkInTargetTable(null);
                                setWalkInPax(2);
                                setShowWalkInModal(true);
                            }}
                            disabled={isReadOnly || isPaused || !isActive}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] rounded-xl shadow-xs shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
                            title="Fast Walk-in Party (Keyboard Shortcut: N)"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Fast Walk-in</span>
                            <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-mono bg-black/20 rounded text-amber-100">
                                N
                            </kbd>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowDockedWaitlist(!showDockedWaitlist)}
                            className="lg:hidden p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-colors"
                            title="Toggle Waitlist Sidebar"
                        >
                            {showDockedWaitlist ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                        </button>

                        <button
                            type="button"
                            onClick={onRefresh}
                            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                            title="Refresh Live Floor"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>


            </div>

            {/* ── 2. Split Workspace: 70% Floor Matrix + 30% Docked Waitlist ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                
                {/* ── LEFT: Floor Matrix Grid ── */}
                <div className={`${showDockedWaitlist ? "lg:col-span-8 xl:col-span-8 2xl:col-span-9" : "lg:col-span-12"} space-y-3 transition-all duration-200`}>
                    
                    {/* Combine Mode Banner (When combining tables for large party) */}
                    {combineModeToken && (
                        <div className="bg-amber-500/10 dark:bg-amber-950/40 border-2 border-amber-500/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                                    <Layers className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                                        <span>Combine Tables Mode:</span>
                                        <span className="font-mono text-sm font-black">Party #{combineModeToken.token_number} ({combineModeToken.pax_count} Pax)</span>
                                    </h4>
                                    <p className="text-[11px] text-amber-800 dark:text-amber-300/90 font-medium">
                                        Select 2 or more vacant tables on the floor. Selected: {combinedTableIds.length > 0 ? combinedTableIds.map(id => `T${id}`).join(" + ") : "None yet"}.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCombineModeToken(null);
                                        setCombinedTableIds([]);
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSeatCombined}
                                    disabled={combinedTableIds.length < 2 || isReadOnly}
                                    className="px-4 py-1.5 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] rounded-xl shadow-xs transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                                >
                                    <CheckCheck className="w-4 h-4" />
                                    <span>Confirm Combined Seating</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Single Table Selection Banner (When host clicked a vacant table) */}
                    {!combineModeToken && activeSelectedTable && (
                        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-xl px-4 py-2 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                                    Selected <span className="font-mono font-black">{activeSelectedTable.name}</span> ({activeSelectedTable.capacity} Pax). Select a party from the waitlist to seat immediately.
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedTableId(null)}
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                                Clear Selection
                            </button>
                        </div>
                    )}

                    {/* High-Density Tactile Table Matrix (NO TEXT TRUNCATION) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                        {filteredTables.map(tbl => {
                            const seatedToken = servingByLine.get(tbl.id);
                            const isOccupied = Boolean(seatedToken);
                            const comps = (seatedToken as any)?.completed_lines || [];
                            const tokenTables: number[] = [];
                            if (seatedToken?.assigned_line != null && !comps.includes(seatedToken.assigned_line)) {
                                tokenTables.push(seatedToken.assigned_line);
                            }
                            if (Array.isArray((seatedToken as any)?.shared_lines)) {
                                (seatedToken as any).shared_lines.forEach((lid: number) => {
                                    if (!comps.includes(lid) && !tokenTables.includes(lid)) {
                                        tokenTables.push(lid);
                                    }
                                });
                            }
                            const isMerged = tokenTables.length > 1;

                            const smartMatch = !isOccupied ? getSmartMatch(tbl.capacity) : null;
                            const isLoading = actionLoadingId === `seat-${tbl.id}` || actionLoadingId === `free-${tbl.id}`;
                            const elapsedMins = isOccupied ? getElapsedMinutes(seatedToken?.served_at) : 0;
                            const isLingering = isOccupied && elapsedMins >= 60;
                            const isSelected = selectedTableId === tbl.id;
                            const isCombinedSelected = combinedTableIds.includes(tbl.id);

                            return (
                                <div
                                    key={tbl.id}
                                    onClick={() => {
                                        if (combineModeToken) {
                                            if (!isOccupied) {
                                                setCombinedTableIds(prev => 
                                                    prev.includes(tbl.id) 
                                                        ? prev.filter(id => id !== tbl.id) 
                                                        : [...prev, tbl.id]
                                                );
                                            }
                                        } else if (!isOccupied) {
                                            setSelectedTableId(isSelected ? null : tbl.id);
                                        }
                                    }}
                                    className={`relative flex flex-col justify-between rounded-2xl border p-3 transition-all duration-150 cursor-pointer select-none min-h-[122px] group ${
                                        isCombinedSelected
                                            ? "ring-2 ring-amber-500 border-amber-500 shadow-md bg-amber-50/40 dark:bg-amber-950/30"
                                            : isSelected
                                                ? "ring-2 ring-indigo-500 border-indigo-500 shadow-md bg-indigo-50/30 dark:bg-indigo-950/20"
                                                : isOccupied
                                                    ? isMerged
                                                        ? "bg-indigo-500/[0.04] dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800/80 ring-1 ring-indigo-500/20 hover:border-indigo-400"
                                                        : isLingering
                                                            ? "bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20 hover:border-rose-400"
                                                            : "bg-amber-500/[0.03] dark:bg-amber-950/20 border-amber-200/90 dark:border-amber-900/40 hover:border-amber-300"
                                                    : "bg-emerald-500/[0.02] dark:bg-emerald-950/15 border-emerald-200/70 dark:border-emerald-900/40 hover:border-emerald-400 hover:shadow-xs"
                                    }`}
                                >
                                    {/* ── Table Pod Top Row: Fixed Table Hero + Status Chip ── */}
                                    <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-white/5">
                                        {/* Table Number Hero (Never Truncates!) */}
                                        <div className="min-w-0">
                                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                                <span className={`text-base font-black font-mono tracking-tight leading-none ${
                                                    isOccupied
                                                        ? isMerged
                                                            ? "text-indigo-600 dark:text-indigo-400"
                                                            : isLingering
                                                                ? "text-rose-600 dark:text-rose-400"
                                                                : "text-amber-600 dark:text-amber-400"
                                                        : "text-emerald-700 dark:text-emerald-400"
                                                }`}>
                                                    T{tbl.id.toString().padStart(2, "0")}
                                                </span>
                                                {isMerged && (
                                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                                                        <Link2 size={9} />
                                                        {tokenTables.map(id => `T${id}`).join("+")}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                                                {tbl.name}
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="shrink-0">
                                            {isOccupied ? (
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                    isLingering
                                                        ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 animate-pulse"
                                                        : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                                                }`}>
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {elapsedMins}m
                                                </span>
                                            ) : isCombinedSelected ? (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                                                    Combined
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100/90 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Open
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── Table Pod Center: Tactile Seats / Guest Details ── */}
                                    <div className="py-2 flex-1 flex flex-col justify-between gap-1.5">
                                        {isOccupied && seatedToken ? (
                                            /* ── OCCUPIED STATE ── */
                                            <>
                                                <div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                                                            #{seatedToken.token_number}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                            👥 {seatedToken.pax_count || 1}p
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate mt-0.5">
                                                        {seatedToken.customer_name || "Guest"}
                                                    </p>
                                                </div>

                                                {/* Compact Clear/Free Button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleFreeTable(tbl.id, tbl.name);
                                                    }}
                                                    disabled={isLoading || isReadOnly}
                                                    className="w-full py-1 px-2 text-[10px] font-black rounded-lg transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer bg-slate-800 hover:bg-rose-600 text-white disabled:opacity-50"
                                                    title="Bill Paid / Free Table"
                                                >
                                                    {isLoading ? (
                                                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        <Check className="w-3 h-3" />
                                                    )}
                                                    <span>Free Table</span>
                                                </button>
                                            </>
                                        ) : (
                                            /* ── VACANT STATE: Tactile Seat Pips & Smart Match ── */
                                            <>
                                                <div>
                                                    {/* Visual Seat Pips (● ● ● ●) */}
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400">
                                                            {Array.from({ length: Math.min(tbl.capacity, 8) }).map((_, i) => (
                                                                <span 
                                                                    key={i} 
                                                                    className="w-2 h-2 rounded-full bg-emerald-400/80 dark:bg-emerald-500/50 inline-block" 
                                                                    title={`Seat ${i + 1}`}
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                            {tbl.capacity} Seats
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Smart Match Execution or Fast Action Bar */}
                                                {smartMatch && !combineModeToken ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSeatToken(smartMatch.token_number, tbl.id, tbl.name);
                                                        }}
                                                        disabled={isLoading || isReadOnly || isPaused || !isActive}
                                                        className="w-full py-1 px-2 text-[10px] font-black rounded-lg transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                                                    >
                                                        {isLoading ? (
                                                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Sparkles className="w-3 h-3 text-amber-300" />
                                                        )}
                                                        <span>Seat #{smartMatch.token_number} ({smartMatch.pax_count || 1}p)</span>
                                                    </button>
                                                ) : (
                                                    /* Tactile Clickable Pod Area */
                                                    <div className="flex items-center justify-between pt-1 text-[10px] font-bold text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                        <span className="flex items-center gap-1">
                                                            <UserPlus className="w-3 h-3" />
                                                            {combineModeToken ? (isCombinedSelected ? "Selected" : "Click to Add") : "Tap to Seat"}
                                                        </span>
                                                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── RIGHT: Docked Live Waitlist & Fast Matching ── */}
                {showDockedWaitlist && (
                    <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 shadow-xs space-y-3 sticky top-4">
                        
                        {/* Waitlist Header */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-white/5">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    Live Waitlist
                                </h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {waitingTokens.length} {waitingTokens.length === 1 ? "party" : "parties"} in queue
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setWalkInTargetTable(null);
                                    setWalkInPax(2);
                                    setShowWalkInModal(true);
                                }}
                                className="px-2.5 py-1 text-[11px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                                <UserPlus className="w-3 h-3" />
                                + Add
                            </button>
                        </div>

                        {/* Search & Pax Filters */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={waitlistSearch}
                                    onChange={(e) => setWaitlistSearch(e.target.value)}
                                    placeholder="Search guest name / #"
                                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center gap-1">
                                {(["all", "1-2", "3-4", "5+"] as const).map(paxMode => (
                                    <button
                                        key={paxMode}
                                        type="button"
                                        onClick={() => setWaitlistPaxFilter(paxMode)}
                                        className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-colors cursor-pointer text-center ${
                                            waitlistPaxFilter === paxMode
                                                ? "bg-indigo-600 text-white shadow-2xs"
                                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                        }`}
                                    >
                                        {paxMode === "all" ? "All" : `${paxMode}p`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Waitlist Parties Stack */}
                        <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                            {filteredWaitlist.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs font-bold">No waiting parties found</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                        {waitingTokens.length > 0 ? "Adjust filters or search query." : "All guests seated!"}
                                    </p>
                                </div>
                            ) : (
                                filteredWaitlist.map(token => {
                                    const pax = token.pax_count || 1;
                                    const waitMins = getElapsedMinutes(token.created_at);
                                    
                                    // Available vacant tables fitting this party
                                    const fittingVacant = tables.filter(tbl => !servingByLine.has(tbl.id) && tbl.capacity >= pax);
                                    const isFitSelected = activeSelectedTable && activeSelectedTable.capacity >= pax;
                                    const isExceeding = fittingVacant.length === 0;

                                    return (
                                        <div
                                            key={token.id}
                                            className={`p-3 rounded-xl border transition-all ${
                                                isFitSelected
                                                    ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-500/20"
                                                    : "bg-slate-50/50 dark:bg-slate-800/50 border-slate-200/80 dark:border-white/5 hover:border-slate-300"
                                            }`}
                                        >
                                            {/* Party Details Header */}
                                            <div className="flex items-start justify-between gap-1.5">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400">
                                                            #{token.token_number}
                                                        </span>
                                                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[130px]">
                                                            {token.customer_name || "Guest"}
                                                        </span>
                                                    </div>
                                                    {token.customer_phone && (
                                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                            {token.customer_phone}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                                                        👥 {pax}p
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {waitMins}m
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Seating CTA Bar */}
                                            <div className="flex flex-col gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/5">
                                                
                                                {/* Normal Direct Seating (Party fits a single table) */}
                                                {activeSelectedTable && !servingByLine.has(activeSelectedTable.id) && activeSelectedTable.capacity >= pax ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSeatToken(token.token_number, activeSelectedTable.id, activeSelectedTable.name)}
                                                            disabled={isReadOnly}
                                                            className="flex-1 py-1 px-2 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                                                        >
                                                            <Zap className="w-3 h-3 text-amber-300" />
                                                            <span>Seat at {activeSelectedTable.name}</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveFromWaitlist(token.id, token.token_number)}
                                                            disabled={isReadOnly}
                                                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer shrink-0"
                                                            title="Cancel / Remove Party"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : fittingVacant.length > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] font-black text-slate-400 shrink-0">Seat:</span>
                                                        <div className="flex-1 flex items-center gap-1 overflow-x-auto">
                                                            {fittingVacant.slice(0, 3).map(tbl => (
                                                                <button
                                                                    key={tbl.id}
                                                                    type="button"
                                                                    onClick={() => handleSeatToken(token.token_number, tbl.id, tbl.name)}
                                                                    disabled={isReadOnly}
                                                                    className="px-1.5 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 hover:bg-emerald-200 rounded border border-emerald-300/80 dark:border-emerald-800 transition-colors shrink-0 cursor-pointer"
                                                                >
                                                                    T{tbl.id} ({tbl.capacity}p)
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveFromWaitlist(token.id, token.token_number)}
                                                            disabled={isReadOnly}
                                                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer shrink-0"
                                                            title="Cancel / Remove Party"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    /* ── OVERSIZED / OVERCAPACITY PARTY RESOLUTION ── */
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between text-[10px]">
                                                            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                                <AlertCircle className="w-3 h-3" />
                                                                Needs {pax} seats (Exceeds 4p)
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveFromWaitlist(token.id, token.token_number)}
                                                                disabled={isReadOnly}
                                                                className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer shrink-0"
                                                                title="Cancel / Remove Party"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        {/* Combine Tables & Override Options */}
                                                        <div className="flex items-center gap-1.5">
                                                            {vacantTables.length >= 2 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setCombineModeToken(token);
                                                                        setCombinedTableIds([]);
                                                                        setSelectedTableId(null);
                                                                    }}
                                                                    className="flex-1 py-1 px-2 text-[10px] font-black text-amber-800 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                                                                >
                                                                    <Link2 className="w-3 h-3 text-amber-600" />
                                                                    <span>Combine Tables</span>
                                                                </button>
                                                            )}

                                                            {vacantTables.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        // Seat at first vacant table as capacity override
                                                                        handleSeatToken(token.token_number, vacantTables[0].id, vacantTables[0].name);
                                                                    }}
                                                                    className="py-1 px-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                                                    title="Pull up chairs / Override Capacity"
                                                                >
                                                                    Seat at T{vacantTables[0].id} (Override)
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── 3. High-Speed Fast Walk-in Modal with Numpad Pax ── */}
            {showWalkInModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150" 
                        onClick={() => setShowWalkInModal(false)} 
                    />
                    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-150">
                        <button
                            type="button"
                            onClick={() => setShowWalkInModal(false)}
                            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                                <UserPlus className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                                    {walkInTargetTable !== null
                                        ? `Seat Walk-in at ${tables.find(t => t.id === walkInTargetTable)?.name || `Table ${walkInTargetTable}`}`
                                        : "Fast Walk-in Registration"}
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {walkInTargetTable !== null
                                        ? "Seat party directly at this table."
                                        : "Assign immediately to open table or place on waitlist."}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleWalkInSubmit} className="space-y-4 pt-1">
                            {/* Numpad Party Size Selector */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                    Party Size (Guests)
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(pax => (
                                        <button
                                            key={pax}
                                            type="button"
                                            onClick={() => setWalkInPax(pax)}
                                            className={`py-2 rounded-xl font-black text-sm transition-all cursor-pointer ${
                                                walkInPax === pax
                                                    ? "bg-amber-600 text-white shadow-xs shadow-amber-600/30 ring-2 ring-amber-500/20"
                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                            }`}
                                        >
                                            {pax} Pax
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Guest Optional Details */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                        Guest Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={walkInName}
                                        onChange={(e) => setWalkInName(e.target.value)}
                                        placeholder="e.g. John"
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                        Phone # (Optional)
                                    </label>
                                    <input
                                        type="tel"
                                        value={walkInPhone}
                                        onChange={(e) => setWalkInPhone(e.target.value)}
                                        placeholder="e.g. +91 98..."
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            {/* Seating Destination */}
                            {walkInTargetTable === null && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                        Seating Destination
                                    </label>
                                    <select
                                        value={walkInTargetTable ?? "waitlist"}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setWalkInTargetTable(val === "waitlist" ? null : parseInt(val));
                                        }}
                                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="waitlist">Add to Waitlist (No table assigned yet)</option>
                                        {suitableVacantTablesForWalkIn.map(tbl => (
                                            <option key={tbl.id} value={tbl.id}>
                                                Seat immediately at {tbl.name} (Capacity: {tbl.capacity} Pax)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Submit CTAs */}
                            <div className="flex gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowWalkInModal(false)}
                                    className="flex-1 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingWalkIn}
                                    className="flex-1 py-2.5 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] rounded-xl shadow-xs shadow-amber-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    {isSubmittingWalkIn ? (
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    <span>
                                        {walkInTargetTable !== null ? "Seat Immediately" : "Add to Waitlist"}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
