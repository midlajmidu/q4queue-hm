"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { api, ApiError } from "@/lib/api";
import { Calendar, Clock, CheckCircle2, UserPlus, Search, Filter, Phone, User, Building2, RefreshCw, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { AppointmentResponse, QueueResponse, AppointmentStatus } from "@/types/api";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { localTodayStr } from "@/lib/tzformat";

interface PageProps {
    params: Promise<{ orgSlug: string }>;
}

export default function AppointmentsDashboardPage({ params }: PageProps) {
    const resolvedParams = use(params);
    const orgSlug = resolvedParams.orgSlug;
    const tz = useBranchTimezone();
    const today = localTodayStr(tz);

    const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedDate, setSelectedDate] = useState<string>(today);
    const [selectedQueueId, setSelectedQueueId] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Modal
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [modalQueueId, setModalQueueId] = useState<string>("");
    const [modalDate, setModalDate] = useState<string>(today);
    const [modalSlotTime, setModalSlotTime] = useState<string>("10:00");
    const [modalName, setModalName] = useState("");
    const [modalPhone, setModalPhone] = useState("");
    const [modalNotes, setModalNotes] = useState("");
    const [modalPax, setModalPax] = useState(1);
    const [bookingSubmitting, setBookingSubmitting] = useState(false);

    // Action state
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [appts, qList] = await Promise.all([
                api.getAppointments({
                    queue_id: selectedQueueId || undefined,
                    date: selectedDate || undefined,
                    status: selectedStatus || undefined,
                    search: searchQuery || undefined,
                }),
                api.listQueues(),
            ]);
            setAppointments(appts);
            setQueues(qList);
            if (!modalQueueId && qList.length > 0) {
                setModalQueueId(qList[0].id);
            }
        } catch (err: any) {
            toast.error(err?.detail || "Failed to load appointments");
        } finally {
            setLoading(false);
        }
    }, [selectedDate, selectedQueueId, selectedStatus, searchQuery, modalQueueId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle Staff Check-In
    const handleCheckIn = async (appointmentId: string) => {
        setActionLoadingId(appointmentId);
        try {
            const res = await api.staffCheckInAppointment(appointmentId);
            toast.success(`Customer checked in! Assigned Token: ${res.prefix}${res.token_number}`);
            loadData();
        } catch (err: any) {
            toast.error(err?.detail || "Check-in failed. Ensure queue session is open.");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Staff Manual Booking
    const handleCreateBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalQueueId || !modalName.trim() || !modalPhone.trim()) return;

        setBookingSubmitting(true);
        try {
            await api.createStaffAppointment({
                queue_id: modalQueueId,
                customer_name: modalName.trim(),
                customer_phone: modalPhone.trim(),
                appointment_date: modalDate,
                start_time: modalSlotTime,
                pax_count: modalPax,
                notes: modalNotes.trim() || undefined,
            });
            toast.success("Appointment booked successfully!");
            setIsBookModalOpen(false);
            setModalName("");
            setModalPhone("");
            setModalNotes("");
            loadData();
        } catch (err: any) {
            toast.error(err?.detail || "Booking failed");
        } finally {
            setBookingSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Appointments & Bookings
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        View, check in, and manage scheduled visitors across all branch queues.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => loadData()}
                        className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition-colors shadow-sm"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                    <button
                        onClick={() => setIsBookModalOpen(true)}
                        className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Book Appointment</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-4 flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search name, phone, or #APT..."
                        className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Queue Filter */}
                <div className="min-w-[160px]">
                    <select
                        value={selectedQueueId}
                        onChange={(e) => setSelectedQueueId(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:outline-none"
                    >
                        <option value="">All Services / Queues</option>
                        {queues.map((q) => (
                            <option key={q.id} value={q.id}>{q.name}</option>
                        ))}
                    </select>
                </div>

                {/* Date Picker */}
                <div>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:outline-none"
                    />
                </div>

                {/* Status Filter */}
                <div>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:outline-none"
                    >
                        <option value="">All Statuses</option>
                        <option value="confirmed">Confirmed (Upcoming)</option>
                        <option value="checked_in">Checked In</option>
                        <option value="serving">Serving</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                    </select>
                </div>

                {/* Quick Today Button */}
                <button
                    type="button"
                    onClick={() => setSelectedDate(today)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                        selectedDate === today
                            ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10"
                    }`}
                >
                    Today
                </button>
            </div>

            {/* Appointments Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-slate-400 font-medium">Loading appointments...</p>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="py-16 text-center">
                        <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-base font-bold text-slate-800 dark:text-slate-200">No appointments found</p>
                        <p className="text-xs text-slate-400 mt-1">There are no bookings matching your selected filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 text-slate-500 uppercase tracking-wider font-bold text-[10.5px]">
                                <tr>
                                    <th className="py-3.5 px-4">Time Slot</th>
                                    <th className="py-3.5 px-4">Customer</th>
                                    <th className="py-3.5 px-4">Service Line</th>
                                    <th className="py-3.5 px-4">Ref Code</th>
                                    <th className="py-3.5 px-4">Status</th>
                                    <th className="py-3.5 px-4">Token</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                                {appointments.map((appt) => {
                                    const isConfirmed = appt.status === "confirmed";
                                    const isCheckedIn = appt.status === "checked_in";
                                    const isServing = appt.status === "serving";
                                    const isDone = appt.status === "completed";

                                    return (
                                        <tr key={appt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-800 dark:text-slate-200 font-mono">
                                                {appt.start_time.slice(0, 5)} - {appt.end_time.slice(0, 5)}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-slate-900 dark:text-white">{appt.customer_name}</div>
                                                <div className="text-[11px] text-slate-400 font-mono">{appt.customer_phone}</div>
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                                {appt.queue_name || "—"}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                {appt.booking_reference}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span
                                                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        isCheckedIn
                                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40"
                                                            : isServing
                                                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40"
                                                            : isDone
                                                            ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                            : isConfirmed
                                                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"
                                                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                                    }`}
                                                >
                                                    {appt.status.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-black text-slate-900 dark:text-white">
                                                {appt.token_number ? `${appt.token_prefix || ""}${appt.token_number}` : "—"}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                {isConfirmed ? (
                                                    <button
                                                        onClick={() => handleCheckIn(appt.id)}
                                                        disabled={actionLoadingId === appt.id}
                                                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-all shadow-sm flex items-center gap-1.5 ml-auto"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span>{actionLoadingId === appt.id ? "Checking in..." : "Check In"}</span>
                                                    </button>
                                                ) : isCheckedIn ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                                        In Live Queue
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Manual Staff Booking Modal */}
            {isBookModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Book Appointment (Reception)</h2>
                            <button
                                onClick={() => setIsBookModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Queue / Service Line *</label>
                                <select
                                    required
                                    value={modalQueueId}
                                    onChange={(e) => setModalQueueId(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-semibold"
                                >
                                    {queues.map((q) => (
                                        <option key={q.id} value={q.id}>{q.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={modalDate}
                                        onChange={(e) => setModalDate(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Slot Time (HH:MM) *</label>
                                    <input
                                        type="time"
                                        required
                                        value={modalSlotTime}
                                        onChange={(e) => setModalSlotTime(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Customer Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={modalName}
                                        onChange={(e) => setModalName(e.target.value)}
                                        placeholder="e.g. Rahul Sharma"
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Customer Phone *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={modalPhone}
                                        onChange={(e) => setModalPhone(e.target.value)}
                                        placeholder="e.g. 9876543210"
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-semibold"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Internal Notes (Optional)</label>
                                <textarea
                                    rows={2}
                                    value={modalNotes}
                                    onChange={(e) => setModalNotes(e.target.value)}
                                    placeholder="Doctor request, special assistance, etc."
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsBookModalOpen(false)}
                                    className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={bookingSubmitting}
                                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/25"
                                >
                                    {bookingSubmitting ? "Saving..." : "Create Appointment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
