"use client";

import React, { useState, useEffect, use, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import {
    Calendar,
    Clock,
    User,
    Phone,
    Mail,
    CheckCircle2,
    AlertCircle,
    Building2,
    Users,
    ChevronRight,
    ArrowRight,
    Sun,
    Sunset,
    Moon,
    CalendarDays,
    Check,
    Stethoscope,
    Sparkles,
    RefreshCw
} from "lucide-react";
import type {
    BranchDirectoryResponse,
    BranchDirectoryQueue,
    TimeSlot,
    AvailableSlotsResponse,
    AppointmentResponse
} from "@/types/api";

interface PageProps {
    params: Promise<{ orgSlug: string }>;
}

function BranchBookingContent({ orgSlug }: { orgSlug: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryQueueId = searchParams.get("queueId") || searchParams.get("queue");

    const [branch, setBranch] = useState<BranchDirectoryResponse | null>(null);
    const [loadingBranch, setLoadingBranch] = useState(true);
    const [selectedQueue, setSelectedQueue] = useState<BranchDirectoryQueue | null>(null);

    // Initial local date
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });

    const [slotsData, setSlotsData] = useState<AvailableSlotsResponse | null>(null);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

    // Form inputs
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [paxCount, setPaxCount] = useState(1);
    const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [bookedAppointment, setBookedAppointment] = useState<AppointmentResponse | null>(null);

    // Fetch Branch Directory
    useEffect(() => {
        setLoadingBranch(true);
        api.getBranchDirectory(orgSlug)
            .then((data) => {
                setBranch(data);
                if (data.today_date) {
                    setSelectedDate(data.today_date);
                }

                // Pick initial queue from query param or default to first queue
                const eligibleQueues = data.queues.filter(
                    (q) => q.appointment_enabled !== false
                );

                let initialQueue: BranchDirectoryQueue | undefined;
                if (queryQueueId) {
                    initialQueue = eligibleQueues.find((q) => q.id === queryQueueId);
                }
                if (!initialQueue && eligibleQueues.length > 0) {
                    initialQueue = eligibleQueues[0];
                }
                if (initialQueue) {
                    setSelectedQueue(initialQueue);
                }
            })
            .catch((err) => {
                setErrorMsg(err?.detail || "Failed to load branch booking page");
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
            .then(setSlotsData)
            .catch(() => setSlotsData(null))
            .finally(() => setLoadingSlots(false));
    }, [selectedQueue, selectedDate]);

    // Quick Date Pills (Next 7-14 days based on advance_booking_days)
    const datePills = useMemo(() => {
        const pills = [];
        const base = branch?.today_date ? new Date(branch.today_date + "T00:00:00") : new Date();
        const maxDays = selectedQueue?.advance_booking_days || 7;
        const count = Math.min(Math.max(maxDays, 7), 14);

        for (let i = 0; i < count; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const isToday = i === 0;
            const isTomorrow = i === 1;
            const weekday = isToday ? "Today" : isTomorrow ? "Tmrw" : d.toLocaleDateString("en-US", { weekday: "short" });
            const dayNum = d.getDate();
            const monthName = d.toLocaleDateString("en-US", { month: "short" });

            pills.push({ iso, weekday, dayNum, monthName, isToday });
        }
        return pills;
    }, [branch?.today_date, selectedQueue?.advance_booking_days]);

    // Group slots by time of day
    const groupedSlots = useMemo(() => {
        if (!slotsData?.slots) return { morning: [], afternoon: [], evening: [] };
        const morning: TimeSlot[] = [];
        const afternoon: TimeSlot[] = [];
        const evening: TimeSlot[] = [];

        slotsData.slots.forEach((s) => {
            const hour = parseInt(s.start_time.split(":")[0], 10);
            if (hour < 12) morning.push(s);
            else if (hour < 17) afternoon.push(s);
            else evening.push(s);
        });

        return { morning, afternoon, evening };
    }, [slotsData?.slots]);

    const handleSelectQueue = (queue: BranchDirectoryQueue) => {
        setSelectedQueue(queue);
        setSelectedSlot(null);
        setCustomAnswers({});
    };

    const handleJumpToTomorrow = () => {
        if (datePills.length > 1) {
            setSelectedDate(datePills[1].iso);
        }
    };

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedQueue || !selectedSlot) return;
        if (!name.trim() || !phone.trim()) {
            setErrorMsg("Please enter your full name and phone number");
            return;
        }

        setSubmitting(true);
        setErrorMsg(null);

        try {
            const res = await api.createPublicAppointment(selectedQueue.id, {
                customer_name: name.trim(),
                customer_phone: phone.trim(),
                customer_email: email.trim() || undefined,
                appointment_date: selectedDate,
                start_time: selectedSlot.start_time,
                pax_count: paxCount,
                custom_data: Object.keys(customAnswers).length ? customAnswers : undefined,
            });
            setBookedAppointment(res);
        } catch (err: any) {
            setErrorMsg(err?.detail || "Failed to book appointment. Please choose another slot.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingBranch) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
                        There are currently no queues or doctors open for online appointment bookings at this location.
                    </p>
                </div>
            </div>
        );
    }

    // Confirmation Screen
    if (bookedAppointment) {
        return (
            <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 sm:p-8 max-w-lg w-full text-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-inner">
                        <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full uppercase tracking-wider">
                        Appointment Confirmed
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                        {bookedAppointment.customer_name}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Your appointment has been reserved at <span className="font-semibold text-slate-700 dark:text-slate-300">{branch.org_name}</span>.
                    </p>

                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 my-6 text-left border border-slate-100 dark:border-white/5 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Booking Reference:</span>
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-base">{bookedAppointment.booking_reference}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Doctor / Service:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedQueue?.name}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Date:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{bookedAppointment.appointment_date}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Time Slot:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{bookedAppointment.start_time} - {bookedAppointment.end_time}</span>
                        </div>
                        {bookedAppointment.pax_count > 1 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Party Size:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{bookedAppointment.pax_count} people</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2.5">
                        <button
                            onClick={() => router.push(`/appointments/${bookedAppointment.booking_reference}`)}
                            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all text-sm flex items-center justify-center gap-2"
                        >
                            <span>View Digital Pass & Check-In</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                setBookedAppointment(null);
                                setSelectedSlot(null);
                                setName("");
                                setPhone("");
                            }}
                            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors"
                        >
                            Book Another Appointment
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const eligibleQueues = branch.queues.filter((q) => q.appointment_enabled !== false);

    return (
        <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* ── Branch Hero Header ── */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                <Building2 className="w-7 h-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                                        Online Appointment Booking
                                    </span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                                    {branch.org_name}
                                </h1>
                                {branch.address && (
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        {branch.address}
                                    </p>
                                )}
                            </div>
                        </div>

                        {branch.phone_number && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-100 dark:border-white/5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{branch.phone_number}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Step 1: Doctor / Queue Selector ── */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Step 1</span>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Choose Doctor or Service</h2>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">
                            {eligibleQueues.length} available service{eligibleQueues.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {eligibleQueues.map((q) => {
                            const isSelected = selectedQueue?.id === q.id;
                            return (
                                <button
                                    key={q.id}
                                    type="button"
                                    onClick={() => handleSelectQueue(q)}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                                        isSelected
                                            ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-md shadow-indigo-500/10 scale-[1.01]"
                                            : "border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                            isSelected
                                                ? "bg-indigo-600 text-white shadow-sm"
                                                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                                        }`}>
                                            {q.prefix || "Q"}
                                        </span>
                                        {isSelected && (
                                            <span className="p-1 rounded-full bg-indigo-600 text-white">
                                                <Check className="w-3.5 h-3.5" />
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                                            {q.name}
                                        </h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                            {q.slot_duration || 15} mins per slot
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Step 2: Date & Time Slots ── */}
                {selectedQueue && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 sm:p-8 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Step 2</span>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Select Appointment Date & Time
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Booking for <span className="font-semibold text-slate-700 dark:text-slate-200 capitalize">{selectedQueue.name}</span>
                                </p>
                            </div>

                            {/* Custom Date Input */}
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    min={branch.today_date || new Date().toISOString().split("T")[0]}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="px-3 py-1.5 text-xs sm:text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-slate-800 dark:text-slate-100"
                                />
                            </div>
                        </div>

                        {/* Quick Date Pills */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {datePills.map((pill) => {
                                const isSelected = selectedDate === pill.iso;
                                return (
                                    <button
                                        key={pill.iso}
                                        type="button"
                                        onClick={() => setSelectedDate(pill.iso)}
                                        className={`shrink-0 py-2.5 px-4 rounded-2xl text-center transition-all border ${
                                            isSelected
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 scale-[1.02]"
                                                : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/5 hover:border-indigo-400"
                                        }`}
                                    >
                                        <div className={`text-[11px] font-bold uppercase ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                                            {pill.weekday}
                                        </div>
                                        <div className="text-base font-black mt-0.5">
                                            {pill.dayNum}
                                        </div>
                                        <div className={`text-[10px] font-medium ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                                            {pill.monthName}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Available Slots */}
                        {loadingSlots ? (
                            <div className="py-16 flex flex-col items-center justify-center gap-2">
                                <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs text-slate-500 font-medium">Checking available slots for {selectedDate}...</p>
                            </div>
                        ) : !slotsData?.slots.length ? (
                            <div className="py-10 px-4 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 space-y-3">
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    No available slots found on {selectedDate}.
                                </p>
                                <p className="text-xs text-slate-400">
                                    Slots may be fully booked or the schedule is closed for this date.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleJumpToTomorrow}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                                >
                                    <span>Check Tomorrow</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {/* Morning Slots */}
                                {groupedSlots.morning.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 mb-2.5 uppercase tracking-wider">
                                            <Sun className="w-3.5 h-3.5" />
                                            <span>Morning Slots</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                            {groupedSlots.morning.map((slot) => renderSlotButton(slot, selectedSlot, setSelectedSlot))}
                                        </div>
                                    </div>
                                )}

                                {/* Afternoon Slots */}
                                {groupedSlots.afternoon.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 mb-2.5 uppercase tracking-wider">
                                            <Sunset className="w-3.5 h-3.5" />
                                            <span>Afternoon Slots</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                            {groupedSlots.afternoon.map((slot) => renderSlotButton(slot, selectedSlot, setSelectedSlot))}
                                        </div>
                                    </div>
                                )}

                                {/* Evening Slots */}
                                {groupedSlots.evening.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2.5 uppercase tracking-wider">
                                            <Moon className="w-3.5 h-3.5" />
                                            <span>Evening Slots</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                            {groupedSlots.evening.map((slot) => renderSlotButton(slot, selectedSlot, setSelectedSlot))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Step 3: Customer Details Form ── */}
                {selectedSlot && (
                    <form
                        onSubmit={handleBook}
                        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-3 duration-200 space-y-6"
                    >
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Step 3</span>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Enter Your Details</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Reserving <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedSlot.start_time} - {selectedSlot.end_time}</span> on {selectedDate} with {selectedQueue?.name}
                            </p>
                        </div>

                        {errorMsg && (
                            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/40 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                    Full Name *
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. John Doe"
                                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                    Phone Number *
                                </label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="e.g. 9876543210"
                                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                    Email Address (Optional)
                                </label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="john@example.com"
                                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                    Number of People (Pax)
                                </label>
                                <div className="relative">
                                    <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={paxCount}
                                        onChange={(e) => setPaxCount(parseInt(e.target.value) || 1)}
                                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Custom Fields from Queue Settings */}
                        {selectedQueue?.custom_fields && selectedQueue.custom_fields.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/10">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                    Service Specific Questions
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {selectedQueue.custom_fields.map((f) => (
                                        <div key={f.key}>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                {f.label} {f.required && "*"}
                                            </label>
                                            {f.type === "select" && f.options ? (
                                                <select
                                                    required={f.required}
                                                    value={customAnswers[f.key] || ""}
                                                    onChange={(e) => setCustomAnswers({ ...customAnswers, [f.key]: e.target.value })}
                                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="">Select option...</option>
                                                    {f.options.map((opt) => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                                                    required={f.required}
                                                    value={customAnswers[f.key] || ""}
                                                    onChange={(e) => setCustomAnswers({ ...customAnswers, [f.key]: e.target.value })}
                                                    placeholder={`Enter ${f.label.toLowerCase()}...`}
                                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all text-base flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Reserving your appointment...</span>
                                </>
                            ) : (
                                <span>Confirm Appointment Booking</span>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

function renderSlotButton(
    slot: TimeSlot,
    selectedSlot: TimeSlot | null,
    setSelectedSlot: (s: TimeSlot) => void
) {
    const isSelected = selectedSlot?.start_time === slot.start_time;

    return (
        <button
            key={slot.start_time}
            type="button"
            disabled={!slot.available}
            onClick={() => setSelectedSlot(slot)}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                !slot.available
                    ? "opacity-35 bg-slate-100 dark:bg-slate-800/30 text-slate-400 border-transparent cursor-not-allowed"
                    : isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25 scale-[1.02]"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-white/10 hover:border-indigo-400"
            }`}
        >
            <span>{slot.start_time}</span>
            <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                {slot.available ? "Open" : "Full"}
            </span>
        </button>
    );
}

export default function BranchBookingPage({ params }: PageProps) {
    const resolvedParams = use(params);
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <BranchBookingContent orgSlug={resolvedParams.orgSlug} />
        </Suspense>
    );
}
