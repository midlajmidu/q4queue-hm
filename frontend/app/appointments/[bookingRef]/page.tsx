"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { CheckCircle2, Calendar, Clock, MapPin, User, AlertCircle, QrCode, ArrowRight, XCircle } from "lucide-react";
import type { AppointmentPublicPass } from "@/types/api";

interface PageProps {
    params: Promise<{ bookingRef: string }>;
}

export default function AppointmentPassPage({ params }: PageProps) {
    const resolvedParams = use(params);
    const bookingRef = resolvedParams.bookingRef;
    const router = useRouter();

    const [pass, setPass] = useState<AppointmentPublicPass | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkInResult, setCheckInResult] = useState<{ token_number: number; prefix: string; tracking_id: string } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

    const handleCheckIn = async () => {
        setCheckingIn(true);
        setErrorMsg(null);
        try {
            const res = await api.publicCheckInAppointment(bookingRef);
            setCheckInResult(res);
            loadPass();
        } catch (err: any) {
            setErrorMsg(err?.detail || "Check-in failed. Please speak with reception.");
        } finally {
            setCheckingIn(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel this appointment?")) return;
        try {
            await api.publicCancelAppointment(bookingRef);
            loadPass();
        } catch (err: any) {
            alert(err?.detail || "Cancellation failed");
        }
    };

    const downloadIcs = () => {
        if (!pass) return;
        const icsContent = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Q4Queue//Appointments//EN",
            "BEGIN:VEVENT",
            `SUMMARY:Appointment at ${pass.queue_name}`,
            `DESCRIPTION:Booking Reference: ${pass.booking_reference}`,
            `DTSTART:${pass.appointment_date.replace(/-/g, "")}T${pass.start_time.replace(":", "")}00`,
            `DTEND:${pass.appointment_date.replace(/-/g, "")}T${pass.end_time.replace(":", "")}00`,
            "STATUS:CONFIRMED",
            "END:VEVENT",
            "END:VCALENDAR",
        ].join("\r\n");

        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `appointment-${pass.booking_reference}.ics`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!pass) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200">Appointment Pass Not Found</p>
                    <p className="text-xs text-slate-400 mt-1">Please check your booking reference code.</p>
                </div>
            </div>
        );
    }

    const isCheckedIn = pass.status === "checked_in" || checkInResult != null;
    const tokenNum = checkInResult?.token_number || pass.token_number;
    const tokenPre = checkInResult?.prefix || pass.token_prefix || "";
    const trackingId = checkInResult?.tracking_id || pass.tracking_id;

    return (
        <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 py-10 px-4 sm:px-6">
            <div className="max-w-md mx-auto">
                {/* Digital Pass Ticket Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xl overflow-hidden">
                    {/* Ticket Header */}
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 text-white text-center relative">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-200 block mb-1">
                            Digital Appointment Pass
                        </span>
                        <h1 className="text-2xl font-black tracking-tight">{pass.queue_name}</h1>
                        <p className="text-xs text-indigo-200 font-mono mt-1 font-semibold">Ref: #{pass.booking_reference}</p>
                    </div>

                    {/* Ticket Body */}
                    <div className="p-6 space-y-6">
                        {errorMsg && (
                            <div className="p-3 bg-red-50 dark:bg-rose-950/60 border border-red-200 dark:border-rose-900/40 rounded-xl flex items-center gap-2 text-xs font-medium text-red-700 dark:text-rose-300">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* If checked in, show the Live Token Hero Card! */}
                        {isCheckedIn ? (
                            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-500/30 rounded-2xl p-6 text-center animate-in zoom-in-95 duration-200">
                                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider rounded-full">
                                    Checked In — You Are in Line!
                                </span>
                                <div className="my-3">
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">Your Queue Token</span>
                                    <span className="text-5xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                                        {tokenPre}{tokenNum}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                    Please take a seat in the waiting area. You will be called shortly.
                                </p>
                                {trackingId && (
                                    <button
                                        onClick={() => router.push(`/track/${trackingId}`)}
                                        className="mt-4 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <span>View Live Queue Tracker</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ) : (
                            /* Slot Info Card */
                            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-3">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                    <div>
                                        <p className="text-[11px] text-slate-400 font-medium">Scheduled Date</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{pass.appointment_date}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                    <div>
                                        <p className="text-[11px] text-slate-400 font-medium">Time Slot</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{pass.start_time} - {pass.end_time}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                    <div>
                                        <p className="text-[11px] text-slate-400 font-medium">Visitor</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{pass.customer_name} ({pass.pax_count} pax)</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Check-in CTA Button (If within window) */}
                        {!isCheckedIn && pass.status === "confirmed" && (
                            <div>
                                {pass.can_check_in ? (
                                    <button
                                        onClick={handleCheckIn}
                                        disabled={checkingIn}
                                        className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                                    >
                                        {checkingIn ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Checking in...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-5 h-5" />
                                                <span>📍 I HAVE ARRIVED (CHECK IN)</span>
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-xl text-center">
                                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                            {pass.check_in_window_message || "Check-in will open closer to your appointment time."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Secondary Actions */}
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
                            <button
                                onClick={downloadIcs}
                                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <Calendar className="w-4 h-4" />
                                <span>Add to Google / Apple Calendar (.ics)</span>
                            </button>

                            {!isCheckedIn && pass.status === "confirmed" && (
                                <button
                                    onClick={handleCancel}
                                    className="w-full py-2.5 px-4 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <XCircle className="w-4 h-4" />
                                    <span>Cancel Appointment</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
