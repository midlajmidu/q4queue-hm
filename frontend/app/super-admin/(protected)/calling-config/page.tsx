"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { CallingConfigRead, BranchCallingConfig } from "@/types/api";
import Link from "next/link";
import {
    PhoneCall,
    IndianRupee,
    Save,
    RefreshCw,
    Building2,
    CheckCircle2,
    Calendar,
    FilterX,
    RotateCcw,
    Clock,
    CreditCard,
    Phone,
    MessageSquare,
    Receipt,
    Sliders,
} from "lucide-react";
import { toast } from "sonner";

export default function SuperAdminCallingConfigPage() {
    const [callingTab, setCallingTab] = useState<"pricing" | "rates">("pricing");

    const [config, setConfig] = useState<CallingConfigRead | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states
    const [globalRate, setGlobalRate] = useState<number>(1.5);
    const [currency, setCurrency] = useState<string>("₹");
    const [branchRates, setBranchRates] = useState<Record<string, string>>({});
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
            setGlobalRate(data.global_rate_per_minute);
            setCurrency(data.currency || "₹");

            const initialOverrides: Record<string, string> = {};
            data.branches.forEach((b: BranchCallingConfig) => {
                initialOverrides[b.id] =
                    b.call_rate_per_minute !== null && b.call_rate_per_minute !== undefined
                        ? String(b.call_rate_per_minute)
                        : "";
            });
            setBranchRates(initialOverrides);
        } catch {
            toast.error("Failed to load calling configuration");
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const overridesPayload: Record<string, number | null> = {};
            Object.entries(branchRates).forEach(([bId, rateStr]) => {
                const trimmed = rateStr.trim();
                if (trimmed === "") {
                    overridesPayload[bId] = null;
                } else {
                    const num = parseFloat(trimmed);
                    if (!isNaN(num) && num >= 0) {
                        overridesPayload[bId] = num;
                    }
                }
            });

            const updated = await api.updateCallingConfig({
                global_rate_per_minute: Number(globalRate),
                currency,
                branch_overrides: overridesPayload,
            });

            setConfig(updated);
            toast.success("Calling rates & configuration updated successfully!");
        } catch {
            toast.error("Failed to save calling configuration");
        } finally {
            setSaving(false);
        }
    };

    const handleBranchRateChange = (branchId: string, value: string) => {
        setBranchRates((prev) => ({
            ...prev,
            [branchId]: value,
        }));
    };

    const handleResetBranchRate = (branchId: string) => {
        setBranchRates((prev) => ({
            ...prev,
            [branchId]: "",
        }));
    };

    const filteredBranches = config?.branches.filter((b: BranchCallingConfig) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.slug.toLowerCase().includes(search.toLowerCase())
    ) || [];

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
                    <div
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    >
                        <Sliders size={16} />
                        Rate Configuration
                    </div>
                    <Link
                        href="/super-admin/calling-config/pricing"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60 transition-all cursor-pointer"
                    >
                        <Receipt size={16} />
                        Branch Pricing & Telephony Usage
                    </Link>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <PhoneCall size={22} />
                        </div>
                        Voice Telephony Management
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Audit branch-wise calling totals (seconds & pricing) and configure per-minute calling rates in INR (₹).
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={loadConfig}
                        disabled={loading || saving}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                        <span>Refresh</span>
                    </button>

                    {callingTab === "rates" && (
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={loading || saving}
                            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
                        >
                            <Save size={16} />
                            <span>{saving ? "Saving..." : "Save Configuration"}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Calling Config Inner Sub-Tabs */}
            <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 w-fit">
                <button
                    type="button"
                    onClick={() => setCallingTab("pricing")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        callingTab === "pricing"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                >
                    <Receipt size={15} />
                    <span>Branch Usage & Total Pricing</span>
                </button>
                <button
                    type="button"
                    onClick={() => setCallingTab("rates")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        callingTab === "rates"
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                >
                    <Sliders size={15} />
                    <span>Rate & Currency Settings</span>
                </button>
            </div>

            {loading ? (
                <div className="p-16 text-center text-slate-400 text-sm font-medium">
                    <RefreshCw size={24} className="animate-spin text-indigo-400 mx-auto mb-3" />
                    Loading voice telephony metrics & configurations...
                </div>
            ) : callingTab === "pricing" ? (
                /* TAB 1: BRANCH USAGE & TOTAL PRICING */
                <div className="space-y-6 animate-in fade-in duration-200">
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

                    {/* Platform Total Summary Cards */}
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
                                    Branch-Wise Usage (Seconds) & Total Pricing Breakdown
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Shows exact duration in seconds, billable minutes, active rate, and total price used by each branch for the selected date range.
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
                                        <th className="px-6 py-3.5">Rate (₹/min)</th>
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
            ) : (
                /* TAB 2: RATE & CURRENCY SETTINGS */
                <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-200">
                    {/* Global Default Rate Banner */}
                    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-5">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <IndianRupee size={18} className="text-emerald-400" />
                                    Global Platform Default Calling Rate
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">
                                    Standard rate applied to all branches unless a custom branch override is specified below.
                                </p>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                <CheckCircle2 size={13} />
                                1 Minute Billing Increment Rule Active
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-2">
                                    Price per 1-Minute Unit (INR ₹)
                                </label>
                                <div className="relative">
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                                        ₹
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={globalRate}
                                        onChange={(e) => setGlobalRate(parseFloat(e.target.value) || 0)}
                                        placeholder="1.50"
                                        className="w-full h-11 bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-4 text-sm font-bold text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        required
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1.5">
                                    Calls under 60s count as 1 min; e.g. 70s calls count as 2 mins.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-2">
                                    Currency Identifier
                                </label>
                                <input
                                    type="text"
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    placeholder="₹"
                                    className="w-full h-11 bg-slate-800/80 border border-slate-700 rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    required
                                />
                                <p className="text-[11px] text-slate-500 mt-1.5">
                                    Primary currency symbol displayed on tenant billing summaries.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Branch Rate Overrides Table */}
                    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden space-y-4">
                        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Building2 size={18} className="text-indigo-400" />
                                    Branch-Specific Calling Rate Overrides
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Set custom per-minute prices for specific branches, or leave empty to use the global rate.
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
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                                        <th className="px-6 py-3.5">Branch Name</th>
                                        <th className="px-6 py-3.5">Effective Rate</th>
                                        <th className="px-6 py-3.5">Rate Override (₹/min)</th>
                                        <th className="px-6 py-3.5 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-sm">
                                    {filteredBranches.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                                                No branches found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBranches.map((b: BranchCallingConfig) => {
                                            const currentOverride = branchRates[b.id] ?? "";
                                            const isOverridden = currentOverride.trim() !== "";
                                            const effectiveVal = isOverridden
                                                ? parseFloat(currentOverride) || globalRate
                                                : globalRate;

                                            return (
                                                <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-3.5 font-bold text-white">
                                                        <div>
                                                            <p>{b.name}</p>
                                                            <p className="text-slate-400 text-[11px] font-mono">{b.slug}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3.5 text-slate-300 text-xs font-semibold">
                                                        ₹{effectiveVal.toFixed(2)}/min
                                                    </td>
                                                    <td className="px-6 py-3.5">
                                                        <div className="relative w-40">
                                                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                                                                ₹
                                                            </div>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                value={currentOverride}
                                                                onChange={(e) => handleBranchRateChange(b.id, e.target.value)}
                                                                placeholder={`Global (₹${globalRate})`}
                                                                className="w-full h-9 bg-slate-800 border border-slate-700 rounded-xl pl-7 pr-3 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-500"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3.5 text-center">
                                                        {isOverridden && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleResetBranchRate(b.id)}
                                                                title="Reset to Global Default"
                                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                                            >
                                                                <RotateCcw size={12} />
                                                                <span>Reset</span>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
}

function roundAmount(num: number): number {
    return Math.round(num * 100) / 100;
}
