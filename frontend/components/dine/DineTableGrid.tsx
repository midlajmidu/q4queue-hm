"use client";

import React, { useState, useMemo, useRef } from "react";
import { api, ApiError } from "@/lib/api";
import { ServingToken, WaitingToken, TableConfig } from "@/types/api";
import dynamic from "next/dynamic";
const DineFloor3D = dynamic(() => import("./DineFloor3D"), { ssr: false });
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
    ChevronRight,
    ChevronDown,
    Loader2
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

    // Unified Table Seating & Merge Modal State (for waiting token)
    const [assignTableToken, setAssignTableToken] = useState<WaitingToken | null>(null);
    const [modalSelectedTableIds, setModalSelectedTableIds] = useState<number[]>([]);
    const [modalTableFilter, setModalTableFilter] = useState<"all" | "vacant" | "occupied">("vacant");
    const [modalTableSearch, setModalTableSearch] = useState("");
    const [isSubmittingSeating, setIsSubmittingSeating] = useState(false);

    // Capacity edit modal state
    const [editingCapacityTable, setEditingCapacityTable] = useState<{ id: number; name: string; capacity: number } | null>(null);
    const [newCapacityInput, setNewCapacityInput] = useState<number>(4);
    const [isSavingCapacity, setIsSavingCapacity] = useState(false);

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

    // Map table_id -> list of serving tokens currently at this table (supports shared tables & merged tables)
    const tableTokensMap = useMemo(() => {
        const map = new Map<number, ServingToken[]>();
        for (const t of allServingTokens) {
            const completed = t.completed_lines ?? [];
            if (t.assigned_line !== null && t.assigned_line !== undefined && !completed.includes(t.assigned_line)) {
                const list = map.get(t.assigned_line) || [];
                list.push(t);
                map.set(t.assigned_line, list);
            }
            for (const sl of (t.shared_lines ?? [])) {
                if (!completed.includes(sl)) {
                    const list = map.get(sl) || [];
                    if (!list.some(x => x.token_number === t.token_number)) {
                        list.push(t);
                    }
                    map.set(sl, list);
                }
            }
        }
        return map;
    }, [allServingTokens]);

    // Backward-compatible primary token map (returns first active token at the table)
    const tableMap = useMemo(() => {
        const map = new Map<number, ServingToken>();
        for (const [tblId, tokens] of tableTokensMap.entries()) {
            if (tokens.length > 0) {
                map.set(tblId, tokens[0]);
            }
        }
        return map;
    }, [tableTokensMap]);

    // Helper: get full occupancy stats for any table (pax seated, spare chairs, shared state)
    const getTableOccupancy = (tableId: number, capacity: number) => {
        const tokens = tableTokensMap.get(tableId) || [];
        const seatedPax = tokens.reduce((sum, t) => sum + (t.pax_count || 1), 0);
        const spareSeats = Math.max(0, capacity - seatedPax);
        const isVacant = tokens.length === 0;
        const isFull = seatedPax >= capacity;
        const isPartiallyOccupied = seatedPax > 0 && seatedPax < capacity;
        const isShared = tokens.length > 1;
        return {
            tokens,
            seatedPax,
            spareSeats,
            isVacant,
            isFull,
            isPartiallyOccupied,
            isShared,
        };
    };

    // Vacant tables (0 occupants)
    const vacantTables = useMemo(() => {
        return tables.filter(t => (tableTokensMap.get(t.id)?.length ?? 0) === 0);
    }, [tables, tableTokensMap]);

    // Tables that have at least 1 spare seat (vacant + partially occupied)
    const availableTables = useMemo(() => {
        return tables.filter(t => {
            const occ = getTableOccupancy(t.id, t.capacity);
            return occ.isVacant || occ.spareSeats > 0;
        });
    }, [tables, tableTokensMap]);

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

    // Free an individual party on a shared table
    const handleFreeSingleParty = async (token: ServingToken, tableId: number, tableName: string) => {
        setLoadingTable(tableId);
        try {
            if (token.id) {
                await api.completeToken(token.id);
            } else {
                await api.clearLine(queueId, tableId);
            }
            toast.success(`Completed Party #${prefix}${token.token_number} at ${tableName}`);
            onUpdate();
        } catch {
            toast.error(`Failed to complete Party #${prefix}${token.token_number}`);
        } finally {
            setLoadingTable(null);
        }
    };

    const handleRequestFreeTable = (tableId: number, tableName: string) => {
        const tokens = tableTokensMap.get(tableId) || [];
        if (tokens.length === 0) {
            freeSingleTable(tableId, tableName);
            return;
        }
        // If any token spans multiple tables (merged table), ask for merged clear confirmation
        const mergedToken = tokens.find(t => getTokenAllActiveTables(t).length > 1);
        if (mergedToken) {
            const activeLines = getTokenAllActiveTables(mergedToken);
            setFreeMergedConfirm({ token: mergedToken, clickedTableId: tableId, clickedTableName: tableName, tableIds: activeLines });
            return;
        }
        freeSingleTable(tableId, tableName);
    };

    // Unified Seating Handler (Seats single table OR merges multiple tables)
    const handleConfirmUnifiedSeating = async () => {
        if (!assignTableToken || modalSelectedTableIds.length === 0 || isReadOnly || isPaused) return;
        setIsSubmittingSeating(true);
        const token = assignTableToken;
        const selectedIds = [...modalSelectedTableIds];
        setAssignTableToken(null);
        setModalSelectedTableIds([]);

        try {
            if (selectedIds.length === 1) {
                // Single table seating
                await handleSeatWaitingToken(token, selectedIds[0]);
            } else {
                // Multi-table merged seating
                const primaryId = selectedIds[0];
                const additionalIds = selectedIds.slice(1);

                await api.serveSpecificToken(queueId, token.token_number, primaryId);
                for (const addId of additionalIds) {
                    await api.shareToken(queueId, token.token_number, addId);
                }

                const names = selectedIds.map(id => tables.find(t => t.id === id)?.name || `Table ${id}`).join(" + ");
                toast.success(`Seated Party #${prefix}${token.token_number} (${getTokenPax(token)}p) across joined [${names}]`);
                onUpdate();
            }
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : "Failed to seat party";
            toast.error(msg);
        } finally {
            setIsSubmittingSeating(false);
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
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${viewMode === "floor"
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
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${viewMode === "paper"
                                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                }`}
                        >
                            <ClipboardList size={14} />
                            <span>Paper View</span>
                            {waitingTokens.length > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${viewMode === "paper"
                                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50"
                                    : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                    }`}>
                                    {waitingTokens.length}
                                </span>
                            )}
                        </button>
                    </div>


                </div>
            </div>

            {/* ========================================================================= */}
            {/* VIEW MODE 1: FLOOR VIEW — 3D ISOMETRIC CANVAS */}
            {/* ========================================================================= */}
            {viewMode === "floor" && (
                <DineFloor3D
                    queueId={queueId}
                    tables={tables}
                    allServingTokens={allServingTokens}
                    prefix={prefix}
                    onUpdate={onUpdate}
                    isPaused={isPaused}
                    isReadOnly={isReadOnly}
                    waitingTokens={waitingTokens}
                    onFreeTable={(tableId, tableName) =>
                        handleRequestFreeTable(tableId, tableName)
                    }
                    onFreeSingleParty={(token, tableId, tableName) =>
                        handleFreeSingleParty(token, tableId, tableName)
                    }
                    onSkipTable={(tableId) => skipTable(tableId)}
                    onSeatNext={(tableId, capacity) =>
                        seatNextToTable(tableId, capacity)
                    }
                    onOpenAssignModal={(token) => {
                        setAssignTableToken(token);
                        setModalSelectedTableIds([]);
                    }}
                    onJoinTable={(token, currentTableId, currentTableName) => {
                        setJoinTargetTable({ token, currentTableId, currentTableName });
                        setSelectedJoinTableId(vacantTables[0]?.id ?? null);
                    }}
                    onOpenCapacityEdit={handleOpenCapacityEdit}
                />
            )}

            {/* ↓ REMOVED: old card grid and mobile card list (replaced by DineFloor3D above) */}
            {false && (
                <>
                    {/* Desktop Grid (md and up: 5 boxes per line) */}
                    <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                        {filteredTables.map((tbl) => {
                            const tokens = tableTokensMap.get(tbl.id) || [];
                            const isOccupied = tokens.length > 0;
                            const seatedPax = tokens.reduce((sum, t) => sum + (t.pax_count || 1), 0);
                            const spareSeats = Math.max(0, tbl.capacity - seatedPax);
                            const isShared = tokens.length > 1;
                            const isPartiallyOccupied = seatedPax > 0 && spareSeats > 0;
                            const primaryToken = tokens[0] || null;
                            const isLoading = loadingTable === tbl.id;
                            const elapsedMins = isOccupied ? getElapsedMinutes(primaryToken?.served_at) : 0;
                            const isLingering = isOccupied && elapsedMins >= 60;
                            const tokenTables = primaryToken ? getTokenAllActiveTables(primaryToken) : [tbl.id];
                            const isMerged = tokenTables.length > 1;

                            return (
                                <div
                                    key={tbl.id}
                                    className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 transition-all duration-200 min-h-[160px] ${isOccupied
                                        ? isLingering
                                            ? "bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/60 shadow-[0_4px_20px_rgba(244,63,94,0.08)]"
                                            : isShared
                                                ? "bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-800 shadow-xs"
                                                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700"
                                        : "bg-white dark:bg-slate-900/50 border border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
                                        }`}
                                >
                                    {/* Header: Table Name & Capacity Badge & Status Pill */}
                                    <div className="flex items-center justify-between mb-2 relative z-10">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className={`text-[11.5px] font-black uppercase tracking-[0.06em] truncate ${isOccupied
                                                ? isLingering ? "text-rose-600 dark:text-rose-400" : isShared ? "text-teal-700 dark:text-teal-300" : "text-slate-900 dark:text-white"
                                                : "text-slate-700 dark:text-slate-300"
                                                }`}>
                                                {tbl.name || `Table ${tbl.id}`}
                                            </span>
                                            {isMerged && (
                                                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-700 shrink-0" title={`Joined tables: ${tokenTables.map(id => `T${id}`).join(", ")}`}>
                                                    🔗 Joined
                                                </span>
                                            )}
                                            {isShared && (
                                                <span className="text-[9px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1 py-0.2 rounded border border-teal-200 dark:border-teal-800 shrink-0">
                                                    🤝 Shared
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {/* Interactive Capacity Badge (Click to Edit Chairs) */}
                                            <button
                                                type="button"
                                                onClick={(e) => handleOpenCapacityEdit(tbl, e)}
                                                disabled={isReadOnly}
                                                title="Click to edit chairs count"
                                                className="group/cap inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200/70 dark:border-slate-700 transition-all cursor-pointer select-none"
                                            >
                                                <span>{tbl.capacity}p</span>
                                                <Edit3 size={8.5} className="opacity-0 group-hover/cap:opacity-100 transition-opacity" />
                                            </button>

                                            <span className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${isOccupied
                                                ? isLingering
                                                    ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 animate-pulse"
                                                    : isShared
                                                        ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                                : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-2xs"
                                                }`}>
                                                {isOccupied ? (
                                                    <>
                                                        <Clock size={10} className="text-slate-400" />
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
                                    {isOccupied && primaryToken ? (
                                        isShared ? (
                                            /* Shared Table Body (Multiple Seated Parties) */
                                            <div className="flex flex-col flex-1 relative z-10 justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold">
                                                        <span className="text-teal-700 dark:text-teal-300 flex items-center gap-1">
                                                            <Users size={11} />
                                                            {tokens.length} Parties
                                                        </span>
                                                        <span className="text-slate-600 dark:text-slate-400 font-semibold text-[10px]">
                                                            {seatedPax}/{tbl.capacity}p {spareSeats > 0 ? `(+${spareSeats})` : "(Full)"}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-1 mb-2 max-h-[120px] overflow-y-auto pr-0.5">
                                                        {tokens.map((t) => (
                                                            <div key={t.id || t.token_number} className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-1">
                                                                <div className="flex items-center gap-1 min-w-0">
                                                                    <span className="text-[11px] font-black text-slate-900 dark:text-white shrink-0">
                                                                        #{prefix}{t.token_number}
                                                                    </span>
                                                                    <span className="text-[10.5px] text-slate-600 dark:text-slate-300 truncate font-medium">
                                                                        {t.customer_name || "Guest"}
                                                                    </span>
                                                                    <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-1 py-0.2 rounded border border-slate-200/50 dark:border-slate-600 shrink-0">
                                                                        {getTokenPax(t)}p
                                                                    </span>
                                                                </div>
                                                                {!isReadOnly && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleFreeSingleParty(t, tbl.id, tbl.name || `Table ${tbl.id}`)}
                                                                        disabled={isLoading}
                                                                        className="text-[9.5px] font-bold px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 transition-colors cursor-pointer shrink-0"
                                                                        title={`Free Party #${prefix}${t.token_number}`}
                                                                    >
                                                                        Free
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                {!isReadOnly && (
                                                    <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-white/5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRequestFreeTable(tbl.id, tbl.name || `Table ${tbl.id}`)}
                                                            disabled={isLoading}
                                                            className="w-full flex items-center justify-center gap-1 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold shadow-sm transition-all disabled:opacity-50 px-2 cursor-pointer"
                                                        >
                                                            <Check size={12} strokeWidth={2.5} />
                                                            <span>Clear Table</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Single Seated Party Body */
                                            <div className="flex flex-col flex-1 relative z-10 justify-between">
                                                <div>
                                                    {/* Token Number */}
                                                    <div className="text-[25px] font-black tracking-tight text-slate-900 dark:text-white leading-none mb-1">
                                                        <span className="text-slate-400 dark:text-slate-500 font-semibold">{prefix}</span>{primaryToken.token_number}
                                                    </div>
                                                    <div className="text-[11.5px] font-medium text-slate-600 dark:text-slate-300 mb-2.5 truncate flex items-center gap-1 flex-wrap">
                                                        <span className="truncate">{primaryToken.customer_name || "Guest"}</span>
                                                        <span className="inline-flex items-center gap-0.5 font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[10px] shadow-2xs border border-slate-200/80 dark:border-slate-700" title={`Total Guests: ${getTokenPax(primaryToken)}`}>
                                                            <Users size={9} />
                                                            {getTokenPax(primaryToken)}p
                                                        </span>
                                                        {isPartiallyOccupied && (
                                                            <span className="inline-flex items-center gap-0.5 font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1 py-0.2 rounded text-[9.5px] border border-teal-200/80 dark:border-teal-800">
                                                                +{spareSeats} Left
                                                            </span>
                                                        )}
                                                        {isMerged && (
                                                            <span className="inline-flex items-center gap-0.5 font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded text-[9.5px] border border-slate-200 dark:border-slate-700 shrink-0" title={`Joined tables: ${tokenTables.map(id => `T${id}`).join(", ")}`}>
                                                                <Link2 size={8.5} />
                                                                {tokenTables.map(id => `T${id}`).join("+")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                {!isReadOnly && (
                                                    <div className="flex items-center gap-1.5 mt-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
                                                        <button
                                                            type="button"
                                                            onClick={() => skipTable(tbl.id)}
                                                            disabled={isLoading || isPaused}
                                                            title={isPaused ? "Queue is on a break" : "Skip customer"}
                                                            className="flex-1 flex items-center justify-center gap-1 h-8 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors disabled:opacity-50 px-1 border border-slate-200/90 dark:border-slate-700"
                                                        >
                                                            <FastForward size={10} className="text-slate-400" />
                                                            <span>Skip</span>
                                                        </button>
                                                        {vacantTables.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setJoinTargetTable({ token: primaryToken, currentTableId: tbl.id, currentTableName: tbl.name || `Table ${tbl.id}` });
                                                                    setSelectedJoinTableId(vacantTables[0]?.id ?? null);
                                                                }}
                                                                disabled={isLoading || isPaused}
                                                                title="Join another vacant table to this party"
                                                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shrink-0 border border-slate-200/90 dark:border-slate-700"
                                                            >
                                                                <Link2 size={12} className="text-slate-400" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRequestFreeTable(tbl.id, tbl.name || `Table ${tbl.id}`)}
                                                            disabled={isLoading}
                                                            title="Free Table (Bill Paid)"
                                                            className="flex-[1.3] flex items-center justify-center gap-1 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50 px-1.5 cursor-pointer"
                                                        >
                                                            <Check size={12} strokeWidth={2.5} />
                                                            <span>{isMerged ? "Free Joined" : "Free Table"}</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    ) : (
                                        <div className="flex flex-col items-center justify-center flex-1 my-2 text-center">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-center mb-1.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-all duration-200 shadow-2xs">
                                                <Utensils size={16} />
                                            </div>
                                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                Vacant Table
                                            </span>
                                            <span className="text-[10.5px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                                                Seats up to {tbl.capacity} guests
                                            </span>
                                            {waitingTokens.length > 0 && !isReadOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() => setViewMode("paper")}
                                                    className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                                                >
                                                    <ClipboardList size={11} className="text-slate-400" />
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
                            const tokens = tableTokensMap.get(tbl.id) || [];
                            const isOccupied = tokens.length > 0;
                            const seatedPax = tokens.reduce((sum, t) => sum + (t.pax_count || 1), 0);
                            const spareSeats = Math.max(0, tbl.capacity - seatedPax);
                            const isShared = tokens.length > 1;
                            const isPartiallyOccupied = seatedPax > 0 && spareSeats > 0;
                            const primaryToken = tokens[0] || null;
                            const isLoading = loadingTable === tbl.id;
                            const isExpanded = mobileExpandAll || expandedTable === tbl.id;
                            const tokenTables = primaryToken ? getTokenAllActiveTables(primaryToken) : [tbl.id];
                            const isMerged = tokenTables.length > 1;

                            return (
                                <div key={tbl.id} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300">
                                    <div
                                        className={`w-full flex items-center justify-between px-4 py-3 transition-all duration-300 ${isOccupied
                                            ? isShared
                                                ? "bg-white dark:bg-slate-900 border-l-4 border-l-teal-500"
                                                : "bg-white dark:bg-slate-900 border-l-4 border-l-indigo-500"
                                            : "bg-slate-50 dark:bg-slate-800/50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs shadow-xs border border-slate-200 dark:border-slate-700">
                                                T{tbl.id}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                                                    <span>{tbl.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleOpenCapacityEdit(tbl, e)}
                                                        disabled={isReadOnly}
                                                        className="text-[10px] text-slate-500 hover:text-indigo-600 bg-slate-200/60 dark:bg-slate-700/60 px-1 py-0.2 rounded font-semibold transition-colors"
                                                    >
                                                        {tbl.capacity}p ✎
                                                    </button>
                                                    {isShared && (
                                                        <span className="text-[9.5px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800">
                                                            🤝 Shared ({seatedPax}/{tbl.capacity}p)
                                                        </span>
                                                    )}
                                                    {isPartiallyOccupied && !isShared && (
                                                        <span className="text-[9.5px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800">
                                                            +{spareSeats} seat left
                                                        </span>
                                                    )}
                                                </div>
                                                {isOccupied && !isShared && primaryToken && (
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap">
                                                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 mr-1">#{prefix}{primaryToken.token_number}</span>
                                                        <span>{primaryToken.customer_name || "Guest"}</span>
                                                        <span className="text-[10px] text-slate-400">({getTokenPax(primaryToken)}p)</span>
                                                        {isMerged && (
                                                            <span className="text-[9.5px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
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
                                                    onClick={() => handleRequestFreeTable(tbl.id, tbl.name || `Table ${tbl.id}`)}
                                                    disabled={isLoading || isReadOnly}
                                                    className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                                                >
                                                    {isMerged ? "Free Joined" : isShared ? "Clear All" : "Free Table"}
                                                </button>
                                            ) : (
                                                <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md">
                                                    Available
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* If shared, render each individual party row on mobile with Free Party button */}
                                    {isShared && (
                                        <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-1.5">
                                            {tokens.map((tok) => (
                                                <div key={tok.id} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">#{prefix}{tok.token_number}</span>
                                                        <span className="text-slate-700 dark:text-slate-300 font-medium">{tok.customer_name || "Guest"}</span>
                                                        <span className="text-[10.5px] text-slate-400">({getTokenPax(tok)}p)</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleFreeSingleParty(tok, tbl.id, tbl.name || `Table ${tbl.id}`)}
                                                        disabled={isLoading || isReadOnly}
                                                        className="text-[10.5px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-0.5 rounded transition-colors"
                                                    >
                                                        Free Party
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                    {/* Filter & Search Bar */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                            {/* Search input */}
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
                            </div>

                            {/* Main Pax Range Chips */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                                    <Users size={12} /> Pax:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("all")}
                                    className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${paxFilter === "all"
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-medium"
                                        }`}
                                >
                                    All ({waitingTokens.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("1-4")}
                                    className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${paxFilter === "1-4"
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-medium"
                                        }`}
                                >
                                    1-4p ({paxStats.p1_4})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("5-6")}
                                    className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${paxFilter === "5-6"
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-medium"
                                        }`}
                                >
                                    5-6p ({paxStats.p5_6})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("7-9")}
                                    className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${paxFilter === "7-9"
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-medium"
                                        }`}
                                >
                                    7-9p ({paxStats.p7_9})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("10-12")}
                                    className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${paxFilter === "10-12"
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-medium"
                                        }`}
                                >
                                    10-12p ({paxStats.p10_12})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("12-15")}
                                    className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${paxFilter === "12-15"
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-medium"
                                        }`}
                                >
                                    12-15p ({paxStats.p12_15})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaxFilter("15+")}
                                    className={`px-3 py-1.5 text-xs rounded-xl transition-all cursor-pointer ${paxFilter === "15+"
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-500/20"
                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 font-medium"
                                        }`}
                                >
                                    15+p ({paxStats.p15plus})
                                </button>
                            </div>
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

                                return (
                                    <div
                                        key={token.id}
                                        className="p-4 sm:px-6 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        {/* Left: Token Number, Name, Phone, Entry Type */}
                                        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                                            {/* Token number badge */}
                                            <div className="w-12 h-12 rounded-xl bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase leading-none">
                                                    {prefix}
                                                </span>
                                                <span className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                                    {token.token_number}
                                                </span>
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {token.customer_name || "Guest"}
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

                                        {/* Center: Pax Badge */}
                                        <div className="flex items-center justify-start md:justify-center flex-1">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700 shadow-2xs">
                                                <Users size={13} className="text-slate-400 dark:text-slate-500" />
                                                <span>{partyPax} Pax</span>
                                            </span>
                                        </div>

                                        {/* Right: Direct Table Assignment & Seating Action */}
                                        <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-1 justify-end">
                                            {tables.some(t => {
                                                const occ = getTableOccupancy(t.id, t.capacity);
                                                return occ.isVacant || occ.spareSeats >= partyPax;
                                            }) ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAssignTableToken(token);
                                                        setModalSelectedTableIds([]);
                                                        setModalTableFilter("vacant");
                                                        setModalTableSearch("");
                                                    }}
                                                    disabled={isSeating || isReadOnly || isPaused}
                                                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50 cursor-pointer"
                                                >
                                                    {isSeating ? (
                                                        <span>Seating...</span>
                                                    ) : (
                                                        <>
                                                            <UtensilsCrossed size={13} />
                                                            <span>Choose Table</span>
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60">
                                                    <span>⏳ All Tables Full</span>
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
                                        className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${newCapacityInput === preset
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
                                        className={`p-2.5 rounded-xl border text-left transition-all ${selectedJoinTableId === vt.id
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

            {/* ========================================================================= */}
            {/* UNIFIED TABLE SEATING & CUSTOM MERGE MODAL (SCENARIO 2 - METHOD 2) */}
            {/* ========================================================================= */}
            {assignTableToken && (() => {
                const partyPax = getTokenPax(assignTableToken);
                const selectedTables = tables.filter(t => modalSelectedTableIds.includes(t.id));
                const totalChairs = selectedTables.reduce((sum, t) => sum + t.capacity, 0);
                const isMerged = selectedTables.length > 1;
                const fits = totalChairs >= partyPax;

                // Intelligent Filtering & Sorting with Shared Table Awareness
                const rawFiltered = tables.filter(t => {
                    const occ = getTableOccupancy(t.id, t.capacity);
                    if (modalTableFilter === "vacant") {
                        // In "Available" tab: include vacant tables AND partially occupied tables with spare seats for this party
                        if (!occ.isVacant && occ.spareSeats < partyPax) return false;
                    }
                    if (modalTableFilter === "occupied") {
                        if (occ.isVacant) return false;
                    }
                    if (modalTableSearch.trim()) {
                        const q = modalTableSearch.toLowerCase().trim();
                        const name = (t.name || `Table ${t.id}`).toLowerCase();
                        const idStr = String(t.id);
                        if (!name.includes(q) && !idStr.includes(q)) return false;
                    }
                    return true;
                });

                // Sort: Prioritize matching tables (vacant or shared spare seats) for partyPax first!
                const modalTables = [...rawFiltered].sort((a, b) => {
                    const aOcc = getTableOccupancy(a.id, a.capacity);
                    const bOcc = getTableOccupancy(b.id, b.capacity);
                    const aAvailableSeats = aOcc.isVacant ? a.capacity : aOcc.spareSeats;
                    const bAvailableSeats = bOcc.isVacant ? b.capacity : bOcc.spareSeats;
                    const aFits = aAvailableSeats >= partyPax;
                    const bFits = bAvailableSeats >= partyPax;

                    if (aFits && !bFits) return -1;
                    if (!aFits && bFits) return 1;

                    if (aFits && bFits) {
                        const aExact = aAvailableSeats === partyPax;
                        const bExact = bAvailableSeats === partyPax;
                        if (aExact && !bExact) return -1;
                        if (!aExact && bExact) return 1;
                        return aAvailableSeats - bAvailableSeats; // Closest fit first
                    }

                    if (aOcc.isVacant && !bOcc.isVacant) return -1;
                    if (!aOcc.isVacant && bOcc.isVacant) return 1;

                    return a.id - b.id;
                });

                const availableForPartyCount = tables.filter(t => {
                    const occ = getTableOccupancy(t.id, t.capacity);
                    return occ.isVacant || occ.spareSeats >= partyPax;
                }).length;
                const occupiedCount = tables.filter(t => {
                    const occ = getTableOccupancy(t.id, t.capacity);
                    return !occ.isVacant;
                }).length;

                const fittingCount = tables.filter(t => {
                    const occ = getTableOccupancy(t.id, t.capacity);
                    return occ.isVacant ? t.capacity >= partyPax : occ.spareSeats >= partyPax;
                }).length;
                const sharedFittingCount = tables.filter(t => {
                    const occ = getTableOccupancy(t.id, t.capacity);
                    return occ.isPartiallyOccupied && occ.spareSeats >= partyPax;
                }).length;
                const perfectCount = tables.filter(t => {
                    const occ = getTableOccupancy(t.id, t.capacity);
                    const available = occ.isVacant ? t.capacity : occ.spareSeats;
                    return available === partyPax;
                }).length;

                return (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setAssignTableToken(null);
                                setModalSelectedTableIds([]);
                            }
                        }}
                    >
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh]">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                        <UtensilsCrossed size={18} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                                                Select Table for Party #{prefix}{assignTableToken.token_number}
                                            </h3>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60">
                                                <Users size={11} />
                                                {partyPax} Pax
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {assignTableToken.customer_name || "Guest"}
                                            {assignTableToken.customer_phone && ` • ${assignTableToken.customer_phone}`}
                                            {` • Waiting ${getElapsedMinutes(assignTableToken.created_at)}m`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAssignTableToken(null);
                                        setModalSelectedTableIds([]);
                                    }}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Filter Tabs and Search Bar */}
                            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                {/* Status Segmented Tabs */}
                                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
                                    <button
                                        type="button"
                                        onClick={() => setModalTableFilter("vacant")}
                                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${modalTableFilter === "vacant"
                                            ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                            }`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Available ({availableForPartyCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModalTableFilter("all")}
                                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${modalTableFilter === "all"
                                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold"
                                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                            }`}
                                    >
                                        All ({tables.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModalTableFilter("occupied")}
                                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${modalTableFilter === "occupied"
                                            ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs font-bold"
                                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                            }`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        Occupied ({occupiedCount})
                                    </button>
                                </div>

                                {/* Quick Search Box */}
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search tables..."
                                        value={modalTableSearch}
                                        onChange={(e) => setModalTableSearch(e.target.value)}
                                        className="w-full sm:w-44 pl-8.5 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    />
                                    {modalTableSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setModalTableSearch("")}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Guidance Banner */}
                            <div className="py-2 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 flex-wrap gap-2 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        Party requires <strong>{partyPax} chairs</strong>
                                    </span>
                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                    {fittingCount > 0 ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                            {fittingCount} table option{fittingCount > 1 ? "s" : ""} available ({perfectCount} exact match
                                            {sharedFittingCount > 0 ? `, incl. ${sharedFittingCount} shared option 🤝` : ""})
                                        </span>
                                    ) : (
                                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                            No single table has {partyPax} empty chairs — tap multiple tables to merge!
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] text-slate-400 hidden sm:inline">
                                    💡 Tap 2+ tables to merge, or choose a shared table
                                </span>
                            </div>

                            {/* Tables Line-by-Line Table View */}
                            <div className="flex-1 flex flex-col border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden min-h-[240px] max-h-[380px] bg-white dark:bg-slate-900/60 shadow-2xs">
                                {modalTables.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center my-auto">
                                        <Utensils size={28} className="text-slate-300 dark:text-slate-600 mb-2" />
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            No tables match your filter
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Table Header Bar */}
                                        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-700/80 shrink-0">
                                            <div className="col-span-5 sm:col-span-4 flex items-center gap-2">
                                                <span>Table</span>
                                            </div>
                                            <div className="col-span-3 sm:col-span-2 flex items-center">
                                                <span>Capacity</span>
                                            </div>
                                            <div className="col-span-4 sm:col-span-4 flex items-center">
                                                <span>Status & Fit</span>
                                            </div>
                                            <div className="hidden sm:block sm:col-span-2 text-right">
                                                <span>Action</span>
                                            </div>
                                        </div>

                                        {/* Scrollable Table Rows */}
                                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                                            {modalTables.map(tbl => {
                                                const occ = getTableOccupancy(tbl.id, tbl.capacity);
                                                const isSelected = modalSelectedTableIds.includes(tbl.id);
                                                const canSharedSeat = occ.isPartiallyOccupied && occ.spareSeats >= partyPax;

                                                // State 1: Fully occupied OR partially occupied with insufficient spare seats
                                                if (!occ.isVacant && !canSharedSeat) {
                                                    return (
                                                        <div
                                                            key={tbl.id}
                                                            className="grid grid-cols-12 gap-3 px-4 py-3 items-center bg-slate-50/40 dark:bg-slate-900/30 opacity-60 select-none cursor-not-allowed"
                                                        >
                                                            {/* Table Name */}
                                                            <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
                                                                <div className="w-5 h-5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                                    <span className="w-1.5 h-0.5 bg-slate-400 rounded-full"></span>
                                                                </div>
                                                                <div className="w-7 h-7 rounded-lg bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-500 shrink-0">
                                                                    T{tbl.id}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">
                                                                        {tbl.name || `Table ${tbl.id}`}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 truncate">
                                                                        {occ.tokens.map(t => `#${prefix}${t.token_number}`).join(", ")} ({occ.seatedPax}p seated)
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Capacity */}
                                                            <div className="col-span-3 sm:col-span-2 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                                <Users size={12} className="text-slate-400" />
                                                                <span>{tbl.capacity} Chairs</span>
                                                            </div>

                                                            {/* Status */}
                                                            <div className="col-span-4 sm:col-span-4 flex items-center">
                                                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 px-2 py-0.5 rounded-md">
                                                                    {occ.spareSeats === 0 ? "Full (Occupied)" : `${occ.spareSeats} left (need ${partyPax})`}
                                                                </span>
                                                            </div>

                                                            {/* Action */}
                                                            <div className="hidden sm:block sm:col-span-2 text-right">
                                                                <span className="text-[10.5px] font-semibold text-slate-400">
                                                                    Unavailable
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // State 2: Partially occupied WITH ENOUGH SPARE SEATS (Shared Seating Candidate!)
                                                if (canSharedSeat) {
                                                    const isExactSharedFit = occ.spareSeats === partyPax;
                                                    return (
                                                        <div
                                                            key={tbl.id}
                                                            onClick={() => {
                                                                setModalSelectedTableIds(prev =>
                                                                    prev.includes(tbl.id)
                                                                        ? prev.filter(id => id !== tbl.id)
                                                                        : [tbl.id]
                                                                );
                                                            }}
                                                            onDoubleClick={async () => {
                                                                setAssignTableToken(null);
                                                                setModalSelectedTableIds([]);
                                                                await handleSeatWaitingToken(assignTableToken, tbl.id);
                                                            }}
                                                            className={`grid grid-cols-12 gap-3 px-4 py-3 items-center transition-colors cursor-pointer group ${isSelected
                                                                ? "bg-teal-50/90 dark:bg-teal-950/60 border-l-4 border-l-teal-600"
                                                                : "hover:bg-teal-50/40 dark:hover:bg-teal-950/20"
                                                                }`}
                                                        >
                                                            {/* Table Name */}
                                                            <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
                                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isSelected
                                                                    ? "bg-teal-600 border-teal-600 text-white"
                                                                    : "border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800"
                                                                    }`}>
                                                                    {isSelected && <Check size={12} strokeWidth={3} />}
                                                                </div>
                                                                <div className="w-7 h-7 rounded-lg bg-teal-100/80 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 flex items-center justify-center font-bold text-xs shrink-0">
                                                                    T{tbl.id}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                                                        <span>{tbl.name || `Table ${tbl.id}`}</span>
                                                                        <span className="text-[9px] font-extrabold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-1.5 py-0.2 rounded">
                                                                            Shared
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-[10px] text-teal-700 dark:text-teal-300/90 truncate">
                                                                        {occ.seatedPax} seated ({occ.tokens.map(t => `#${prefix}${t.token_number}`).join(", ")})
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Capacity */}
                                                            <div className="col-span-3 sm:col-span-2 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                                <Users size={12} className="text-teal-500" />
                                                                <span>{tbl.capacity}p <strong className="text-teal-700 dark:text-teal-300 font-bold">({occ.spareSeats} left)</strong></span>
                                                            </div>

                                                            {/* Fit Badge */}
                                                            <div className="col-span-4 sm:col-span-4 flex items-center gap-1.5 flex-wrap">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isExactSharedFit
                                                                    ? "bg-teal-100 dark:bg-teal-900/80 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700"
                                                                    : "bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                                                                    }`}>
                                                                    {isExactSharedFit
                                                                        ? `★ Exact Shared Fit (${partyPax}p)`
                                                                        : `🤝 Fits ${partyPax}p (${occ.spareSeats} left)`}
                                                                </span>
                                                            </div>

                                                            {/* Action */}
                                                            <div className="hidden sm:flex sm:col-span-2 items-center justify-end">
                                                                {isSelected ? (
                                                                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2.5 py-1 rounded-lg">
                                                                        <Check size={11} strokeWidth={3} />
                                                                        Selected
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 group-hover:underline">
                                                                        Share Table →
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                // State 3: Completely vacant table
                                                const isExactFit = tbl.capacity === partyPax;
                                                const isOverFit = tbl.capacity > partyPax;
                                                const isUnderFit = tbl.capacity < partyPax;

                                                return (
                                                    <div
                                                        key={tbl.id}
                                                        onClick={() => {
                                                            setModalSelectedTableIds(prev =>
                                                                prev.includes(tbl.id)
                                                                    ? prev.filter(id => id !== tbl.id)
                                                                    : [...prev, tbl.id]
                                                            );
                                                        }}
                                                        onDoubleClick={async () => {
                                                            setAssignTableToken(null);
                                                            setModalSelectedTableIds([]);
                                                            await handleSeatWaitingToken(assignTableToken, tbl.id);
                                                        }}
                                                        className={`grid grid-cols-12 gap-3 px-4 py-3 items-center transition-colors cursor-pointer group ${isSelected
                                                            ? "bg-indigo-50/90 dark:bg-indigo-950/60 border-l-4 border-l-indigo-600"
                                                            : "hover:bg-slate-50/90 dark:hover:bg-slate-800/50"
                                                            }`}
                                                    >
                                                        {/* Table Name */}
                                                        <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isSelected
                                                                ? "bg-indigo-600 border-indigo-600 text-white"
                                                                : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                                                }`}>
                                                                {isSelected && <Check size={12} strokeWidth={3} />}
                                                            </div>
                                                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shrink-0">
                                                                T{tbl.id}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                                    {tbl.name || `Table ${tbl.id}`}
                                                                </div>
                                                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                                                                    Vacant & Ready
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Capacity */}
                                                        <div className="col-span-3 sm:col-span-2 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                            <Users size={12} className="text-slate-400" />
                                                            <span>{tbl.capacity} Chairs</span>
                                                        </div>

                                                        {/* Fit Badge */}
                                                        <div className="col-span-4 sm:col-span-4 flex items-center gap-1.5 flex-wrap">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isExactFit
                                                                ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                                                : isOverFit
                                                                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900"
                                                                    : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60"
                                                                }`}>
                                                                {isExactFit
                                                                    ? "★ Exact Fit"
                                                                    : isOverFit
                                                                        ? `+${tbl.capacity - partyPax} Extra Chairs`
                                                                        : `${tbl.capacity}p (Tap to merge)`}
                                                            </span>
                                                        </div>

                                                        {/* Action */}
                                                        <div className="hidden sm:flex sm:col-span-2 items-center justify-end">
                                                            {isSelected ? (
                                                                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2.5 py-1 rounded-lg">
                                                                    <Check size={11} strokeWidth={3} />
                                                                    Selected
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                                    {modalSelectedTableIds.length > 0 ? "+ Add Table" : "Select →"}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Live Custom Merge & Shared Seating Summary Banner */}
                            {selectedTables.length > 0 && (() => {
                                const isSingle = selectedTables.length === 1;
                                const singleOcc = isSingle ? getTableOccupancy(selectedTables[0].id, selectedTables[0].capacity) : null;
                                const isSharedOption = isSingle && singleOcc && singleOcc.isPartiallyOccupied;
                                const effectiveAvailableSeats = isSharedOption ? singleOcc.spareSeats : totalChairs;
                                const fitsParty = effectiveAvailableSeats >= partyPax;

                                return (
                                    <div className={`mt-2.5 p-3 rounded-2xl border flex items-center justify-between gap-3 flex-wrap ${fitsParty
                                        ? isSharedOption
                                            ? "bg-teal-50/80 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/70"
                                            : "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70"
                                        : "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70"
                                        }`}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {isSharedOption ? (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-black text-teal-800 dark:text-teal-200 flex items-center gap-1">
                                                        🤝 Shared Seating at {selectedTables[0].name || `Table ${selectedTables[0].id}`}:
                                                    </span>
                                                    <span className="text-xs text-slate-700 dark:text-slate-300">
                                                        <strong>{singleOcc.seatedPax}</strong> seated + <strong>{partyPax}</strong> new = <strong>{singleOcc.seatedPax + partyPax}/{selectedTables[0].capacity}</strong> chairs
                                                    </span>
                                                    <span className="text-[11px] font-extrabold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-700">
                                                        {singleOcc.spareSeats === partyPax ? "★ Perfect Shared Fit" : `+${singleOcc.spareSeats - partyPax} Extra Left`}
                                                    </span>
                                                    <span className="text-[10.5px] text-teal-600 dark:text-teal-400 font-medium">
                                                        (Existing diners remain seated)
                                                    </span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-xs font-black text-slate-900 dark:text-white">
                                                            {isMerged ? `Combined (${selectedTables.length} Tables):` : "Selected Table:"}
                                                        </span>
                                                        {selectedTables.map(t => (
                                                            <span
                                                                key={t.id}
                                                                className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs"
                                                            >
                                                                <span>{t.name || `Table ${t.id}`}</span>
                                                                <span className="text-[10px] text-slate-400">({t.capacity}p)</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setModalSelectedTableIds(prev => prev.filter(id => id !== t.id));
                                                                    }}
                                                                    className="text-slate-400 hover:text-rose-500 ml-0.5 p-0.5 cursor-pointer"
                                                                    title="Remove table"
                                                                >
                                                                    <X size={11} />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                                            Total: <strong className="text-slate-900 dark:text-white">{totalChairs}</strong> / {partyPax} seats
                                                        </span>
                                                        {fits ? (
                                                            <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-700/60">
                                                                {totalChairs === partyPax ? "★ Perfect Fit" : `+${totalChairs - partyPax} Extra`}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-700/60">
                                                                Need {partyPax - totalChairs} more seats (tap another table to merge)
                                                            </span>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setModalSelectedTableIds([])}
                                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                );
                            })()}

                            {/* Modal Footer */}
                            <div className="pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5 flex-wrap">
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {selectedTables.length === 0 ? (
                                        <span>Tap a table to seat, or tap multiple tables to merge</span>
                                    ) : isMerged ? (
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                                            <Link2 size={13} />
                                            Merging {selectedTables.length} tables together for Party #{prefix}{assignTableToken.token_number}
                                        </span>
                                    ) : (() => {
                                        const singleOcc = getTableOccupancy(selectedTables[0].id, selectedTables[0].capacity);
                                        if (singleOcc.isPartiallyOccupied) {
                                            return (
                                                <span className="text-teal-700 dark:text-teal-300 font-bold flex items-center gap-1">
                                                    🤝 Seating party at shared {selectedTables[0].name || `Table ${selectedTables[0].id}`} ({partyPax}p)
                                                </span>
                                            );
                                        }
                                        return <span>Seating at single table {selectedTables[0].name || `Table ${selectedTables[0].id}`}</span>;
                                    })()}
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAssignTableToken(null);
                                            setModalSelectedTableIds([]);
                                        }}
                                        className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmUnifiedSeating}
                                        disabled={selectedTables.length === 0 || isSubmittingSeating}
                                        className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all flex items-center gap-2 cursor-pointer"
                                    >
                                        {isSubmittingSeating ? (
                                            <>
                                                <Loader2 size={13} className="animate-spin" />
                                                <span>Seating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={14} />
                                                <span>
                                                    {selectedTables.length === 0
                                                        ? "Select a Table to Seat"
                                                        : isMerged
                                                            ? `Confirm Merge & Seat (${totalChairs} Seats)`
                                                            : (() => {
                                                                const singleOcc = getTableOccupancy(selectedTables[0].id, selectedTables[0].capacity);
                                                                if (singleOcc.isPartiallyOccupied) {
                                                                    return `Seat at ${selectedTables[0].name || `Table ${selectedTables[0].id}`} (Shared • ${partyPax}p)`;
                                                                }
                                                                return `Seat at ${selectedTables[0].name || `Table ${selectedTables[0].id}`} (${totalChairs}p)`;
                                                            })()}
                                                </span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
