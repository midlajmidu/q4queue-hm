"use client";

import React, { useState, useEffect, useCallback, use, useMemo } from "react";
import { api } from "@/lib/api";
import {
    Calendar,
    Clock,
    CheckCircle2,
    UserPlus,
    Search,
    Phone,
    PhoneCall,
    RefreshCw,
    X,
    AlertCircle,
    Trash2,
    CalendarDays,
    Layers,
    CalendarClock,
    Check,
    LayoutList,
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    Plus,
    Users,
    UserCheck,
    Eye
} from "lucide-react";
import { toast } from "sonner";
import type { AppointmentResponse, QueueResponse, SessionResponse } from "@/types/api";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { localTodayStr, nowInTz, queueBusinessDate } from "@/lib/tzformat";
import AppointmentPortalCard from "@/components/AppointmentPortalCard";
import RescheduleAppointmentModal from "@/components/RescheduleAppointmentModal";
import WebRTCCallModal from "@/components/organization-admin/WebRTCCallModal";
import { useAuth } from "@/hooks/useAuth";

interface PageProps {
    params: Promise<{ orgSlug: string }>;
}

type DateTab = "today" | "tomorrow" | "upcoming" | "pending" | "all" | "custom";
type ViewMode = "list" | "slots";

function parseHHMM(str: string): number {
    if (!str) return 0;
    const [h, m] = str.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
}

