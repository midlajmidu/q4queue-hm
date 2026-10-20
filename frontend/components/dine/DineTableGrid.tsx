"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import { ServingToken, WaitingToken, TableConfig } from "@/types/api";
import { motion } from "framer-motion";
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
    Loader2,
    Building2,
    Receipt,
    Layers,
    Tag,
    UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import DineTableCard from "./DineTableCard";
import WaitlistPeekDrawer, { WaitlistBadgeButton } from "./WaitlistPeekDrawer";
import QuickWalkInModal from "./QuickWalkInModal";
import ServerRotationBar from "./ServerRotationBar";
import DineFloatingViewToggle from "./DineFloatingViewToggle";
import ModalPortal from "@/components/ui/ModalPortal";
import { useSmartSeatingMatcher } from "./hooks/useSmartSeatingMatcher";
import { useBranch } from "@/context/BranchContext";
import {
    EnhancedTableConfig,
    TableLifecycleStatus,
    QuickWalkInPayload,
    resolveTableStatus,
} from "@/types/dine";

interface Props {
    queueId: string;
    tables: (TableConfig | EnhancedTableConfig)[];
    allServingTokens: ServingToken[];
    prefix: string;
    onUpdate: () => void;
    isPaused?: boolean;
    isReadOnly?: boolean;
    waitingTokens?: WaitingToken[];
    is3DViewEnabled?: boolean;
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

function formatPaperWaitDuration(isoString?: string | null): { text: string; severity: "low" | "medium" | "high" } {
    if (!isoString) return { text: "Just now", severity: "low" };
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.max(0, Math.floor(diffMs / 60000));

    if (mins < 1) return { text: "Just now", severity: "low" };
    if (mins < 15) return { text: `${mins}m waiting`, severity: "low" };
    if (mins < 30) return { text: `${mins}m waiting`, severity: "medium" };
    if (mins < 60) return { text: `${mins}m waiting`, severity: "high" };

    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    if (hrs < 24) {
        return { text: `${hrs}h ${rem > 0 ? `${rem}m ` : ""}waiting`, severity: "high" };
    }
    const days = Math.floor(hrs / 24);
    return { text: `${days}d+ waiting`, severity: "high" };
}

const AVATAR_COLOR_PALETTES = [
    "bg-indigo-600 text-white border-indigo-700/30",
    "bg-violet-600 text-white border-violet-700/30",
    "bg-teal-600 text-white border-teal-700/30",
    "bg-sky-600 text-white border-sky-700/30",
    "bg-amber-600 text-white border-amber-700/30",
    "bg-rose-600 text-white border-rose-700/30",
    "bg-emerald-600 text-white border-emerald-700/30",
    "bg-fuchsia-600 text-white border-fuchsia-700/30",
];

function getContactAvatarColor(name?: string | null): string {
    if (!name || !name.trim()) return AVATAR_COLOR_PALETTES[0];
    const trimmed = name.trim();
    let hash = 0;
    for (let i = 0; i < trimmed.length; i++) {
        hash = (hash << 5) - hash + trimmed.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % AVATAR_COLOR_PALETTES.length;
    return AVATAR_COLOR_PALETTES[index];
}

function getContactInitial(name?: string | null): string {
    if (!name || !name.trim()) return "G";
    return name.trim().charAt(0).toUpperCase();
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
    is3DViewEnabled: propIs3DViewEnabled,
}: Props) {
    const { is3DViewEnabled: ctxIs3DViewEnabled } = useBranch();
    const is3DViewEnabled = propIs3DViewEnabled !== undefined ? propIs3DViewEnabled : (ctxIs3DViewEnabled ?? true);

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

    // Target table for Assign Customer modal
    const [assigningTargetTable, setAssigningTargetTable] = useState<EnhancedTableConfig | null>(null);
    const [assignModalSearch, setAssignModalSearch] = useState("");
    const [assignModalFilter, setAssignModalFilter] = useState<"all" | "fits" | "exceeds">("all");

    // Capacity, Zone & Name edit modal state
    const [editingCapacityTable, setEditingCapacityTable] = useState<{ id: number; name: string; capacity: number; section?: string } | null>(null);
    const [newTableNameInput, setNewTableNameInput] = useState<string>("");
    const [newCapacityInput, setNewCapacityInput] = useState<number>(4);
    const [newSectionInput, setNewSectionInput] = useState<string>("Main Dining");
    const [isSavingCapacity, setIsSavingCapacity] = useState(false);
    const [focusFieldOnEdit, setFocusFieldOnEdit] = useState<"name" | "capacity" | "section">("name");
    const tableNameInputRef = useRef<HTMLInputElement>(null);
    const capacityInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingCapacityTable) {
            const timer = setTimeout(() => {
                if (focusFieldOnEdit === "name") {
                    tableNameInputRef.current?.focus();
                    tableNameInputRef.current?.select();
                } else if (focusFieldOnEdit === "capacity") {
                    capacityInputRef.current?.focus();
                    capacityInputRef.current?.select();
                }
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [editingCapacityTable, focusFieldOnEdit]);

    // Custom user dining zones persisted in localStorage
    const [customZones, setCustomZones] = useState<string[]>(() => {
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem(`dining_custom_zones_${queueId}`);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) return parsed;
                }
            } catch {}
        }
        return [];
    });

    useEffect(() => {
        if (typeof window !== "undefined" && queueId) {
            try {
                const saved = localStorage.getItem(`dining_custom_zones_${queueId}`);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) setCustomZones(parsed);
                }
            } catch {}
        }
    }, [queueId]);

    const handleAddZone = (newSec: string) => {
        const trimmed = newSec.trim();
        if (!trimmed) return;
        setCustomZones((prev) => {
            if (prev.some((z) => z.toLowerCase() === trimmed.toLowerCase())) {
                toast.info(`Zone "${trimmed}" already exists`);
                return prev;
            }
            const updated = [...prev, trimmed];
            try {
                localStorage.setItem(`dining_custom_zones_${queueId}`, JSON.stringify(updated));
            } catch {}
            return updated;
        });
        setSelectedSection(trimmed);
        toast.success(`Zone "${trimmed}" added`);
    };

    const handleDeleteZone = (secToDelete: string) => {
        setCustomZones((prev) => {
            const updated = prev.filter((z) => z.toLowerCase() !== secToDelete.toLowerCase());
            try {
                localStorage.setItem(`dining_custom_zones_${queueId}`, JSON.stringify(updated));
            } catch {}
            return updated;
        });
        if (selectedSection.toLowerCase() === secToDelete.toLowerCase()) {
            setSelectedSection("all");
        }
        toast.success(`Zone "${secToDelete}" removed`);
    };

    // Join extra table from floor view
    const [joinTargetTable, setJoinTargetTable] = useState<{ token: ServingToken; currentTableId: number; currentTableName: string } | null>(null);
    const [selectedJoinTableId, setSelectedJoinTableId] = useState<number | null>(null);
    const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);

    // Free joined tables confirmation
    const [freeMergedConfirm, setFreeMergedConfirm] = useState<{ token: ServingToken; clickedTableId: number; clickedTableName: string; tableIds: number[] } | null>(null);

    // Host Stand & Lifecycle Enhancement States
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
    const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
    const [walkInTargetTableId, setWalkInTargetTableId] = useState<number | null>(null);
    const [activeStatusFilter, setActiveStatusFilter] = useState<TableLifecycleStatus | "all" | "unpaid">("all");
    const [tableStatusOverrides, setTableStatusOverrides] = useState<Record<number, TableLifecycleStatus>>({});
    const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (assignTableToken) { setAssignTableToken(null); setModalSelectedTableIds([]); }
                if (joinTargetTable) { setJoinTargetTable(null); setSelectedJoinTableId(null); }
                if (editingCapacityTable) { setEditingCapacityTable(null); }
                if (freeMergedConfirm) { setFreeMergedConfirm(null); }
                if (assigningTargetTable) { setAssigningTargetTable(null); setAssignModalSearch(""); }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [assignTableToken, joinTargetTable, editingCapacityTable, freeMergedConfirm, assigningTargetTable]);

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

    // Sub-view toggle state under Floor View: "3d" (spatial model) vs "plain" (2D responsive grid)
    const [floorSubView, setFloorSubView] = useState<"3d" | "plain">("3d");
    const [selectedSection, setSelectedSection] = useState<string>("all");
    const activeFloorSubView = is3DViewEnabled ? floorSubView : "plain";

    // Load and persist floor subview in localStorage (keys: dine_floor_subview_preference, q4q_dine_floor_subview)
    useEffect(() => {
        if (!is3DViewEnabled) {
            setFloorSubView("plain");
            return;
        }
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem("dine_floor_subview_preference") || localStorage.getItem("q4q_dine_floor_subview");
                if (saved === "3d" || saved === "plain") {
                    setFloorSubView(saved);
                }
            } catch {}
        }
    }, [is3DViewEnabled]);

    const handleSetFloorSubView = (subView: "3d" | "plain") => {
        if (!is3DViewEnabled && subView === "3d") return;
        setFloorSubView(subView);
        if (typeof window !== "undefined") {
            try {
                localStorage.setItem("dine_floor_subview_preference", subView);
                localStorage.setItem("q4q_dine_floor_subview", subView);
            } catch {}
        }
    };

    // Keyboard shortcut: Press 'v' or 'V' to toggle between 2D Table Cards and 3D Spatial Model
    useEffect(() => {
        if (!is3DViewEnabled || viewMode !== "floor") return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable) {
                return;
            }
            if (e.key === "v" || e.key === "V") {
                e.preventDefault();
                handleSetFloorSubView(activeFloorSubView === "3d" ? "plain" : "3d");
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [is3DViewEnabled, viewMode, activeFloorSubView]);

    // Available sections from tables, custom zones, and stored multi-floor layout
    const availableSections = useMemo(() => {
        const set = new Set<string>();
        for (const t of tables) {
            if (t.section && t.section.trim()) {
                set.add(t.section.trim());
            }
        }
        for (const z of customZones) {
            if (z && z.trim()) {
                set.add(z.trim());
            }
        }
        if (typeof window !== "undefined") {
            try {
                const stored = localStorage.getItem(`floor_layout_${queueId}`);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed?.floors && Array.isArray(parsed.floors)) {
                        for (const f of parsed.floors) {
                            if (f.name && f.name.trim()) set.add(f.name.trim());
                        }
                    }
                }
            } catch {}
        }
        const hasUnassigned = tables.some((t) => !t.section || !t.section.trim());
        if (set.size === 0 || hasUnassigned) {
            set.add("Main Dining");
        }
        return Array.from(set);
    }, [tables, customZones, queueId]);

    const enhancedTables = useMemo<EnhancedTableConfig[]>(() => {
        return tables.map(t => {
            const tokens = tableTokensMap.get(t.id) || [];
            const override = tableStatusOverrides[t.id];
            let status: TableLifecycleStatus;
            if (tokens.length > 0) {
                status = (override === "check_dropped" || override === "seated") ? override : "seated";
            } else {
                if (override === "held" || override === "blocked") {
                    status = override;
                } else {
                    status = "available";
                }
            }
            return {
                ...t,
                status,
            };
        });
    }, [tables, tableStatusOverrides, tableTokensMap]);

    const matcher = useSmartSeatingMatcher(enhancedTables, waitingTokens, tableTokensMap);

    const filteredTables = useMemo(() => {
        let result = enhancedTables;
        if (selectedSection !== "all") {
            result = result.filter(t => {
                const sec = t.section && t.section.trim() ? t.section.trim() : "Main Dining";
                return sec.toLowerCase() === selectedSection.toLowerCase();
            });
        }
        if (activeStatusFilter === "unpaid") {
            result = result.filter(t => {
                const tokens = tableTokensMap.get(t.id) || [];
                return tokens.some(tok => tok.payment_status === "unpaid");
            });
        } else if (activeStatusFilter !== "all") {
            result = result.filter(t => {
                const tokens = tableTokensMap.get(t.id) || [];
                const st = resolveTableStatus(t, tokens);
                return st === activeStatusFilter;
            });
        }
        return result;
    }, [enhancedTables, selectedSection, activeStatusFilter, tableTokensMap]);

    const displayZones = useMemo(() => {
        if (selectedSection !== "all") {
            return [selectedSection];
        }
        const zones = [...availableSections];
        zones.sort((a, b) => {
            if (a.toLowerCase() === "main dining") return -1;
            if (b.toLowerCase() === "main dining") return 1;
            return a.localeCompare(b);
        });
        return zones;
    }, [selectedSection, availableSections]);

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
                setTableStatusOverrides(prev => {
                    const copy = { ...prev };
                    delete copy[tableId];
                    return copy;
                });
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
            setTableStatusOverrides(prev => {
                const copy = { ...prev };
                delete copy[tableId];
                return copy;
            });
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
            setTableStatusOverrides(prev => {
                const copy = { ...prev };
                for (const id of tableIds) {
                    delete copy[id];
                }
                return copy;
            });
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
            setTableStatusOverrides(prev => {
                const copy = { ...prev };
                delete copy[tableId];
                return copy;
            });
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

                setTableStatusOverrides(prev => {
                    const copy = { ...prev };
                    for (const id of selectedIds) {
                        delete copy[id];
                    }
                    return copy;
                });

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
            setTableStatusOverrides(prev => {
                const copy = { ...prev };
                delete copy[targetTableId];
                return copy;
            });
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

    // Open inline capacity, zone & name edit modal
    const handleOpenCapacityEdit = (
        tbl: TableConfig,
        e: React.MouseEvent,
        focusField: "name" | "capacity" | "section" = "name"
    ) => {
        e.stopPropagation();
        if (isReadOnly) return;
        setEditingCapacityTable({
            id: tbl.id,
            name: tbl.name || `Table ${tbl.id}`,
            capacity: tbl.capacity,
            section: tbl.section || "Main Dining",
        });
        setNewTableNameInput(tbl.name || `Table ${tbl.id}`);
        setNewCapacityInput(tbl.capacity);
        setNewSectionInput(tbl.section || "Main Dining");
        setFocusFieldOnEdit(focusField);
    };

    // Save updated table name, capacity & zone
    const handleSaveCapacity = async () => {
        if (!editingCapacityTable) return;
        const trimmedName = newTableNameInput.trim();
        if (!trimmedName) {
            toast.error("Please enter a valid table name");
            return;
        }

        const capacityVal = Number(newCapacityInput);
        if (isNaN(capacityVal) || capacityVal < 1 || capacityVal > 50) {
            toast.error("Please enter a valid chair count between 1 and 50");
            return;
        }

        setIsSavingCapacity(true);
        try {
            const updatedTables = tables.map(t =>
                t.id === editingCapacityTable.id
                    ? {
                        ...t,
                        name: trimmedName,
                        capacity: capacityVal,
                        section: newSectionInput
                    }
                    : t
            );
            await api.updateQueue(queueId, { table_config: updatedTables });
            toast.success(`Updated table to "${trimmedName}"`);
            setEditingCapacityTable(null);
            onUpdate();
        } catch (err: any) {
            toast.error(err?.message || "Failed to update table");
        } finally {
            setIsSavingCapacity(false);
        }
    };

    const handleUpdatePaymentStatus = async (tokenId: string, nextStatus: "pending" | "unpaid" | "paid") => {
        try {
            await api.updatePaymentStatus(tokenId, nextStatus);
            toast.success(
                nextStatus === "paid"
                    ? "Payment marked as Paid"
                    : nextStatus === "unpaid"
                    ? "Payment marked as Unpaid"
                    : "Payment reset to Pending"
            );
            onUpdate();
        } catch (err: any) {
            toast.error(err?.message || "Failed to update payment status");
        }
    };

    const handleAdvanceTableStatus = async (tableId: number, nextStatus: TableLifecycleStatus) => {
        const tbl = tables.find(t => t.id === tableId);
        const name = tbl?.name || `Table ${tableId}`;

        if (nextStatus === "check_dropped") {
            setTableStatusOverrides(prev => ({ ...prev, [tableId]: "check_dropped" }));
            toast.success(`${name}: Bill Given (Settling)`);
            const tokens = tableTokensMap.get(tableId) || [];
            const primary = tokens[0];
            if (primary && (!primary.payment_status || primary.payment_status === "pending")) {
                api.updatePaymentStatus(primary.id, "unpaid").then(() => onUpdate()).catch(() => {});
            }

        } else if (nextStatus === "available") {
            setTableStatusOverrides(prev => {
                const copy = { ...prev };
                delete copy[tableId];
                return copy;
            });
            toast.success(`${name} is Clean & Ready for seating`);
            onUpdate();
        } else {
            setTableStatusOverrides(prev => ({ ...prev, [tableId]: nextStatus }));
        }
    };

    const handleQuickWalkInSubmit = async (payload: QuickWalkInPayload) => {
        if (isReadOnly || isPaused) return;
        setIsSubmittingWalkIn(true);
        try {
            const res = await api.adminJoin(queueId, {
                name: payload.customerName || "Walk-in Guest",
                phone: payload.customerPhone || "",
                pax_count: payload.pax,
                entry_type: "manual",
                custom_data: {
                    preferences: payload.preferences,
                    notes: payload.notes,
                    pax: payload.pax,
                },
            });

            if (payload.immediateTableId) {
                setTableStatusOverrides(prev => {
                    const copy = { ...prev };
                    delete copy[payload.immediateTableId!];
                    return copy;
                });
                await api.serveSpecificToken(queueId, res.token_number, payload.immediateTableId);
                const tbl = tables.find(t => t.id === payload.immediateTableId);
                toast.success(`Walk-in Party #${prefix}${res.token_number} (${payload.pax}p) seated at ${tbl?.name || `Table ${payload.immediateTableId}`}`);
            } else {
                toast.success(`Walk-in Party #${prefix}${res.token_number} (${payload.pax}p) added to Waitlist`);
            }
            setIsWalkInModalOpen(false);
            setWalkInTargetTableId(null);
            onUpdate();
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.detail : "Failed to seat walk-in";
            toast.error(msg);
        } finally {
            setIsSubmittingWalkIn(false);
        }
    };

    const handlePageNextParty = async () => {
        const nextParty = waitingTokens[0];
        if (!nextParty) {
            toast.info("No waiting parties to page");
            return;
        }
        toast.success(`Paged Party #${prefix}${nextParty.token_number} (${nextParty.customer_name || "Guest"}) via SMS`);
    };

    const renderTableCard = (tbl: EnhancedTableConfig) => {
        const tokens = tableTokensMap.get(tbl.id) || [];
        const isOccupied = tokens.length > 0;
        const primaryToken = tokens[0] || null;
        const elapsedMins = isOccupied ? getElapsedMinutes(primaryToken?.served_at) : 0;
        const match = matcher.getMatchForTable(tbl.id);

        return (
            <DineTableCard
                key={tbl.id}
                table={tbl}
                tokens={tokens}
                prefix={prefix}
                match={match}
                elapsedMins={elapsedMins}
                isLoading={loadingTable === tbl.id}
                isReadOnly={isReadOnly}
                onSeatMatch={async (tableId, waitingTokenId) => {
                    const token = waitingTokens.find((t) => t.id === waitingTokenId);
                    if (token) {
                        await handleSeatWaitingToken(token, tableId);
                    }
                }}
                onSeatWalkIn={(tableId) => {
                    setWalkInTargetTableId(tableId);
                    setIsWalkInModalOpen(true);
                }}
                onSeatParty={() => {
                    setAssigningTargetTable(tbl);
                    setAssignModalSearch("");
                    setAssignModalFilter("all");
                }}
                onAssignParty={() => {
                    setAssigningTargetTable(tbl);
                    setAssignModalSearch("");
                    setAssignModalFilter("all");
                }}
                onAdvanceStatus={handleAdvanceTableStatus}
                onFreeTable={(tableId, tableName) => {
                    handleRequestFreeTable(tableId, tableName);
                }}
                onJoinTable={(token, currentTableId, currentTableName) => {
                    setJoinTargetTable({ token, currentTableId, currentTableName });
                    setSelectedJoinTableId(vacantTables[0]?.id ?? null);
                }}
                onOpenCapacityEdit={(t, e, field) => {
                    handleOpenCapacityEdit(t, e, field);
                }}
                onUpdatePaymentStatus={handleUpdatePaymentStatus}
            />
        );
    };

    const occupiedCount = allServingTokens.length;

    return (
        <div className="w-full flex flex-col flex-1 pb-1">
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
                    {/* Container 1: Top-Level View Switcher (Floor View vs Paper View) */}
                    <div
                        role="tablist"
                        aria-label="View Switcher"
                        className="h-9 p-0.5 flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs relative select-none"
                    >
                        {/* Floor View */}
                        <button
                            type="button"
                            role="tab"
                            aria-selected={viewMode === "floor"}
                            onClick={() => setViewMode("floor")}
                            className={`relative h-8 flex items-center gap-1.5 px-3 text-xs font-bold rounded-lg transition-colors cursor-pointer z-10 ${
                                viewMode === "floor"
                                    ? "text-slate-900 dark:text-white"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                            }`}
                            title="Floor View"
                        >
                            {viewMode === "floor" && (
                                <motion.div
                                    layoutId="activeTopBarViewTab"
                                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                    className="absolute inset-0 bg-white dark:bg-slate-900 rounded-lg shadow-xs -z-10"
                                />
                            )}
                            <LayoutGrid size={13.5} className="shrink-0 opacity-80" />
                            <span>Floor View</span>
                        </button>

                        {/* Paper View */}
                        <button
                            type="button"
                            role="tab"
                            aria-selected={viewMode === "paper"}
                            onClick={() => setViewMode("paper")}
                            className={`relative h-8 flex items-center gap-1.5 px-3 text-xs font-bold rounded-lg transition-colors cursor-pointer z-10 ${
                                viewMode === "paper"
                                    ? "text-slate-900 dark:text-white"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                            }`}
                            title="Host Stand Waitlist Register & Table Turns"
                        >
                            {viewMode === "paper" && (
                                <motion.div
                                    layoutId="activeTopBarViewTab"
                                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                                    className="absolute inset-0 bg-white dark:bg-slate-900 rounded-lg shadow-xs -z-10"
                                />
                            )}
                            <ClipboardList size={13.5} className="shrink-0 opacity-80" />
                            <span>Paper View</span>
                            {waitingTokens.length > 0 && (
                                <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full transition-colors ${
                                        viewMode === "paper"
                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                            : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                    }`}
                                >
                                    {waitingTokens.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Waitlist Peek Drawer Toggle Button */}
                    <WaitlistBadgeButton
                        count={waitingTokens.length}
                        isOpen={isWaitlistOpen}
                        onClick={() => setIsWaitlistOpen(prev => !prev)}
                    />

                    {/* Mobile Expand Toggle (2D Plain Grid View only) */}
                    {viewMode === "floor" && activeFloorSubView === "plain" && (
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
            {/* VIEW MODE 1A: 3D SPATIAL INTERACTIVE MODEL */}
            {/* ========================================================================= */}
            {viewMode === "floor" && is3DViewEnabled && activeFloorSubView === "3d" && (
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
                    onUpdatePaymentStatus={handleUpdatePaymentStatus}
                />
            )}

            {/* ========================================================================= */}
            {/* VIEW MODE 1B: 2D PLAIN CARD GRID VIEW */}
            {/* ========================================================================= */}
            {viewMode === "floor" && activeFloorSubView === "plain" && (
                <>
                    {/* Section & Server Rotation Balancer */}
                    <ServerRotationBar
                        tables={enhancedTables}
                        tableTokensMap={tableTokensMap}
                        availableSections={availableSections}
                        selectedSection={selectedSection}
                        onSelectSection={setSelectedSection}
                        onAddSection={handleAddZone}
                        onDeleteSection={handleDeleteZone}
                        isReadOnly={isReadOnly}
                    />
                    {/* Zone-Grouped Layout or Empty State */}
                    {displayZones.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                                <Layers size={18} />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                No zones or tables configured
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                                Click "+ Add Zone" above to add dining areas for this counter.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-7 mb-8">
                            {displayZones.map((zoneName, index) => {
                                const zoneTables = filteredTables.filter((tbl) => {
                                    const sec = tbl.section && tbl.section.trim() ? tbl.section.trim() : "Main Dining";
                                    return sec.toLowerCase() === zoneName.toLowerCase();
                                });

                                const zoneAvailable = zoneTables.filter((t) => {
                                    const tokens = tableTokensMap.get(t.id) || [];
                                    return resolveTableStatus(t, tokens) === "available";
                                }).length;

                                const zoneCovers = zoneTables.reduce((sum, t) => {
                                    const tokens = tableTokensMap.get(t.id) || [];
                                    return sum + tokens.reduce((paxSum, tk) => paxSum + (tk.pax_count || 1), 0);
                                }, 0);

                                return (
                                    <div key={zoneName} className="space-y-4">
                                        {/* Divider line before zone (for zones after the first) */}
                                        {index > 0 && (
                                            <div className="pt-2 pb-1 border-t border-slate-200/80 dark:border-slate-800/80" />
                                        )}

                                        {/* Zone Section Header */}
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                                                    <Layers size={14} />
                                                </div>
                                                <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight uppercase">
                                                        {zoneName}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                            {zoneTables.length} {zoneTables.length === 1 ? "table" : "tables"}
                                                        </span>
                                                        {zoneAvailable > 0 && (
                                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                <span>{zoneAvailable} available</span>
                                                            </span>
                                                        )}
                                                        {zoneCovers > 0 && (
                                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center gap-1">
                                                                <Users size={11} className="text-indigo-500 dark:text-indigo-400" />
                                                                <span>{zoneCovers} {zoneCovers === 1 ? "guest" : "guests"}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedSection !== "all" && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedSection("all")}
                                                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                                                >
                                                    Show all zones
                                                </button>
                                            )}
                                        </div>

                                        {/* Zone Table Cards or Empty State */}
                                        {zoneTables.length === 0 ? (
                                            <div className="py-8 px-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center text-center">
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2">
                                                    <Layers size={16} />
                                                </div>
                                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    No tables in {zoneName}
                                                </h4>
                                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-xs">
                                                    Click any table's zone badge to assign it to "{zoneName}".
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Desktop Card Grid (md and up) */}
                                                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 items-stretch">
                                                    {zoneTables.map(renderTableCard)}
                                                </div>

                                                {/* Mobile Card Grid (below md) */}
                                                <div className="md:hidden flex flex-col gap-3">
                                                    {zoneTables.map(renderTableCard)}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                                    <Users size={12} /> Pax:
                                </span>
                                <div className="flex items-center gap-1 flex-wrap bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                                    {[
                                        { key: "all", label: "All", count: waitingTokens.length },
                                        { key: "1-4", label: "1-4p", count: paxStats.p1_4 },
                                        { key: "5-6", label: "5-6p", count: paxStats.p5_6 },
                                        { key: "7-9", label: "7-9p", count: paxStats.p7_9 },
                                        { key: "10-12", label: "10-12p", count: paxStats.p10_12 },
                                        { key: "12-15", label: "12-15p", count: paxStats.p12_15 },
                                        { key: "15+", label: "15+p", count: paxStats.p15plus },
                                    ].map((opt) => {
                                        const isActive = paxFilter === opt.key;
                                        return (
                                            <button
                                                key={opt.key}
                                                type="button"
                                                onClick={() => setPaxFilter(opt.key as any)}
                                                className={`h-7 px-2.5 text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-medium ${
                                                    isActive
                                                        ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-500/20"
                                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50"
                                                }`}
                                            >
                                                <span>{opt.label}</span>
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                        isActive
                                                            ? "bg-white/20 text-white"
                                                            : opt.count > 0
                                                            ? "bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                                            : "text-slate-300 dark:text-slate-600"
                                                    }`}
                                                >
                                                    {opt.count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
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
                            {/* Table Column Headers */}
                            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
                                <div className="col-span-12 md:col-span-3">Guest & Token</div>
                                <div className="col-span-6 md:col-span-2">Party Size</div>
                                <div className="col-span-6 md:col-span-3">Contact</div>
                                <div className="col-span-6 md:col-span-2">Wait Time</div>
                                <div className="col-span-6 md:col-span-2 text-right">Action</div>
                            </div>

                            {filteredWaitingTokens.map((token) => {
                                const partyPax = getTokenPax(token);
                                const waitInfo = formatPaperWaitDuration(token.created_at);
                                const isSeating = seatingTokenId === token.id;
                                const initial = getContactInitial(token.customer_name);
                                const avatarColor = getContactAvatarColor(token.customer_name || String(token.token_number));

                                const fittingVacantTables = vacantTables
                                    .filter(t => t.capacity >= partyPax)
                                    .sort((a, b) => a.capacity - b.capacity);
                                const bestVacantTable = fittingVacantTables[0] || null;

                                const hasAnyCompatibleTable = tables.some(t => {
                                    const occ = getTableOccupancy(t.id, t.capacity);
                                    return occ.isVacant || occ.spareSeats >= partyPax;
                                });

                                return (
                                    <div
                                        key={token.id}
                                        className="px-4 sm:px-6 py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors grid grid-cols-12 gap-4 items-center"
                                    >
                                        {/* 1. Guest & Token */}
                                        <div className="col-span-12 md:col-span-3 flex items-center gap-2.5 min-w-0">
                                            {/* Contact Initial Avatar with Distinct Colors */}
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm leading-none border shadow-2xs select-none shrink-0 ${avatarColor}`}>
                                                <span className="flex items-center justify-center leading-none translate-y-[-0.5px]">
                                                    {initial}
                                                </span>
                                            </div>

                                            {/* Identity Stack */}
                                            <div className="min-w-0 flex flex-col justify-center">
                                                <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
                                                        {token.customer_name || "Guest"}
                                                    </span>
                                                    {token.entry_type && token.entry_type !== "manual" && (
                                                        <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded">
                                                            {token.entry_type}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
                                                    Token {prefix}{token.token_number}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Party Size */}
                                        <div className="col-span-6 md:col-span-2 flex items-center">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80">
                                                <Users size={12} className="text-slate-400 dark:text-slate-500" />
                                                <span>{partyPax} Pax</span>
                                            </span>
                                        </div>

                                        {/* 3. Contact */}
                                        <div className="col-span-6 md:col-span-3 flex items-center">
                                            {token.customer_phone ? (
                                                <a
                                                    href={`tel:${token.customer_phone}`}
                                                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
                                                >
                                                    <Phone size={12} className="text-slate-400" />
                                                    <span>{token.customer_phone}</span>
                                                </a>
                                            ) : (
                                                <span className="text-xs text-slate-400">No phone</span>
                                            )}
                                        </div>

                                        {/* 4. Wait Time */}
                                        <div className="col-span-6 md:col-span-2 flex items-center">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    waitInfo.severity === "high"
                                                        ? "bg-rose-500"
                                                        : waitInfo.severity === "medium"
                                                        ? "bg-amber-500"
                                                        : "bg-emerald-500"
                                                }`} />
                                                <Clock size={12} className="text-slate-400" />
                                                <span className={
                                                    waitInfo.severity === "high"
                                                        ? "text-rose-600 dark:text-rose-400 font-semibold"
                                                        : waitInfo.severity === "medium"
                                                        ? "text-amber-600 dark:text-amber-400 font-semibold"
                                                        : "text-slate-600 dark:text-slate-300"
                                                }>
                                                    {waitInfo.text}
                                                </span>
                                            </span>
                                        </div>

                                        {/* 5. Action */}
                                        <div className="col-span-6 md:col-span-2 flex items-center justify-end">
                                            {hasAnyCompatibleTable ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAssignTableToken(token);
                                                        setModalSelectedTableIds(bestVacantTable ? [bestVacantTable.id] : []);
                                                        setModalTableFilter(bestVacantTable ? "vacant" : "all");
                                                        setModalTableSearch("");
                                                    }}
                                                    disabled={isSeating || isReadOnly || isPaused}
                                                    className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 select-none active:scale-[0.98] whitespace-nowrap"
                                                >
                                                    {isSeating ? (
                                                        <>
                                                            <Loader2 size={13} className="animate-spin" />
                                                            <span>Seating...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UtensilsCrossed size={13} />
                                                            <span>Choose Table</span>
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAssignTableToken(token);
                                                        setModalSelectedTableIds([]);
                                                        setModalTableFilter("all");
                                                        setModalTableSearch("");
                                                    }}
                                                    disabled={isSeating || isReadOnly || isPaused}
                                                    className="h-9 px-3 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs select-none whitespace-nowrap"
                                                    title="All tables are occupied. Click to inspect turns or join tables."
                                                >
                                                    <Clock size={13} className="text-amber-600 dark:text-amber-400" />
                                                    <span>Join / View Tables</span>
                                                </button>
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
            {/* ========================================================================= */}
            {/* INLINE TABLE CAPACITY EDIT MODAL */}
            {/* ========================================================================= */}
            {editingCapacityTable && (
                <ModalPortal>
                    <div
                        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 dark:bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-200"
                        onClick={() => setEditingCapacityTable(null)}
                    >
                        <div
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 max-w-sm w-full p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <Edit3 size={14} className="text-indigo-500" />
                                        Edit Table Details
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Configure name, chairs & zone for <strong>{editingCapacityTable.name}</strong>
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

                            {/* Table Name Input */}
                            <div className="mb-4">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                        <Tag size={12} className="text-indigo-500" /> Table Name
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-normal">
                                        ID #{editingCapacityTable.id}
                                    </span>
                                </label>
                                <input
                                    ref={tableNameInputRef}
                                    type="text"
                                    value={newTableNameInput}
                                    onChange={(e) => setNewTableNameInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleSaveCapacity();
                                        }
                                    }}
                                    placeholder={`e.g. Table ${editingCapacityTable.id}`}
                                    maxLength={30}
                                    className="w-full px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase"
                                />
                            </div>

                            {/* Zone Selection */}
                            <div className="mb-4">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <Layers size={12} className="text-indigo-500" /> Dining Zone
                                </label>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {availableSections.map((sec) => (
                                        <button
                                            key={sec}
                                            type="button"
                                            onClick={() => setNewSectionInput(sec)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                                newSectionInput.toLowerCase() === sec.toLowerCase()
                                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                                            }`}
                                        >
                                            {sec}
                                        </button>
                                    ))}
                                </div>
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
                                            className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${newCapacityInput === preset
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
                                        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-lg flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
                                    >
                                        -
                                    </button>
                                    <input
                                        ref={capacityInputRef}
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={newCapacityInput}
                                        onChange={(e) => setNewCapacityInput(Math.max(1, parseInt(e.target.value) || 1))}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleSaveCapacity();
                                            }
                                        }}
                                        className="flex-1 text-center py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setNewCapacityInput(prev => Math.min(50, prev + 1))}
                                        className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-lg flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
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
                                    className="flex-1 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveCapacity}
                                    disabled={isSavingCapacity}
                                    className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {isSavingCapacity ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}



            {/* ========================================================================= */}
            {/* JOIN EXTRA TABLE MODAL (Global Portal) */}
            {/* ========================================================================= */}
            {/* JOIN EXTRA TABLE MODAL */}
            {/* ========================================================================= */}
            {joinTargetTable && (
                <ModalPortal>
                    <div
                        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 dark:bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-200"
                        onClick={() => { setJoinTargetTable(null); setSelectedJoinTableId(null); }}
                    >
                        <div
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 max-w-sm w-full p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
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
                </ModalPortal>
            )}

            {/* ========================================================================= */}
            {/* ========================================================================= */}
            {/* FREE JOINED TABLES CONFIRMATION MODAL */}
            {/* ========================================================================= */}
            {freeMergedConfirm && (
                <ModalPortal>
                    <div
                        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 dark:bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-200"
                        onClick={() => setFreeMergedConfirm(null)}
                    >
                        <div
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 max-w-sm w-full p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
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
                                    className="w-full py-2 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                                >
                                    Free Only {freeMergedConfirm.clickedTableName}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFreeMergedConfirm(null)}
                                    className="w-full py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
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
                    <ModalPortal>
                        <div
                            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 dark:bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-200"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                    setAssignTableToken(null);
                                    setModalSelectedTableIds([]);
                                }
                            }}
                        >
                        <div
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 max-w-2xl w-full p-5 sm:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
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
                </ModalPortal>
            );
        })()}

            {/* Waitlist Peek Slide-Over Drawer */}
            <WaitlistPeekDrawer
                isOpen={isWaitlistOpen}
                onClose={() => setIsWaitlistOpen(false)}
                waitingTokens={waitingTokens}
                tables={enhancedTables}
                prefix={prefix}
                onSeatParty={async (token, tableId) => {
                    await handleSeatWaitingToken(token, tableId);
                    setIsWaitlistOpen(false);
                }}
                onPageParty={async (token) => {
                    toast.success(`Paged Party #${prefix}${token.token_number} (${token.customer_name || "Guest"}) via SMS`);
                }}
                onNoShowParty={async (token) => {
                    try {
                        await api.skipToken(token.id);
                        toast.info(`Marked Party #${prefix}${token.token_number} as No-Show`);
                        onUpdate();
                    } catch {
                        toast.error("Failed to mark no-show");
                    }
                }}
                onOpenWalkInModal={() => {
                    setIsWaitlistOpen(false);
                    setIsWalkInModalOpen(true);
                }}
                isReadOnly={isReadOnly}
            />

            {/* Quick Walk-In Modal */}
            <QuickWalkInModal
                isOpen={isWalkInModalOpen}
                onClose={() => {
                    setIsWalkInModalOpen(false);
                    setWalkInTargetTableId(null);
                }}
                tables={enhancedTables}
                initialTableId={walkInTargetTableId}
                onSubmit={handleQuickWalkInSubmit}
                isSubmitting={isSubmittingWalkIn}
            />

            {/* ========================================================================= */}
            {/* ASSIGN WAITING CUSTOMER TO TABLE MODAL                                    */}
            {/* ========================================================================= */}
            {assigningTargetTable && (
                <ModalPortal>
                    <div
                        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 dark:bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-200"
                        onClick={() => {
                            setAssigningTargetTable(null);
                            setAssignModalSearch("");
                        }}
                    >
                        <div
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 max-w-2xl w-full p-0 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
                                        <UtensilsCrossed size={18} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                                Assign Party to {assigningTargetTable.name || `Table ${assigningTargetTable.id}`}
                                            </h3>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200/70 dark:border-indigo-800/70">
                                                <Users size={11} />
                                                {assigningTargetTable.capacity}p Capacity
                                            </span>
                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                                                {assigningTargetTable.section || "Main Dining"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Select a waiting guest from the queue to seat immediately at this table
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAssigningTargetTable(null);
                                        setAssignModalSearch("");
                                    }}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Search and Segmented Filter Bar */}
                            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                                {/* Search Input */}
                                <div className="relative flex-1">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={assignModalSearch}
                                        onChange={(e) => setAssignModalSearch(e.target.value)}
                                        placeholder="Search by guest name, phone, or token #..."
                                        className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                    {assignModalSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setAssignModalSearch("")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>

                                {/* Segmented Filter Pills */}
                                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setAssignModalFilter("all")}
                                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                            assignModalFilter === "all"
                                                ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold"
                                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                        }`}
                                    >
                                        All ({waitingTokens.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAssignModalFilter("fits")}
                                        className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                                            assignModalFilter === "fits"
                                                ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold"
                                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                        }`}
                                    >
                                        <Sparkles size={11} className="text-emerald-500" />
                                        <span>Fits Table ({waitingTokens.filter(t => getTokenPax(t) <= assigningTargetTable.capacity).length})</span>
                                    </button>
                                    {waitingTokens.filter(t => getTokenPax(t) > assigningTargetTable.capacity).length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setAssignModalFilter("exceeds")}
                                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                                assignModalFilter === "exceeds"
                                                    ? "bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-2xs font-bold"
                                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                            }`}
                                        >
                                            Exceeds ({waitingTokens.filter(t => getTokenPax(t) > assigningTargetTable.capacity).length})
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Scrollable List of Waiting Parties */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
                                {(() => {
                                    const filtered = waitingTokens.filter((token) => {
                                        if (assignModalSearch.trim()) {
                                            const query = assignModalSearch.toLowerCase();
                                            const nameMatch = token.customer_name?.toLowerCase().includes(query);
                                            const phoneMatch = token.customer_phone?.toLowerCase().includes(query);
                                            const tokenMatch = `${prefix}${token.token_number}`.toLowerCase().includes(query);
                                            if (!nameMatch && !phoneMatch && !tokenMatch) return false;
                                        }
                                        const pax = getTokenPax(token);
                                        if (assignModalFilter === "fits") {
                                            return pax <= assigningTargetTable.capacity;
                                        }
                                        if (assignModalFilter === "exceeds") {
                                            return pax > assigningTargetTable.capacity;
                                        }
                                        return true;
                                    });

                                    if (filtered.length === 0) {
                                        return (
                                            <div className="p-8 text-center flex flex-col items-center justify-center">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                                                    <Users size={22} />
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                    No Waiting Parties Found
                                                </h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                                                    {assignModalSearch
                                                        ? "No waiting guests match your current search query."
                                                        : "There are currently no waiting parties in the queue register."}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const tableId = assigningTargetTable.id;
                                                        setAssigningTargetTable(null);
                                                        setWalkInTargetTableId(tableId);
                                                        setIsWalkInModalOpen(true);
                                                    }}
                                                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
                                                >
                                                    <UserPlus size={14} />
                                                    <span>Seat Walk-in at {assigningTargetTable.name || `Table ${assigningTargetTable.id}`}</span>
                                                </button>
                                            </div>
                                        );
                                    }

                                    return filtered.map((token, index) => {
                                        const tokenPax = getTokenPax(token);
                                        const targetCapacity = assigningTargetTable.capacity;
                                        const isFit = tokenPax <= targetCapacity;
                                        const isExact = tokenPax === targetCapacity;
                                        const avatarColor = getContactAvatarColor(token.customer_name || String(token.token_number));
                                        const initial = getContactInitial(token.customer_name);
                                        const waitInfo = formatPaperWaitDuration(token.created_at);
                                        const isBeingSeated = seatingTokenId === token.id;

                                        return (
                                            <div
                                                key={token.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-2xs group"
                                            >
                                                {/* Left: Contact Avatar + Guest & Token details */}
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm leading-none border shadow-2xs select-none shrink-0 ${avatarColor}`}>
                                                        <span>{initial}</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                                {token.customer_name || "Guest"}
                                                            </span>
                                                            <span className="font-mono text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 px-2 py-0.5 rounded-md shrink-0">
                                                                #{prefix}{token.token_number}
                                                            </span>
                                                            {index === 0 && (
                                                                <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800/80 px-1.5 py-0.5 rounded-md shrink-0">
                                                                    Next in Line
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                                                            {token.customer_phone ? (
                                                                <span className="flex items-center gap-1 font-mono text-[11px]">
                                                                    <Phone size={10} className="text-slate-400" />
                                                                    {token.customer_phone}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400">Walk-in Party</span>
                                                            )}
                                                            <span>•</span>
                                                            <span className="flex items-center gap-1 text-[11px]">
                                                                <Clock size={11} className={waitInfo.severity === "high" ? "text-rose-500" : "text-slate-400"} />
                                                                <span className={waitInfo.severity === "high" ? "text-rose-600 dark:text-rose-400 font-semibold" : ""}>
                                                                    {waitInfo.text}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Party Size & Fit Badge + Action Button */}
                                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                                    {/* Party Size & Fit */}
                                                    <div className="flex flex-col items-start sm:items-end">
                                                        <span className="inline-flex items-center gap-1 text-xs font-black text-slate-800 dark:text-slate-200">
                                                            <Users size={12} className="text-indigo-600 dark:text-indigo-400" />
                                                            <span>{tokenPax} {tokenPax === 1 ? "Guest" : "Guests"}</span>
                                                        </span>
                                                        {isExact ? (
                                                            <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/70 px-1.5 py-0.5 rounded-md mt-0.5">
                                                                ★ Exact Fit ({tokenPax}/{targetCapacity}p)
                                                            </span>
                                                        ) : isFit ? (
                                                            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/70 px-1.5 py-0.5 rounded-md mt-0.5">
                                                                ✓ Fits ({tokenPax}/{targetCapacity}p)
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-800/70 px-1.5 py-0.5 rounded-md mt-0.5">
                                                                ⚠ +{tokenPax - targetCapacity} Over
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Seat Button */}
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            const targetTableId = assigningTargetTable.id;
                                                            setAssigningTargetTable(null);
                                                            setAssignModalSearch("");
                                                            await handleSeatWaitingToken(token, targetTableId);
                                                        }}
                                                        disabled={isBeingSeated || isReadOnly}
                                                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
                                                    >
                                                        {isBeingSeated ? (
                                                            <>
                                                                <Loader2 size={13} className="animate-spin" />
                                                                <span>Seating...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Check size={14} strokeWidth={2.5} />
                                                                <span>Seat at {assigningTargetTable.name || `Table ${assigningTargetTable.id}`}</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
                                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        {waitingTokens.length}
                                    </span>
                                    <span>part{waitingTokens.length === 1 ? "y" : "ies"} currently in waitlist register</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const tableId = assigningTargetTable.id;
                                            setAssigningTargetTable(null);
                                            setWalkInTargetTableId(tableId);
                                            setIsWalkInModalOpen(true);
                                        }}
                                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                        <UserPlus size={13} />
                                        <span>Seat Walk-in Instead</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAssigningTargetTable(null);
                                            setAssignModalSearch("");
                                        }}
                                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
            {/* ========================================================================= */}
            {/* DRAGGABLE CORNER-SNAPPING FLOATING ACTIONS (Walk-In & 2D/3D View Switcher) */}
            {/* ========================================================================= */}
            <DineFloatingViewToggle
                onToggleWalkIn={() => {
                    setWalkInTargetTableId(null);
                    setIsWalkInModalOpen((prev) => !prev);
                }}
                isWalkInOpen={isWalkInModalOpen}
                showViewToggle={viewMode === "floor" && is3DViewEnabled}
                activeFloorSubView={activeFloorSubView}
                onToggleView={() => handleSetFloorSubView(activeFloorSubView === "3d" ? "plain" : "3d")}
                nextParty={waitingTokens[0] || null}
                onPageNextParty={handlePageNextParty}
                prefix={prefix}
                isReadOnly={isReadOnly}
            />
        </div>
    );
}
