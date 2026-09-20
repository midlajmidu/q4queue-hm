"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { AppointmentResponse, AppointmentStatus } from "@/types/api";
import { toast } from "sonner";
import {
    Calendar,
    Clock,
    User,
    Phone,
    PhoneCall,
    Plus,
    Search,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Check,
    X,
    QrCode,
    Users,
    FileText,
    ExternalLink,
    Trash2,
    CalendarClock
} from "lucide-react";

import { useParams } from "next/navigation";
import RescheduleAppointmentModal from "@/components/RescheduleAppointmentModal";
import WebRTCCallModal from "@/components/organization-admin/WebRTCCallModal";

interface QueueAppointmentsTabProps {
    queueId: string;
    sessionId: string;
    sessionDate?: string;
    orgSlug?: string;
    queueName: string;
    canManage: boolean;
    onTokenCreated?: () => void;
}


const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bg: string; border: string }> = {
    pending_approval: { label: "Pending Approval", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-800" },
    confirmed: { label: "Confirmed", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800" },
    checked_in: { label: "Checked In", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-950/40", border: "border-purple-200 dark:border-purple-800" },
    serving: { label: "Serving", color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-200 dark:border-indigo-800" },
    completed: { label: "Completed", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-800" },
    cancelled: { label: "Cancelled", color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-200 dark:border-rose-800" },
    no_show: { label: "No Show", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-200 dark:border-slate-700" }
};

export default function QueueAppointmentsTab({
    queueId,
    sessionId,
    sessionDate,
    orgSlug,
    queueName,
    canManage,
    onTokenCreated
}: QueueAppointmentsTabProps) {
    const params = useParams();
    const branchSlug = orgSlug || (params?.orgSlug as string);
    const unifiedBookingUrl = branchSlug ? `/${branchSlug}/book?queueId=${queueId}` : `/book/${queueId}`;

    const todayStr = React.useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }, []);

    const [selectedDate, setSelectedDate] = useState<string>(sessionDate || todayStr);
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
    const [futureCount, setFutureCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [checkingInId, setCheckingInId] = useState<string | null>(null);

    // Sync selectedDate whenever sessionDate changes or is loaded
    useEffect(() => {
        if (sessionDate) {
            setSelectedDate(sessionDate);
        }
    }, [sessionDate]);


    // Modal state for manual staff booking
    const [showBookModal, setShowBookModal] = useState<boolean>(false);
    const [bookDate, setBookDate] = useState<string>(sessionDate || todayStr);
    const [bookStartTime, setBookStartTime] = useState<string>("10:00");
    const [bookEndTime, setBookEndTime] = useState<string>("10:15");
    const [bookName, setBookName] = useState<string>("");
    const [bookPhone, setBookPhone] = useState<string>("");
    const [bookPax, setBookPax] = useState<number>(1);
    const [bookNotes, setBookNotes] = useState<string>("");
    const [isBooking, setIsBooking] = useState<boolean>(false);

    // Calling state (Plivo WebRTC)
    const [callModalOpen, setCallModalOpen] = useState<boolean>(false);
    const [callCustomerPhone, setCallCustomerPhone] = useState<string>("");
    const [callCustomerName, setCallCustomerName] = useState<string>("");
    const [callTokenNumber, setCallTokenNumber] = useState<string>("");
    const [callAppointmentId, setCallAppointmentId] = useState<string>("");
    const [callTokenId, setCallTokenId] = useState<string>("");
    const [callOrgId, setCallOrgId] = useState<string | undefined>(undefined);

    const handleCallCustomer = (app: AppointmentResponse) => {
        if (!app.customer_phone) {
            toast.error("No phone number available for this customer");
            return;
        }
        setCallCustomerPhone(app.customer_phone);
        setCallCustomerName(app.customer_name);
        setCallTokenNumber(app.token_number ? `${app.token_prefix || ""}${app.token_number}` : `#${app.booking_reference}`);
        setCallAppointmentId(app.id);
        setCallTokenId(app.token_id || "");
        setCallOrgId(app.org_id);
        setCallModalOpen(true);
    };

    const loadAppointments = useCallback(async () => {
        setLoading(true);
        try {
            const [data, allQueueData] = await Promise.all([
                api.getAppointments({
                    queue_id: queueId,
                    date: selectedDate || undefined,
                    status: selectedStatus !== "all" ? (selectedStatus as AppointmentStatus) : undefined
                }),
                api.getAppointments({
                    queue_id: queueId,
                })
            ]);
            setAppointments(data);
            const otherCount = allQueueData.filter(a => selectedDate ? a.appointment_date !== selectedDate : false).length;
            setFutureCount(otherCount);
        } catch (err: any) {
            toast.error(err.message || "Failed to load appointments");
        } finally {
            setLoading(false);
        }
    }, [queueId, selectedDate, selectedStatus]);

    useEffect(() => {
        loadAppointments();
    }, [loadAppointments]);

    const handleCheckIn = async (app: AppointmentResponse) => {
        const currentOpDate = sessionDate || todayStr;
        if (app.appointment_date !== currentOpDate) {
            toast.error(`Cannot check in: this appointment is booked for ${app.appointment_date}, not this session (${currentOpDate}).`);
            return;
        }
        setCheckingInId(app.id);
        try {
            const res = await api.staffCheckInAppointment(app.id, sessionId);
            toast.success(`Checked in ${app.customer_name}! Token #${res.token_number} generated.`);
            await loadAppointments();
            if (onTokenCreated) onTokenCreated();
        } catch (err: any) {
            toast.error(err.message || "Failed to check in appointment");
        } finally {
            setCheckingInId(null);
        }
    };

    const [rescheduleAppt, setRescheduleAppt] = useState<AppointmentResponse | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDeleteAppointment = async (app: AppointmentResponse) => {
        if (!confirm(`Are you sure you want to permanently delete the appointment for ${app.customer_name}?`)) {
            return;
        }
        setDeletingId(app.id);
        try {
            await api.deleteAppointment(app.id);
            toast.success(`Appointment for ${app.customer_name} deleted.`);
            loadAppointments();
        } catch (err: any) {
            toast.error(err?.detail || err?.message || "Failed to delete appointment");
        } finally {
            setDeletingId(null);
        }
    };

    const handleUpdateStatus = async (appId: string, status: AppointmentStatus) => {
        try {
            await api.updateAppointment(appId, { status });
            toast.success(`Appointment status updated to ${status.replace("_", " ")}`);
            loadAppointments();
        } catch (err: any) {
            toast.error(err.message || "Failed to update appointment");
        }
    };

    const handleCreateStaffBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookName.trim() || !bookStartTime || !bookEndTime) {
            toast.error("Please fill in customer name and slot times");
            return;
        }

        setIsBooking(true);
        try {
            await api.createStaffAppointment({
                queue_id: queueId,
                appointment_date: bookDate,
                start_time: bookStartTime,
                end_time: bookEndTime,
                customer_name: bookName.trim(),
                customer_phone: bookPhone.trim() || undefined,
                pax_count: bookPax,
                notes: bookNotes.trim() || undefined,
                status: "confirmed"
            });
            toast.success("Appointment scheduled successfully!");
            setShowBookModal(false);
            setBookName("");
            setBookPhone("");
            setBookNotes("");
            setBookPax(1);
            loadAppointments();
        } catch (err: any) {
            toast.error(err.message || "Failed to create appointment");
        } finally {
            setIsBooking(false);
        }
    };

    // Filter appointments by search query
    const filteredAppointments = appointments.filter((app) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            app.customer_name.toLowerCase().includes(q) ||
            (app.customer_phone && app.customer_phone.toLowerCase().includes(q)) ||
            app.booking_reference.toLowerCase().includes(q)
        );
    });

    const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;
    const checkedInCount = appointments.filter((a) => a.status === "checked_in" || a.status === "serving" || a.status === "completed").length;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header & Metric Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                                <Calendar size={20} />
                            </span>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                Appointments for {queueName}
                            </h2>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Manage bookings, verify arrivals, and merge reservations directly into today's queue line.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowBookModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            <span>New Appointment</span>
                        </button>
                        <a
                            href={unifiedBookingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                            title="Open unified branch booking portal"
                        >
                            <span>Booking Portal</span>
                            <ExternalLink size={14} />
                        </a>
                    </div>
                </div>

                {/* Stat pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-white/5">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Booked</span>
                        <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{appointments.length}</p>
                    </div>
                    <div className="bg-blue-50/60 dark:bg-blue-900/20 p-3 rounded-xl">
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Confirmed</span>
                        <p className="text-xl font-black text-blue-700 dark:text-blue-300 mt-0.5">{confirmedCount}</p>
                    </div>
                    <div className="bg-purple-50/60 dark:bg-purple-900/20 p-3 rounded-xl">
                        <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Checked In</span>
                        <p className="text-xl font-black text-purple-700 dark:text-purple-300 mt-0.5">{checkedInCount}</p>
                    </div>
                    <div className="bg-emerald-50/60 dark:bg-emerald-900/20 p-3 rounded-xl">
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</span>
                        <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                            {appointments.filter((a) => a.status === "completed").length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Quick Session / All Filter */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {sessionDate && (
                            <button
                                type="button"
                                onClick={() => setSelectedDate(sessionDate)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                    selectedDate === sessionDate
                                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                This Session
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setSelectedDate("")}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                !selectedDate
                                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                            All Dates {futureCount > 0 && selectedDate ? `(${futureCount} other)` : ""}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                        <Calendar size={15} className="text-slate-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
                        />
                        {selectedDate && (
                            <button
                                type="button"
                                onClick={() => setSelectedDate("")}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                                title="Show All Dates"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending_approval">Pending Approval</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="checked_in">Checked In</option>
                        <option value="serving">Serving</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    <button
                        onClick={() => loadAppointments()}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        title="Refresh List"
                    >
                        <RefreshCw size={15} className={loading ? "animate-spin text-indigo-500" : ""} />
                    </button>
                </div>

                <div className="relative min-w-[240px]">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search name, phone, ref..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>
            </div>

            {/* Upcoming notice banner if viewing session date and other appointments exist */}
            {selectedDate && futureCount > 0 && (
                <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-indigo-600 shrink-0" />
                        <span>
                            You have <strong>{futureCount}</strong> appointment(s) booked for upcoming dates.
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedDate("")}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                        View All Dates
                    </button>
                </div>
            )}

            {/* Appointment Cards / Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                        <RefreshCw size={24} className="animate-spin text-indigo-500" />
                        <span className="text-xs font-medium text-slate-500">Loading appointments...</span>
                    </div>
                ) : filteredAppointments.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                            <Calendar size={22} />
                        </div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No appointments found</p>
                        <p className="text-xs text-slate-400 max-w-sm">
                            {searchQuery ? "No appointments match your search criteria." : `No appointments scheduled for ${selectedDate || "selected criteria"}.`}
                        </p>
                        {selectedDate && futureCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setSelectedDate("")}
                                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                            >
                                View {futureCount} Upcoming Appointments
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="px-5 py-3.5">Time Slot</th>
                                    <th className="px-5 py-3.5">Reference</th>
                                    <th className="px-5 py-3.5">Customer</th>
                                    <th className="px-5 py-3.5">Status</th>
                                    <th className="px-5 py-3.5">Pax / Notes</th>
                                    <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {filteredAppointments.map((app) => {
                                    const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.confirmed;
                                    const isForThisSession = app.appointment_date === (sessionDate || todayStr);
                                    const canCheckIn = (app.status === "confirmed" || app.status === "pending_approval") && !app.token_id && isForThisSession;

                                    return (
                                        <tr key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                            {/* Time Slot */}
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                                        <Clock size={14} />
                                                    </span>
                                                    <div>
                                                        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                                            {app.start_time.slice(0, 5)} - {app.end_time.slice(0, 5)}
                                                        </span>
                                                        <div className="text-[10px] text-slate-400">{app.appointment_date}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Booking Ref */}
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                                                    #{app.booking_reference}
                                                </span>
                                            </td>

                                            {/* Customer */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                                                        {app.customer_name ? app.customer_name.slice(0, 2).toUpperCase() : "CU"}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 dark:text-slate-100">{app.customer_name}</div>
                                                        {app.customer_phone ? (
                                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                                                    <Phone size={10} />
                                                                    <a href={`tel:${app.customer_phone}`} className="hover:underline">
                                                                        {app.customer_phone}
                                                                    </a>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleCallCustomer(app);
                                                                        }}
                                                                        className="inline-flex items-center justify-center p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                                                                        title="Call customer via Plivo"
                                                                    >
                                                                        <PhoneCall size={12} />
                                                                    </button>
                                                                </div>
                                                                {Boolean(app.call_count && app.call_count > 0) && (
                                                                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium" title={`Last called: ${app.last_called_at || "recently"}`}>
                                                                        <PhoneCall size={9} className="shrink-0" />
                                                                        <span>
                                                                            {app.call_count} call{(app.call_count ?? 0) > 1 ? "s" : ""} • {Math.floor((app.total_call_duration_seconds || 0) / 60)}m {(app.total_call_duration_seconds || 0) % 60}s
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-slate-400">No phone</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                                    {app.status === "completed" && <CheckCircle2 size={12} />}
                                                    {app.status === "cancelled" && <XCircle size={12} />}
                                                    {app.status === "checked_in" && <QrCode size={12} />}
                                                    {cfg.label}
                                                </span>
                                                {app.token_id && (
                                                    <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mt-1">
                                                        Token In Queue
                                                    </div>
                                                )}
                                            </td>

                                            {/* Pax / Notes */}
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1 max-w-[200px]">
                                                    {app.pax_count > 1 && (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                            <Users size={12} /> {app.pax_count} people
                                                        </span>
                                                    )}
                                                    {app.notes ? (
                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={app.notes}>
                                                            {app.notes}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-600 text-[11px]">—</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {canCheckIn ? (
                                                        <button
                                                            onClick={() => handleCheckIn(app)}
                                                            disabled={checkingInId === app.id}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
                                                            title="Check in customer and issue token directly into active session"
                                                        >
                                                            {checkingInId === app.id ? (
                                                                <RefreshCw size={13} className="animate-spin" />
                                                            ) : (
                                                                <Check size={13} />
                                                            )}
                                                            <span>Check In</span>
                                                        </button>
                                                    ) : !isForThisSession && (app.status === "confirmed" || app.status === "pending_approval") && !app.token_id ? (
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-white/10" title={`Check-in only available on ${app.appointment_date}`}>
                                                            Scheduled
                                                        </span>
                                                    ) : null}

                                                    {app.status === "pending_approval" && (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateStatus(app.id, "confirmed")}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                                title="Approve Appointment"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateStatus(app.id, "cancelled")}
                                                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                                title="Decline Appointment"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </>
                                                    )}

                                                    {app.status === "confirmed" && !app.token_id && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(app.id, "cancelled")}
                                                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                            title="Cancel Appointment"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}

                                                    {/* Reschedule Button */}
                                                    {!app.token_id && app.status !== "completed" && app.status !== "cancelled" && (
                                                        <button
                                                            onClick={() => setRescheduleAppt(app)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors cursor-pointer"
                                                            title="Reschedule Appointment"
                                                        >
                                                            <CalendarClock size={14} />
                                                        </button>
                                                    )}

                                                    {/* Plivo Call Button */}
                                                    {app.customer_phone && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCallCustomer(app)}
                                                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors cursor-pointer"
                                                            title="Call customer via Plivo"
                                                        >
                                                            <PhoneCall size={14} />
                                                        </button>
                                                    )}

                                                    <a
                                                        href={`/appointments/${app.booking_reference}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                                        title="View Digital Pass"
                                                    >
                                                        <QrCode size={14} />
                                                    </a>

                                                    {/* Delete Button */}
                                                    <button
                                                        onClick={() => handleDeleteAppointment(app)}
                                                        disabled={deletingId === app.id}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                                        title="Delete Appointment"
                                                    >
                                                        {deletingId === app.id ? (
                                                            <RefreshCw size={14} className="animate-spin" />
                                                        ) : (
                                                            <Trash2 size={14} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* New Appointment Modal */}
            {showBookModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Schedule Appointment</h3>
                                <p className="text-xs text-slate-400 mt-0.5">{queueName}</p>
                            </div>
                            <button
                                onClick={() => setShowBookModal(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateStaffBooking} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={bookDate}
                                    onChange={(e) => setBookDate(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Start Time</label>
                                    <input
                                        type="time"
                                        value={bookStartTime}
                                        onChange={(e) => setBookStartTime(e.target.value)}
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">End Time</label>
                                    <input
                                        type="time"
                                        value={bookEndTime}
                                        onChange={(e) => setBookEndTime(e.target.value)}
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Customer Name *</label>
                                <input
                                    type="text"
                                    value={bookName}
                                    onChange={(e) => setBookName(e.target.value)}
                                    required
                                    placeholder="e.g. John Doe"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={bookPhone}
                                        onChange={(e) => setBookPhone(e.target.value)}
                                        placeholder="+91 9876543210"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Pax</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={bookPax}
                                        onChange={(e) => setBookPax(parseInt(e.target.value) || 1)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Internal Notes</label>
                                <textarea
                                    value={bookNotes}
                                    onChange={(e) => setBookNotes(e.target.value)}
                                    rows={2}
                                    placeholder="Special requests, assistance, notes, etc."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setShowBookModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isBooking}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                                >
                                    {isBooking ? "Saving..." : "Create Booking"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reschedule Modal */}
            <RescheduleAppointmentModal
                isOpen={!!rescheduleAppt}
                onClose={() => setRescheduleAppt(null)}
                appointment={rescheduleAppt}
                onRescheduled={() => loadAppointments()}
            />

            {/* WebRTC Call Modal (Plivo) */}
            <WebRTCCallModal
                isOpen={callModalOpen}
                onClose={() => {
                    setCallModalOpen(false);
                    loadAppointments();
                }}
                customerPhone={callCustomerPhone}
                customerName={callCustomerName}
                tokenNumber={callTokenNumber}
                tokenId={callTokenId || undefined}
                appointmentId={callAppointmentId || undefined}
                queueId={queueId}
                sessionId={sessionId}
                organizationId={callOrgId}
            />
        </div>
    );
}
