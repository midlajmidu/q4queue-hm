"use client";

import React, { useState, useEffect, use, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { queueBusinessDate } from "@/lib/tzformat";
import {
    Calendar,
    Clock,
    User,
    Phone,
    Mail,
    AlertCircle,
    Building2,
    Users,
    ArrowRight,
    Lock,
    Zap,
    Bell,
    Check,
    ChevronRight,
    ChevronLeft,
    CalendarCheck,
    X,
    Copy
} from "lucide-react";
import { toast } from "sonner";
import type {
    BranchDirectoryResponse,
    BranchDirectoryQueue,
    TimeSlot,
    AvailableSlotsResponse,
    AppointmentResponse,
    CustomField
} from "@/types/api";

interface PageProps {
    params: Promise<{ orgSlug: string }>;
}

function formatTime12(timeStr: string | undefined | null): string {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${ampm}`;
}

function formatFullDate(dateStr: string): string {
    try {
        const [y, m, d] = dateStr.split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    } catch {
        return dateStr;
    }
}

function BranchBookingContent({ orgSlug }: { orgSlug: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryQueueId = searchParams.get("queueId") || searchParams.get("queue");

    const [branch, setBranch] = useState<BranchDirectoryResponse | null>(null);
    const [loadingBranch, setLoadingBranch] = useState(true);
    const [selectedQueue, setSelectedQueue] = useState<BranchDirectoryQueue | null>(null);

    // Initial local date (today)
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });

    const [slotsData, setSlotsData] = useState<AvailableSlotsResponse | null>(null);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

    // Dynamic Form values map
    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [bookedAppointment, setBookedAppointment] = useState<AppointmentResponse | null>(null);

    const datesScrollRef = useRef<HTMLDivElement>(null);

    // Fetch Branch Directory
    useEffect(() => {
        setLoadingBranch(true);
        api.getBranchDirectory(orgSlug)
            .then((data) => {
                setBranch(data);
                const eligibleQueues = data.queues;
                let initialQueue: BranchDirectoryQueue | undefined;
                if (queryQueueId) {
                    initialQueue = eligibleQueues.find((q) => q.id === queryQueueId);
                }
                if (!initialQueue && eligibleQueues.length > 0) {
                    initialQueue = eligibleQueues[0];
                }
                if (initialQueue) {
                    setSelectedQueue(initialQueue);
                    const tz = data.timezone || "Asia/Kolkata";
                    const qToday = queueBusinessDate(tz, initialQueue.open_time, initialQueue.close_time);
                    setSelectedDate(qToday);
                } else if (data.today_date) {
                    setSelectedDate(data.today_date);
                }
            })
            .catch((err) => {
                setErrorMsg(err?.detail || "Failed to load appointment booking portal");
            })
            .finally(() => setLoadingBranch(false));
    }, [orgSlug, queryQueueId]);

    // Fetch Slots when Queue or Date changes
    useEffect(() => {
        if (!selectedQueue || !selectedDate) {
            setSlotsData(null);
            setSelectedSlot(null);
            return;
        }

        setLoadingSlots(true);
        setSelectedSlot(null);
        api.getAvailableSlots(selectedQueue.id, selectedDate)
            .then((res) => {
                setSlotsData(res);
                setSelectedSlot(null);
            })
            .catch(() => {
                setSlotsData(null);
                setSelectedSlot(null);
            })
            .finally(() => setLoadingSlots(false));
    }, [selectedQueue, selectedDate]);

    // Compute effective fields strictly based on queue settings
    const effectiveFields = useMemo(() => {
        const rawList: CustomField[] = selectedQueue?.custom_fields && selectedQueue.custom_fields.length > 0
            ? [...selectedQueue.custom_fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            : [
                { id: "default_name", key: "name", label: "Full Name", type: "text", required: true, order: 0 },
                { id: "default_phone", key: "phone", label: "Phone Number", type: "phone", required: true, order: 1 },
                { id: "default_pax", key: "pax", label: "Number of People (Pax)", type: "number", required: false, order: 2 },
            ];

        const hasName = rawList.some(
            (f) => f.key === "name" || f.key === "full_name" || f.label.toLowerCase().includes("name")
        );
        const hasPhone = rawList.some(
            (f) => f.key === "phone" || f.key === "phone_number" || f.type === "phone" || f.label.toLowerCase().includes("phone")
        );

        const result: CustomField[] = [];

        if (!hasName) {
            result.push({
                id: "core_name",
                key: "name",
                label: "Full Name",
                type: "text",
                required: true,
                order: -2,
            });
        }

        for (const f of rawList) {
            const isNameField = f.key === "name" || f.key === "full_name" || f.label.toLowerCase().includes("name");
            const isPhoneField = f.key === "phone" || f.key === "phone_number" || f.type === "phone" || f.label.toLowerCase().includes("phone");
            
            if (isNameField || isPhoneField) {
                result.push({ ...f, required: true });
            } else {
                result.push(f);
            }
        }

        if (!hasPhone) {
            const nameIdx = result.findIndex(
                (f) => f.key === "name" || f.key === "full_name" || f.label.toLowerCase().includes("name")
            );
            result.splice(nameIdx + 1, 0, {
                id: "core_phone",
                key: "phone",
                label: "Phone Number",
                type: "phone",
                required: true,
                order: -1,
            });
        }

        return result;
    }, [selectedQueue?.custom_fields]);

    // Today, Tomorrow, and Max booking date
    const { todayIso, tomorrowIso, maxIso, upcomingDays } = useMemo(() => {
        let baseDateStr = branch?.today_date;
        if (selectedQueue?.open_time && selectedQueue?.close_time) {
            const tz = branch?.timezone || "Asia/Kolkata";
            baseDateStr = queueBusinessDate(tz, selectedQueue.open_time, selectedQueue.close_time);
        }
        const base = baseDateStr ? new Date(baseDateStr + "T00:00:00") : new Date();
        const t = new Date(base);
        const todayIso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;

        const tm = new Date(base);
        tm.setDate(base.getDate() + 1);
        const tomorrowIso = `${tm.getFullYear()}-${String(tm.getMonth() + 1).padStart(2, "0")}-${String(tm.getDate()).padStart(2, "0")}`;

        const maxDays = selectedQueue?.advance_booking_days || 14;
        const mx = new Date(base);
        mx.setDate(base.getDate() + maxDays);
        const maxIso = `${mx.getFullYear()}-${String(mx.getMonth() + 1).padStart(2, "0")}-${String(mx.getDate()).padStart(2, "0")}`;

        // Generate day objects for the horizontal day picker
        const days: Array<{ iso: string; dayName: string; dayNum: number; monthName: string }> = [];
        for (let i = 0; i < Math.min(maxDays + 1, 14); i++) {
            const cur = new Date(base);
            cur.setDate(base.getDate() + i);
            const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
            const dayName = cur.toLocaleDateString("en-US", { weekday: "short" });
            const dayNum = cur.getDate();
            const monthName = cur.toLocaleDateString("en-US", { month: "short" });
            days.push({ iso, dayName, dayNum, monthName });
        }

        return { todayIso, tomorrowIso, maxIso, upcomingDays: days };
    }, [branch?.today_date, branch?.timezone, selectedQueue?.advance_booking_days, selectedQueue?.open_time, selectedQueue?.close_time]);

    const eligibleQueues = useMemo(() => branch?.queues || [], [branch?.queues]);

    const groupedQueues = useMemo(() => {
        const groups: Record<string, BranchDirectoryQueue[]> = {};
        for (const q of eligibleQueues) {
            const bName = q.branch_name || "Services";
            if (!groups[bName]) groups[bName] = [];
            groups[bName].push(q);
        }
        return groups;
    }, [eligibleQueues]);

    const hasMultipleBranches = useMemo(() => Object.keys(groupedQueues).length > 1, [groupedQueues]);

    const handleSelectQueue = (queueId: string) => {
        const q = branch?.queues.find((item) => item.id === queueId);
        if (q) {
            setSelectedQueue(q);
            setSelectedSlot(null);
            setFormValues((prev) => ({
                name: prev.name || prev.full_name,
                phone: prev.phone || prev.phone_number,
            }));
            const tz = branch?.timezone || "Asia/Kolkata";
            const qToday = queueBusinessDate(tz, q.open_time, q.close_time);
            setSelectedDate(qToday);
        }
    };

    const handleScrollDays = (direction: "left" | "right") => {
        if (datesScrollRef.current) {
            const offset = direction === "left" ? -220 : 220;
            datesScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
        }
    };

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQueue || !selectedSlot) {
            setErrorMsg("Please choose an available time slot for your appointment");
            return;
        }

        // Resolve Name
        const nameField = effectiveFields.find(
            (f) => f.key === "name" || f.key === "full_name" || f.label.toLowerCase().includes("name")
        );
        const resolvedName = (nameField ? formValues[nameField.key] : "") || formValues["name"] || "";
        if (!resolvedName || !String(resolvedName).trim()) {
            setErrorMsg("Please enter your full name");
            return;
        }

        // Resolve Phone
        const phoneField = effectiveFields.find(
            (f) => f.key === "phone" || f.key === "phone_number" || f.type === "phone" || f.label.toLowerCase().includes("phone")
        );
        const resolvedPhone = (phoneField ? formValues[phoneField.key] : "") || formValues["phone"] || "";
        if (!resolvedPhone || !String(resolvedPhone).trim()) {
            setErrorMsg("Please enter your phone number");
            return;
        }

        // Resolve Email
        const emailField = effectiveFields.find(
            (f) => f.key === "email" || f.type === "email" || f.label.toLowerCase().includes("email")
        );
        const resolvedEmail = emailField ? formValues[emailField.key] : undefined;

        // Resolve Pax
        const paxField = effectiveFields.find(
            (f) => f.key === "pax" || f.key === "pax_count" || f.label.toLowerCase().includes("pax")
        );
        const resolvedPax = paxField && formValues[paxField.key] ? parseInt(formValues[paxField.key], 10) || 1 : 1;

        // Validate all required fields
        for (const f of effectiveFields) {
            if (f.required) {
                const val = formValues[f.key];
                if (val === undefined || val === null || String(val).trim() === "") {
                    setErrorMsg(`Please fill in required field: ${f.label}`);
                    return;
                }
            }
        }

        const customData: Record<string, any> = {};
        for (const f of effectiveFields) {
            if (formValues[f.key] !== undefined && formValues[f.key] !== "") {
                customData[f.key] = formValues[f.key];
            }
        }

        setSubmitting(true);
        setErrorMsg(null);

        try {
            const res = await api.createPublicAppointment(selectedQueue.id, {
                customer_name: String(resolvedName).trim(),
                customer_phone: String(resolvedPhone).trim(),
                customer_email: resolvedEmail ? String(resolvedEmail).trim() : undefined,
                appointment_date: selectedDate,
                start_time: selectedSlot.start_time,
                pax_count: resolvedPax,
                custom_data: Object.keys(customData).length ? customData : undefined,
            });
            setBookedAppointment(res);
            if (selectedQueue && selectedDate) {
                api.getAvailableSlots(selectedQueue.id, selectedDate)
                    .then((slots) => setSlotsData(slots))
                    .catch(() => {});
            }
        } catch (err: any) {
            setErrorMsg(err?.detail || "Failed to book appointment. Please select another slot.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingBranch) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Loading appointment booking portal...</p>
                </div>
            </div>
        );
    }

    if (!branch || branch.queues.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-white/10 text-center shadow-lg">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Online Booking Unavailable</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        There are currently no services available for online appointment bookings at this location.
                    </p>
                </div>
            </div>
        );
    }

    const parentOrgName = branch.parent_org_name || null;
    const branchName = selectedQueue?.branch_name || branch.branch_name || branch.org_name || "";



    const openTimeDisplay = formatTime12(selectedQueue?.open_time || "09:00");
    const closeTimeDisplay = formatTime12(selectedQueue?.close_time || "18:00");

    return (
        <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between py-4 sm:py-8">
            {/* Main Content Area */}
            <main className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-2 sm:py-4 flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* ── LEFT COLUMN: Interactive Booking Card ── */}
                    <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.04)] dark:shadow-none p-5 sm:p-8">
                        
                        {/* Card Header */}
                        <div className="flex items-start justify-between pb-6 border-b border-slate-100 dark:border-white/5">
                            <div>
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                        Book Appointment
                                    </span>
                                    {(parentOrgName || branchName) && (
                                        <>
                                            <span className="text-slate-300 dark:text-slate-700">•</span>
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                {parentOrgName && <span>{parentOrgName}</span>}
                                                {parentOrgName && branchName && <span className="text-slate-400">/</span>}
                                                {branchName && (
                                                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        {branchName}
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                    Your Time, Simplified
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    {parentOrgName ? (
                                        <>Schedule your visit with <span className="font-semibold text-slate-800 dark:text-slate-200">{parentOrgName}</span> at <span className="font-semibold text-indigo-600 dark:text-indigo-400">{branchName}</span>.</>
                                    ) : (
                                        <>Schedule your visit at <span className="font-semibold text-slate-800 dark:text-slate-200">{branchName}</span>.</>
                                    )}
                                </p>
                            </div>

                            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100/80 dark:border-indigo-900/30">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                    Quick • Easy • Secure
                                </span>
                            </div>
                        </div>

                        {/* Booking Form */}
                        <form onSubmit={handleBook} className="mt-6 space-y-6">
                            {errorMsg && (
                                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/40 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {/* ── STEP 1: Select Service / Queue ── */}
                            <div>
                                <div className="flex items-center gap-2.5 mb-2.5">
                                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                        1
                                    </span>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Select Service / Person
                                    </h3>
                                </div>

                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <select
                                        value={selectedQueue?.id || ""}
                                        onChange={(e) => handleSelectQueue(e.target.value)}
                                        className="w-full pl-10 pr-10 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all cursor-pointer appearance-none"
                                    >
                                        {hasMultipleBranches ? (
                                            Object.entries(groupedQueues).map(([branchName, queues]) => (
                                                <optgroup key={branchName} label={branchName}>
                                                    {queues.map((q) => (
                                                        <option key={q.id} value={q.id}>
                                                            {q.name} ({formatTime12(q.open_time || "09:00")} – {formatTime12(q.close_time || "18:00")})
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))
                                        ) : (
                                            eligibleQueues.map((q) => (
                                                <option key={q.id} value={q.id}>
                                                    {q.name} ({formatTime12(q.open_time || "09:00")} – {formatTime12(q.close_time || "18:00")})
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <ChevronRight className="w-4 h-4 rotate-90" />
                                    </div>
                                </div>

                                {selectedQueue && (
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 ml-1">
                                        Hours: {openTimeDisplay} – {closeTimeDisplay} • {selectedQueue.slot_duration || 15} mins per slot
                                        {selectedQueue.branch_name && hasMultipleBranches ? ` • Location: ${selectedQueue.branch_name}` : ""}
                                    </p>
                                )}
                            </div>

                            {/* ── STEP 2: Select Date ── */}
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                            2
                                        </span>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Select Date
                                        </h3>
                                    </div>

                                    {/* Quick Chips: Today & Tomorrow */}
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedDate(todayIso)}
                                            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                                                selectedDate === todayIso
                                                    ? "bg-indigo-600 text-white shadow-xs"
                                                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                                            }`}
                                        >
                                            Today
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedDate(tomorrowIso)}
                                            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                                                selectedDate === tomorrowIso
                                                    ? "bg-indigo-600 text-white shadow-xs"
                                                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                                            }`}
                                        >
                                            Tomorrow
                                        </button>
                                    </div>
                                </div>

                                {/* Native Date Picker Field */}
                                <div className="relative mb-3">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        min={todayIso}
                                        max={maxIso}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all cursor-pointer"
                                    />
                                </div>

                                {/* Horizontal Day Pills Carousel */}
                                <div className="relative flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => handleScrollDays("left")}
                                        className="hidden sm:flex absolute -left-3 z-10 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 cursor-pointer"
                                        aria-label="Previous days"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>

                                    <div
                                        ref={datesScrollRef}
                                        className="flex gap-2 overflow-x-auto scrollbar-none py-1 w-full px-0.5"
                                    >
                                        {upcomingDays.map((d) => {
                                            const isSelected = selectedDate === d.iso;
                                            return (
                                                <button
                                                    key={d.iso}
                                                    type="button"
                                                    onClick={() => setSelectedDate(d.iso)}
                                                    className={`shrink-0 flex flex-col items-center justify-center w-[74px] py-2.5 rounded-2xl transition-all cursor-pointer border ${
                                                        isSelected
                                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                                                            : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40"
                                                    }`}
                                                >
                                                    <span className={`text-[11px] font-bold ${isSelected ? "text-indigo-100" : "text-slate-400 dark:text-slate-400"}`}>
                                                        {d.dayName}
                                                    </span>
                                                    <span className="text-[13px] font-black leading-tight mt-0.5">
                                                        {d.dayNum} {d.monthName}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleScrollDays("right")}
                                        className="hidden sm:flex absolute -right-3 z-10 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 cursor-pointer"
                                        aria-label="Next days"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* ── STEP 3: Choose Time Slot ── */}
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                            3
                                        </span>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            Choose Time Slot
                                        </h3>
                                    </div>

                                    {selectedSlot && (
                                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                                            <span>{formatTime12(selectedSlot.start_time)} Selected</span>
                                            {selectedSlot.is_next_day && (
                                                <span className="text-[9.5px] font-black bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-1.5 py-0.2 rounded">
                                                    Next Morning
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>

                                {/* Time Slot Grid */}
                                {loadingSlots ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        {Array.from({ length: 8 }).map((_, idx) => (
                                            <div
                                                key={idx}
                                                className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"
                                            />
                                        ))}
                                    </div>
                                ) : !slotsData?.slots || slotsData.slots.length === 0 ? (
                                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 text-center">
                                        <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            No slots available for this date
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            Please choose another date or check back later.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                                        {slotsData.slots.map((slot) => {
                                            const isSelected = selectedSlot?.start_time === slot.start_time;
                                            const s12 = formatTime12(slot.start_time);
                                            const isFull = slot.booked_count >= slot.capacity;

                                            if (!slot.available) {
                                                return (
                                                    <button
                                                        key={slot.start_time}
                                                        type="button"
                                                        disabled
                                                        className="py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 text-slate-300 dark:text-slate-600 text-xs font-medium cursor-not-allowed line-through flex flex-col items-center justify-center gap-0.5"
                                                        title={isFull ? "All capacity booked for this slot" : "Booking closed for this time"}
                                                    >
                                                        <span>{s12}</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 no-underline font-normal">
                                                                {isFull ? "Full" : "Closed"}
                                                            </span>
                                                            {slot.is_next_day && (
                                                                <span className="text-[8px] no-underline font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                                                                    Next Day
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            }

                                            return (
                                                <button
                                                    key={slot.start_time}
                                                    type="button"
                                                    onClick={() => setSelectedSlot(slot)}
                                                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                                                        isSelected
                                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/20"
                                                            : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40"
                                                    }`}
                                                >
                                                    <span>{s12}</span>
                                                    <div className="flex items-center gap-1 flex-wrap justify-center">
                                                        <span className={`text-[9px] font-medium ${isSelected ? "text-indigo-100" : "text-indigo-600 dark:text-indigo-400"}`}>
                                                            Available
                                                        </span>
                                                        {slot.is_next_day && (
                                                            <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/25 text-white" : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"}`}>
                                                                Next Morning
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* ── STEP 4: Your Details ── */}
                            <div>
                                <div className="flex items-center gap-2.5 mb-2.5">
                                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                        4
                                    </span>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Your Details
                                    </h3>
                                </div>

                                <div className="space-y-3">
                                    {effectiveFields.map((field) => {
                                        const isName = field.key === "name" || field.key === "full_name" || field.label.toLowerCase().includes("name");
                                        const isPhone = field.key === "phone" || field.key === "phone_number" || field.type === "phone" || field.label.toLowerCase().includes("phone");
                                        const isEmail = field.key === "email" || field.type === "email" || field.label.toLowerCase().includes("email");
                                        const isPax = field.key === "pax" || field.key === "pax_count" || field.label.toLowerCase().includes("pax");

                                        const val = formValues[field.key] ?? (isPax ? 1 : "");

                                        return (
                                            <div key={field.id || field.key}>
                                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                                                    {field.label} {field.required && "*"}
                                                </label>
                                                <div className="relative">
                                                    {isName ? (
                                                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                    ) : isPhone ? (
                                                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                    ) : isEmail ? (
                                                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                    ) : isPax ? (
                                                        <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                    ) : null}

                                                    {field.type === "textarea" ? (
                                                        <textarea
                                                            required={field.required}
                                                            value={val}
                                                            onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                                            placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                            rows={2}
                                                            className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                                                        />
                                                    ) : field.type === "select" && field.options ? (
                                                        <select
                                                            required={field.required}
                                                            value={val}
                                                            onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                                            className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
                                                        >
                                                            <option value="">Select {field.label}...</option>
                                                            {field.options.map((opt) => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type={field.type === "number" || isPax ? "number" : field.type === "date" ? "date" : field.type === "phone" || isPhone ? "tel" : field.type === "email" || isEmail ? "email" : "text"}
                                                            required={field.required}
                                                            min={field.type === "number" || isPax ? 1 : undefined}
                                                            max={isPax ? 50 : undefined}
                                                            value={val}
                                                            onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                                            placeholder={
                                                                isName ? "Enter your full name" :
                                                                isPhone ? "Enter your phone number" :
                                                                isEmail ? "name@example.com" :
                                                                isPax ? "1" :
                                                                `Enter ${field.label.toLowerCase()}...`
                                                            }
                                                            className={`w-full py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all ${
                                                                isName || isPhone || isEmail || isPax ? "pl-10 pr-3.5" : "px-3.5"
                                                            }`}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Slot Summary Review Card ── */}
                            {selectedSlot && (
                                <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 transition-all ${
                                    selectedSlot.is_next_day
                                        ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-slate-300"
                                }`}>
                                    <Clock className={`w-4 h-4 shrink-0 mt-0.5 ${selectedSlot.is_next_day ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400"}`} />
                                    <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold">
                                                Selected Slot: {formatTime12(selectedSlot.start_time)} – {formatTime12(selectedSlot.end_time)}
                                            </span>
                                            {selectedSlot.is_next_day && (
                                                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                                                    Next Morning / Post-Midnight
                                                </span>
                                            )}
                                        </div>
                                        {selectedSlot.is_next_day ? (
                                            <p className="mt-1 text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                                                Note: This slot occurs after midnight during the overnight operating shift of this date.
                                            </p>
                                        ) : (
                                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                For {selectedDate ? formatFullDate(selectedDate) : "selected date"}.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Big CTA Button ── */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={submitting || !selectedSlot}
                                    className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/25 transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Confirming appointment...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Confirm Appointment</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>

                                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Your information is secure with us.</span>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* ── RIGHT COLUMN: Value Props & Benefits (Desktop) ── */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-6 pt-2">
                        
                        {/* Location Summary Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Booking Location
                                    </span>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        {branchName}
                                    </h3>
                                </div>
                            </div>
                            
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                                {parentOrgName && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400 font-medium">Organization:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{parentOrgName}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 font-medium">Branch:</span>
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">{branchName}</span>
                                </div>
                                {branch.address && (
                                    <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                                        <span className="text-slate-400 font-medium shrink-0">Address:</span>
                                        <span className="text-slate-600 dark:text-slate-300 text-right">{branch.address}</span>
                                    </div>
                                )}
                                {branch.phone_number && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400 font-medium">Phone:</span>
                                        <span className="text-slate-600 dark:text-slate-300">{branch.phone_number}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block mb-1">
                                ANY BUSINESS. ANY APPOINTMENT.
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                                Appointments Made <span className="text-indigo-600 dark:text-indigo-400">Simple</span>
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                                From consultations to meetings, demos to support — Q4Queue helps you manage appointments effortlessly.
                            </p>
                        </div>

                        {/* Feature Points */}
                        <div className="space-y-4 pt-2">
                            
                            <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 shadow-xs flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Quick Booking
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Get an appointment in minutes
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 shadow-xs flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Real-time Availability
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        See only available time slots
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 shadow-xs flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Instant Confirmation
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Get notified via SMS/WhatsApp
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 shadow-xs flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Works for Any Business
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Clinics, offices, salons, education, consultations and more
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Tagline */}
                        <div className="pt-4">
                            <p className="text-lg font-serif italic text-slate-500 dark:text-slate-400">
                                Simpler Queues, Happier People
                            </p>
                        </div>

                        {/* Powered by */}
                        <div className="pt-4 flex items-center gap-1.5 opacity-80">
                            <span className="text-xs text-slate-400">Powered by</span>
                            <Image
                                src="/logo-main-trimmed.png"
                                alt="Q4Queue"
                                width={85}
                                height={20}
                                className="h-4 w-auto object-contain"
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* Subtle Footer */}
            <footer className="w-full text-center py-4 text-xs text-slate-400">
                &copy; {new Date().getFullYear()} {branch.org_name}. All rights reserved.
            </footer>

            {/* Appointment Confirmed Popup Modal */}
            {bookedAppointment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 sm:p-7 text-center animate-in zoom-in-95 duration-200"
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={() => {
                                setBookedAppointment(null);
                                setSelectedSlot(null);
                                setFormValues({});
                            }}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Success Icon */}
                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-2xl mx-auto flex items-center justify-center mb-3.5 shadow-sm">
                            <Check className="w-7 h-7 stroke-[3]" />
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Appointment Confirmed!
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Your appointment has been successfully booked with{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {parentOrgName ? `${parentOrgName} (${branchName})` : branchName}
                            </span>.
                        </p>

                        {/* Reference & Info Card */}
                        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 my-5 text-left border border-slate-100 dark:border-white/5 space-y-2.5">
                            <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-200/60 dark:border-white/10">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Booking Reference
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                                        #{bookedAppointment.booking_reference}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(bookedAppointment.booking_reference);
                                            toast.success("Booking reference copied!");
                                        }}
                                        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition-colors cursor-pointer"
                                        title="Copy reference"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-xs sm:text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Service:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                    {selectedQueue?.name}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-xs sm:text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Date:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {formatFullDate(bookedAppointment.appointment_date)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-xs sm:text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Time Slot:</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                        {formatTime12(bookedAppointment.start_time)} – {formatTime12(bookedAppointment.end_time)}
                                    </span>
                                    {(bookedAppointment.is_next_day || (bookedAppointment.start_time < "06:00" && !!selectedQueue?.open_time && !!selectedQueue?.close_time && selectedQueue.open_time > selectedQueue.close_time)) && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                                            Next Morning
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-xs sm:text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Customer:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                    {bookedAppointment.customer_name}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2.5">
                            <button
                                type="button"
                                onClick={() => router.push(`/appointments/${bookedAppointment.booking_reference}`)}
                                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/25 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <CalendarCheck className="w-4 h-4" />
                                <span>View Live Appointment Pass</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setBookedAppointment(null);
                                    setSelectedSlot(null);
                                    setFormValues({});
                                }}
                                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl text-xs transition-colors cursor-pointer"
                            >
                                Book Another Appointment
                            </button>
                        </div>

                        {/* Powered By */}
                        <div className="pt-4 flex items-center justify-center gap-1.5 opacity-60">
                            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Powered by</span>
                            <Image
                                src="/logo-main-trimmed.png"
                                alt="Q4Queue"
                                width={70}
                                height={16}
                                className="h-3 w-auto object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function BranchBookingPage({ params }: PageProps) {
    const resolvedParams = use(params);
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <BranchBookingContent orgSlug={resolvedParams.orgSlug} />
        </Suspense>
    );
}
