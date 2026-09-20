"use client";
import { use, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { QueueResponse, SessionResponse } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";
import { useDashBase } from "@/hooks/useDashBase";
import QueueCard from "@/components/QueueCard";
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, CalendarDays, CalendarOff, CheckCircle2, AlertCircle, Utensils, Coffee, Users, Trash2, PlusCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Bookmark } from "lucide-react";
import type { QueueTemplate, TableConfig } from "@/types/api";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { nowInTz, localTodayStr, fmtDate } from "@/lib/tzformat";

interface PageProps {
    params: Promise<{ orgSlug: string }>;
}

function formatMonthDayYear(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatWeekday(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long" });
}

function isToday(dateStr: string, tz: string): boolean {
    return dateStr === localTodayStr(tz);
}

function shiftDate(dateStr: string, days: number): string {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

const DEFAULT_CAFE_TABLES: TableConfig[] = [
    { id: 1, name: "Table 1", capacity: 2 },
    { id: 2, name: "Table 2", capacity: 2 },
    { id: 3, name: "Table 3", capacity: 2 },
    { id: 4, name: "Table 4", capacity: 2 },
    { id: 5, name: "Table 5", capacity: 4 },
    { id: 6, name: "Table 6", capacity: 4 },
    { id: 7, name: "Table 7", capacity: 4 },
    { id: 8, name: "Table 8", capacity: 6 },
];

const DEFAULT_RESTAURANT_TABLES: TableConfig[] = [
    { id: 1, name: "Table 1", capacity: 2 },
    { id: 2, name: "Table 2", capacity: 2 },
    { id: 3, name: "Table 3", capacity: 2 },
    { id: 4, name: "Table 4", capacity: 2 },
    { id: 5, name: "Table 5", capacity: 4 },
    { id: 6, name: "Table 6", capacity: 4 },
    { id: 7, name: "Table 7", capacity: 4 },
    { id: 8, name: "Table 8", capacity: 4 },
    { id: 9, name: "Table 9", capacity: 4 },
    { id: 10, name: "Table 10", capacity: 4 },
    { id: 11, name: "Table 11", capacity: 6 },
    { id: 12, name: "Table 12", capacity: 6 },
    { id: 13, name: "Table 13", capacity: 6 },
    { id: 14, name: "Table 14", capacity: 8 },
];

const DEFAULT_FAMILY_TABLES: TableConfig[] = [
    { id: 1, name: "Table 1", capacity: 2 },
    { id: 2, name: "Table 2", capacity: 2 },
    { id: 3, name: "Table 3", capacity: 4 },
    { id: 4, name: "Table 4", capacity: 4 },
    { id: 5, name: "Table 5", capacity: 4 },
    { id: 6, name: "Table 6", capacity: 4 },
    { id: 7, name: "Table 7", capacity: 4 },
    { id: 8, name: "Table 8", capacity: 4 },
    { id: 9, name: "Table 9", capacity: 6 },
    { id: 10, name: "Table 10", capacity: 6 },
    { id: 11, name: "Table 11", capacity: 6 },
];

function generateDefaultTables(count: number): TableConfig[] {
    const validCount = Math.min(50, Math.max(1, count));
    return Array.from({ length: validCount }, (_, idx) => {
        const id = idx + 1;
        const capacity = id % 5 === 0 ? 8 : id % 3 === 0 ? 6 : id % 2 === 0 ? 4 : 2;
        return { id, name: `Table ${id}`, capacity };
    });
}

export default function QueuesPage({ params }: PageProps) {
    const { orgSlug } = use(params);
    const { user, isReadOnly } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const dashBase = useDashBase();
    const isStaff = user?.role === "staff";
    const isGlobalOrOrgAdmin = user?.role === "super_admin" || user?.role === "organization_admin";
    const canManageQueues = !isGlobalOrOrgAdmin && !isReadOnly;
    const tz = useBranchTimezone();

    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filterName, setFilterName] = useState("");
    const [debouncedFilterName, setDebouncedFilterName] = useState("");
    const LIMIT = 12;
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dateNavLoading, setDateNavLoading] = useState(false);
    const datePickerRef = useRef<HTMLInputElement>(null);

    // Create queue modal state
    const [branchType, setBranchType] = useState<"standard" | "dine">("standard");
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPrefix, setNewPrefix] = useState("A");
    const [newStartingSequence, setNewStartingSequence] = useState<number>(1);
    const [newQueueType, setNewQueueType] = useState<"normal" | "service_lines">("normal");
    const [newServiceLines, setNewServiceLines] = useState<number>(2);
    const [newTables, setNewTables] = useState<TableConfig[]>(DEFAULT_CAFE_TABLES);
    const [selectedPreset, setSelectedPreset] = useState<"cafe" | "restaurant" | "family" | "grand" | "custom">("cafe");
    const [newOpenTime, setNewOpenTime] = useState("");
    const [newCloseTime, setNewCloseTime] = useState("");
    const [newAppointmentEnabled, setNewAppointmentEnabled] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [templates, setTemplates] = useState<QueueTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const nameRef = useRef<HTMLInputElement>(null);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedFilterName(filterName);
            setPage(1); // Reset to first page on search
        }, 300);
        return () => clearTimeout(timer);
    }, [filterName]);

    useEffect(() => {
        if (!isInitialLoading && queues.length >= 0) {
            const action = searchParams.get("action");
            if (action === "create") {
                if (canManageQueues) setShowCreate(true);
                // Clear the URL
                router.replace(`${dashBase}/queues`);
            } else if (action === "qr") {
                // For QR, we could show an alert or highlight the first queue's QR
                // But if there are no queues, maybe show the create modal instead?
                if (queues.length === 0 && canManageQueues) {
                    setShowCreate(true);
                }
                router.replace(`${dashBase}/queues`);
            }
        }
    }, [isInitialLoading, queues.length, searchParams, isStaff, dashBase, router, canManageQueues]);

    const loadQueues = useCallback(async (isInitial = false) => {
        if (isInitial) setIsInitialLoading(true);
        else setIsBackgroundLoading(true);

        setError(null);
        try {
            let allQueues = await api.listQueues();
            allQueues = allQueues.filter(q => !q.is_deleted);
            if (debouncedFilterName) {
                allQueues = allQueues.filter(q => q.name.toLowerCase().includes(debouncedFilterName.toLowerCase()));
            }
            setTotal(allQueues.length);
            // Apply simple frontend pagination
            const paginated = allQueues.slice((page - 1) * LIMIT, page * LIMIT);
            setQueues(paginated);
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Failed to load queues");
        } finally {
            setIsInitialLoading(false);
            setIsBackgroundLoading(false);
        }
    }, [page, debouncedFilterName]);

    // Initial load: Queues + Templates + Org Branch Type
    useEffect(() => {
        Promise.all([
            loadQueues(true),
            api.getOrganizationSettings().then(res => {
                if (res.queue_templates) setTemplates(res.queue_templates);
                if (res.branch_type) setBranchType(res.branch_type);
            }).catch(console.error)
        ]);
    }, []);

    // Background updates: Search/Pagination
    useEffect(() => {
        if (!isInitialLoading) {
            loadQueues(false);
        }
    }, [page, debouncedFilterName]);



    // Split non-deleted queues into active vs inactive
    const activeQueues = useMemo(() => queues.filter(q => !q.is_deleted && q.is_active), [queues]);
    const inactiveQueues = useMemo(() => queues.filter(q => !q.is_deleted && !q.is_active), [queues]);
    const [inactiveCollapsed, setInactiveCollapsed] = useState(false);

    // Table preset handlers for Dine mode
    const applyPreset = (preset: "cafe" | "restaurant" | "family" | "grand") => {
        setSelectedPreset(preset);
        if (preset === "cafe") setNewTables(DEFAULT_CAFE_TABLES);
        else if (preset === "restaurant") setNewTables(DEFAULT_RESTAURANT_TABLES);
        else if (preset === "family") setNewTables(DEFAULT_FAMILY_TABLES);
        else if (preset === "grand") setNewTables(generateDefaultTables(50));
    };

    const addTable = () => {
        if (newTables.length >= 50) {
            toast.error("Maximum 50 tables allowed for now.");
            return;
        }
        setSelectedPreset("custom");
        setNewTables(prev => [
            ...prev,
            { id: prev.length + 1, name: `Table ${prev.length + 1}`, capacity: 4 }
        ]);
    };

    const updateTable = (index: number, updates: Partial<TableConfig>) => {
        setSelectedPreset("custom");
        setNewTables(prev => {
            const next = [...prev];
            next[index] = { ...next[index], ...updates };
            return next;
        });
    };

    const removeTable = (index: number) => {
        if (newTables.length <= 1) {
            toast.error("At least one table is required.");
            return;
        }
        setSelectedPreset("custom");
        setNewTables(prev => {
            const filtered = prev.filter((_, i) => i !== index);
            return filtered.map((t, i) => ({ ...t, id: i + 1 }));
        });
    };

    // When modal opens, clear form. Templates are already loaded.
    useEffect(() => {
        if (showCreate) {
            if (branchType === "dine") {
                setNewName("Dining Floor");
                setNewPrefix("T");
                setNewTables(DEFAULT_CAFE_TABLES);
                setSelectedPreset("cafe");
            } else {
                setNewName("");
                setNewPrefix("A");
            }
            setNewStartingSequence(1);
            setNewQueueType("normal");
            setNewServiceLines(2);
            setNewOpenTime("");
            setNewCloseTime("");
            setNewAppointmentEnabled(false);
            setCreateError(null);
            setSelectedTemplateId("");
            setTimeout(() => nameRef.current?.focus(), 100);
        }
    }, [showCreate, branchType]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape" && showCreate) {
                setShowCreate(false);
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [showCreate]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setCreateLoading(true);
        setCreateError(null);
        try {
            if (branchType === "dine") {
                await api.createQueue({
                    name: newName.trim(),
                    prefix: newPrefix.trim() || "T",
                    starting_sequence: newStartingSequence || 1,
                    service_lines: newTables.length,
                    table_config: newTables.map((t, idx) => ({
                        id: idx + 1,
                        name: t.name.trim() || `Table ${idx + 1}`,
                        capacity: Number(t.capacity) || 4,
                    })),
                    open_time: newOpenTime || undefined,
                    close_time: newCloseTime || undefined,
                    appointment_enabled: newAppointmentEnabled,
                });
            } else {
                await api.createQueue({
                    name: newName.trim(),
                    prefix: newPrefix.trim() || "A",
                    starting_sequence: newStartingSequence || 1,
                    service_lines: newQueueType === "service_lines" ? newServiceLines : 0,
                    open_time: newOpenTime || undefined,
                    close_time: newCloseTime || undefined,
                    appointment_enabled: newAppointmentEnabled,
                });
            }
            setShowCreate(false);
            setPage(1); // Reset to page 1 to see the newly created queue at the top
            loadQueues(false);
            
            // Professional Success Toast
            toast.custom((t) => (
                <div className="pointer-events-auto w-[356px] overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5">
                    <div className="p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div className="ml-3 w-0 flex-1 pt-0.5">
                                <p className="text-sm font-medium text-gray-900 leading-none mb-1.5">Queue Created</p>
                                <p className="text-sm text-gray-500 leading-snug">The queue <span className="font-semibold text-gray-700">"{newName.trim()}"</span> is now active.</p>
                            </div>
                        </div>
                    </div>
                </div>
            ), { duration: 3000, position: 'top-center' });

        } catch (err: unknown) {
            const errMessage = err instanceof ApiError ? err.detail : "Failed to create queue";
            setCreateError(errMessage);
            
            // Professional Error Toast
            toast.custom((t) => (
                <div className="pointer-events-auto w-[356px] overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5">
                    <div className="p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="ml-3 w-0 flex-1 pt-0.5">
                                <p className="text-sm font-medium text-gray-900 leading-none mb-1.5">Creation Failed</p>
                                <p className="text-sm text-gray-500 leading-snug">{errMessage}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ), { duration: 4000, position: 'top-center' });
        } finally {
            setCreateLoading(false);
        }
    };

    const totalPages = Math.ceil(total / LIMIT);

    if (isInitialLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-10 h-10 border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-gray-500 font-medium">Loading queues…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-300">
            {/* ── Background loading bar ── */}
                {isBackgroundLoading && (
                    <div className="fixed top-0 left-0 right-0 h-0.5 z-[60]">
                        <div className="h-full bg-blue-500 animate-[progress_1s_infinite_linear] origin-left" />
                    </div>
                )}
                <style>{`
                    @keyframes progress {
                        0% { transform: scaleX(0); }
                        50% { transform: scaleX(0.5); }
                        100% { transform: scaleX(1); opacity: 0; }
                    }
                `}</style>

                {/* ── Header Card ── */}
                <div className="p-4 md:py-4 md:px-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl shadow-sm ring-1 ring-slate-900/5 w-full">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-5 w-full">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full xl:w-auto">
                            {/* Metadata outside the pill */}
                            <div className="flex items-center gap-2 flex-wrap text-xs font-medium text-slate-400 w-full md:w-auto">
                                <span className="whitespace-nowrap">{queues.length} {queues.length === 1 ? "queue" : "queues"}</span>
                                {activeQueues.length > 0 && (
                                    <span className="inline-flex items-center gap-1 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900/40 font-bold px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wider whitespace-nowrap">
                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                        {activeQueues.length} ACTIVE
                                    </span>
                                )}
                                {inactiveQueues.length > 0 && (
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md whitespace-nowrap">
                                        {inactiveQueues.length} inactive
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right: Search & Create */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-sm rounded-xl px-3 h-9 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all w-full sm:w-44 xl:w-56">
                                <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={filterName}
                                    onChange={(e) => setFilterName(e.target.value)}
                                    className="text-sm text-slate-900 dark:text-white font-medium focus:outline-none bg-transparent w-full placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    placeholder="Search queues…"
                                />
                                {filterName && (
                                    <button onClick={() => { setFilterName(""); setPage(1); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            {canManageQueues && (
                                <button
                                    onClick={() => setShowCreate(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl h-9 px-4 shadow-sm shadow-indigo-500/10 transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 flex-shrink-0 w-full sm:w-auto"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Queue
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Error ── */}
                {error && (
                    <div role="alert" className="bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-5 py-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-sm flex items-center justify-between font-medium">
                        <span>{error}</span>
                        <button onClick={() => { loadQueues(true); }} className="underline font-bold hover:text-rose-900 dark:hover:text-rose-200 transition-colors">Retry</button>
                    </div>
                )}

                {/* ── Queues Content ── */}
                <div className={`transition-opacity duration-200 ${isBackgroundLoading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
                    {queues.length === 0 ? (
                        /* Empty state */
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 text-center py-24 px-8">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No queues found</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8 max-w-xs mx-auto leading-relaxed">
                                {canManageQueues ? "Add your first queue to start serving customers." : "No queues have been created yet."}
                            </p>
                                {canManageQueues && (
                                <button
                                    onClick={() => setShowCreate(true)}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors duration-200 shadow-sm shadow-indigo-500/10 text-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create First Queue
                                </button>
                                )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8">
                            {/* ── Active Queues ── */}
                            {activeQueues.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-wide uppercase">ACTIVE QUEUES</h2>
                                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/40 px-2.5 py-0.5 rounded-full">{activeQueues.length}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-2">
                                        {activeQueues.map((q) => (
                                            <QueueCard key={q.id} queue={q} onToggled={() => { loadQueues(false); }} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ── Inactive Queues ── */}
                            {inactiveQueues.length > 0 && (
                                <section>
                                    <button
                                        onClick={() => setInactiveCollapsed(c => !c)}
                                        className="flex items-center gap-3 mb-5 group cursor-pointer w-full text-left"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            <div className="w-2.5 h-2.5 bg-slate-400 rounded-full" />
                                        </div>
                                        <h2 className="text-sm font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider flex-1 text-left">Inactive Queues</h2>
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full mr-1">{inactiveQueues.length}</span>
                                        <svg
                                            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${inactiveCollapsed ? "-rotate-90" : "rotate-0"}`}
                                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {!inactiveCollapsed && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-2">
                                            {inactiveQueues.map((q) => (
                                                <QueueCard key={q.id} queue={q} onToggled={() => { loadQueues(false); }} />
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* ── All inactive warning ── */}
                            {activeQueues.length === 0 && inactiveQueues.length > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/40 rounded-2xl px-5 py-4 flex items-center gap-3">
                                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                    <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">All queues are currently inactive. Activate a queue to start serving customers.</p>
                                </div>
                            )}

                            {/* ── Pagination ── */}
                            {total > LIMIT && (
                                <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        Showing <span className="text-slate-900 dark:text-white font-bold">{(page - 1) * LIMIT + 1}</span> to <span className="text-slate-900 dark:text-white font-bold">{Math.min(page * LIMIT, total)}</span> of <span className="text-slate-900 dark:text-white font-bold">{total}</span> queues
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-4 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-xs font-bold text-slate-400 tabular-nums px-2">
                                            {page} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page * LIMIT >= total}
                                            className="px-4 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Create Queue Slide-Over Drawer ── */}
                {showCreate && (
                    <div className="fixed inset-0 z-50 overflow-hidden">
                        {/* Backdrop */}
                        <div 
                            className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in" 
                            onClick={() => setShowCreate(false)} 
                        />

                        {/* Slide-over Drawer Container */}
                        <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
                            <div className={`w-screen ${branchType === "dine" ? "max-w-xl md:max-w-2xl" : "max-w-lg md:max-w-xl"} bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/80 dark:border-white/10 flex flex-col h-full animate-in slide-in-from-right duration-300 ease-out`}>
                                
                                {/* Sticky Drawer Header */}
                                <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-start justify-between gap-4 shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl ${branchType === "dine" ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400" : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"} flex items-center justify-center shrink-0`}>
                                            {branchType === "dine" ? (
                                                <Utensils className="w-5 h-5" />
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                                                {branchType === "dine" ? "Setup Dining Floor & Tables" : "Create New Queue"}
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                                                {branchType === "dine"
                                                    ? "Configure your tables, seating capacity, and dining floor sections."
                                                    : "Define a new service lane for this session."}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setShowCreate(false)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <form onSubmit={handleCreate} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                                        {branchType === "dine" ? "Floor / Section Name" : "Queue Name"}
                                    </label>
                                    <input
                                        ref={nameRef}
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder={branchType === "dine" ? "e.g. Dining Floor, Terrace, Main Hall" : "e.g. Counter 1, Desk A"}
                                        required
                                        maxLength={40}
                                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5">Open Time</label>
                                        <input
                                            type="time"
                                            value={newOpenTime}
                                            onChange={(e) => setNewOpenTime(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5">Close Time</label>
                                        <input
                                            type="time"
                                            value={newCloseTime}
                                            onChange={(e) => setNewCloseTime(e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all"
                                        />
                                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-tight">
                                            Defaults to midnight session closing if blank.
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5">Token Prefix</label>
                                        <input
                                            type="text"
                                            value={newPrefix}
                                            onChange={(e) => setNewPrefix(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
                                            placeholder={branchType === "dine" ? "T" : "A"}
                                            maxLength={3}
                                            className={`w-full rounded-xl border shadow-sm bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-4 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 ${queues.some(q => (q.prefix || "").toUpperCase() === (newPrefix.trim().toUpperCase() || (branchType === "dine" ? "T" : "A"))) ? "border-rose-300 dark:border-rose-900/60 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900 dark:text-rose-300" : "border-slate-200 dark:border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20"}`}
                                        />
                                        {queues.some(q => (q.prefix || "").toUpperCase() === (newPrefix.trim().toUpperCase() || (branchType === "dine" ? "T" : "A"))) && (
                                            <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                                                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                Prefix already used in this session.
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5">Starting Number</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={9999}
                                            value={newStartingSequence}
                                            onChange={(e) => {
                                                const valStr = e.target.value.slice(0, 4);
                                                setNewStartingSequence(parseInt(valStr) || 1);
                                            }}
                                            placeholder="1"
                                            className="w-full rounded-xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                        />
                                    </div>
                                </div>
                                
                                {branchType === "dine" ? (
                                    <div className="space-y-3 pt-1">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Utensils className="w-3.5 h-3.5 text-amber-500" />
                                                    Table Floor Setup
                                                </label>
                                                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-900/40">
                                                    {newTables.length} Tables · {newTables.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0)} Seats
                                                </span>
                                            </div>

                                            {/* Presets */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                                <button
                                                    type="button"
                                                    onClick={() => applyPreset("cafe")}
                                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                                        selectedPreset === "cafe"
                                                            ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/20"
                                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-1.5 font-bold text-xs">
                                                        <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                        Cafe
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">8 Tables</p>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => applyPreset("restaurant")}
                                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                                        selectedPreset === "restaurant"
                                                            ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/20"
                                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-1.5 font-bold text-xs">
                                                        <Utensils className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                        Restaurant
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">14 Tables</p>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => applyPreset("family")}
                                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                                        selectedPreset === "family"
                                                            ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/20"
                                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-1.5 font-bold text-xs">
                                                        <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                        Family Dine
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">12 Tables</p>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => applyPreset("grand")}
                                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                                        selectedPreset === "grand"
                                                            ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/20"
                                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-1.5 font-bold text-xs">
                                                        <Utensils className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                                        50 Tables
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Full Floor (50p)</p>
                                                </button>
                                            </div>

                                            {/* Table rows */}
                                            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 rounded-xl border border-slate-200 dark:border-white/10 p-2.5 bg-slate-50/50 dark:bg-slate-800/40">
                                                {newTables.map((tbl, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-white/10 shadow-xs">
                                                        <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center text-[11px] font-black shrink-0">
                                                            T{idx + 1}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={tbl.name}
                                                            onChange={(e) => updateTable(idx, { name: e.target.value })}
                                                            placeholder={`Table ${idx + 1}`}
                                                            className="flex-1 min-w-[90px] px-2 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white focus:outline-none focus:border-amber-500"
                                                        />
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0">Pax:</span>
                                                            <div className="flex items-center gap-0.5">
                                                                {[2, 4, 6, 8, 10].map(cap => (
                                                                    <button
                                                                        key={cap}
                                                                        type="button"
                                                                        onClick={() => updateTable(idx, { capacity: cap })}
                                                                        className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors ${
                                                                            tbl.capacity === cap
                                                                                ? "bg-amber-500 text-white shadow-xs"
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
                                                            onClick={() => removeTable(idx)}
                                                            className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                            title="Remove Table"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-2.5">
                                                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                    <span>Quick fill:</span>
                                                    {[10, 20, 30, 50].map(cnt => (
                                                        <button
                                                            key={cnt}
                                                            type="button"
                                                            onClick={() => { setSelectedPreset("custom"); setNewTables(generateDefaultTables(cnt)); }}
                                                            className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                                                        >
                                                            {cnt}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={addTable}
                                                    disabled={newTables.length >= 50}
                                                    className="py-1.5 px-3 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg border border-amber-200 dark:border-amber-900/40 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <PlusCircle className="w-3.5 h-3.5" />
                                                    {newTables.length >= 50 ? "Maximum 50 Tables Reached" : `Add Table (${newTables.length}/50)`}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5">Queue Type</label>
                                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                                <button
                                                    type="button"
                                                    onClick={() => setNewQueueType("normal")}
                                                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                                                        newQueueType === "normal"
                                                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                                    }`}
                                                >
                                                    Normal Queue
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewQueueType("service_lines")}
                                                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                                                        newQueueType === "service_lines"
                                                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                                    }`}
                                                >
                                                    Service Lanes
                                                </button>
                                            </div>
                                        </div>

                                        {newQueueType === "service_lines" && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5">Number of Service Lanes</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    value={newServiceLines}
                                                    onChange={(e) => setNewServiceLines(parseInt(e.target.value) || 2)}
                                                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all"
                                                    required={newQueueType === "service_lines"}
                                                    disabled={createLoading}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Appointment Booking Checkbox */}
                                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10">
                                    <label className="flex items-start gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={newAppointmentEnabled}
                                            onChange={(e) => setNewAppointmentEnabled(e.target.checked)}
                                            className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-slate-800 dark:text-white block">
                                                Add this into appointment booking
                                            </span>
                                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-snug">
                                                When enabled, this queue will be available for online appointment booking on your public booking link.
                                            </span>
                                        </div>
                                    </label>
                                </div>
                                    </div>

                                    {/* Sticky Drawer Footer */}
                                    <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-end gap-3 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreate(false)}
                                            className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-xl transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={createLoading || !newName.trim() || (branchType === "standard" && queues.some(q => (q.prefix || "").toUpperCase() === (newPrefix.trim().toUpperCase() || "A")))}
                                            className={`px-5 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm ${
                                                branchType === "dine"
                                                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/10"
                                                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/10"
                                            }`}
                                        >
                                            {createLoading ? "Building…" : (branchType === "dine" ? "Create Dining Floor" : "Build Queue")}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
    );
}
