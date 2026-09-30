"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { WhatsAppUsageResponse, BranchWhatsAppUsage, ParentOrganization } from "@/types/api";
import Link from "next/link";
import {
    MessageSquare,
    Receipt,
    RefreshCw,
    Building2,
    Calendar,
    FilterX,
    CheckCircle2,
    XCircle,
    Sliders,
    Search,
    Download,
    DollarSign,
    Layers,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function SuperAdminWhatsAppPricingPage() {
    const [usageData, setUsageData] = useState<WhatsAppUsageResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState<string>("");
    const [parentOrgs, setParentOrgs] = useState<ParentOrganization[]>([]);
    const [selectedParentOrgId, setSelectedParentOrgId] = useState<string>("");

    // Date Range Filter states
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [datePreset, setDatePreset] = useState<"all" | "today" | "7d" | "30d">("all");

    // Rate editing modal state
    const [showRateModal, setShowRateModal] = useState(false);
    const [editRate, setEditRate] = useState<number>(0.12);
    const [editCurrency, setEditCurrency] = useState<string>("₹");
    const [savingRate, setSavingRate] = useState(false);

    // Sorting
    const [sortBy, setSortBy] = useState<"messages" | "amount" | "delivered" | "name">("messages");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getWhatsAppUsage(
                startDate || undefined,
                endDate || undefined,
                selectedParentOrgId || undefined
            );
            setUsageData(data);
            setEditRate(data.global_rate_per_message);
            setEditCurrency(data.currency);
        } catch {
            toast.error("Failed to load WhatsApp usage & pricing data");
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, selectedParentOrgId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        // Fetch parent orgs for dropdown filter
        api.listParentOrganizations({ limit: 100 })
            .then((res) => setParentOrgs(res.items || []))
            .catch(() => {});
    }, []);

    const handleSaveRate = async () => {
        if (editRate <= 0) {
            toast.error("Rate must be greater than 0");
            return;
        }
        setSavingRate(true);
        try {
            const updated = await api.updateWhatsAppRate({
                global_rate_per_message: editRate,
                currency: editCurrency,
            });
            setUsageData(updated);
            setShowRateModal(false);
            toast.success("Default WhatsApp message rate updated");
        } catch {
            toast.error("Failed to update WhatsApp rate");
        } finally {
            setSavingRate(false);
        }
    };

    const filteredBranches = useMemo(() => {
        if (!usageData?.branches) return [];
        let items = usageData.branches.filter((b: BranchWhatsAppUsage) => {
            const matchesSearch =
                b.name.toLowerCase().includes(search.toLowerCase()) ||
                b.slug.toLowerCase().includes(search.toLowerCase()) ||
                (b.parent_org_name && b.parent_org_name.toLowerCase().includes(search.toLowerCase()));
            return matchesSearch;
        });

        items.sort((a, b) => {
            let comp = 0;
            if (sortBy === "messages") comp = a.total_messages - b.total_messages;
            else if (sortBy === "amount") comp = a.total_amount - b.total_amount;
            else if (sortBy === "delivered") comp = a.delivered_messages - b.delivered_messages;
            else comp = a.name.localeCompare(b.name);
            return sortOrder === "desc" ? -comp : comp;
        });

        return items;
    }, [usageData?.branches, search, sortBy, sortOrder]);

    const handleExportCSV = () => {
        if (!filteredBranches.length) {
            toast.error("No branch usage data to export");
            return;
        }
        const headers = ["Branch Name", "Branch Slug", "Parent Org", "Total Messages", "Delivered", "Read", "Failed", "Rate per Msg", "Estimated Cost", "Last Sent"];
        const rows = filteredBranches.map(b => [
            `"${b.name}"`,
            b.slug,
            `"${b.parent_org_name || "Direct"}"`,
            b.total_messages,
            b.delivered_messages,
            b.read_messages,
            b.failed_messages,
            b.effective_rate,
            b.total_amount,
            b.last_sent_at ? new Date(b.last_sent_at).toLocaleDateString() : "Never",
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `whatsapp_branch_usage_${startDate || "all"}_to_${endDate || "now"}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const currencySymbol = usageData?.currency || "₹";
    const totalDelivered = usageData?.total_delivered ?? 0;
    const totalSent = usageData?.total_messages ?? 0;
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 100;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
            {/* Top Sub-Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
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
                    <Receipt size={16} />
                    Branch Pricing & Usage
                </div>
                <Link
                    href="/super-admin/whatsapp/templates"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60 transition-all cursor-pointer"
                >
                    <Layers size={16} />
                    Manage Templates
                </Link>
                <Link
                    href="/super-admin/calling-config"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60 transition-all cursor-pointer"
                >
                    <Sliders size={16} />
                    Calling Config
                </Link>
                <Link
                    href="/super-admin/calling-config/pricing"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60 transition-all cursor-pointer"
                >
                    <Receipt size={16} />
                    Calling Pricing
                </Link>
            </div>

            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
                        <MessageSquare className="w-6 h-6 text-emerald-500" />
                        WhatsApp Branch Pricing & Usage
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Track live outbound WhatsApp messages, delivery performance, and estimated Meta costs per branch.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={() => setShowRateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
                    >
                        <DollarSign size={14} className="text-amber-400" />
                        Rate: {currencySymbol}{usageData?.global_rate_per_message.toFixed(2) ?? "0.12"} / msg
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
                    >
                        <Download size={14} />
                        Export CSV
                    </button>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 shadow-md shadow-indigo-600/20"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Messages</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                            <MessageSquare size={16} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-white mt-3 tabular-nums">
                        {usageData?.total_messages.toLocaleString() ?? 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Outbound notifications across all queues</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivered Rate</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-emerald-400 mt-3 tabular-nums">
                        {usageData?.total_delivered.toLocaleString() ?? 0}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        <strong className="text-white">{usageData?.total_billable.toLocaleString() ?? 0}</strong> paid templates • <strong className="text-emerald-400">{usageData?.total_free_session.toLocaleString() ?? 0}</strong> free session
                    </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Meta Spend</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                            <Receipt size={16} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-amber-300 mt-3 tabular-nums">
                        {currencySymbol}{(usageData?.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        At {currencySymbol}{usageData?.global_rate_per_message ?? 0.12} / paid template (session text is ₹0)
                    </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Branches</span>
                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                            <Building2 size={16} />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-white mt-3 tabular-nums">
                        {usageData?.active_branches_count ?? 0}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Out of {usageData?.branches.length ?? 0} configured branches
                    </p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Date Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1">
                            <Calendar size={13} /> Timeframe:
                        </span>
                        {(["all", "today", "7d", "30d"] as const).map((preset) => (
                            <button
                                key={preset}
                                onClick={() => handleDatePreset(preset)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    datePreset === preset
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750"
                                }`}
                            >
                                {preset === "all" ? "All Time" : preset === "today" ? "Today" : preset === "7d" ? "Last 7 Days" : "Last 30 Days"}
                            </button>
                        ))}
                    </div>

                    {/* Custom Date Inputs */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400">From:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setDatePreset("all");
                                }}
                                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400">To:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setDatePreset("all");
                                }}
                                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs outline-none focus:border-indigo-500"
                            />
                        </div>
                        {(startDate || endDate || selectedParentOrgId || search) && (
                            <button
                                onClick={() => {
                                    setStartDate("");
                                    setEndDate("");
                                    setDatePreset("all");
                                    setSelectedParentOrgId("");
                                    setSearch("");
                                }}
                                title="Reset all filters"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-lg transition"
                            >
                                <FilterX size={13} /> Reset
                            </button>
                        )}
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Search Branch */}
                    <div className="relative w-full sm:w-80">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search branch name, slug or brand..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs rounded-xl outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Parent Org Filter */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-xs text-slate-400 whitespace-nowrap">Parent Brand:</span>
                        <select
                            value={selectedParentOrgId}
                            onChange={(e) => setSelectedParentOrgId(e.target.value)}
                            className="w-full sm:w-60 px-3 py-2 bg-slate-800 border border-slate-700 text-white text-xs rounded-xl outline-none focus:border-indigo-500 transition"
                        >
                            <option value="">All Parent Organizations</option>
                            {parentOrgs.map((po) => (
                                <option key={po.id} value={po.id}>
                                    {po.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Branch Breakdown Table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-md overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-400" />
                            Branch-Wise WhatsApp Usage Breakdown
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Showing {filteredBranches.length} branch{filteredBranches.length === 1 ? "" : "es"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-2 py-1 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs outline-none"
                        >
                            <option value="messages">Total Messages</option>
                            <option value="amount">Estimated Cost</option>
                            <option value="delivered">Delivered Count</option>
                            <option value="name">Branch Name</option>
                        </select>
                        <button
                            onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
                            className="px-2 py-1 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs hover:bg-slate-700"
                        >
                            {sortOrder === "desc" ? "↓ Desc" : "↑ Asc"}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-800/60 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="px-5 py-3.5">Branch Name</th>
                                <th className="px-4 py-3.5">Parent Org</th>
                                <th className="px-3 py-3.5">Delivery Mode</th>
                                <th className="px-4 py-3.5 text-right">Total Sent</th>
                                <th className="px-3 py-3.5 text-right">Billable (Paid)</th>
                                <th className="px-3 py-3.5 text-right">Free Session</th>
                                <th className="px-3 py-3.5 text-right">Rate</th>
                                <th className="px-4 py-3.5 text-right">Est. Cost</th>
                                <th className="px-4 py-3.5 text-right">Last Message</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-500">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-400" />
                                        Loading branch usage data...
                                    </td>
                                </tr>
                            ) : filteredBranches.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-500">
                                        <AlertCircle size={28} className="mx-auto mb-2 text-slate-600" />
                                        No branches found matching your search or filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredBranches.map((branch) => (
                                    <tr key={branch.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-5 py-3.5">
                                             <div className="font-bold text-white text-sm">{branch.name}</div>
                                             <div className="text-[11px] text-slate-500 font-mono mt-0.5">{branch.slug}</div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {branch.parent_org_name ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 font-medium text-[11px] border border-indigo-500/20">
                                                    {branch.parent_org_name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 text-[11px] italic">Independent</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3.5 whitespace-nowrap">
                                            {branch.delivery_mode === "always_send" ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                                    ⚡ Always Send All
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                                    🟢 Button Click (Free)
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-extrabold text-white tabular-nums text-sm">
                                            {branch.total_messages.toLocaleString()}
                                            <span className="block text-[10px] text-slate-500 font-normal">
                                                {branch.delivered_messages} delivered
                                            </span>
                                        </td>
                                        <td className="px-3 py-3.5 text-right tabular-nums">
                                            <span className="text-white font-bold text-sm">{branch.billable_messages.toLocaleString()}</span>
                                            <span className="block text-[10px] text-slate-400 font-normal">
                                                templates
                                            </span>
                                        </td>
                                        <td className="px-3 py-3.5 text-right tabular-nums">
                                            <span className="text-emerald-400 font-bold text-sm">{branch.free_session_messages.toLocaleString()}</span>
                                            <span className="block text-[10px] text-emerald-500/80 font-normal">
                                                ₹0.00 (free)
                                            </span>
                                        </td>
                                        <td className="px-3 py-3.5 text-right text-slate-400 font-mono tabular-nums">
                                            {currencySymbol}{branch.effective_rate.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-extrabold text-amber-300 tabular-nums text-sm">
                                            {currencySymbol}{branch.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3.5 text-right text-slate-400 text-[11px] whitespace-nowrap">
                                            {branch.last_sent_at ? (
                                                <>
                                                    <span className="font-medium text-slate-300">
                                                        {new Date(branch.last_sent_at).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-slate-500 block text-[10px]">
                                                        {new Date(branch.last_sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-slate-600">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Rate Modal */}
            {showRateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-amber-400" />
                                Edit Default WhatsApp Rate
                            </h3>
                            <button
                                onClick={() => setShowRateModal(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                    Currency Symbol
                                </label>
                                <input
                                    type="text"
                                    value={editCurrency}
                                    onChange={(e) => setEditCurrency(e.target.value)}
                                    placeholder="₹ or $"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white text-sm rounded-xl outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                    Default Rate per Delivered Utility Message
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                                        {editCurrency}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={editRate}
                                        onChange={(e) => setEditRate(parseFloat(e.target.value) || 0)}
                                        className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 text-white text-sm rounded-xl outline-none focus:border-indigo-500 font-mono"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    Meta official India utility rate is approximately ₹0.11 – ₹0.12 per conversation.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowRateModal(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveRate}
                                disabled={savingRate}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                            >
                                {savingRate ? "Saving..." : "Save Rate"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
