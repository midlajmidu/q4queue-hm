"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Users, MonitorPlay, Ticket, Activity } from "lucide-react";

export default function BranchExecutiveSummary({ data }: { data: any }) {
    if (!data) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between h-[120px] animate-pulse">
                        <div className="flex justify-between items-start w-full">
                            <div className="w-24 h-4 bg-slate-100 rounded-md"></div>
                            <div className="w-8 h-8 rounded-lg bg-slate-100"></div>
                        </div>
                        <div className="w-16 h-8 bg-slate-100 rounded-md mt-auto"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* CARD 1: Total Staff */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 flex flex-col justify-between group hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-sm font-medium text-slate-500">Total Staff</div>
                    <div className="p-2 bg-slate-50 rounded-md text-slate-400 border border-slate-100 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors">
                        <Users size={16} strokeWidth={2} />
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums leading-none">{data.total_staff.toLocaleString()}</div>
                </div>
            </div>

            {/* CARD 2: Active Sessions */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 flex flex-col justify-between group hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-sm font-medium text-slate-500">Active Sessions</div>
                    <div className="p-2 bg-slate-50 rounded-md text-slate-400 border border-slate-100 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors">
                        <MonitorPlay size={16} strokeWidth={2} />
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums leading-none">{data.active_sessions.toLocaleString()}</div>
                </div>
            </div>

            {/* CARD 3: Active Queues */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 flex flex-col justify-between group hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-sm font-medium text-slate-500">Active Queues</div>
                    <div className="p-2 bg-slate-50 rounded-md text-slate-400 border border-slate-100 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors">
                        <Ticket size={16} strokeWidth={2} />
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums leading-none">{data.active_queues.toLocaleString()}</div>
                </div>
            </div>

            {/* CARD 4: Served Today */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 flex flex-col justify-between group hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all">
                <div className="flex justify-between items-center mb-4">
                    <div className="text-sm font-medium text-slate-500">Served Today</div>
                    <div className="p-2 bg-slate-50 rounded-md text-slate-400 border border-slate-100 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors">
                        <Activity size={16} strokeWidth={2} />
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums leading-none">{data.customers_served_today.toLocaleString()}</div>
                </div>
            </div>

        </div>
    );
}