function formatMinsToHHMM(totalMins: number): string {
    const h = Math.floor(totalMins / 60) % 24;
    const m = totalMins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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

function formatFullDateDisplay(dateStr: string): string {
    try {
        const [y, m, d] = dateStr.split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
}

export default function AppointmentsDashboardPage({ params }: PageProps) {
    const resolvedParams = use(params);
    const orgSlug = resolvedParams.orgSlug;
    const tz = useBranchTimezone();
    const { user, isReadOnly: authReadOnly } = useAuth();
    const isReadOnly = !!authReadOnly || user?.role === "super_admin" || user?.role === "organization_admin";

    const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [activeDateTab, setActiveDateTab] = useState<DateTab>("today");
    const [customDate, setCustomDate] = useState<string>("");
    const [selectedQueueId, setSelectedQueueId] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Operating business date for the active queue/branch.
    // For overnight schedules (e.g. 17:00 -> 04:00), if currently 02:00 AM, returns yesterday's date
    const today = useMemo(() => {
        const activeQ = queues.find((q) => q.id === selectedQueueId);
        if (activeQ?.open_time && activeQ?.close_time) {
            return queueBusinessDate(tz, activeQ.open_time, activeQ.close_time);
        }
        for (const q of queues) {
            if (q.open_time && q.close_time && q.open_time > q.close_time) {
                const qDate = queueBusinessDate(tz, q.open_time, q.close_time);
                if (qDate !== localTodayStr(tz)) {
                    return qDate;
                }
            }
        }
        return localTodayStr(tz);
    }, [queues, selectedQueueId, tz]);

    const tomorrow = useMemo(() => {
        const [y, m, d] = today.split("-").map(Number);
        const next = new Date(y, m - 1, d);
        next.setDate(next.getDate() + 1);
        return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    }, [today]);

    // View mode & Slot schedule state
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [slotDate, setSlotDate] = useState<string>(today);
    const [slotFilter, setSlotFilter] = useState<"all" | "occupied" | "available">("all");
    const [selectedSlotTimeForModal, setSelectedSlotTimeForModal] = useState<string | null>(null);

    // Counts for tabs
    const [counts, setCounts] = useState<{ today: number; tomorrow: number; upcoming: number; pending: number; all: number }>({
        today: 0,
        tomorrow: 0,
        upcoming: 0,
        pending: 0,
        all: 0,
    });

    // Booking Modal
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [modalQueueId, setModalQueueId] = useState<string>("");

    // Calling state (Plivo WebRTC)
    const [callModalOpen, setCallModalOpen] = useState<boolean>(false);
    const [callCustomerPhone, setCallCustomerPhone] = useState<string>("");
    const [callCustomerName, setCallCustomerName] = useState<string>("");
    const [callTokenNumber, setCallTokenNumber] = useState<string>("");
    const [callAppointmentId, setCallAppointmentId] = useState<string>("");
    const [callTokenId, setCallTokenId] = useState<string>("");
    const [callQueueId, setCallQueueId] = useState<string>("");
    const [callOrgId, setCallOrgId] = useState<string | undefined>(undefined);

    const handleCallCustomer = (appt: AppointmentResponse) => {
        if (!appt.customer_phone) {
            toast.error("No phone number available for this customer");
            return;
        }
        setCallCustomerPhone(appt.customer_phone);
        setCallCustomerName(appt.customer_name);
        setCallTokenNumber(appt.token_number ? `${appt.token_prefix || ""}${appt.token_number}` : `#${appt.booking_reference}`);
        setCallAppointmentId(appt.id);
        setCallTokenId(appt.token_id || "");
        setCallQueueId(appt.queue_id || "");
        setCallOrgId(appt.org_id);
        setCallModalOpen(true);
    };
    const [modalDate, setModalDate] = useState<string>(today);
    const [modalSlotTime, setModalSlotTime] = useState<string>("10:00");
    const [modalName, setModalName] = useState("");
    const [modalPhone, setModalPhone] = useState("");
    const [modalNotes, setModalNotes] = useState("");
    const [modalPax, setModalPax] = useState(1);
    const [bookingSubmitting, setBookingSubmitting] = useState(false);

    // Action state
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Sync slotDate & modalDate when today updates to overnight business date
    useEffect(() => {
        setSlotDate((prev) => (prev === localTodayStr(tz) && today !== localTodayStr(tz) ? today : prev));
        setModalDate((prev) => (prev === localTodayStr(tz) && today !== localTodayStr(tz) ? today : prev));
    }, [today, tz]);

    // Session picker modal state
    const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
    const [sessionPickerSessions, setSessionPickerSessions] = useState<SessionResponse[]>([]);
    const [sessionPickerApptId, setSessionPickerApptId] = useState<string | null>(null);
    const [sessionPickerLoading, setSessionPickerLoading] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Determine date params based on viewMode & activeDateTab
            const filterParams: any = {
                queue_id: selectedQueueId || undefined,
                status: selectedStatus || undefined,
                search: searchQuery || undefined,
            };

            if (viewMode === "slots") {
                filterParams.date = slotDate;
            } else {
                if (activeDateTab === "pending") {
                    filterParams.status = "pending_approval";
                } else if (activeDateTab === "today") {
                    filterParams.date = today;
                } else if (activeDateTab === "tomorrow") {
                    filterParams.date = tomorrow;
                } else if (activeDateTab === "upcoming") {
                    filterParams.start_date = tomorrow;
                } else if (activeDateTab === "custom" && customDate) {
                    filterParams.date = customDate;
                }
            }

            const [appts, qList, allAppts] = await Promise.all([
                api.getAppointments(filterParams),
                api.listQueues(),
                api.getAppointments({
                    queue_id: selectedQueueId || undefined,
                }),
            ]);

            setAppointments(appts);
            setQueues(qList);
            if (!modalQueueId && qList.length > 0) {
                setModalQueueId(qList[0].id);
            }

            // Calculate tab badge counts
            const todayC = allAppts.filter((a) => a.appointment_date === today).length;
            const tomorrowC = allAppts.filter((a) => a.appointment_date === tomorrow).length;
            const upcomingC = allAppts.filter((a) => a.appointment_date >= tomorrow).length;
            const pendingC = allAppts.filter((a) => a.status === "pending_approval").length;
            setCounts({
                today: todayC,
                tomorrow: tomorrowC,
                upcoming: upcomingC,
                pending: pendingC,
                all: allAppts.length,
            });
        } catch (err: any) {
            toast.error(err?.detail || "Failed to load appointments");
        } finally {
            setLoading(false);
        }
    }, [viewMode, slotDate, activeDateTab, customDate, selectedQueueId, selectedStatus, searchQuery, today, tomorrow, modalQueueId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const changeSlotDate = (days: number) => {
        try {
            const [y, m, d] = slotDate.split("-").map(Number);
            const dt = new Date(y, m - 1, d);
            dt.setDate(dt.getDate() + days);
            const newDateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
            setSlotDate(newDateStr);
        } catch {
            setSlotDate(today);
        }
    };

    const handleBookIntoSlot = (slotStartTime: string, queueId?: string) => {
        setModalDate(slotDate);
        setModalSlotTime(slotStartTime);
        if (queueId) {
            setModalQueueId(queueId);
        } else if (selectedQueueId) {
            setModalQueueId(selectedQueueId);
        } else if (queues.length > 0) {
            setModalQueueId(queues[0].id);
        }
        setIsBookModalOpen(true);
    };

    interface ScheduleSlot {
        start_time: string;
        end_time: string;
        capacity: number;
        appointments: AppointmentResponse[];
        isOccupied: boolean;
        isFull: boolean;
        is_next_day?: boolean;
    }

    const generatedSlots = useMemo<ScheduleSlot[]>(() => {
        const targetQueue = selectedQueueId ? queues.find((q) => q.id === selectedQueueId) : null;
        let isOvernight = false;
        let startMins = 9 * 60;
        let endMins = 17 * 60;
        let step = 15;
        let defaultCapacity = 1;

        if (targetQueue) {
            const openM = parseHHMM(targetQueue.open_time || "09:00");
            const closeM = parseHHMM(targetQueue.close_time || "17:00");
            isOvernight = closeM <= openM;
            startMins = openM;
            endMins = closeM;
            step = Math.max(5, targetQueue.slot_duration || 15);
            defaultCapacity = Math.max(1, targetQueue.slot_capacity || 1);
        } else if (queues.length > 0) {
            let minOpen = 24 * 60;
            let maxClose = 0;
            let minDuration = 60;
            let totalCap = 0;
            let hasOvernight = false;
            let overnightOpen = 24 * 60;
            let overnightClose = 0;

            queues.forEach((q) => {
                const o = parseHHMM(q.open_time || "09:00");
                const c = parseHHMM(q.close_time || "17:00");
                if (c <= o) {
                    hasOvernight = true;
                    if (o < overnightOpen) overnightOpen = o;
                    if (c > overnightClose) overnightClose = c;
                } else {
                    if (o < minOpen) minOpen = o;
                    if (c > maxClose) maxClose = c;
                }
                if (q.slot_duration && q.slot_duration < minDuration) minDuration = q.slot_duration;
                totalCap += (q.slot_capacity || 1);
            });

            if (hasOvernight) {
                isOvernight = true;
                startMins = Math.min(minOpen, overnightOpen);
                endMins = overnightClose;
            } else if (minOpen < maxClose) {
                startMins = minOpen;
                endMins = maxClose;
            }
            step = Math.max(10, minDuration);
            defaultCapacity = Math.max(1, totalCap);
        }

        const apptsByStart = new Map<string, AppointmentResponse[]>();
        appointments.forEach((appt) => {
            if (appt.appointment_date !== slotDate) return;
            if (selectedQueueId && appt.queue_id !== selectedQueueId) return;
            const sTime = (appt.start_time || "").slice(0, 5);
            if (!sTime) return;
            const existing = apptsByStart.get(sTime) || [];
            existing.push(appt);
            apptsByStart.set(sTime, existing);
        });

        const createSlot = (sTime: string, isNextDay: boolean): ScheduleSlot => {
            const slotAppts = apptsByStart.get(sTime) || [];
            const activeAppts = slotAppts.filter((a) => a.status !== "cancelled");
            const sMins = parseHHMM(sTime);
            const eTime = formatMinsToHHMM(sMins + step);
            return {
                start_time: sTime,
                end_time: eTime,
                capacity: defaultCapacity,
                appointments: slotAppts,
                isOccupied: activeAppts.length > 0,
                isFull: activeAppts.length >= defaultCapacity,
                is_next_day: isNextDay,
            };
        };

        if (isOvernight) {
            const seg1Times = new Set<string>();
            const seg2Times = new Set<string>();

            for (let m = startMins; m < 24 * 60; m += step) {
                seg1Times.add(formatMinsToHHMM(m));
            }
            for (let m = 0; m < endMins; m += step) {
                seg2Times.add(formatMinsToHHMM(m));
            }

            apptsByStart.forEach((_, sTime) => {
                const sM = parseHHMM(sTime);
                if (sM < startMins) {
                    seg2Times.add(sTime);
                } else {
                    seg1Times.add(sTime);
                }
            });

            const sortedSeg1 = Array.from(seg1Times).sort();
            const sortedSeg2 = Array.from(seg2Times).sort();

            return [
                ...sortedSeg1.map((t) => createSlot(t, false)),
                ...sortedSeg2.map((t) => createSlot(t, true)),
            ];
        } else {
            const slotStartTimes = new Set<string>();
            for (let m = startMins; m < endMins; m += step) {
                slotStartTimes.add(formatMinsToHHMM(m));
            }
            apptsByStart.forEach((_, sTime) => {
                slotStartTimes.add(sTime);
            });

            const sortedStarts = Array.from(slotStartTimes).sort();
            return sortedStarts.map((sTime) => createSlot(sTime, false));
        }
    }, [selectedQueueId, queues, appointments, slotDate]);

    const displayedSlots = useMemo(() => {
        if (slotFilter === "occupied") {
            return generatedSlots.filter((s) => s.appointments.length > 0);
        }
        if (slotFilter === "available") {
            return generatedSlots.filter((s) => !s.isFull);
        }
        return generatedSlots;
    }, [generatedSlots, slotFilter]);

    // Active modal slot derived from generatedSlots
    const activeModalSlot = useMemo(() => {
        if (!selectedSlotTimeForModal) return null;
        return generatedSlots.find((s) => s.start_time === selectedSlotTimeForModal) || null;
    }, [selectedSlotTimeForModal, generatedSlots]);

    const slotStats = useMemo(() => {
        const total = generatedSlots.length;
        const occupied = generatedSlots.filter((s) => s.isOccupied).length;
        const available = generatedSlots.filter((s) => !s.isFull).length;
        const totalBookings = appointments.filter((a) => a.appointment_date === slotDate && a.status !== "cancelled").length;
        const pendingInDate = appointments.filter((a) => a.appointment_date === slotDate && a.status === "pending_approval").length;
        return { total, occupied, available, totalBookings, pendingInDate };
    }, [generatedSlots, appointments, slotDate]);

    // Execute check-in with optional session_id
    const executeCheckIn = async (appointmentId: string, sessionId?: string) => {
        setActionLoadingId(appointmentId);
        try {
            const res = await api.staffCheckInAppointment(appointmentId, sessionId);
            toast.success(`Customer checked in! Assigned Token: ${res.prefix}${res.token_number}`);
            loadData();
        } catch (err: any) {
            toast.error(err?.detail || err?.message || "Check-in failed. Ensure queue session is open.");
        } finally {
            setActionLoadingId(null);
        }
    };

    /**
     * Returns the queue's "business date" string (YYYY-MM-DD) accounting for overnight schedules.
     * For a 17:00–04:00 queue, if it's currently 02:00 on Sept 20, the business date is Sept 19.
     */
    const getQueueBusinessDate = useCallback((queueId?: string): string => {
        if (!queueId) return today;
        const queue = queues.find(q => q.id === queueId);
        return queueBusinessDate(tz, queue?.open_time, queue?.close_time);
    }, [queues, today, tz]);

    // Handle Staff Check-In — check for multiple sessions first
    const handleCheckIn = async (appointmentId: string, appointmentDate?: string, queueId?: string) => {
        if (isReadOnly) return;
        // Use business date (handles overnight queues where 01:30 AM on Sept 20 is still "Sept 19 session")
        const businessToday = getQueueBusinessDate(queueId);
        if (appointmentDate && appointmentDate !== businessToday) {
            toast.error(`Cannot check in: this appointment is scheduled for ${appointmentDate}. Today's active session is for ${businessToday}.`);
            return;
        }
        if (!queueId) {
            await executeCheckIn(appointmentId);
            return;
        }
        // Fetch active sessions using business date (not calendar date) — critical for overnight queues
        setSessionPickerLoading(true);
        try {
            const sessionsResp = await api.listQueueSessions(queueId, 20, 0, businessToday);
            const activeSessions = (sessionsResp.items || []).filter(s => s.is_active);
            if (activeSessions.length <= 1) {
                // 0 or 1 active session — proceed directly (backend will handle missing session error)
                await executeCheckIn(appointmentId, activeSessions[0]?.id);
            } else {
                // Multiple active sessions — show picker modal
                setSessionPickerApptId(appointmentId);
                setSessionPickerSessions(activeSessions);
                setSessionPickerOpen(true);
            }
        } catch {
            // Fallback: try without explicit session_id
            await executeCheckIn(appointmentId);
        } finally {
            setSessionPickerLoading(false);
        }
    };

    // Confirm session selection from picker modal
    const handleSessionPickerConfirm = async (sessionId: string) => {
        setSessionPickerOpen(false);
        if (!sessionPickerApptId) return;
        await executeCheckIn(sessionPickerApptId, sessionId);
        setSessionPickerApptId(null);
        setSessionPickerSessions([]);
    };

    const [rescheduleAppt, setRescheduleAppt] = useState<AppointmentResponse | null>(null);

    // Handle Permanent Deletion
    const handleDeleteAppointment = async (appointmentId: string, customerName: string) => {
        if (isReadOnly) return;
        if (!confirm(`Permanently delete appointment for ${customerName}? This action cannot be undone.`)) return;
        setActionLoadingId(appointmentId);
        try {
            await api.deleteAppointment(appointmentId);
            toast.success("Appointment deleted successfully");
            loadData();
        } catch (err: any) {
            toast.error(err?.detail || err?.message || "Failed to delete appointment");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Staff Cancellation
    const handleCancelAppointment = async (appointmentId: string, customerName: string) => {
        if (isReadOnly) return;
        if (!confirm(`Cancel appointment for ${customerName}?`)) return;
        setActionLoadingId(appointmentId);
        try {
            await api.updateAppointment(appointmentId, { status: "cancelled" });
            toast.success("Appointment cancelled");
            loadData();
        } catch (err: any) {
            toast.error(err?.detail || "Failed to cancel appointment");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Staff Approval
    const handleApproveAppointment = async (appointmentId: string, customerName: string) => {
        if (isReadOnly) return;
        setActionLoadingId(appointmentId);
        try {
            await api.approveAppointment(appointmentId);
            toast.success(`Appointment for ${customerName} approved!`);
            loadData();
        } catch (err: any) {
            toast.error(err?.detail || err?.message || "Failed to approve appointment");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Staff Rejection
    const handleRejectAppointment = async (appointmentId: string, customerName: string) => {
        if (isReadOnly) return;
        if (!confirm(`Reject appointment for ${customerName}?`)) return;
        setActionLoadingId(appointmentId);
        try {
            await api.rejectAppointment(appointmentId);
            toast.success(`Appointment for ${customerName} rejected`);
            loadData();
        } catch (err: any) {
            toast.error(err?.detail || err?.message || "Failed to reject appointment");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Staff Manual Booking
    const handleCreateBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;
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
                        Front-desk appointment management. Verify arrivals, check in scheduled visitors, or book upcoming slots.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher: List vs Slot Schedule (minimal icon-only) */}
                    <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                viewMode === "list"
                                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                            title="List View"
                            aria-label="List View"
                        >
                            <LayoutList className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setViewMode("slots");
                                setSlotDate(today);
                            }}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                viewMode === "slots"
                                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                            title="Slot Schedule"
                            aria-label="Slot Schedule"
                        >
                            <CalendarRange className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => loadData()}
                        className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-2xs cursor-pointer"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>

                    {isReadOnly ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold text-xs rounded-xl border border-violet-200 dark:border-violet-800/40 shadow-xs">
                            <Eye className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                            <span>Read-Only View</span>
                        </span>
                    ) : (
                        <button
                            onClick={() => setIsBookModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Book Appointment</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Public Booking Portal Link & QR */}
            <AppointmentPortalCard variant="full" />

            {viewMode === "slots" ? (
                <div className="space-y-4">
                    {/* Slot Schedule Control Bar */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm p-4 space-y-4">
                        {/* Top row: Date navigation & Queue Selector */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Date Navigator */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200/60 dark:border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => changeSlotDate(-1)}
                                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                        title="Previous Day"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSlotDate(today)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            slotDate === today
                                                ? "bg-indigo-600 text-white shadow-xs"
                                                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                                        }`}
                                    >
                                        Today
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSlotDate(tomorrow)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            slotDate === tomorrow
                                                ? "bg-indigo-600 text-white shadow-xs"
                                                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                                        }`}
                                    >
                                        Tomorrow
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => changeSlotDate(1)}
                                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                        title="Next Day"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Native date picker */}
                                <input
                                    type="date"
                                    value={slotDate}
                                    onChange={(e) => e.target.value && setSlotDate(e.target.value)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer"
                                />

                                {/* Date Title */}
                                <div className="ml-1 flex items-center gap-2">
                                    <span className="text-sm font-black text-slate-900 dark:text-white">
                                        {formatFullDateDisplay(slotDate)}
                                    </span>
                                    {slotDate === today && (
                                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10.5px] font-black uppercase tracking-wide">
                                            Today
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Service / Queue Selector */}
                            <div className="flex items-center gap-2 min-w-[240px]">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                                    Service:
                                </span>
                                <select
                                    value={selectedQueueId}
                                    onChange={(e) => setSelectedQueueId(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer"
                                >
                                    <option value="">All Services & Queues</option>
                                    {queues.map((q) => (
                                        <option key={q.id} value={q.id}>
                                            {q.name} ({q.slot_duration || 15}m slots)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Bottom row: Metrics & Filter Switcher */}
                        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            {/* Stats */}
                            <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400 font-medium">
                                <div>
                                    <strong className="text-slate-900 dark:text-white font-bold">{slotStats.total}</strong> slots total
                                </div>
                                <div>
                                    <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{slotStats.occupied}</strong> booked ({slotStats.totalBookings} pax)
                                </div>
                                <div>
                                    <strong className="text-slate-900 dark:text-white font-bold">{slotStats.available}</strong> open
                                </div>
                                {slotStats.pendingInDate > 0 && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-lg text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <span>{slotStats.pendingInDate} need approval</span>
                                    </div>
                                )}
                            </div>

                            {/* Slot Filter Buttons */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setSlotFilter("all")}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                        slotFilter === "all"
                                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                                >
                                    All Slots ({slotStats.total})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSlotFilter("occupied")}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                        slotFilter === "occupied"
                                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                                >
                                    Booked ({slotStats.occupied})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSlotFilter("available")}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                        slotFilter === "available"
                                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                                >
                                    Available ({slotStats.available})
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Notice if viewing future/past date */}
                    {slotDate !== today && (
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span>
                                    Viewing schedule for <strong>{formatFullDateDisplay(slotDate)}</strong>. Live visitor check-in will activate when this date is reached.
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSlotDate(today)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
                            >
                                Jump to Today
                            </button>
                        </div>
                    )}

                    {/* Slot Cards Grid */}
                    {loading ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-16 flex flex-col items-center justify-center gap-3">
                            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-slate-400 font-medium">Loading schedule slots...</p>
                        </div>
                    ) : displayedSlots.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-16 text-center">
                            <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                            <p className="text-base font-bold text-slate-800 dark:text-slate-200">No time slots found</p>
                            <p className="text-xs text-slate-400 mt-1">
                                {slotFilter === "occupied"
                                    ? "There are no bookings for this date."
                                    : "No operating slots configured for this service."}
                            </p>
                            {slotFilter !== "all" && (
                                <button
                                    type="button"
                                    onClick={() => setSlotFilter("all")}
                                    className="mt-3 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                                >
                                    Show All Slots
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                            {displayedSlots.map((slot) => {
                                const activeAppts = slot.appointments.filter((a) => a.status !== "cancelled");
                                const hasBookings = activeAppts.length > 0;
                                const pendingCount = activeAppts.filter((a) => a.status === "pending_approval").length;
                                const isFull = slot.isFull;

                                return (
                                    <div
                                        key={slot.start_time}
                                        className={`rounded-2xl border transition-all p-3 flex flex-col justify-between gap-2.5 ${
                                            hasBookings
                                                ? "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-white/15 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700/60"
                                                : "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                                        }`}
                                    >
                                        {/* Top Row: Time + Capacity Pill */}
                                        <div className="flex items-center justify-between gap-1.5">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                                    hasBookings
                                                        ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                                                        : "bg-slate-200/60 dark:bg-slate-800 text-slate-400"
                                                }`}>
                                                    <Clock className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
                                                            {formatTime12(slot.start_time)}
                                                        </span>
                                                        {slot.is_next_day && (
                                                            <span className="px-1 py-0.2 rounded text-[8.5px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                                                                +1D
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Capacity Pill */}
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                                isFull
                                                    ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40"
                                                    : hasBookings
                                                    ? "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40"
                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-white/5"
                                            }`}>
                                                {hasBookings
                                                    ? `${activeAppts.length} / ${slot.capacity}`
                                                    : `0 / ${slot.capacity}`}
                                            </span>
                                        </div>

                                        {/* Bottom Row: Preview & Action Button */}
                                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 gap-2">
                                            {hasBookings ? (
                                                <>
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                                            {activeAppts.slice(0, 3).map((a, i) => (
                                                                <div
                                                                    key={a.id || i}
                                                                    className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900"
                                                                    title={a.customer_name}
                                                                >
                                                                    {a.customer_name?.charAt(0).toUpperCase() || "U"}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {pendingCount > 0 ? (
                                                            <span className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                                {pendingCount} new
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                                                                {activeAppts.length} {activeAppts.length === 1 ? "visitor" : "visitors"}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedSlotTimeForModal(slot.start_time)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            <span>View</span>
                                                        </button>
                                                        {!isFull && !isReadOnly && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleBookIntoSlot(slot.start_time, selectedQueueId || undefined)}
                                                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                                                                title="Add another booking to this slot"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        Available
                                                    </span>
                                                    {!isReadOnly && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleBookIntoSlot(slot.start_time, selectedQueueId || undefined)}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            <Plus className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                                            <span>Book</span>
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <>
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
                                className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer"
                            >
                                <option value="">All Services / Queues</option>
                                {queues.map((q) => (
                                    <option key={q.id} value={q.id}>{q.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Quick Filter Pills */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveDateTab("today");
                                    setCustomDate("");
                                }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                    activeDateTab === "today"
                                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <span>Today</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeDateTab === "today" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                                    {counts.today}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveDateTab("tomorrow");
                                    setCustomDate("");
                                }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                    activeDateTab === "tomorrow"
                                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <span>Tomorrow</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeDateTab === "tomorrow" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                                    {counts.tomorrow}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveDateTab("upcoming");
                                    setCustomDate("");
                                }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                    activeDateTab === "upcoming"
                                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <span>Upcoming</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeDateTab === "upcoming" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                                    {counts.upcoming}
                                </span>
                            </button>
                            {counts.pending > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveDateTab("pending");
                                        setCustomDate("");
                                    }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                        activeDateTab === "pending"
                                            ? "bg-amber-500 text-white shadow-xs"
                                            : "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"
                                    }`}
                                >
                                    <span>Needs Approval</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeDateTab === "pending" ? "bg-white text-amber-700" : "bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200"}`}>
                                        {counts.pending}
                                    </span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveDateTab("all");
                                    setCustomDate("");
                                }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                    activeDateTab === "all"
                                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <span>All Dates</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeDateTab === "all" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                                    {counts.all}
                                </span>
                            </button>
                        </div>

                        {/* Specific Date Picker */}
                        <div className="flex items-center gap-1.5">
                            <input
                                type="date"
                                value={customDate}
                                onChange={(e) => {
                                    setCustomDate(e.target.value);
                                    if (e.target.value) {
                                        setActiveDateTab("custom");
                                    } else {
                                        setActiveDateTab("today");
                                    }
                                }}
                                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer"
                                title="Pick specific date"
                            />
                            {customDate && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCustomDate("");
                                        setActiveDateTab("today");
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="Reset to today"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Status Filter */}
                        <div>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:outline-none cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                <option value="pending_approval">Pending Approval</option>
                                <option value="confirmed">Confirmed (Upcoming)</option>
                                <option value="checked_in">Checked In</option>
                                <option value="serving">Serving</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="no_show">No Show</option>
                            </select>
                        </div>
                    </div>

                    {/* Context Reminder Banner for Future or Pending dates */}
                    {activeDateTab === "pending" ? (
                        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>
                                    Viewing <strong>{counts.pending} appointment(s)</strong> awaiting your approval. Click <strong>Approve</strong> to confirm the booking and lock the slot.
                                </span>
                            </div>
                        </div>
                    ) : activeDateTab !== "today" && (
                        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span>
                                    You are currently viewing <strong>{activeDateTab === "tomorrow" ? "Tomorrow" : activeDateTab === "upcoming" ? "All Upcoming Dates" : activeDateTab === "custom" ? customDate : "All Dates"}</strong>. Check-in is locked until the appointment date arrives.
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveDateTab("today");
                                    setCustomDate("");
                                }}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
                            >
                                Switch to Today
                            </button>
                        </div>
                    )}

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
                                {activeDateTab !== "today" && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveDateTab("today");
                                            setCustomDate("");
                                        }}
                                        className="mt-3 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                                    >
                                        Back to Today's Arrivals
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10 text-slate-500 uppercase tracking-wider font-bold text-[10.5px]">
                                        <tr>
                                            <th className="py-3.5 px-4">Date & Time</th>
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
                                            const isCancelled = appt.status === "cancelled";
                                            const isPending = appt.status === "pending_approval";
                                            const isToday = appt.appointment_date === today;

                                            return (
                                                <tr key={appt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                                        <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                                                            {appt.start_time.slice(0, 5)} - {appt.end_time.slice(0, 5)}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                                                            {appt.appointment_date === today ? (
                                                                <span className="font-bold text-indigo-600 dark:text-indigo-400">Today</span>
                                                            ) : appt.appointment_date === tomorrow ? (
                                                                <span className="font-bold text-blue-600 dark:text-blue-400">Tomorrow</span>
                                                            ) : (
                                                                appt.appointment_date
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="font-bold text-slate-900 dark:text-white">{appt.customer_name}</div>
                                                        {appt.customer_phone ? (
                                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                                                                    <Phone className="w-3 h-3 text-slate-400" />
                                                                    <span>{appt.customer_phone}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleCallCustomer(appt);
                                                                        }}
                                                                        className="inline-flex items-center justify-center p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                                                                        title="Call customer via Plivo"
                                                                    >
                                                                        <PhoneCall className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                                {Boolean(appt.call_count && appt.call_count > 0) && (
                                                                    <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium" title={`Last called: ${appt.last_called_at || "recently"}`}>
                                                                        <PhoneCall className="w-2.5 h-2.5 shrink-0" />
                                                                        <span>
                                                                            {appt.call_count} call{(appt.call_count ?? 0) > 1 ? "s" : ""} • {Math.floor((appt.total_call_duration_seconds || 0) / 60)}m {(appt.total_call_duration_seconds || 0) % 60}s
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-slate-400">No phone</div>
                                                        )}
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
                                                                isPending
                                                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"
                                                                    : isCheckedIn
                                                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40"
                                                                    : isServing
                                                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40"
                                                                    : isDone
                                                                    ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                                                    : isConfirmed
                                                                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40"
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
                                                        <div className="flex items-center justify-end gap-2">
                                                            {isReadOnly ? (
                                                                <span className="text-xs font-semibold text-slate-400 capitalize">
                                                                    {isCheckedIn ? (
                                                                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold inline-flex items-center gap-1">
                                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                                            <span>In Live Queue</span>
                                                                        </span>
                                                                    ) : (
                                                                        appt.status.replace("_", " ")
                                                                    )}
                                                                </span>
                                                            ) : isPending ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <button
                                                                        onClick={() => handleApproveAppointment(appt.id, appt.customer_name)}
                                                                        disabled={actionLoadingId === appt.id}
                                                                        className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                                                        title="Approve appointment"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                                        <span>{actionLoadingId === appt.id ? "Approving..." : "Approve"}</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRejectAppointment(appt.id, appt.customer_name)}
                                                                        disabled={actionLoadingId === appt.id}
                                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                                                        title="Reject Appointment"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ) : isConfirmed ? (
                                                                isToday ? (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleCheckIn(appt.id, appt.appointment_date, appt.queue_id)}
                                                                            disabled={actionLoadingId === appt.id || sessionPickerLoading}
                                                                            className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                                                            title="Admit customer into active queue"
                                                                        >
                                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                                            <span>{actionLoadingId === appt.id ? "Checking in..." : "Check In"}</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleCancelAppointment(appt.id, appt.customer_name)}
                                                                            disabled={actionLoadingId === appt.id}
                                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                                                            title="Cancel Appointment"
                                                                        >
                                                                            <X className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span
                                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10"
                                                                            title={`Check-in is locked until ${appt.appointment_date}`}
                                                                        >
                                                                            <Calendar className="w-3 h-3 text-slate-400" />
                                                                            <span>Scheduled</span>
                                                                        </span>
                                                                        <button
                                                                            onClick={() => handleCancelAppointment(appt.id, appt.customer_name)}
                                                                            disabled={actionLoadingId === appt.id}
                                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                                                            title="Cancel Booking"
                                                                        >
                                                                            <X className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                )
                                                            ) : isCheckedIn ? (
                                                                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold inline-flex items-center gap-1">
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    <span>In Live Queue</span>
                                                                </span>
                                                            ) : isCancelled ? (
                                                                <span className="text-rose-400 text-xs font-semibold">Cancelled</span>
                                                            ) : (
                                                                <span className="text-slate-400 text-xs">—</span>
                                                            )}

                                                            {/* Reschedule Button */}
                                                            {!isReadOnly && !isCheckedIn && !isServing && !isDone && (
                                                                <button
                                                                    onClick={() => setRescheduleAppt(appt)}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                                                                    title="Reschedule Appointment"
                                                                >
                                                                    <CalendarClock className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}

                                                            {/* Plivo Call Button */}
                                                            {!isReadOnly && appt.customer_phone && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCallCustomer(appt)}
                                                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                                                                    title="Call customer via Plivo"
                                                                >
                                                                    <PhoneCall className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}

                                                            {/* Delete Button */}
                                                            {!isReadOnly && (
                                                                <button
                                                                    onClick={() => handleDeleteAppointment(appt.id, appt.customer_name)}
                                                                    disabled={actionLoadingId === appt.id}
                                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                                                    title="Delete Appointment"
                                                                >
                                                                    {actionLoadingId === appt.id ? (
                                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                    ) : (
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    )}
                                                                </button>
                                                            )}
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
                </>
            )}

            {/* Manual Staff Booking Modal */}
            {isBookModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Book Appointment (Reception)</h2>
                            <button
                                onClick={() => setIsBookModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
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
                                    placeholder="Special requests, assistance, notes, etc."
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsBookModalOpen(false)}
                                    className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={bookingSubmitting}
                                    className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/25 cursor-pointer"
                                >
                                    {bookingSubmitting ? "Saving..." : "Create Appointment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Session Picker Modal — shown when multiple active sessions exist */}
            {sessionPickerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                                    <Layers className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Select Session</h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Multiple active sessions found — choose which queue to admit this patient into</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setSessionPickerOpen(false); setSessionPickerApptId(null); }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Session list */}
                        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                            {sessionPickerSessions.map((sess, idx) => (
                                <button
                                    key={sess.id}
                                    onClick={() => handleSessionPickerConfirm(sess.id)}
                                    disabled={!!actionLoadingId}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group cursor-pointer text-left"
                                >
                                    {/* Session index badge */}
                                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm shadow-indigo-500/30">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                                            {sess.title || `Session ${idx + 1}`}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {sess.session_date} &bull; {sess.total_issued ?? 0} issued &bull; {sess.total_served ?? 0} served
                                        </p>
                                    </div>
                                    <div className="shrink-0">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Active
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 dark:border-white/10">
                            <button
                                onClick={() => { setSessionPickerOpen(false); setSessionPickerApptId(null); }}
                                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reschedule Modal */}
            <RescheduleAppointmentModal
                isOpen={!!rescheduleAppt}
                onClose={() => setRescheduleAppt(null)}
                appointment={rescheduleAppt}
                onRescheduled={() => loadData()}
            />

            {/* WebRTC Call Modal (Plivo) */}
            <WebRTCCallModal
                isOpen={callModalOpen}
                onClose={() => {
                    setCallModalOpen(false);
                    loadData();
                }}
                customerPhone={callCustomerPhone}
                customerName={callCustomerName}
                tokenNumber={callTokenNumber}
                tokenId={callTokenId || undefined}
                appointmentId={callAppointmentId || undefined}
                queueId={callQueueId || undefined}
                organizationId={callOrgId}
            />

            {/* Slot Details Modal */}
            {activeModalSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-base font-black text-slate-900 dark:text-white">
                                            {formatTime12(activeModalSlot.start_time)} – {formatTime12(activeModalSlot.end_time)}
                                        </h2>
                                        {activeModalSlot.is_next_day && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                                                +1 Day (Early Morning)
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {formatFullDateDisplay(slotDate)} &bull; {activeModalSlot.appointments.filter(a => a.status !== "cancelled").length} of {activeModalSlot.capacity} Booked
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {!isReadOnly && !activeModalSlot.isFull && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleBookIntoSlot(activeModalSlot.start_time, selectedQueueId || undefined);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Book Visitor</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSelectedSlotTimeForModal(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: List of Appointments in Slot */}
                        <div className="p-5 overflow-y-auto space-y-3 flex-1">
                            {activeModalSlot.appointments.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No visitors booked</p>
                                    <p className="text-xs text-slate-400 mt-1">This slot currently has no active appointments.</p>
                                </div>
                            ) : (
                                activeModalSlot.appointments.map((appt) => {
                                    const isNeedsApproval = appt.status === "pending_approval";
                                    const isConfirmed = appt.status === "confirmed";
                                    const isCheckedIn = appt.status === "checked_in";
                                    const isServing = appt.status === "serving";
                                    const isCompleted = appt.status === "completed";
                                    const isCancelled = appt.status === "cancelled";

                                    return (
                                        <div
                                            key={appt.id}
                                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all space-y-3"
                                        >
                                            {/* Customer Header */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                                                        {appt.customer_name?.charAt(0).toUpperCase() || "U"}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                            {appt.customer_name}
                                                        </h4>
                                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                                <span>{appt.customer_phone}</span>
                                                                {appt.customer_phone && !isReadOnly && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleCallCustomer(appt);
                                                                        }}
                                                                        className="inline-flex items-center justify-center p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                                                                        title="Call customer via Plivo"
                                                                    >
                                                                        <PhoneCall className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                                {appt.pax_count > 1 && (
                                                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                                                        &bull; {appt.pax_count} pax
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {Boolean(appt.call_count && appt.call_count > 0) && (
                                                                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium" title={`Last called: ${appt.last_called_at || "recently"}`}>
                                                                    <PhoneCall className="w-2.5 h-2.5 shrink-0" />
                                                                    <span>
                                                                        {appt.call_count} call{(appt.call_count ?? 0) > 1 ? "s" : ""} • {Math.floor((appt.total_call_duration_seconds || 0) / 60)}m {(appt.total_call_duration_seconds || 0) % 60}s
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Status Badge */}
                                                <div className="shrink-0">
                                                    {isNeedsApproval && (
                                                        <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 text-[11px] font-bold">
                                                            Needs Approval
                                                        </span>
                                                    )}
                                                    {isConfirmed && (
                                                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40 text-[11px] font-bold">
                                                            Confirmed
                                                        </span>
                                                    )}
                                                    {isCheckedIn && (
                                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40 text-[11px] font-bold">
                                                            Checked In {appt.token_number ? `(#${appt.token_prefix || ""}${appt.token_number})` : ""}
                                                        </span>
                                                    )}
                                                    {isServing && (
                                                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40 text-[11px] font-bold">
                                                            Serving
                                                        </span>
                                                    )}
                                                    {isCompleted && (
                                                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                                                            Done
                                                        </span>
                                                    )}
                                                    {isCancelled && (
                                                        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                                                            Cancelled
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Meta: Booking Reference & Queue */}
                                            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-400 font-mono">
                                                <span>#{appt.booking_reference}</span>
                                                {appt.queue_name && (
                                                    <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 font-sans text-slate-700 dark:text-slate-300 font-bold text-[10.5px]">
                                                        {appt.queue_name}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Notes if present */}
                                            {appt.notes && (
                                                <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-100 dark:border-white/5 italic">
                                                    &ldquo;{appt.notes}&rdquo;
                                                </p>
                                            )}

                                            {/* Actions Toolbar */}
                                            {isReadOnly ? (
                                                <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-2">
                                                    <span className="text-xs font-semibold text-slate-400">
                                                        {isCheckedIn ? "Active in Live Queue" : "Read-Only View"}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 uppercase tracking-wider">
                                                        View Only
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        {isNeedsApproval && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    disabled={actionLoadingId === appt.id}
                                                                    onClick={() => handleApproveAppointment(appt.id, appt.customer_name)}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                                                                >
                                                                    <Check className="w-3.5 h-3.5" />
                                                                    <span>Approve</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={actionLoadingId === appt.id}
                                                                    onClick={() => handleRejectAppointment(appt.id, appt.customer_name)}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                    <span>Reject</span>
                                                                </button>
                                                            </>
                                                        )}

                                                        {isConfirmed && (
                                                            <button
                                                                type="button"
                                                                disabled={actionLoadingId === appt.id || slotDate !== today}
                                                                onClick={() => handleCheckIn(appt.id, appt.appointment_date, appt.queue_id)}
                                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs ${
                                                                    slotDate === today
                                                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                                                                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                                                }`}
                                                                title={slotDate === today ? "Check in visitor now" : "Check-in only available on appointment date"}
                                                            >
                                                                {actionLoadingId === appt.id ? (
                                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                ) : (
                                                                    <UserCheck className="w-3.5 h-3.5" />
                                                                )}
                                                                <span>Check In Visitor</span>
                                                            </button>
                                                        )}

                                                        {isCheckedIn && (
                                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                <span>Active in Live Queue</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        {appt.customer_phone && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCallCustomer(appt)}
                                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
                                                                title="Call customer via Plivo"
                                                            >
                                                                <PhoneCall className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {!isCheckedIn && !isServing && !isCompleted && !isCancelled && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setRescheduleAppt(appt)}
                                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer"
                                                                title="Reschedule Appointment"
                                                            >
                                                                <CalendarClock className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            disabled={actionLoadingId === appt.id}
                                                            onClick={() => handleDeleteAppointment(appt.id, appt.customer_name)}
                                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                                                            title="Delete Appointment"
                                                        >
                                                            {actionLoadingId === appt.id ? (
                                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
                            <span className="text-xs text-slate-400">
                                Showing bookings for {formatTime12(activeModalSlot.start_time)} – {formatTime12(activeModalSlot.end_time)}
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedSlotTimeForModal(null)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
