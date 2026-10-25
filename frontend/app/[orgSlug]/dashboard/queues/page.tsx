"use client";
import { use, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { QueueResponse, SessionResponse } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";
import { useDashBase } from "@/hooks/useDashBase";
import QueueCard from "@/components/QueueCard";
import { Calendar, Plus, ChevronLeft, ChevronRight, ChevronDown, Check, Clock, CalendarDays, CalendarOff, CheckCircle2, AlertCircle, Utensils, Coffee, Users, Trash2, PlusCircle, X, Building2, Layers, ArrowRightLeft, Sparkles, Search, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Bookmark } from "lucide-react";
import type { QueueTemplate, TableConfig } from "@/types/api";
import { computeAutoLayout } from "@/components/dine/hooks/useFloorLayout";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { useBranch } from "@/context/BranchContext";
import { nowInTz, localTodayStr, fmtDate } from "@/lib/tzformat";
import { EntitlementLimitNotice } from "@/components/EntitlementLimitNotice";
import { ContactSalesModal } from "@/components/ContactSalesModal";
import { Table2SeaterIcon, Table4SeaterIcon, Table6SeaterIcon, Table8SeaterIcon } from "@/components/dine/DiningTableVectors";

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
    const { hasAppointmentFeature } = useBranch();
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
    const [branchType, setBranchType] = useState<"standard" | "dine">(() => {
        if (typeof window !== "undefined" && orgSlug) {
            try {
                const cached = sessionStorage.getItem(`org_branch_type_${orgSlug}`);
                if (cached === "dine" || cached === "standard") return cached;
                const cachedSettings = sessionStorage.getItem(`org_settings_${orgSlug}`);
                if (cachedSettings) {
                    const parsed = JSON.parse(cachedSettings);
                    if (parsed.branch_type === "dine" || parsed.branch_type === "standard") return parsed.branch_type;
                }
            } catch { }
        }
        return "standard";
    });
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPrefix, setNewPrefix] = useState("A");
    const [newStartingSequence, setNewStartingSequence] = useState<number>(1);
    const [newQueueType, setNewQueueType] = useState<"normal" | "service_lines" | "zone">("normal");
    const [newMaxCapacity, setNewMaxCapacity] = useState<number>(15);
    const [newZoneDurationMins, setNewZoneDurationMins] = useState<number>(30);
    const [newServiceLines, setNewServiceLines] = useState<number>(2);
    const [newTables, setNewTables] = useState<TableConfig[]>(() => generateDefaultTables(20));
    const [newOpenTime, setNewOpenTime] = useState("");
    const [newCloseTime, setNewCloseTime] = useState("");
    const [newAppointmentEnabled, setNewAppointmentEnabled] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [showContactSales, setShowContactSales] = useState(false);
    const [templates, setTemplates] = useState<QueueTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const nameRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedFilterName(filterName);
            setPage(1); // Reset to first page on search
        }, 300);
        return () => clearTimeout(timer);
    }, [filterName]);

    // Global keyboard shortcut (⌘K or /) to focus queue search
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

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
                if (res.branch_type) {
                    setBranchType(res.branch_type);
                    if (typeof window !== "undefined" && orgSlug) {
                        try {
                            sessionStorage.setItem(`org_branch_type_${orgSlug}`, res.branch_type);
                            sessionStorage.setItem(`org_settings_${orgSlug}`, JSON.stringify(res));
                        } catch { }
                    }
                }
            }).catch(console.error)
        ]);
    }, [orgSlug]);

    // Background updates: Search/Pagination
    useEffect(() => {
        if (!isInitialLoading) {
            loadQueues(false);
        }
    }, [page, debouncedFilterName]);





    // Detect if branch is a Hotel / Dine establishment
    const isHotelDineBranch = useMemo(() => {
        return (
            branchType === "dine" ||
            queues.some(q => (Array.isArray(q.table_config) && q.table_config.length > 0) || q.industry_template === "dining" || q.industry_template === "hotel")
        );
    }, [branchType, queues]);

    // Aggregate served count across all queues for live telemetry
    const totalServedToday = useMemo(() => {
        return queues.reduce((acc, q) => acc + (Number(q.total_served) || 0), 0);
    }, [queues]);

    // Multi-Floor / Area setup for Dine mode
    const [floorsSetup, setFloorsSetup] = useState<Array<{ id: string; name: string }>>([
        { id: "ground", name: "Ground Floor (Down)" },
    ]);
    const [activeSetupFloorId, setActiveSetupFloorId] = useState<string>("ground");
    const [isAddingFloor, setIsAddingFloor] = useState(false);
    const [newFloorInputName, setNewFloorInputName] = useState("");
    const [showCustomTableList, setShowCustomTableList] = useState(false);

    // Smart Table Matrix metrics & validation
    const count2 = useMemo(() => newTables.filter(t => (t.capacity || 2) <= 2).length, [newTables]);
    const count4 = useMemo(() => newTables.filter(t => t.capacity === 3 || t.capacity === 4).length, [newTables]);
    const count6 = useMemo(() => newTables.filter(t => t.capacity === 5 || t.capacity === 6).length, [newTables]);
    const count8 = useMemo(() => newTables.filter(t => (t.capacity || 0) >= 7).length, [newTables]);
    const totalDineSeats = useMemo(() => newTables.reduce((acc, t) => acc + (Number(t.capacity) || 0), 0), [newTables]);

    const isPrefixDuplicate = useMemo(() => {
        const candidate = (newPrefix.trim().toUpperCase() || (branchType === "dine" ? "T" : "A"));
        return queues.some(q => (q.prefix || "").toUpperCase() === candidate);
    }, [queues, newPrefix, branchType]);

    const adjustPaxGroup = (targetPax: number, delta: number) => {
        if (delta > 0) {
            if (newTables.length >= 50) {
                toast.error("Maximum 50 tables allowed.");
                return;
            }
            const nextId = newTables.length + 1;
            const targetFloor = activeSetupFloorId || floorsSetup[0]?.id || "ground";
            setNewTables(prev => [
                ...prev,
                { id: nextId, name: `Table ${nextId}`, capacity: targetPax, section: targetFloor }
            ]);
        } else {
            if (newTables.length <= 1) {
                toast.error("At least one table is required.");
                return;
            }
            let removeIdx = -1;
            for (let i = newTables.length - 1; i >= 0; i--) {
                const cap = newTables[i].capacity || 2;
                if (targetPax === 2 && cap <= 2) { removeIdx = i; break; }
                if (targetPax === 4 && (cap === 3 || cap === 4)) { removeIdx = i; break; }
                if (targetPax === 6 && (cap === 5 || cap === 6)) { removeIdx = i; break; }
                if (targetPax === 8 && cap >= 7) { removeIdx = i; break; }
            }
            if (removeIdx === -1) {
                removeIdx = newTables.length - 1;
            }
            setNewTables(prev => {
                const filtered = prev.filter((_, idx) => idx !== removeIdx);
                return filtered.map((t, idx) => ({ ...t, id: idx + 1 }));
            });
        }
    };

    const applyQuickPreset = (presetType: "bistro" | "standard" | "large") => {
        let presetTables: TableConfig[] = [];
        const floorId = floorsSetup[0]?.id || "ground";
        if (presetType === "bistro") {
            let id = 1;
            for (let i = 0; i < 6; i++, id++) presetTables.push({ id, name: `Table ${id}`, capacity: 2, section: floorId });
            for (let i = 0; i < 4; i++, id++) presetTables.push({ id, name: `Table ${id}`, capacity: 4, section: floorId });
            for (let i = 0; i < 2; i++, id++) presetTables.push({ id, name: `Table ${id}`, capacity: 6, section: floorId });
        } else if (presetType === "standard") {
            let id = 1;
            for (let i = 0; i < 6; i++, id++) presetTables.push({ id, name: `Table ${id}`, capacity: 2, section: floorId });
            for (let i = 0; i < 10; i++, id++) presetTables.push({ id, name: `Table ${id}`, capacity: 4, section: floorId });
            for (let i = 0; i < 4; i++, id++) presetTables.push({ id, name: `Table ${id}`, capacity: 6, section: floorId });
        } else {
            let id = 1;
            for (let i = 0; i < 10; i++, id++) presetTables.push({ id, name: `Table ${id}`, capacity: 2, section: floorId });
            for (let i = 0; i < 14; i++, id++) presetTables.push({ id, name: `Table ${id}`, capacity: 4, section: floorId });
            for (let i = 0; i < 6; i++, id++) presetTables.push({ id, name: `Table ${id}`, capacity: 6, section: floorId });
            for (let i = 0; i < 2; i++, id++) presetTables.push({ id, name: `Table ${id}`, capacity: 8, section: floorId });
        }
        if (floorsSetup.length > 1) {
            const perFloor = Math.floor(presetTables.length / floorsSetup.length);
            const remainder = presetTables.length % floorsSetup.length;
            const dist: string[] = [];
            floorsSetup.forEach((fl, idx) => {
                const count = perFloor + (idx < remainder ? 1 : 0);
                for (let i = 0; i < count; i++) dist.push(fl.id);
            });
            presetTables = presetTables.map((t, idx) => ({ ...t, section: dist[idx] || floorsSetup[0].id }));
        }
        setNewTables(presetTables);
        toast.success(`Configured ${presetTables.length} tables (${presetType.toUpperCase()} preset)!`);
    };

    const handleSetTotalTables = (count: number) => {
        const target = Math.min(50, Math.max(1, count));
        if (target === newTables.length) return;

        if (target > newTables.length) {
            const addedCount = target - newTables.length;
            const currentLength = newTables.length;
            const added: TableConfig[] = [];
            for (let i = 0; i < addedCount; i++) {
                const tableId = currentLength + i + 1;
                const capacity = tableId % 5 === 0 ? 8 : tableId % 3 === 0 ? 6 : tableId % 2 === 0 ? 4 : 2;
                const assignedFloorId = floorsSetup[i % floorsSetup.length]?.id || floorsSetup[0].id;
                added.push({
                    id: tableId,
                    name: `Table ${tableId}`,
                    capacity,
                    section: assignedFloorId,
                });
            }
            setNewTables(prev => [...prev, ...added]);
        } else {
            setNewTables(prev => prev.slice(0, target));
        }
    };

    const handleSetFloorTableCount = (floorId: string, count: number) => {
        const targetCount = Math.max(0, count);
        if (floorsSetup.length <= 1) return;

        if (floorsSetup.length === 2) {
            const otherFloor = floorsSetup.find(f => f.id !== floorId);
            if (!otherFloor) return;
            const boundedTarget = Math.min(newTables.length, targetCount);
            setNewTables(prev => {
                let assignedToThis = 0;
                return prev.map((t) => {
                    if (assignedToThis < boundedTarget) {
                        assignedToThis++;
                        return { ...t, section: floorId };
                    } else {
                        return { ...t, section: otherFloor.id };
                    }
                });
            });
        } else {
            setNewTables(prev => {
                const currentFloorTables = prev.filter(t => (t.section || floorsSetup[0].id) === floorId);
                if (currentFloorTables.length === targetCount) return prev;

                if (targetCount > currentFloorTables.length) {
                    let needed = targetCount - currentFloorTables.length;
                    return prev.map(t => {
                        if (needed > 0 && (t.section || floorsSetup[0].id) !== floorId) {
                            needed--;
                            return { ...t, section: floorId };
                        }
                        return t;
                    });
                } else {
                    let excess = currentFloorTables.length - targetCount;
                    const otherFloor = floorsSetup.find(f => f.id !== floorId) || floorsSetup[0];
                    return prev.map(t => {
                        if (excess > 0 && (t.section || floorsSetup[0].id) === floorId) {
                            excess--;
                            return { ...t, section: otherFloor.id };
                        }
                        return t;
                    });
                }
            });
        }
    };

    const splitEvenlyAcrossFloors = () => {
        if (floorsSetup.length <= 1 || newTables.length === 0) return;
        const perFloor = Math.floor(newTables.length / floorsSetup.length);
        const remainder = newTables.length % floorsSetup.length;

        const dist: string[] = [];
        floorsSetup.forEach((fl, idx) => {
            const floorCount = perFloor + (idx < remainder ? 1 : 0);
            for (let i = 0; i < floorCount; i++) dist.push(fl.id);
        });

        setNewTables(prev => prev.map((t, idx) => ({
            ...t,
            section: dist[idx] || floorsSetup[0].id,
        })));
        toast.success(`Tables split evenly across ${floorsSetup.length} floors!`);
    };

    const addFloorSetup = (customName?: string) => {
        if (floorsSetup.length >= 5) {
            toast.error("Maximum 5 floors or areas supported.");
            return;
        }
        const nextNum = floorsSetup.length + 1;
        const defaultNames = ["First Floor (Up)", "Second Floor (Up)", "Outdoor Terrace", "Rooftop Lounge"];
        const name = (customName || newFloorInputName).trim() || defaultNames[nextNum - 2] || `Floor ${nextNum}`;
        const newId = `floor_${Date.now()}`;

        const updated = [...floorsSetup, { id: newId, name }];
        setFloorsSetup(updated);
        setIsAddingFloor(false);
        setNewFloorInputName("");

        // Split tables evenly across all floors
        const perFloor = Math.floor(newTables.length / updated.length);
        const remainder = newTables.length % updated.length;
        const dist: string[] = [];
        updated.forEach((fl, idx) => {
            const count = perFloor + (idx < remainder ? 1 : 0);
            for (let i = 0; i < count; i++) dist.push(fl.id);
        });

        setNewTables(prev => prev.map((t, idx) => ({
            ...t,
            section: dist[idx] || updated[0].id,
        })));
        toast.success(`Added "${name}" and distributed tables across all ${updated.length} floors!`);
    };

    const removeFloorSetup = (id: string) => {
        if (floorsSetup.length <= 1) {
            toast.error("At least one floor or area is required.");
            return;
        }
        const remaining = floorsSetup.filter(f => f.id !== id);
        const fallbackId = remaining[0].id;
        setNewTables(prev => prev.map(t => (t.section === id ? { ...t, section: fallbackId } : t)));
        setFloorsSetup(remaining);
        if (activeSetupFloorId === id) {
            setActiveSetupFloorId(fallbackId);
        }
        toast.info("Floor removed. Tables moved to remaining floor.");
    };

    const addTable = () => {
        if (newTables.length >= 50) {
            toast.error("Maximum 50 tables allowed.");
            return;
        }
        const nextId = newTables.length + 1;
        const capacity = nextId % 5 === 0 ? 8 : nextId % 3 === 0 ? 6 : nextId % 2 === 0 ? 4 : 2;
        setNewTables(prev => [
            ...prev,
            { id: nextId, name: `Table ${nextId}`, capacity, section: floorsSetup[0]?.id || "ground" }
        ]);
    };

    const updateTable = (index: number, updates: Partial<TableConfig>) => {
        setNewTables(prev => {
            const next = [...prev];
            next[index] = { ...next[index], ...updates };
            return next;
        });
    };

    const moveTableToFloor = (index: number, targetFloorId: string) => {
        setNewTables(prev => {
            const next = [...prev];
            next[index] = { ...next[index], section: targetFloorId };
            return next;
        });
    };

    const removeTable = (index: number) => {
        if (newTables.length <= 1) {
            toast.error("At least one table is required.");
            return;
        }
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
                setFloorsSetup([{ id: "ground", name: "Ground Floor (Down)" }]);
                setActiveSetupFloorId("ground");
                setNewTables(generateDefaultTables(20).map(t => ({ ...t, section: "ground" })));
                setShowCustomTableList(false);
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
                const totalTables = newTables.map((t, idx) => ({
                    id: idx + 1,
                    name: t.name.trim() || `Table ${idx + 1}`,
                    capacity: Number(t.capacity) || 4,
                    section: t.section || floorsSetup[0]?.id || "ground",
                }));

                const created = await api.createQueue({
                    name: newName.trim(),
                    prefix: newPrefix.trim() || "T",
                    starting_sequence: newStartingSequence || 1,
                    service_lines: totalTables.length,
                    table_config: totalTables,
                    open_time: branchType === "dine" ? undefined : (newOpenTime || undefined),
                    close_time: branchType === "dine" ? undefined : (newCloseTime || undefined),
                    appointment_enabled: hasAppointmentFeature ? newAppointmentEnabled : false,
                });

                // Generate rich initial floor layout with multiple floors if more than 1 floor
                if (created?.id && typeof window !== "undefined") {
                    try {
                        const richFloors = floorsSetup.map((fl, flIdx) => {
                            const flTables = totalTables.filter(t => t.section === fl.id || (!t.section && flIdx === 0));
                            const { roomWidth, roomDepth, laidOutTables } = computeAutoLayout(flTables);
                            const sqDim = Math.max(28, roomWidth);
                            return {
                                id: fl.id,
                                name: fl.name,
                                theme: flIdx === 0 ? "city_daylight" : "warm_bistro",
                                room_width: sqDim,
                                room_depth: sqDim,
                                hasEntranceCounter: flIdx === 0,
                                walls: [],
                                decorations: [
                                    { type: "snake_plant", x: 2.2, z: 2.2, rotation: 0 },
                                    { type: "potted_palm", x: sqDim - 2.2, z: 2.2, rotation: 0 },
                                    { type: "sofa_lounge", x: 5.0, z: 2.0, rotation: 0 },
                                    { type: "snake_plant", x: sqDim - 2.2, z: sqDim - 2.5, rotation: 0 },
                                ],
                                tables: laidOutTables,
                            };
                        });
                        localStorage.setItem(`floor_layout_${created.id}`, JSON.stringify({
                            floors: richFloors,
                            viewMode: richFloors.length > 1 ? "avenue" : "single_block",
                        }));
                    } catch (err) {
                        console.error("Failed to seed localStorage floors:", err);
                    }
                }
            } else {
                await api.createQueue({
                    name: newName.trim(),
                    prefix: newPrefix.trim() || (newQueueType === "zone" ? "Z" : "A"),
                    starting_sequence: newStartingSequence || 1,
                    queue_type: newQueueType,
                    service_lines: newQueueType === "service_lines" ? newServiceLines : 0,
                    max_capacity: newQueueType === "zone" ? newMaxCapacity : 0,
                    zone_duration_mins: newQueueType === "zone" && newZoneDurationMins ? newZoneDurationMins : undefined,
                    open_time: newOpenTime || undefined,
                    close_time: newCloseTime || undefined,
                    appointment_enabled: hasAppointmentFeature ? newAppointmentEnabled : false,
                });
            }
            setShowCreate(false);
            setPage(1); // Reset to page 1 to see the newly created queue at the top
            loadQueues(false);

            // Professional Success Toast
            toast.custom(() => (
                <div className="pointer-events-auto w-[356px] overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5">
                    <div className="p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div className="ml-3 w-0 flex-1 pt-0.5">
                                <p className="text-sm font-medium text-gray-900 leading-none mb-1.5">Queue Created</p>
                                <p className="text-sm text-gray-500 leading-snug">The queue <span className="font-semibold text-gray-700">&ldquo;{newName.trim()}&rdquo;</span> is now active.</p>
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

            {/* ── Executive Page Command Header ── */}
            <div className="flex flex-col gap-3.5 pb-5 border-b border-slate-200/80 dark:border-slate-800">
                {/* Top Row: Title, Branch Badge, and Main Action Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Heading & Count */}
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Manage Queues
                        </h1>

                        <span className="inline-flex items-center justify-center h-6 px-2 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 tabular-nums">
                            {queues.length}
                        </span>
                    </div>

                    {/* Right: Search & Create Queue Button */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        {/* Search Input with Keyboard Shortcut */}
                        <div className="relative flex-1 sm:w-60 md:w-72">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg px-2.5 h-9 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-2xs">
                                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={filterName}
                                    onChange={(e) => setFilterName(e.target.value)}
                                    className="text-xs text-slate-900 dark:text-white font-medium focus:outline-none bg-transparent w-full placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    placeholder="Search queues..."
                                />
                                {filterName ? (
                                    <button
                                        type="button"
                                        onClick={() => { setFilterName(""); setPage(1); }}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 transition-colors shrink-0 rounded cursor-pointer"
                                        title="Clear search"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <kbd className="hidden sm:inline-flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-500 font-sans border border-slate-200 dark:border-slate-700/80 rounded px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 select-none pointer-events-none">
                                        ⌘K
                                    </kbd>
                                )}
                            </div>
                        </div>

                        {/* Primary Action Button */}
                        {canManageQueues && (
                            <button
                                type="button"
                                onClick={() => { setCreateError(null); setShowCreate(true); }}
                                className="h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                            >
                                <Plus className="w-4 h-4 stroke-[2.25]" />
                                <span>New Queue</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Bottom Subtitle & Aggregate Telemetry */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <p className="truncate">
                        Real-time queue monitoring, dining floor allocation, and token management.
                    </p>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{queues.length}</span> total {queues.length === 1 ? "queue" : "queues"}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{totalServedToday}</span> served today
                        </span>
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
                                onClick={() => { setCreateError(null); setShowCreate(true); }}
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
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {queues.map((q) => (
                                <QueueCard
                                    key={q.id}
                                    queue={q}
                                    branchType={isHotelDineBranch ? "dine" : branchType}
                                    onToggled={() => { loadQueues(false); }}
                                />
                            ))}
                        </div>

                        {/* ── Pagination ── */}
                        {total > LIMIT && (
                            <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm mt-6">
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
                    </>
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
                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-6 md:pl-10">
                        <div className={`w-screen ${branchType === "dine" ? "max-w-xl md:max-w-2xl" : "max-w-lg md:max-w-xl"} bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200/80 dark:border-white/10 flex flex-col h-full animate-in slide-in-from-right duration-300 ease-out`}>

                            {/* Sticky Drawer Header */}
                            <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-slate-100 dark:border-white/5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-between gap-4 shrink-0">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className={`w-10 h-10 rounded-xl ${branchType === "dine" ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40" : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40"} flex items-center justify-center shrink-0 shadow-xs`}>
                                        {branchType === "dine" ? (
                                            <Utensils className="w-5 h-5" />
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                                            {branchType === "dine" ? "Setup Dining Floor & Tables" : "Create New Queue"}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                                            {branchType === "dine"
                                                ? "Configure floor zones, table inventory, and guest seating capacity."
                                                : "Define a new service lane for this session."}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 space-y-5">
                                    {createError && (
                                        <EntitlementLimitNotice
                                            message={createError}
                                            onContactSales={() => setShowContactSales(true)}
                                        />
                                    )}

                                    {/* ── Floor / Queue Name ── */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                            {branchType === "dine" ? "Floor or Dining Section Name" : "Queue Name"}
                                        </label>
                                        <input
                                            ref={nameRef}
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder={branchType === "dine" ? "e.g. Main Dining Room, Rooftop Terrace, Patio" : "e.g. Counter 1, Desk A"}
                                            required
                                            maxLength={40}
                                            className="w-full rounded-xl border border-slate-200 dark:border-white/10 shadow-xs bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                        />
                                    </div>

                                    {branchType !== "dine" && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Open Time</label>
                                                <input
                                                    type="time"
                                                    value={newOpenTime}
                                                    onChange={(e) => setNewOpenTime(e.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 shadow-xs bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Close Time</label>
                                                <input
                                                    type="time"
                                                    value={newCloseTime}
                                                    onChange={(e) => setNewCloseTime(e.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 shadow-xs bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all"
                                                />
                                                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-tight">
                                                    Defaults to midnight session closing if blank.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Token Identity Grid ── */}
                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Token Prefix</label>
                                                {isPrefixDuplicate ? (
                                                    <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" /> In use
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                        <Check className="w-3 h-3" /> Available
                                                    </span>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                value={newPrefix}
                                                onChange={(e) => setNewPrefix(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
                                                placeholder={branchType === "dine" ? "T" : "A"}
                                                maxLength={3}
                                                className={`w-full rounded-xl border shadow-xs bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-4 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 ${isPrefixDuplicate ? "border-rose-300 dark:border-rose-900/60 focus:border-rose-500 focus:ring-rose-500/20 text-rose-900 dark:text-rose-300" : "border-slate-200 dark:border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20"}`}
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Starting Number</label>
                                                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40">
                                                    Preview: #{newPrefix || (branchType === "dine" ? "T" : "A")}{newStartingSequence || 1}
                                                </span>
                                            </div>
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
                                                className="w-full rounded-xl border border-slate-200 dark:border-white/10 shadow-xs bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                            />
                                        </div>
                                    </div>

                                    {branchType === "dine" ? (
                                        <div className="space-y-4 pt-1">
                                            {/* ── Table Capacity Matrix Header ── */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                                        <Utensils className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                                                            Table Capacity Matrix
                                                        </h4>
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                            Add tables in seconds by seating category.
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/40 shadow-xs">
                                                    {newTables.length} Tables · {totalDineSeats} Seats
                                                </span>
                                            </div>

                                            {/* ── Smart Table Matrix Cards ── */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                {/* 2-Seater Card */}
                                                <div className="p-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all text-center">
                                                    <div className="w-full text-left">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">2-seater</span>
                                                            <span className="text-[10px] font-semibold text-slate-400">Bistro</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">2 seating</p>
                                                    </div>

                                                    {/* Table & Chair Graphic */}
                                                    <div className="my-2.5 flex items-center justify-center h-13 w-full">
                                                        <Table2SeaterIcon className="w-15 h-11" />
                                                    </div>

                                                    {/* Stepper Controls */}
                                                    <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-slate-100 dark:border-white/5">
                                                        <button
                                                            type="button"
                                                            onClick={() => adjustPaxGroup(2, -1)}
                                                            disabled={count2 <= 0}
                                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="text-sm font-bold text-slate-800 dark:text-white min-w-[20px] text-center">
                                                            {count2}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => adjustPaxGroup(2, 1)}
                                                            disabled={newTables.length >= 50}
                                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 4-Seater Card */}
                                                <div className="p-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all text-center ring-1 ring-indigo-500/15">
                                                    <div className="w-full text-left">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">4-seater</span>
                                                            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">Popular</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">4 seating</p>
                                                    </div>

                                                    {/* Table & Chair Graphic */}
                                                    <div className="my-2.5 flex items-center justify-center h-13 w-full">
                                                        <Table4SeaterIcon className="w-15 h-11" />
                                                    </div>

                                                    {/* Stepper Controls */}
                                                    <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-slate-100 dark:border-white/5">
                                                        <button
                                                            type="button"
                                                            onClick={() => adjustPaxGroup(4, -1)}
                                                            disabled={count4 <= 0}
                                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="text-sm font-bold text-slate-800 dark:text-white min-w-[20px] text-center">
                                                            {count4}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => adjustPaxGroup(4, 1)}
                                                            disabled={newTables.length >= 50}
                                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 6-Seater Card */}
                                                <div className="p-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all text-center">
                                                    <div className="w-full text-left">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">6-seater</span>
                                                            <span className="text-[10px] font-semibold text-slate-400">Family</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">6 seating</p>
                                                    </div>

                                                    {/* Table & Chair Graphic */}
                                                    <div className="my-2.5 flex items-center justify-center h-13 w-full">
                                                        <Table6SeaterIcon className="w-15 h-11" />
                                                    </div>

                                                    {/* Stepper Controls */}
                                                    <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-slate-100 dark:border-white/5">
                                                        <button
                                                            type="button"
                                                            onClick={() => adjustPaxGroup(6, -1)}
                                                            disabled={count6 <= 0}
                                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="text-sm font-bold text-slate-800 dark:text-white min-w-[20px] text-center">
                                                            {count6}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => adjustPaxGroup(6, 1)}
                                                            disabled={newTables.length >= 50}
                                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 8-Seater Card */}
                                                <div className="p-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all text-center">
                                                    <div className="w-full text-left">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">8-seater</span>
                                                            <span className="text-[10px] font-semibold text-slate-400">Large Group</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">8 seating</p>
                                                    </div>

                                                    {/* Table & Chair Graphic */}
                                                    <div className="my-2.5 flex items-center justify-center h-13 w-full">
                                                        <Table8SeaterIcon className="w-15 h-11" />
                                                    </div>

                                                    {/* Stepper Controls */}
                                                    <div className="flex items-center justify-center gap-2 w-full pt-2 border-t border-slate-100 dark:border-white/5">
                                                        <button
                                                            type="button"
                                                            onClick={() => adjustPaxGroup(8, -1)}
                                                            disabled={count8 <= 0}
                                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="text-sm font-bold text-slate-800 dark:text-white min-w-[20px] text-center">
                                                            {count8}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => adjustPaxGroup(8, 1)}
                                                            disabled={newTables.length >= 50}
                                                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Quick Venue Presets ── */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-white/5 text-xs">
                                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                                    Quick Venue Presets:
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => applyQuickPreset("bistro")}
                                                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-xs transition-colors cursor-pointer"
                                                    >
                                                        12 Tables (Bistro)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyQuickPreset("standard")}
                                                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-xs transition-colors cursor-pointer"
                                                    >
                                                        20 Tables (Casual)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyQuickPreset("large")}
                                                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-xs transition-colors cursor-pointer"
                                                    >
                                                        32 Tables (Large)
                                                    </button>
                                                </div>
                                            </div>

                                            {/* ── Floors & Dining Areas ── */}
                                            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/90 dark:border-white/10 p-3.5 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                                                            Dining Floors & Areas
                                                        </span>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                            Distribute your {newTables.length} tables across restaurant sections
                                                        </p>
                                                    </div>
                                                    {!isAddingFloor && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsAddingFloor(true)}
                                                            disabled={floorsSetup.length >= 5}
                                                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                        >
                                                            <PlusCircle className="w-3.5 h-3.5" />
                                                            Add Area
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Add Floor Input Bar */}
                                                {isAddingFloor && (
                                                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 animate-in fade-in">
                                                        <Building2 className="w-4 h-4 text-indigo-500 shrink-0 ml-1" />
                                                        <input
                                                            type="text"
                                                            value={newFloorInputName}
                                                            onChange={(e) => setNewFloorInputName(e.target.value)}
                                                            placeholder="e.g. First Floor (Up), Terrace, Rooftop..."
                                                            className="flex-1 text-xs font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") {
                                                                    e.preventDefault();
                                                                    addFloorSetup();
                                                                } else if (e.key === "Escape") {
                                                                    setIsAddingFloor(false);
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => addFloorSetup()}
                                                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                                                        >
                                                            Add
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsAddingFloor(false)}
                                                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Floor Chips Grid */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {floorsSetup.map((fl, flIdx) => {
                                                        const floorTables = newTables.filter(t => (t.section || floorsSetup[0].id) === fl.id);
                                                        const isSelected = (activeSetupFloorId === fl.id);
                                                        return (
                                                            <div
                                                                key={fl.id}
                                                                onClick={() => setActiveSetupFloorId(fl.id)}
                                                                className={`p-2.5 rounded-xl border bg-white dark:bg-slate-900/90 flex items-center justify-between gap-2 shadow-xs transition-all cursor-pointer ${isSelected
                                                                        ? "border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/10"
                                                                        : "border-slate-200 dark:border-white/5 hover:border-slate-300"
                                                                    }`}
                                                            >
                                                                <div className="min-w-0 flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400">
                                                                        {flIdx + 1}
                                                                    </div>
                                                                    <div className="truncate">
                                                                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                                            {fl.name}
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                                            {floorTables.reduce((a, b) => a + (Number(b.capacity) || 0), 0)} Seats
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                                    {floorsSetup.length > 1 ? (
                                                                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-white/10">
                                                                            <input
                                                                                type="number"
                                                                                min={0}
                                                                                max={newTables.length}
                                                                                value={floorTables.length}
                                                                                onChange={(e) => handleSetFloorTableCount(fl.id, parseInt(e.target.value) || 0)}
                                                                                className="w-10 text-center text-xs font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                                                                            />
                                                                            <span className="text-[10px] text-slate-400 font-bold">tables</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                                                                            {floorTables.length} tables
                                                                        </span>
                                                                    )}

                                                                    {floorsSetup.length > 1 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeFloorSetup(fl.id)}
                                                                            className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                                                            title="Remove Floor"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Quick Split Action if 2 or more floors */}
                                                {floorsSetup.length > 1 && (
                                                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 dark:border-white/5">
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                            Total: {newTables.length} tables across {floorsSetup.length} floors
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={splitEvenlyAcrossFloors}
                                                            className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/60 dark:border-indigo-800/40 transition-all cursor-pointer flex items-center gap-1"
                                                        >
                                                            <ArrowRightLeft className="w-3 h-3" />
                                                            Split Evenly
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Live Summary Card (from UI Mockup) ── */}
                                            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-white/10 shadow-2xs flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                                            Live Summary
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-normal">
                                                            Based on current inputs
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                        {newTables.length} Tables · {totalDineSeats} Seats
                                                    </span>
                                                </div>
                                            </div>

                                            {/* ── Progressive Disclosure Accordion for Custom Table Names ── */}
                                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-slate-900/60">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCustomTableList(prev => !prev)}
                                                    className="w-full flex items-center justify-between p-3.5 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/80 transition-colors cursor-pointer text-left"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                            Configure Custom Table Names & Booths
                                                        </span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                            {newTables.length} tables
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                        <span>{showCustomTableList ? "Hide individual tables" : "Edit individual tables"}</span>
                                                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showCustomTableList ? "rotate-180" : ""}`} />
                                                    </div>
                                                </button>

                                                {showCustomTableList && (
                                                    <div className="p-3 space-y-2 border-t border-slate-200 dark:border-white/10 animate-in fade-in duration-200">
                                                        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                                                            {newTables.map((tbl, idx) => (
                                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-50/60 dark:bg-slate-800/80 p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
                                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                        <div className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-[11px] font-black shrink-0">
                                                                            T{tbl.id}
                                                                        </div>
                                                                        <input
                                                                            type="text"
                                                                            value={tbl.name}
                                                                            onChange={(e) => updateTable(idx, { name: e.target.value })}
                                                                            placeholder={`Table ${tbl.id}`}
                                                                            className="flex-1 min-w-[70px] px-2 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                                                                        />

                                                                        {/* Floor Dropdown if multiple floors */}
                                                                        {floorsSetup.length > 1 && (
                                                                            <select
                                                                                value={tbl.section || floorsSetup[0].id}
                                                                                onChange={(e) => moveTableToFloor(idx, e.target.value)}
                                                                                className="text-[10px] font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-1.5 py-1 rounded-md border border-slate-200 dark:border-white/10 hover:border-indigo-400 focus:outline-none cursor-pointer max-w-[120px] truncate"
                                                                                title="Floor"
                                                                            >
                                                                                {floorsSetup.map(f => (
                                                                                    <option key={f.id} value={f.id}>
                                                                                        {f.name}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0">Pax:</span>
                                                                            <div className="flex items-center gap-0.5">
                                                                                {[2, 4, 6, 8, 10].map(cap => (
                                                                                    <button
                                                                                        key={cap}
                                                                                        type="button"
                                                                                        onClick={() => updateTable(idx, { capacity: cap })}
                                                                                        className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors ${tbl.capacity === cap
                                                                                                ? "bg-indigo-600 text-white shadow-xs font-black"
                                                                                                : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200/60 dark:border-white/5"
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
                                                                            className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                                                            title="Remove Table"
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
                                                            disabled={newTables.length >= 50}
                                                            className="w-full py-2 px-3 text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl border border-indigo-200/80 dark:border-indigo-900/40 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                        >
                                                            <PlusCircle className="w-3.5 h-3.5" />
                                                            {newTables.length >= 50 ? "Maximum 50 Tables Reached" : `+ Add Custom Table (${newTables.length}/50)`}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5">Queue Type</label>
                                                <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setNewQueueType("normal"); setNewPrefix("A"); }}
                                                        className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all text-center ${newQueueType === "normal"
                                                                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                                            }`}
                                                    >
                                                        Normal Queue
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewQueueType("service_lines")}
                                                        className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all text-center ${newQueueType === "service_lines"
                                                                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                                            }`}
                                                    >
                                                        Service Lanes
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setNewQueueType("zone"); setNewPrefix("Z"); }}
                                                        className={`py-2 px-2 text-xs font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1 ${newQueueType === "zone"
                                                                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                                            }`}
                                                    >
                                                        <Users className="w-3.5 h-3.5" />
                                                        <span>Zone / Capacity</span>
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

                                            {newQueueType === "zone" && (
                                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40 shrink-0">
                                                            <Users className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900 dark:text-white">Zone Occupancy Model</p>
                                                            <p className="text-[11px] text-purple-700/80 dark:text-purple-400/80 mt-0.5 leading-snug">
                                                                Concurrent capacity model. Staff admits parties up to maximum capacity without binding them to a specific counter.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">
                                                                Max Capacity (Inside)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={500}
                                                                value={newMaxCapacity}
                                                                onChange={(e) => setNewMaxCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                                                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all"
                                                                placeholder="e.g. 15 players"
                                                                required={newQueueType === "zone"}
                                                                disabled={createLoading}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">
                                                                Session Duration (Mins)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min={5}
                                                                max={360}
                                                                value={newZoneDurationMins}
                                                                onChange={(e) => setNewZoneDurationMins(Math.max(5, parseInt(e.target.value) || 30))}
                                                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all"
                                                                placeholder="e.g. 30 mins"
                                                                disabled={createLoading}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Appointment Booking Checkbox */}
                                    {hasAppointmentFeature && (
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
                                    )}
                                </div>

                                {/* Sticky Drawer Footer */}
                                <div className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0">
                                    {branchType === "dine" ? (
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300">
                                                <span className="text-xs font-bold">{newTables.length}</span>
                                                <span className="text-[11px] font-medium text-indigo-600/80 dark:text-indigo-300/80">tables</span>
                                                <span className="text-indigo-300 dark:text-indigo-700">·</span>
                                                <span className="text-xs font-bold">{totalDineSeats}</span>
                                                <span className="text-[11px] font-medium text-indigo-600/80 dark:text-indigo-300/80">seats</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div />
                                    )}
                                    <div className="flex items-center gap-2.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreate(false)}
                                            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-xl transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={
                                                createLoading ||
                                                !newName.trim() ||
                                                isPrefixDuplicate ||
                                                (branchType === "dine" && newTables.length === 0)
                                            }
                                            className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/10 cursor-pointer flex items-center gap-1.5"
                                        >
                                            {createLoading ? (
                                                "Building…"
                                            ) : branchType === "dine" ? (
                                                "Create Dining Floor"
                                            ) : (
                                                "Build Queue"
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {showContactSales && (
                <ContactSalesModal
                    mode="authenticated"
                    onClose={() => setShowContactSales(false)}
                />
            )}
        </div>
    );
}
