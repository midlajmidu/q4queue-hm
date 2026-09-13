"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { CallingConfigRead, BranchCallingConfig } from "@/types/api";
import Link from "next/link";
import {
    PhoneCall,
    IndianRupee,
    RefreshCw,
    Building2,
    Calendar,
    FilterX,
    Clock,
    CreditCard,
    Phone,
    MessageSquare,
    Receipt,
    Sliders,
} from "lucide-react";
import { toast } from "sonner";

export default function BranchCallingPricingPage() {
    const [config, setConfig] = useState<CallingConfigRead | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState<string>("");

    // Date Range Filter states
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [datePreset, setDatePreset] = useState<"all" | "today" | "7d" | "30d">("all");

    const formatDuration = (seconds: number) => {
        if (!seconds || seconds <= 0) return "0s";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs}s`;
        if (secs === 0) return `${mins}m`;
        return `${mins}m ${secs}s`;
    };

    const handleDatePreset = (preset: "all" | "today" | "7d" | "30d") => {
        setDatePreset(preset);
        const now = new Date();
        const toYMD = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };

        if (preset === "all") {
            setStartDate("");
            setEndDate("");
        } else if (preset === "today") {
            const todayStr = toYMD(now);
            setStartDate(todayStr);
            setEndDate(todayStr);
        } else if (preset === "7d") {
            const past = new Date(now);
            past.setDate(past.getDate() - 6);
            setStartDate(toYMD(past));
            setEndDate(toYMD(now));
        } else if (preset === "30d") {
            const past = new Date(now);
            past.setDate(past.getDate() - 29);
            setStartDate(toYMD(past));
            setEndDate(toYMD(now));
        }
    };

    const loadConfig = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getCallingConfig(startDate || undefined, endDate || undefined);
            setConfig(data);
        } catch {
            toast.error("Failed to load calling usage & pricing data");
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const filteredBranches = config?.branches.filter((b: BranchCallingConfig) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.slug.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const globalRate = config?.global_rate_per_minute ?? 1.5;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
            {/* Top Sub-Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Link
                    href="/super-admin/whatsapp"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60 transition-all cursor-pointer"
                >
                    <MessageSquare size={16} />
                    WhatsApp & Meta
                </Link>
                <Link
                    href="/super-admin/calling-config"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60 transition-all cursor-pointer"
                >
                    <Sliders size={16} />
                    Rate Configuration
                </Link>
                <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                >
                    <Receipt size={16} />
                    Branch Pricing & Telephony Usage
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <Receipt size={22} />
                        </div>
                        All Branch Telephony Pricing & Seconds Audit
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        View total call seconds, billable minutes, and total pricing billed to each branch in INR (₹) with date filtering.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={loadConfig}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Date Range Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-2xs">
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 shrink-0 overflow-x-auto">
                    {(["all", "today", "7d", "30d"] as const).map((p) => {
                        const labels: Record<string, string> = {
                            all: "All Time",
                            today: "Today",
                            "7d": "7 Days",
                            "30d": "30 Days"
                        };
                        const isSelected = datePreset === p && (!startDate && !endDate && p === "all" || p !== "all");
                        return (
                            <button
                                key={p}
                                type="button"
                                onClick={() => handleDatePreset(p)}
                                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${isSelected
                                    ? "bg-indigo-600 text-white shadow-2xs"
                                    : "text-slate-400 hover:text-white"
                                }`}
                            >
                                {labels[p]}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => { setStartDate(e.target.value); setDatePreset("all"); }}
                            className="bg-transparent text-xs font-semibold text-white outline-none w-28"
                        />
                        <span className="text-slate-500 text-xs font-bold">→</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => { setEndDate(e.target.value); setDatePreset("all"); }}
                            className="bg-transparent text-xs font-semibold text-white outline-none w-28"
                        />
                    </div>

                    {(startDate || endDate) && (
                        <button
                            type="button"
                            onClick={() => { setStartDate(""); setEndDate(""); setDatePreset("all"); }}
                            className="h-9 px-3 flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer border border-rose-500/20"
                        >
                            <FilterX size={14} />
                            <span>Reset Filter</span>
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="p-16 text-center text-slate-400 text-sm font-medium">
                    <RefreshCw size={24} className="animate-spin text-indigo-400 mx-auto mb-3" />
                    Loading branch voice telephony metrics & pricing...
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Platform Total Summary Metric Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4.5 flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Total Platform Calls
                                </p>
                                <p className="text-2xl font-bold text-white mt-1">
                                    {config?.total_calls ?? 0}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Across all branches</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
                                <Phone size={20} />
                            </div>
                        </div>

                        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4.5 flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Total Seconds Used
                                </p>
                                <p className="text-2xl font-bold text-white mt-1">
                                    {config?.total_duration_seconds ?? 0} <span className="text-sm font-semibold text-slate-400">secs</span>
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Formatted: {formatDuration(config?.total_duration_seconds ?? 0)}
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
                                <Clock size={20} />
                            </div>
                        </div>

                        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4.5 flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Billable Minutes
                                </p>
                                <p className="text-2xl font-bold text-white mt-1">
                                    {config?.total_billable_minutes ?? 0} <span className="text-sm text-slate-400 font-semibold">mins</span>
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">60s rounded units</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
                                <CreditCard size={20} />
                            </div>
                        </div>

                        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4.5 flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Total Branch Pricing
                                </p>
                                <p className="text-2xl font-bold text-emerald-400 mt-1">
                                    {config?.currency || "₹"}{(config?.total_amount ?? 0).toFixed(2)}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Total billable amount in INR
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                                <IndianRupee size={20} />
                            </div>
                        </div>
                    </div>

                    {/* All Branch Pricing Breakdown Table */}
                    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden space-y-4">
                        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Building2 size={18} className="text-indigo-400" />
                                    Branch-Wise Telephony Usage (Seconds) & Total Pricing Breakdown
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Includes exact duration in seconds, billable minutes, per-minute rate, and total cost pricing for each branch.
                                </p>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Filter branches..."
                                    className="w-full h-9 bg-slate-800 border border-slate-700 rounded-xl px-3 text-xs font-semibold text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[750px]">
                                <thead>
                                    <tr className="bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                                        <th className="px-6 py-3.5">Branch Name</th>
                                        <th className="px-6 py-3.5">Total Calls</th>
                                        <th className="px-6 py-3.5">Duration (Seconds)</th>
                                        <th className="px-6 py-3.5">Billable Mins</th>
                                        <th className="px-6 py-3.5">Active Rate (₹/min)</th>
                                        <th className="px-6 py-3.5 text-right">Total Pricing (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-sm">
                                    {filteredBranches.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                                                No branches found matching filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBranches.map((b: BranchCallingConfig) => {
                                            const effectiveVal = b.call_rate_per_minute !== null && b.call_rate_per_minute !== undefined
                                                ? b.call_rate_per_minute
                                                : globalRate;
                                            const calculatedTotal = roundAmount(b.total_billable_minutes * effectiveVal);

                                            return (
                                                <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-3.5 font-bold text-white">
                                                        <div>
                                                            <p>{b.name}</p>
                                                            <p className="text-slate-400 text-[11px] font-mono">{b.slug}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3.5 text-slate-300 text-xs font-semibold">
                                                        {b.total_calls} call{b.total_calls !== 1 ? "s" : ""}
                                                    </td>
                                                    <td className="px-6 py-3.5">
                                                        <div className="font-extrabold text-white text-sm">
                                                            {b.total_duration_seconds} <span className="text-xs text-slate-400 font-normal">seconds</span>
                                                        </div>
                                                        <div className="text-slate-400 text-[11px]">
                                                            {formatDuration(b.total_duration_seconds)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3.5 text-slate-200 text-xs font-bold">
                                                        {b.total_billable_minutes} mins
                                                    </td>
                                                    <td className="px-6 py-3.5 text-slate-300 text-xs font-semibold">
                                                        ₹{effectiveVal.toFixed(2)}
                                                        {b.call_rate_per_minute !== null && b.call_rate_per_minute !== undefined && (
                                                            <span className="ml-1.5 text-[10px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                                                                Custom Override
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3.5 text-right font-black text-emerald-400 text-base">
                                                        ₹{calculatedTotal.toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function roundAmount(num: number): number {
    return Math.round(num * 100) / 100;
}
