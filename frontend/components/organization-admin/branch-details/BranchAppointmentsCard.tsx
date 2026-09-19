"use client";

import { CalendarCheck, Calendar, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getToken } from "@/lib/auth";

export interface BranchAppointmentStats {
    total_confirmed: number;
    today_confirmed: number;
    tomorrow_confirmed: number;
    upcoming_confirmed: number;
    total_all: number;
}

export default function BranchAppointmentsCard({
    data,
    branchId,
}: {
    data?: BranchAppointmentStats;
    branchId: string;
}) {
    const stats = data || {
        total_confirmed: 0,
        today_confirmed: 0,
        tomorrow_confirmed: 0,
        upcoming_confirmed: 0,
        total_all: 0,
    };

    if (!data) {
        return (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 space-y-4 animate-pulse">
                <div className="h-6 w-48 bg-slate-100 rounded-md" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-20 bg-slate-100 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                        <CalendarCheck size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                                Confirmed Appointments
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {stats.total_confirmed} Confirmed
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Advance reservations and scheduled visitor slots for this branch
                        </p>
                    </div>
                </div>

                <Link
                    href={`/organization-admin/branches/${branchId}/admin#token=${getToken("org_admin") || ""}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all shadow-2xs self-start sm:self-auto"
                >
                    <span>View Portal</span>
                    <ArrowRight size={13} />
                </Link>
            </div>

            {/* 4 Metric Pill Cards */}
            <div className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {/* Total Confirmed */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between group hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Total Confirmed</span>
                            <div className="p-1.5 rounded-lg bg-white border border-slate-200/60 text-indigo-600 shadow-2xs">
                                <CalendarCheck size={14} />
                            </div>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                            {stats.total_confirmed}
                        </div>
                        <span className="text-[11px] font-medium text-slate-400 mt-1">
                            {stats.total_all > 0 ? `${stats.total_all} total bookings overall` : "All confirmed bookings"}
                        </span>
                    </div>

                    {/* Today Confirmed */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between group hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Today</span>
                            <div className="p-1.5 rounded-lg bg-white border border-slate-200/60 text-emerald-600 shadow-2xs">
                                <Clock size={14} />
                            </div>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 tabular-nums flex items-baseline gap-1.5">
                            <span>{stats.today_confirmed}</span>
                            {stats.today_confirmed > 0 && (
                                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    Active
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] font-medium text-slate-400 mt-1">
                            Scheduled for today
                        </span>
                    </div>

                    {/* Tomorrow Confirmed */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between group hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Tomorrow</span>
                            <div className="p-1.5 rounded-lg bg-white border border-slate-200/60 text-blue-600 shadow-2xs">
                                <Calendar size={14} />
                            </div>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                            {stats.tomorrow_confirmed}
                        </div>
                        <span className="text-[11px] font-medium text-slate-400 mt-1">
                            Scheduled for tomorrow
                        </span>
                    </div>

                    {/* Upcoming (>= Today) */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col justify-between group hover:border-purple-200 hover:bg-purple-50/30 transition-all">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Upcoming</span>
                            <div className="p-1.5 rounded-lg bg-white border border-slate-200/60 text-purple-600 shadow-2xs">
                                <CheckCircle2 size={14} />
                            </div>
                        </div>
                        <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                            {stats.upcoming_confirmed}
                        </div>
                        <span className="text-[11px] font-medium text-slate-400 mt-1">
                            Today & future dates
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
