"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import {
    Check,
    CheckCircle2,
    Calendar,
    Clock,
    MapPin,
    User,
    Users,
    Phone,
    AlertCircle,
    QrCode,
    ArrowRight,
    XCircle,
    Copy,
    Share2,
    ExternalLink,
    Building2,
    CalendarPlus,
    RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import type { AppointmentPublicPass, AppointmentStatus } from "@/types/api";

interface PageProps {
    params: Promise<{ bookingRef: string }>;
}

function formatFullDate(dateStr: string): string {
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

const STATUS_CONFIG: Record<
    AppointmentStatus,
    { label: string; badgeCls: string; icon: React.ReactNode; title: string }
> = {
    confirmed: {
        label: "Confirmed",
        badgeCls: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50",
        icon: <Check className="w-8 h-8 stroke-[3]" />,
        title: "Appointment Confirmed",
    },
    checked_in: {
        label: "Checked In & In Line",
        badgeCls: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50",
        icon: <QrCode className="w-8 h-8 stroke-[2.5]" />,
        title: "Checked In — Active in Queue",
    },
    serving: {
        label: "Now Serving",
        badgeCls: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
        icon: <Clock className="w-8 h-8 stroke-[2.5]" />,
        title: "You Are Being Served",
    },
    completed: {
        label: "Completed",
        badgeCls: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        icon: <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />,
        title: "Appointment Completed",
    },
    cancelled: {
        label: "Cancelled",
        badgeCls: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/40",
        icon: <XCircle className="w-8 h-8 stroke-[2.5]" />,
        title: "Appointment Cancelled",
    },
    pending_approval: {
        label: "Pending Review",
        badgeCls: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50",
        icon: <Clock className="w-8 h-8 stroke-[2.5]" />,
        title: "Pending Staff Confirmation",
    },
    no_show: {
        label: "No Show",
        badgeCls: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
        icon: <AlertCircle className="w-8 h-8 stroke-[2.5]" />,
        title: "Missed Appointment",
    },
};

export default function AppointmentPassPage({ params }: PageProps) {
    const resolvedParams = use(params);
    const bookingRef = resolvedParams.bookingRef;
    const router = useRouter();

    const [pass, setPass] = useState<AppointmentPublicPass | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    const loadPass = () => {
        setLoading(true);
        api.getPublicAppointmentPass(bookingRef)
            .then(setPass)
            .catch((err) => setErrorMsg(err?.detail || "Appointment not found"))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadPass();
    }, [bookingRef]);

    const handleCopyRef = () => {
        if (!pass) return;
        navigator.clipboard.writeText(`#${pass.booking_reference}`);
        toast.success("Booking reference copied to clipboard!");
    };

    const handleCopyPassLink = () => {
        if (typeof window !== "undefined") {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Digital pass link copied to clipboard!");
        }
    };

    const generateGoogleCalendarUrl = () => {
        if (!pass) return "";
        try {
            const title = encodeURIComponent(`Appointment: ${pass.queue_name} at ${pass.org_name || "Q4Queue"}`);
            const [y, m, d] = pass.appointment_date.split("-");
            const [sh, sm] = pass.start_time.split(":");
            const [eh, em] = pass.end_time.split(":");
            const startIso = `${y}${m}${d}T${sh}${sm}00`;
            const endIso = `${y}${m}${d}T${eh}${em}00`;
            const details = encodeURIComponent(
                `Booking Reference: #${pass.booking_reference}\nService: ${pass.queue_name}\nCustomer: ${pass.customer_name}\nReception Check-In Required upon arrival.`
            );
            const location = encodeURIComponent(pass.branch_address || pass.org_name || "");
            return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
        } catch {
            return "";
        }
    };

    const handleConfirmCancel = async () => {
        setCancelling(true);
        try {
            await api.publicCancelAppointment(bookingRef);
            toast.success("Appointment cancelled successfully.");
            setShowCancelConfirm(false);
            loadPass();
        } catch (err: any) {
            toast.error(err?.detail || "Cancellation failed");
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-semibold text-slate-500">Loading appointment pass...</p>
            </div>
        );
    }

    if (!pass) {
        return (
            <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-8 max-w-md w-full text-center shadow-xl">
                    <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
                        <AlertCircle className="w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Appointment Pass Not Found</h2>
                    <p className="text-xs text-slate-400 mt-1 mb-6">
                        We couldn't locate an appointment matching reference <span className="font-mono font-bold">#{bookingRef}</span>. Please verify the code and try again.
                    </p>
                    <button
                        onClick={() => router.back()}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const isCheckedIn = pass.status === "checked_in";
    const tokenNum = pass.token_number;
    const tokenPre = pass.token_prefix || "";
    const trackingId = pass.tracking_id;
    const statusCfg = STATUS_CONFIG[pass.status] || STATUS_CONFIG.confirmed;
    const isOvernight = pass.is_next_day || pass.start_time < "06:00";
    const organizationDisplay = pass.parent_org_name
        ? pass.org_name
            ? `${pass.parent_org_name} (${pass.org_name})`
            : pass.parent_org_name
        : pass.org_name;

    return (
        <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 py-10 px-4 sm:px-6 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 sm:p-9 max-w-lg w-full text-center animate-in fade-in zoom-in-95 duration-200">
                
                {/* Top Status Icon */}
                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-sm ${
                    pass.status === "confirmed"
                        ? "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400"
                        : pass.status === "checked_in"
                        ? "bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400"
                        : pass.status === "cancelled"
                        ? "bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400"
                        : pass.status === "pending_approval"
                        ? "bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}>
                    {statusCfg.icon}
                </div>

                {/* Header Title */}
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {statusCfg.title}!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Your appointment has been registered with{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {organizationDisplay || pass.queue_name}
                    </span>.
                </p>

                {/* Error Banner if any */}
                {errorMsg && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-rose-950/60 border border-red-200 dark:border-rose-900/40 rounded-xl flex items-center gap-2 text-xs font-medium text-red-700 dark:text-rose-300 text-left">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* If Checked-In: Live Token Hero Card */}
                {isCheckedIn && (
                    <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 dark:from-indigo-950/40 dark:to-indigo-900/40 border border-indigo-500/30 rounded-2xl p-5 my-5 text-center animate-in zoom-in-95 duration-200">
                        <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider rounded-full">
                            Checked In — You Are in Line!
                        </span>
                        <div className="my-3">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">Your Queue Token</span>
                            <span className="text-5xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
                                {tokenPre}{tokenNum}
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                            Please take a seat in the waiting area. You will be called shortly.
                        </p>
                        {trackingId && (
                            <button
                                onClick={() => router.push(`/track/${trackingId}`)}
                                className="mt-3.5 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <span>View Live Queue Tracker</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Detailed Information Card (Matching Appointment Confirmed Screen) */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 my-6 text-left border border-slate-100 dark:border-white/5 space-y-3">
                    {/* Booking Reference */}
                    <div className="flex justify-between items-center text-sm pb-2 border-b border-slate-100 dark:border-white/5">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Booking Reference:</span>
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-base bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-0.5 rounded-lg">
                                #{pass.booking_reference}
                            </span>
                            <button
                                type="button"
                                onClick={handleCopyRef}
                                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"
                                title="Copy booking reference"
                            >
                                <Copy size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Organization */}
                    {pass.parent_org_name && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Organization:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{pass.parent_org_name}</span>
                        </div>
                    )}

                    {/* Branch */}
                    {pass.org_name && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Branch:</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{pass.org_name}</span>
                        </div>
                    )}

                    {/* Service / Queue */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Service:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{pass.queue_name}</span>
                    </div>

                    {/* Scheduled Date */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Date:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{formatFullDate(pass.appointment_date)}</span>
                    </div>

                    {/* Time Slot */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Time Slot:</span>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {formatTime12(pass.start_time)} – {formatTime12(pass.end_time)}
                            </span>
                            {isOvernight && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40">
                                    Next Morning
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Customer */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Customer:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{pass.customer_name}</span>
                    </div>

                    {/* Phone */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Phone:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-xs">{pass.customer_phone_masked}</span>
                    </div>

                    {/* Pax */}
                    {pass.pax_count && pass.pax_count > 1 && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Party Size:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                <Users size={13} className="text-slate-400" />
                                <span>{pass.pax_count} people</span>
                            </span>
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Status:</span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusCfg.badgeCls}`}>
                            {statusCfg.label}
                        </span>
                    </div>

                    {/* Notes if any */}
                    {pass.notes && (
                        <div className="flex justify-between items-start text-sm pt-2 border-t border-slate-100 dark:border-white/5">
                            <span className="text-slate-500 dark:text-slate-400 shrink-0">Notes:</span>
                            <span className="text-slate-700 dark:text-slate-300 text-right text-xs max-w-[240px] italic">"{pass.notes}"</span>
                        </div>
                    )}

                    {/* Branch Address if available */}
                    {pass.branch_address && (
                        <div className="flex justify-between items-start text-sm pt-2 border-t border-slate-100 dark:border-white/5">
                            <span className="text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
                                <MapPin size={13} /> Location:
                            </span>
                            <span className="text-slate-700 dark:text-slate-300 text-right text-xs max-w-[240px]">{pass.branch_address}</span>
                        </div>
                    )}
                </div>

                {/* Reception Check-In Instruction Box */}
                {!isCheckedIn && pass.status === "confirmed" && (
                    <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/40 rounded-2xl text-center space-y-1.5 mb-6">
                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto">
                            <User className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Reception Check-In Required
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            When you arrive at the branch, please show your booking reference{" "}
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                #{pass.booking_reference}
                            </span>{" "}
                            to the staff at the reception desk. Staff will verify your arrival and issue your live queue token.
                        </p>
                    </div>
                )}

                {/* Pending Approval Notice */}
                {!isCheckedIn && pass.status === "pending_approval" && (
                    <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-center space-y-1.5 mb-6">
                        <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mx-auto">
                            <Clock className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Awaiting Staff Review
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Your appointment request has been submitted and is awaiting confirmation by our team. We will notify you once approved.
                        </p>
                    </div>
                )}

                {/* Primary & Secondary Action Buttons */}
                <div className="space-y-3">
                    {/* Google Calendar Link */}
                    {pass.status !== "cancelled" && (
                        <a
                            href={generateGoogleCalendarUrl()}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <CalendarPlus className="w-4 h-4" />
                            <span>Add to Google Calendar</span>
                        </a>
                    )}

                    {/* Copy Link Button */}
                    <button
                        type="button"
                        onClick={handleCopyPassLink}
                        className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share / Copy Digital Pass Link</span>
                    </button>

                    {/* Book Another Appointment Link */}
                    {pass.org_slug && (
                        <button
                            type="button"
                            onClick={() => router.push(`/${pass.org_slug}/book`)}
                            className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium rounded-2xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span>Book Another Appointment</span>
                            <ExternalLink className="w-3 h-3" />
                        </button>
                    )}

                    {/* Cancel Appointment Action */}
                    {!isCheckedIn && (pass.status === "confirmed" || pass.status === "pending_approval") && (
                        <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                            {showCancelConfirm ? (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/40 space-y-2">
                                    <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                                        Are you sure you want to cancel this appointment?
                                    </p>
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowCancelConfirm(false)}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
                                        >
                                            Keep Booking
                                        </button>
                                        <button
                                            type="button"
                                            disabled={cancelling}
                                            onClick={handleConfirmCancel}
                                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1"
                                        >
                                            {cancelling ? <RefreshCw size={12} className="animate-spin" /> : <XCircle size={12} />}
                                            <span>Yes, Cancel</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowCancelConfirm(true)}
                                    className="w-full py-2 px-3 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Cancel Appointment</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Branding Footer */}
                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-center gap-1.5 opacity-70">
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Powered by</span>
                    <Image
                        src="/logo-main-trimmed.png"
                        alt="Q4Queue"
                        width={75}
                        height={18}
                        className="h-3.5 w-auto object-contain"
                    />
                </div>
            </div>
        </div>
    );
}

