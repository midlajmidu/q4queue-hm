"use client";

import React, { useState, useMemo, useRef } from "react";
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
    ClipboardList,
    Search,
    Edit3,
    X,
    ArrowRight,
    CheckCircle2,
    Phone,
    SlidersHorizontal,
    UtensilsCrossed,
    Link2,
    ChevronLeft,
    ChevronRight
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

function getTokenPax(token: WaitingToken | ServingToken): number {
    if (token.pax_count && token.pax_count > 0) {
        return token.pax_count;
    }
    const cd = (token as any).custom_data;
    if (cd && typeof cd === "object") {
        const val = cd.pax ?? cd.pax_count ?? cd.no_of_pax ?? cd.number_of_pax;
        if (val !== undefined && val !== null) {
            const parsed = parseInt(String(val), 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
    }
    return 1;
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
    const [viewMode, setViewMode] = useState<"floor" | "paper">("floor");
    const [loadingTable, setLoadingTable] = useState<number | null>(null);
    const [mobileExpandAll, setMobileExpandAll] = useState(false);
    const [expandedTable, setExpandedTable] = useState<number | null>(null);

    // Paper view states
    const [searchQuery, setSearchQuery] = useState("");
    const [paxFilter, setPaxFilter] = useState<"all" | "1-4" | "5-6" | "7-9" | "10-12" | "12-15" | "15+" | number>("all");
    const [selectedTableForToken, setSelectedTableForToken] = useState<Record<string, number>>({});
    const [seatingTokenId, setSeatingTokenId] = useState<string | null>(null);
    const [showVacantBar, setShowVacantBar] = useState<boolean>(true);
    const vacantScrollRef = useRef<HTMLDivElement>(null);

    // Capacity edit modal state
    const [editingCapacityTable, setEditingCapacityTable] = useState<{ id: number; name: string; capacity: number } | null>(null);
    const [newCapacityInput, setNewCapacityInput] = useState<number>(4);
    const [isSavingCapacity, setIsSavingCapacity] = useState(false);

    // Shared / Merged Tables states
    const [mergePartyToken, setMergePartyToken] = useState<WaitingToken | null>(null);
    const [selectedMergeTableIds, setSelectedMergeTableIds] = useState<number[]>([]);
    const [isSubmittingMerge, setIsSubmittingMerge] = useState(false);

    // Join extra table from floor view
    const [joinTargetTable, setJoinTargetTable] = useState<{ token: ServingToken; currentTableId: number; currentTableName: string } | null>(null);
    const [selectedJoinTableId, setSelectedJoinTableId] = useState<number | null>(null);
    const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);

    // Free joined tables confirmation
    const [freeMergedConfirm, setFreeMergedConfirm] = useState<{ token: ServingToken; clickedTableId: number; clickedTableName: string; tableIds: number[] } | null>(null);

    // Helper: Return all active table IDs for a serving token (assigned_line + shared_lines)
    const getTokenAllActiveTables = (token: ServingToken): number[] => {
        const completed = token.completed_lines ?? [];
        const list: number[] = [];
        if (token.assigned_line !== null && token.assigned_line !== undefined && !completed.includes(token.assigned_line)) {
            list.push(token.assigned_line);
        }
        for (const sl of (token.shared_lines ?? [])) {
            if (!completed.includes(sl) && !list.includes(sl)) {
                list.push(sl);
            }
        }
        return list;
    };

    // Map table_id -> serving token (supports both primary assigned_line and shared_lines for merged tables)
    const tableMap = useMemo(() => {
        const map = new Map<number, ServingToken>();
        for (const t of allServingTokens) {
            const completed = t.completed_lines ?? [];
            if (t.assigned_line !== null && t.assigned_line !== undefined && !completed.includes(t.assigned_line)) {
                map.set(t.assigned_line, t);
            }
            for (const sl of (t.shared_lines ?? [])) {
                if (!completed.includes(sl)) {
                    map.set(sl, t);
                }
            }
        }
        return map;
    }, [allServingTokens]);

    // Vacant tables list
    const vacantTables = useMemo(() => {
        return tables.filter(t => !tableMap.has(t.id));
    }, [tables, tableMap]);

    // All tables displayed directly
    const filteredTables = tables;

    // Pax counts for filter buttons
    const paxStats = useMemo(() => {
        let p1_4 = 0;
        let p5_6 = 0;
        let p7_9 = 0;
        let p10_12 = 0;
        let p12_15 = 0;
        let p15plus = 0;
        const exactCounts: Record<number, number> = {};

        for (const t of waitingTokens) {
            const p = getTokenPax(t);
            if (p >= 1 && p <= 4) p1_4++;
            if (p >= 5 && p <= 6) p5_6++;
            if (p >= 7 && p <= 9) p7_9++;
            if (p >= 10 && p <= 12) p10_12++;
            if (p >= 12 && p <= 15) p12_15++;
            if (p >= 15) p15plus++;

            exactCounts[p] = (exactCounts[p] || 0) + 1;
        }

        return { p1_4, p5_6, p7_9, p10_12, p12_15, p15plus, exactCounts };
    }, [waitingTokens]);

    // Filtered waiting tokens in Paper View
    const filteredWaitingTokens = useMemo(() => {
        return waitingTokens.filter(t => {
            const pax = getTokenPax(t);
            
            // Pax filter
            if (paxFilter === "1-4" && (pax < 1 || pax > 4)) return false;
            if (paxFilter === "5-6" && (pax < 5 || pax > 6)) return false;
            if (paxFilter === "7-9" && (pax < 7 || pax > 9)) return false;
            if (paxFilter === "10-12" && (pax < 10 || pax > 12)) return false;
            if (paxFilter === "12-15" && (pax < 12 || pax > 15)) return false;
            if (paxFilter === "15+" && pax < 15) return false;
            if (typeof paxFilter === "number" && pax !== paxFilter) return false;

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const numMatch = `${prefix}${t.token_number}`.toLowerCase().includes(q) || String(t.token_number).includes(q);
                const nameMatch = (t.customer_name || "").toLowerCase().includes(q);
                const phoneMatch = (t.customer_phone || "").includes(q);
                if (!numMatch && !nameMatch && !phoneMatch) return false;
            }

            return true;
        });
    }, [waitingTokens, paxFilter, searchQuery, prefix]);

    // Call / Seat next customer to this table
    const seatNextToTable = async (tableId: number, tableCapacity: number) => {
        setLoadingTable(tableId);
        try {
            // Find best matching waiting party (where pax <= tableCapacity)
            const match = waitingTokens.find(w => getTokenPax(w) <= tableCapacity);
            if (match) {
                await api.serveSpecificToken(queueId, match.token_number, tableId);
                toast.success(`Seated Party #${prefix}${match.token_number} (${getTokenPax(match)}p) at Table ${tableId}`);
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
    const freeSingleTable = async (tableId: number, tableName: string) => {
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

    const freeAllJoinedTables = async (tableIds: number[]) => {
        setLoadingTable(tableIds[0]);
        try {
            await Promise.all(tableIds.map(id => api.clearLine(queueId, id)));
            const names = tableIds.map(id => tables.find(t => t.id === id)?.name || `T${id}`).join(" + ");
            toast.success(`Cleared joined tables [${names}]`);
            setFreeMergedConfirm(null);
            onUpdate();
        } catch {
            toast.error(`Failed to clear joined tables`);
        } finally {
            setLoadingTable(null);
        }
    };

    const handleRequestFreeTable = (tableId: number, tableName: string) => {
        const token = tableMap.get(tableId);
        if (!token) {
            freeSingleTable(tableId, tableName);
            return;
        }
        const activeLines = getTokenAllActiveTables(token);
        if (activeLines.length > 1) {
            setFreeMergedConfirm({ token, clickedTableId: tableId, clickedTableName: tableName, tableIds: activeLines });
        } else {
            freeSingleTable(tableId, tableName);
        }
    };

    // Seat party across multiple merged tables (from Paper View)
    const handleConfirmMergeSeating = async () => {
        if (!mergePartyToken || selectedMergeTableIds.length === 0 || isReadOnly || isPaused) return;
        setIsSubmittingMerge(true);
        try {
            const primaryId = selectedMergeTableIds[0];
            const additionalIds = selectedMergeTableIds.slice(1);

            // 1. Assign primary table
            await api.serveSpecificToken(queueId, mergePartyToken.token_number, primaryId);

            // 2. Share additional tables
            for (const addId of additionalIds) {
                await api.shareToken(queueId, mergePartyToken.token_number, addId);
            }

            const names = selectedMergeTableIds.map(id => tables.find(t => t.id === id)?.name || `T${id}`).join(" + ");
            toast.success(`Seated Party #${prefix}${mergePartyToken.token_number} (${getTokenPax(mergePartyToken)}p) across joined [${names}]`);
            setMergePartyToken(null);
            setSelectedMergeTableIds([]);
            onUpdate();
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : "Failed to merge tables";
            toast.error(msg);
        } finally {
            setIsSubmittingMerge(false);
        }
    };

    // Join extra vacant table to already seated party (from Floor View)
    const handleConfirmJoinTable = async () => {
        if (!joinTargetTable || !selectedJoinTableId || isReadOnly || isPaused) return;
        setIsSubmittingJoin(true);
        try {
            await api.shareToken(queueId, joinTargetTable.token.token_number, selectedJoinTableId);
            const addedName = tables.find(t => t.id === selectedJoinTableId)?.name || `Table ${selectedJoinTableId}`;
            toast.success(`Joined ${addedName} to Party #${prefix}${joinTargetTable.token.token_number} (${joinTargetTable.currentTableName})`);
            setJoinTargetTable(null);
            setSelectedJoinTableId(null);
            onUpdate();
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : "Failed to join table";
            toast.error(msg);
        } finally {
            setIsSubmittingJoin(false);
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

    // Seat specific waiting token from Paper View
    const handleSeatWaitingToken = async (token: WaitingToken, tableId?: number) => {
        if (isReadOnly || isPaused) return;
        const targetTableId = tableId ?? selectedTableForToken[token.id] ?? vacantTables[0]?.id;
        if (!targetTableId) {
            toast.error("No vacant table selected or available");
            return;
        }

        setSeatingTokenId(token.id);
        try {
            await api.serveSpecificToken(queueId, token.token_number, targetTableId);
            const targetTable = tables.find(t => t.id === targetTableId);
            const tableName = targetTable?.name || `Table ${targetTableId}`;
            toast.success(`Seated #${prefix}${token.token_number} (${token.customer_name || "Guest"}) at ${tableName}`);
            onUpdate();
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : `Failed to seat customer at Table ${targetTableId}`;
            toast.error(msg);
        } finally {
            setSeatingTokenId(null);
        }
    };

    // Open inline capacity edit modal
    const handleOpenCapacityEdit = (tbl: TableConfig, e: React.MouseEvent) => {
        e.stopPropagation();
        if (isReadOnly) return;
        setEditingCapacityTable({ id: tbl.id, name: tbl.name || `Table ${tbl.id}`, capacity: tbl.capacity });
        setNewCapacityInput(tbl.capacity);
    };

    // Save updated table capacity
    const handleSaveCapacity = async () => {
        if (!editingCapacityTable) return;
        const capacityVal = Number(newCapacityInput);
        if (isNaN(capacityVal) || capacityVal < 1 || capacityVal > 50) {
            toast.error("Please enter a valid chair count between 1 and 50");
            return;
        }

        setIsSavingCapacity(true);
        try {
            const updatedTables = tables.map(t => 
                t.id === editingCapacityTable.id ? { ...t, capacity: capacityVal } : t
            );
            await api.updateQueue(queueId, { table_config: updatedTables });
            toast.success(`Updated ${editingCapacityTable.name} to ${capacityVal} chairs`);
            setEditingCapacityTable(null);
            onUpdate();
        } catch (err: any) {
            toast.error(err?.message || "Failed to update table capacity");
        } finally {
            setIsSavingCapacity(false);
        }
    };

    const occupiedCount = allServingTokens.length;

    return (
        <div style={{ marginBottom: 24 }}>
            {/* Top Bar: Title, Counts, and View Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white m-0">
                            {viewMode === "floor" ? "Floor Tables" : "Host Stand Waitlist Register"}
                        </h2>
                        {viewMode === "paper" && (
                            <span className="text-[10.5px] font-bold tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                Paper View
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                            <span><strong className="text-slate-800 dark:text-slate-200 font-semibold">{occupiedCount}</strong> / {tables.length} occupied</span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span><strong className="text-slate-800 dark:text-slate-200 font-semibold">{vacantTables.length}</strong> available</span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                            <span><strong className="text-slate-800 dark:text-slate-200 font-semibold">{waitingTokens.length}</strong> waiting parties</span>
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* View Switcher Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                        <button
                            type="button"
                            onClick={() => setViewMode("floor")}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                viewMode === "floor"
                                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                        >
                            <LayoutGrid size={14} />
                            <span>Floor View</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("paper")}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                viewMode === "paper"
                                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                        >
                            <ClipboardList size={14} />
                            <span>Paper View</span>
                            {waitingTokens.length > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                                    viewMode === "paper"
                                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50"
                                        : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                }`}>
                                    {waitingTokens.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Mobile Expand Toggle (Floor View only) */}
                    {viewMode === "floor" && (
                        <button
                            type="button"
                            onClick={() => { setMobileExpandAll(prev => !prev); setExpandedTable(null); }}
                            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 shadow-sm"
                        >
                            {mobileExpandAll ? <><List size={14} /> Compact</> : <><LayoutGrid size={14} /> Expand</>}
                        </button>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* VIEW MODE 1: FLOOR VIEW (GRID OF TABLES) */}
            {/* ========================================================================= */}
            {viewMode === "floor" && (
                <>
                    {/* Desktop Grid (md and up) */}
                    <div className="hidden md:grid" style={{
                        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                        gap: 20,
                    }}>
                        {filteredTables.map((tbl) => {
                            const token = tableMap.get(tbl.id);
                            const isOccupied = !!token;
                            const isLoading = loadingTable === tbl.id;
                            const elapsedMins = isOccupied ? getElapsedMinutes(token?.served_at) : 0;
                            const isLingering = isOccupied && elapsedMins >= 60;
                            const tokenTables = token ? getTokenAllActiveTables(token) : [tbl.id];
                            const isMerged = tokenTables.length > 1;

                            return (
                                <div
                                    key={tbl.id}
                                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 transition-all duration-200 min-h-[175px] ${
                                        isOccupied
                                            ? isLingering
                                                ? "bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/60 shadow-[0_4px_20px_rgba(244,63,94,0.08)]"
                                                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700"
                                            : "bg-white dark:bg-slate-900/50 border border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
                                    }`}
                                >
                                    {/* Header: Table Name & Capacity Badge & Status Pill */}
                                    <div className="flex items-center justify-between mb-2 relative z-10">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`text-[12px] font-black uppercase tracking-[0.08em] truncate ${
                                                isOccupied
                                                    ? isLingering ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                                                    : "text-slate-700 dark:text-slate-300"
                                            }`}>
                                                {tbl.name || `Table ${tbl.id}`}
                                            </span>
                                            {isMerged && (
                                                <span className="text-[9.5px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 shrink-0" title={`Joined tables: ${tokenTables.map(id => `T${id}`).join(", ")}`}>
                                                    🔗 Joined
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {/* Interactive Capacity Badge (Click to Edit Chairs) */}
                                            <button
                                                type="button"
                                                onClick={(e) => handleOpenCapacityEdit(tbl, e)}
                                                disabled={isReadOnly}
                                                title="Click to edit chairs count"
                                                className="group/cap inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200/70 dark:border-slate-700 transition-all cursor-pointer select-none"
                                            >
                                                <span>{tbl.capacity}p</span>
                                                <Edit3 size={9} className="opacity-0 group-hover/cap:opacity-100 transition-opacity" />
                                            </button>

                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${
                                                isOccupied
                                                    ? isLingering
                                                        ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 animate-pulse"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-2xs"
                                            }`}>
                                                {isOccupied ? (
                                                    <>
                                                        <Clock size={11} className="text-slate-400" />
                                                        <span>{elapsedMins}m</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        <span>Available</span>
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    {isOccupied && token ? (
                                        <div className="flex flex-col flex-1 relative z-10 justify-between">
                                            <div>
                                                {/* Token Number */}
                                                <div className="text-[28px] font-black tracking-tight text-slate-900 dark:text-white leading-none mb-1.5">
                                                    <span className="text-slate-400 dark:text-slate-500 font-semibold">{prefix}</span>{token.token_number}
                                                </div>
                                                <div className="text-[12.5px] font-medium text-slate-600 dark:text-slate-300 mb-3 truncate flex items-center gap-1.5 flex-wrap">
                                                    <span className="truncate">{token.customer_name || "Guest"}</span>
                                                    {getTokenPax(token) > 1 && (
                                                        <span className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10.5px] shadow-2xs border border-slate-200/80 dark:border-slate-700" title={`Total Guests: ${getTokenPax(token)}`}>
                                                            <Users size={10} />
                                                            {getTokenPax(token)}p
                                                        </span>
                                                    )}
                                                    {isMerged && (
                                                        <span className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] border border-slate-200 dark:border-slate-700 shrink-0" title={`Joined tables: ${tokenTables.map(id => `T${id}`).join(", ")}`}>
                                                            <Link2 size={9} />
                                                            {tokenTables.map(id => `T${id}`).join("+")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            {!isReadOnly && (
                                                <div className="flex items-center gap-2 mt-2 pt-2.5 border-t border-slate-100 dark:border-white/5">
                                                    <button
                                                        type="button"
                                                        onClick={() => skipTable(tbl.id)}
                                                        disabled={isLoading || isPaused}
                                                        title={isPaused ? "Queue is on a break" : "Skip customer"}
                                                        className="flex-1 flex items-center justify-center gap-1 h-8.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11.5px] font-semibold transition-colors disabled:opacity-50 px-1 border border-slate-200/90 dark:border-slate-700"
                                                    >
                                                        <FastForward size={11} className="text-slate-400" />
                                                        <span>Skip</span>
                                                    </button>
                                                    {vacantTables.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setJoinTargetTable({ token, currentTableId: tbl.id, currentTableName: tbl.name || `Table ${tbl.id}` });
                                                                setSelectedJoinTableId(vacantTables[0]?.id ?? null);
                                                            }}
                                                            disabled={isLoading || isPaused}
                                                            title="Join another vacant table to this party"
                                                            className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shrink-0 border border-slate-200/90 dark:border-slate-700"
                                                        >
                                                            <Link2 size={13} className="text-slate-400" />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRequestFreeTable(tbl.id, tbl.name || `Table ${tbl.id}`)}
                                                        disabled={isLoading}
                                                        title="Free Table (Bill Paid)"
                                                        className="flex-[1.4] flex items-center justify-center gap-1.5 h-8.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11.5px] font-semibold shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50 px-2 cursor-pointer"
                                                    >
                                                        <Check size={13} strokeWidth={2.5} />
                                                        <span>{isMerged ? "Free Joined" : "Free Table"}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center flex-1 my-3 text-center">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-center mb-2 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-all duration-200 shadow-2xs">
                                                <Utensils size={18} />
                                            </div>
                                            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                Vacant Table
                                            </span>
                                            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                                                Seats up to {tbl.capacity} guests
                                            </span>
                                            {waitingTokens.length > 0 && !isReadOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() => setViewMode("paper")}
                                                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                                                >
                                                    <ClipboardList size={12} className="text-slate-400" />
                                                    <span>Seat Party</span>
                                                </button>
                                            )}
                                        </div>
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
                            const tokenTables = token ? getTokenAllActiveTables(token) : [tbl.id];
                            const isMerged = tokenTables.length > 1;

                            return (
                                <div key={tbl.id} className="overflow-hidden rounded-xl transition-all duration-300">
                                    <div
                                        className={`w-full flex items-center justify-between px-4 py-3 transition-all duration-300 ${
                                            isOccupied
                                                ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
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
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleOpenCapacityEdit(tbl, e)}
                                                        disabled={isReadOnly}
                                                        className="text-[10px] text-slate-500 hover:text-indigo-600 bg-slate-200/60 dark:bg-slate-700/60 px-1 py-0.2 rounded font-semibold transition-colors"
                                                    >
                                                        {tbl.capacity}p ✎
                                                    </button>
                                                </div>
                                                {isOccupied && token && (
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap">
                                                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-1">{prefix}{token.token_number}</span>
                                                        <span>{token.customer_name || "Guest"}</span>
                                                        {isMerged && (
                                                            <span className="text-[9.5px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                                                                🔗 {tokenTables.map(id => `T${id}`).join("+")}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isOccupied ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRequestFreeTable(tbl.id, tbl.name)}
                                                    disabled={isLoading || isReadOnly}
                                                    className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                                                >
                                                    {isMerged ? "Free Joined" : "Free Table"}
                                                </button>
                                            ) : (
                                                <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md">
                                                    Available
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ========================================================================= */}
            {/* VIEW MODE 2: PAPER VIEW (HOST STAND WAITLIST MANIFEST) */}
            {/* ========================================================================= */}
            {viewMode === "paper" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                    {/* Vacant Tables Available Bar (Minimal & Professional Strip) */}
                    {showVacantBar && (
                        <div className="bg-slate-50/90 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3 overflow-hidden transition-all">
                            {/* Left Badge */}
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                    Ready Tables ({vacantTables.length})
                                </span>
                            </div>

                            {/* Center Scrollable Pills Strip */}
                            {vacantTables.length === 0 ? (
                                <span className="text-xs text-slate-500 dark:text-slate-400 italic flex-1 truncate">
                                    All tables are currently occupied
                                </span>
                            ) : (
                                <div className="flex items-center gap-1 min-w-0 flex-1 relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (vacantScrollRef.current) {
                                                vacantScrollRef.current.scrollBy({ left: -220, behavior: "smooth" });
                                            }
                                        }}
                                        className="shrink-0 p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-md transition-colors cursor-pointer"
                                        title="Scroll left"
                                    >
                                        <ChevronLeft size={15} />
                                    </button>
                                    <div
                                        ref={vacantScrollRef}
                                        onWheel={(e) => {
                                            if (vacantScrollRef.current && Math.abs(e.deltaY) > 0) {
                                                vacantScrollRef.current.scrollLeft += e.deltaY;
                                            }
                                        }}
                                        className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth py-0.5 flex-1 select-none"
                                    >
                                        {vacantTables.map(vt => (
                                            <span
                                                key={vt.id}
                                                className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 px-2.5 py-1 rounded-lg shadow-2xs whitespace-nowrap"
                                            >
                                                <span>{vt.name || `T${vt.id}`}</span>
                                                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1 py-0.2 rounded font-bold">
                                                    {vt.capacity}p
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (vacantScrollRef.current) {
                                                vacantScrollRef.current.scrollBy({ left: 220, behavior: "smooth" });
                                            }
                                        }}
                                        className="shrink-0 p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-md transition-colors cursor-pointer"
                                        title="Scroll right"
                                    >
                                        <ChevronRight size={15} />
                                    </button>
                                </div>
                            )}

                            {/* Right Actions & Waiting Pax Count */}
                            <div className="flex items-center gap-3 shrink-0 pl-2.5 border-l border-slate-200 dark:border-slate-700">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap hidden md:inline">
                                    Waiting: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{waitingTokens.reduce((sum, t) => sum + getTokenPax(t), 0)}p</strong>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowVacantBar(false)}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-md transition-colors cursor-pointer"
                                    title="Hide ready tables strip"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Filter & Search Bar */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                            {/* Search input and restore strip button */}
                            <div className="flex items-center gap-2 flex-1 max-w-lg">
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by token #, guest name, or phone..."
                                        className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 dark:focus:ring-white/10 dark:focus:border-slate-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all shadow-2xs"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                {!showVacantBar && (
                                    <button
                                        type="button"
                                        onClick={() => setShowVacantBar(true)}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer whitespace-nowrap"
                                        title="Show ready vacant tables strip"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span>Show Tables ({vacantTables.length})</span>
                                    </button>
                                )}
                            </div>

                            {/* Main Pax Range Chips */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                                    <Users size={12} /> Pax:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("all")}
                                    className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
                                        paxFilter === "all"
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-medium"
                                    }`}
                                >
                                    All ({waitingTokens.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("1-4")}
                                    className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
                                        paxFilter === "1-4"
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-medium"
                                    }`}
                                >
                                    1-4p ({paxStats.p1_4})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("5-6")}
                                    className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
                                        paxFilter === "5-6"
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-medium"
                                    }`}
                                >
                                    5-6p ({paxStats.p5_6})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("7-9")}
                                    className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
                                        paxFilter === "7-9"
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-medium"
                                    }`}
                                >
                                    7-9p ({paxStats.p7_9})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("10-12")}
                                    className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
                                        paxFilter === "10-12"
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-medium"
                                    }`}
                                >
                                    10-12p ({paxStats.p10_12})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("12-15")}
                                    className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
                                        paxFilter === "12-15"
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-medium"
                                    }`}
                                >
                                    12-15p ({paxStats.p12_15})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("15+")}
                                    className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
                                        paxFilter === "15+"
                                            ? "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
                                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-medium"
                                    }`}
                                >
                                    15+p ({paxStats.p15plus})
                                </button>
                            </div>
                        </div>

                        {/* Quick Exact Match Pax Buttons (e.g. Host looking for exact 6 people for an open 6-top) */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                                Exact Seats:
                            </span>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(exactPax => {
                                const count = paxStats.exactCounts[exactPax] || 0;
                                const isSelected = paxFilter === exactPax;
                                return (
                                    <button
                                        key={exactPax}
                                        type="button"
                                        onClick={() => setPaxFilter(isSelected ? "all" : exactPax)}
                                        className={`px-2.5 py-0.5 rounded-lg text-[11px] transition-all cursor-pointer ${
                                            isSelected
                                                ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm shadow-indigo-500/20"
                                                : count > 0
                                                    ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-semibold"
                                                    : "bg-slate-100/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-600 border border-transparent font-normal"
                                        }`}
                                    >
                                        {exactPax}p {count > 0 && <span className="opacity-75 font-normal">({count})</span>}
                                    </button>
                                );
                            })}
                            {paxFilter !== "all" && (
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("all")}
                                    className="ml-auto text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                                >
                                    Clear Filter
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Waiting Guests Manifest List */}
                    {filteredWaitingTokens.length === 0 ? (
                        <div className="py-12 px-4 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
                                <UtensilsCrossed size={22} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                No waiting parties found
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                                {searchQuery || paxFilter !== "all"
                                    ? "No parties match the selected search query or pax count filters."
                                    : "The dining waitlist is currently empty. Guests will appear here as they register."}
                            </p>
                            {(searchQuery || paxFilter !== "all") && (
                                <button
                                    type="button"
                                    onClick={() => { setSearchQuery(""); setPaxFilter("all"); }}
                                    className="mt-3 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {filteredWaitingTokens.map((token, idx) => {
                                const partyPax = getTokenPax(token);
                                const waitMins = getElapsedMinutes(token.created_at);
                                const isSeating = seatingTokenId === token.id;

                                // Recommend best matching vacant table for this party
                                const bestMatchTable = vacantTables.find(t => t.capacity >= partyPax);
                                const selectedTableId = selectedTableForToken[token.id] ?? bestMatchTable?.id ?? vacantTables[0]?.id;

                                return (
                                    <div
                                        key={token.id}
                                        className="p-4 sm:px-6 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        {/* Left: Token Number, Name, Phone, Entry Type */}
                                        <div className="flex items-start sm:items-center gap-3.5">
                                            {/* Token number badge */}
                                            <div className="w-12 h-12 rounded-xl bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase leading-none">
                                                    {prefix}
                                                </span>
                                                <span className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                                    {token.token_number}
                                                </span>
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {token.customer_name || "Guest"}
                                                    </span>
                                                    {/* Unified Minimal Pax Badge */}
                                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-md border border-slate-200/70 dark:border-slate-700 shadow-2xs">
                                                        <Users size={11} className="text-slate-400 dark:text-slate-500" />
                                                        <span>{partyPax} Pax</span>
                                                    </span>
                                                    {token.entry_type && token.entry_type !== "manual" && (
                                                        <span className="text-[9.5px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                                            {token.entry_type}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                                    {token.customer_phone && (
                                                        <a
                                                            href={`tel:${token.customer_phone}`}
                                                            className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                                                        >
                                                            <Phone size={11} className="text-slate-400" />
                                                            <span>{token.customer_phone}</span>
                                                        </a>
                                                    )}
                                                    <span className="flex items-center gap-1 text-slate-400 font-medium">
                                                        <Clock size={11} />
                                                        <span>{waitMins}m waiting</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Direct Table Assignment & Seating Action */}
                                        <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap justify-end">
                                            {vacantTables.length > 0 ? (
                                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                                    {/* Table Selection Dropdown */}
                                                    <select
                                                        value={selectedTableId || ""}
                                                        onChange={(e) => setSelectedTableForToken(prev => ({
                                                            ...prev,
                                                            [token.id]: Number(e.target.value)
                                                        }))}
                                                        disabled={isSeating || isReadOnly || isPaused}
                                                        className="text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 shadow-2xs cursor-pointer"
                                                    >
                                                        {vacantTables.map(vt => {
                                                            const isExactFit = vt.capacity === partyPax;
                                                            const isOverFit = vt.capacity > partyPax;
                                                            const isUnderFit = vt.capacity < partyPax;
                                                            const tag = isExactFit ? "★ Perfect" : isOverFit ? `+${vt.capacity - partyPax} seats` : "Under capacity";
                                                            return (
                                                                <option key={vt.id} value={vt.id}>
                                                                    {vt.name || `Table ${vt.id}`} ({vt.capacity}p) • {tag}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>

                                                    {/* Direct Seating Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSeatWaitingToken(token, selectedTableId)}
                                                        disabled={isSeating || isReadOnly || isPaused || !selectedTableId}
                                                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {isSeating ? (
                                                            <span>Seating...</span>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 size={13} />
                                                                <span>Seat to Table</span>
                                                            </>
                                                        )}
                                                    </button>

                                                    {/* Merge Tables Option (Available when 2 or more vacant tables exist) */}
                                                    {vacantTables.length >= 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setMergePartyToken(token);
                                                                setSelectedMergeTableIds([]);
                                                            }}
                                                            disabled={isSeating || isReadOnly || isPaused}
                                                            title="Combine 2 or more tables to seat this party"
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                                                        >
                                                            <Link2 size={12} className="text-slate-400 dark:text-slate-500" />
                                                            <span>Merge Tables</span>
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                                                    No vacant tables
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* INLINE TABLE CAPACITY EDIT MODAL */}
            {/* ========================================================================= */}
            {editingCapacityTable && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 shadow-2xl">
                        <div className="flex items-center justify-between mb-3.5">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Edit3 size={14} className="text-indigo-500" />
                                    Edit Table Chairs
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Configure chairs count for <strong>{editingCapacityTable.name}</strong>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingCapacityTable(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="mb-4">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Chair Presets
                            </label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {[2, 4, 6, 8, 10, 12, 14, 16].map(preset => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setNewCapacityInput(preset)}
                                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                            newCapacityInput === preset
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                                : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                                        }`}
                                    >
                                        {preset}p
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Direct Number Input */}
                        <div className="mb-5">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                Custom Number of Chairs
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setNewCapacityInput(prev => Math.max(1, prev - 1))}
                                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-lg flex items-center justify-center hover:bg-slate-200 transition-colors"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={newCapacityInput}
                                    onChange={(e) => setNewCapacityInput(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="flex-1 text-center py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setNewCapacityInput(prev => Math.min(50, prev + 1))}
                                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-lg flex items-center justify-center hover:bg-slate-200 transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingCapacityTable(null)}
                                className="flex-1 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCapacity}
                                disabled={isSavingCapacity}
                                className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
                            >
                                {isSavingCapacity ? "Saving..." : "Save Chairs"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MERGE TABLES MODAL (FROM PAPER VIEW) */}
            {/* ========================================================================= */}
            {mergePartyToken && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                    <Link2 size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Merge Tables for Party #{prefix}{mergePartyToken.token_number}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {mergePartyToken.customer_name || "Guest"} • <strong>{getTokenPax(mergePartyToken)} Pax Required</strong>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setMergePartyToken(null); setSelectedMergeTableIds([]); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="py-3.5 flex-1 overflow-y-auto space-y-3.5">
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                Select 2 or more vacant tables to join together into one combined table for this group:
                            </p>

                            {/* Grid of Vacant Tables */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {vacantTables.map(vt => {
                                    const isSelected = selectedMergeTableIds.includes(vt.id);
                                    return (
                                        <button
                                            key={vt.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedMergeTableIds(prev =>
                                                    prev.includes(vt.id) ? prev.filter(id => id !== vt.id) : [...prev, vt.id]
                                                );
                                            }}
                                            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[70px] ${
                                                isSelected
                                                    ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                                                    : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                                    {vt.name || `Table ${vt.id}`}
                                                </span>
                                                <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                                                    isSelected ? "bg-indigo-600 text-white" : "border border-slate-300 dark:border-slate-600"
                                                }`}>
                                                    {isSelected && <Check size={11} />}
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-2">
                                                {vt.capacity} Chairs
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Summary Box */}
                            {selectedMergeTableIds.length > 0 && (() => {
                                const selectedTables = tables.filter(t => selectedMergeTableIds.includes(t.id));
                                const totalChairs = selectedTables.reduce((sum, t) => sum + t.capacity, 0);
                                const neededPax = getTokenPax(mergePartyToken);
                                const fits = totalChairs >= neededPax;

                                return (
                                    <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                        fits
                                            ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                                            : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                                    }`}>
                                        <div>
                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                                <span>Joined:</span>
                                                <span className="text-indigo-600 dark:text-indigo-400">
                                                    {selectedTables.map(t => t.name || `T${t.id}`).join(" + ")}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                Total Capacity: <strong>{totalChairs} Chairs</strong> for <strong>{neededPax} Pax</strong>
                                            </div>
                                        </div>
                                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${
                                            fits
                                                ? "bg-emerald-600 text-white shadow-xs"
                                                : "bg-amber-500 text-white shadow-xs"
                                        }`}>
                                            {fits ? "✓ Fits Party" : `Need ${neededPax - totalChairs} More`}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Modal Actions */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => { setMergePartyToken(null); setSelectedMergeTableIds([]); }}
                                className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmMergeSeating}
                                disabled={selectedMergeTableIds.length < 2 || isSubmittingMerge}
                                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                {isSubmittingMerge ? "Merging & Seating..." : `Seat Across ${selectedMergeTableIds.length} Joined Tables`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* JOIN EXTRA TABLE MODAL (FROM FLOOR VIEW) */}
            {/* ========================================================================= */}
            {joinTargetTable && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 shadow-2xl">
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <Link2 size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Join Another Table
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Connect to <strong>{joinTargetTable.currentTableName}</strong> (Party #{prefix}{joinTargetTable.token.token_number})
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setJoinTargetTable(null); setSelectedJoinTableId(null); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="mb-4">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Select Vacant Table to Join:
                            </label>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                {vacantTables.map(vt => (
                                    <button
                                        key={vt.id}
                                        type="button"
                                        onClick={() => setSelectedJoinTableId(vt.id)}
                                        className={`p-2.5 rounded-xl border text-left transition-all ${
                                            selectedJoinTableId === vt.id
                                                ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                                                : "bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                        }`}
                                    >
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                                            {vt.name || `Table ${vt.id}`}
                                        </div>
                                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            {vt.capacity} Chairs
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => { setJoinTargetTable(null); setSelectedJoinTableId(null); }}
                                className="flex-1 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmJoinTable}
                                disabled={!selectedJoinTableId || isSubmittingJoin}
                                className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
                            >
                                {isSubmittingJoin ? "Joining..." : "Join Table"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* FREE JOINED TABLES CONFIRMATION MODAL */}
            {/* ========================================================================= */}
            {freeMergedConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 shadow-2xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <Utensils size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Free Joined Tables?
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Party #{prefix}{freeMergedConfirm.token.token_number} is seated across tables:{" "}
                                    <strong>{freeMergedConfirm.tableIds.map(id => tables.find(t => t.id === id)?.name || `T${id}`).join(" + ")}</strong>
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
                            Would you like to clear and free all joined tables together, or only this table?
                        </p>

                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => freeAllJoinedTables(freeMergedConfirm.tableIds)}
                                className="w-full py-2.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer"
                            >
                                Free All Joined Tables ({freeMergedConfirm.tableIds.map(id => `T${id}`).join("+")})
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const tblId = freeMergedConfirm.clickedTableId;
                                    const tblName = freeMergedConfirm.clickedTableName;
                                    setFreeMergedConfirm(null);
                                    freeSingleTable(tblId, tblName);
                                }}
                                className="w-full py-2 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Free Only {freeMergedConfirm.clickedTableName}
                            </button>
                            <button
                                type="button"
                                onClick={() => setFreeMergedConfirm(null)}
                                className="w-full py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
