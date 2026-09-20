"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { AppointmentResponse, TimeSlot } from "@/types/api";
import { toast } from "sonner";
import { Calendar, Clock, AlertCircle, X, RefreshCw, CalendarClock } from "lucide-react";

interface RescheduleAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: AppointmentResponse | null;
    onRescheduled: () => void;
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

export default function RescheduleAppointmentModal({
    isOpen,
    onClose,
    appointment,
    onRescheduled,
}: RescheduleAppointmentModalProps) {
    const todayIso = React.useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }, []);

    const [selectedDate, setSelectedDate] = useState<string>(todayIso);
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string>("");
    const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Initialize date when appointment changes
    useEffect(() => {
        if (isOpen && appointment) {
            setSelectedDate(appointment.appointment_date || todayIso);
            setSelectedSlot(appointment.start_time?.slice(0, 5) || "");
            setErrorMsg(null);
        }
    }, [isOpen, appointment, todayIso]);

    // Fetch available slots when appointment queue or date changes
    useEffect(() => {
        if (!isOpen || !appointment?.queue_id || !selectedDate) {
            setSlots([]);
            return;
        }

        setLoadingSlots(true);
        setErrorMsg(null);
        api.getAvailableSlots(appointment.queue_id, selectedDate)
            .then((res) => {
                const fetchedSlots = res.slots || [];
                setSlots(fetchedSlots);
                // If previously selected slot is not in fetched slots or unavailable, reset or keep
                const exists = fetchedSlots.some((s) => s.start_time === selectedSlot && s.available);
                if (!exists) {
                    const firstAvail = fetchedSlots.find((s) => s.available);
                    setSelectedSlot(firstAvail ? firstAvail.start_time : "");
                }
            })
            .catch((err) => {
                setSlots([]);
                setErrorMsg(err?.detail || "Failed to load slots for this date");
            })
            .finally(() => setLoadingSlots(false));
    }, [isOpen, appointment?.queue_id, selectedDate]);

    if (!isOpen || !appointment) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !selectedSlot) {
            setErrorMsg("Please select a date and an available time slot");
            return;
        }

        setSubmitting(true);
        setErrorMsg(null);

        try {
            await api.updateAppointment(appointment.id, {
                appointment_date: selectedDate,
                start_time: selectedSlot,
            });
            toast.success(`Appointment rescheduled to ${selectedDate} at ${formatTime12(selectedSlot)}`);
            onRescheduled();
            onClose();
        } catch (err: any) {
            setErrorMsg(err?.detail || err?.message || "Failed to reschedule appointment");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <CalendarClock size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reschedule Appointment</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Ref: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">#{appointment.booking_reference}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Customer & Current Details Pill */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-white/5 mb-4 text-xs space-y-1">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Customer:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{appointment.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Current Slot:</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {appointment.appointment_date} at {formatTime12(appointment.start_time)}
                        </span>
                    </div>
                </div>

                {errorMsg && (
                    <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Date Picker */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                            New Date *
                        </label>
                        <div className="relative">
                            <input
                                type="date"
                                required
                                min={todayIso}
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Slot Dropdown */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                            New Time Slot *
                        </label>
                        <div className="relative">
                            <select
                                required
                                value={selectedSlot}
                                onChange={(e) => setSelectedSlot(e.target.value)}
                                disabled={loadingSlots || slots.length === 0}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60"
                            >
                                <option value="">
                                    {loadingSlots
                                        ? "Loading slots..."
                                        : slots.length === 0
                                        ? "No available slots on this date"
                                        : "-- Choose a time slot --"}
                                </option>
                                {slots.map((s) => (
                                    <option
                                        key={s.start_time}
                                        value={s.start_time}
                                        disabled={!s.available && s.start_time !== appointment.start_time?.slice(0, 5)}
                                    >
                                        {formatTime12(s.start_time)} – {formatTime12(s.end_time)} {s.available ? "(Available)" : "(Full)"}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !selectedSlot}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw size={13} className="animate-spin" />
                                    <span>Rescheduling...</span>
                                </>
                            ) : (
                                <span>Confirm Reschedule</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
