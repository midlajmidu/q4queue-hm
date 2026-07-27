"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Search, Plus, ExternalLink, Eye, Building2, Pencil, ChevronRight, ChevronDown, Copy, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import CreateBranchModal from "@/components/organization-admin/CreateBranchModal";
import EditBranchModal from "@/components/organization-admin/EditBranchModal";

export default function BranchesPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Statuses");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState<string>("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [dashboardData, setDashboardData] = useState<any>(null);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

    const loadBranches = useCallback(async () => {
        try {
            const [data, dashboard] = await Promise.all([
                api.getOrgAdminBranchesOverview(),
                api.getOrgAdminDashboard()
            ]);
            setBranches(data);
            setDashboardData(dashboard);
        } catch (error) {
            console.error("Failed to load branches:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadBranches(); }, [loadBranches]);

    const filteredBranches = branches.filter(b => {
        const matchesSearch =
            b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.slug.toLowerCase().includes(searchTerm.toLowerCase());
        let matchesStatus = true;
        if (statusFilter === "Active") matchesStatus = b.health !== "Offline";
        else if (statusFilter === "Inactive") matchesStatus = b.health === "Offline";
        return matchesStatus && matchesSearch;
    });

    const sortedBranches = [...filteredBranches].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        if (sortField === "serving_capacity") {
            aValue = (a.serving || 0) / (a.queues || 1);
            bValue = (b.serving || 0) / (b.queues || 1);
        } else if (sortField === "status") {
            aValue = a.health;
            bValue = b.health;
        }
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(sortedBranches.length / itemsPerPage) || 1;
    const paginatedBranches = sortedBranches.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const SortIcon = ({ field }: { field: string }) => {
        if (sortField !== field) return <ArrowUpDown size={12} className="text-slate-300" />;
        return sortDirection === "asc"
            ? <ArrowUp size={12} className="text-indigo-500" />
            : <ArrowDown size={12} className="text-indigo-500" />;
    };

    const branchCount = dashboardData?.global_kpis?.total_branches ?? dashboardData?.branch_count ?? 0;
    const maxBranches = dashboardData?.max_branches ?? 0;
    const quotaPct = maxBranches > 0 ? Math.min(100, (branchCount / maxBranches) * 100) : 0;
    const quotaBarColor = quotaPct >= 100 ? 'bg-rose-500' : quotaPct >= 80 ? 'bg-amber-500' : 'bg-indigo-500';

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-5 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">Branch Overview</h1>
                    <p className="text-[13px] font-medium text-slate-500 mt-1">
                        Monitor all branches and their current health status.
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {/* Quota indicator */}
                    {maxBranches > 0 && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2 bg-white border border-slate-200/80 rounded-xl shadow-sm">
                            <Building2 size={14} className="text-slate-400 shrink-0" />
                            <div className="flex items-center gap-2">
                                <span className="text-[12px] font-semibold text-slate-700">
                                    <span className="text-slate-900 font-black">{branchCount}</span>
                                    <span className="text-slate-300 mx-1">/</span>
                                    {maxBranches}
                                    <span className="text-slate-400 ml-1">branches</span>
                                </span>
                                <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${quotaBarColor}`}
                                        style={{ width: `${quotaPct}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shadow-indigo-600/25 group"
                    >
                        <Plus size={15} className="group-hover:rotate-90 transition-transform duration-300" />
                        Create Branch
                    </button>
                </div>
            </div>

            {/* ── Table Card ── */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">

                {/* Toolbar */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search branches..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-400 focus:bg-white transition-all"
                        />
                    </div>

                    {/* Segmented filter */}
                    <div className="flex p-1 bg-slate-100/70 rounded-lg border border-slate-200/60">
                        {["All Statuses", "Active", "Inactive"].map((status) => (
                            <button
                                key={status}
                                onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                                className={`px-3.5 py-1.5 text-[11px] font-semibold rounded-md whitespace-nowrap transition-all ${
                                    statusFilter === status
                                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Mobile Cards ── */}
                <div className="block md:hidden divide-y divide-slate-100">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="p-4 space-y-3 animate-pulse">
                                <div className="flex justify-between">
                                    <div className="space-y-1.5">
                                        <div className="h-4 bg-slate-200 rounded w-28" />
                                        <div className="h-3 bg-slate-100 rounded w-20" />
                                    </div>
                                    <div className="h-6 bg-slate-100 rounded-full w-16" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="h-3 bg-slate-100 rounded" />
                                    <div className="h-3 bg-slate-100 rounded" />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <div className="h-8 w-8 bg-slate-200 rounded-lg" />
                                    <div className="h-8 w-8 bg-slate-200 rounded-lg" />
                                    <div className="h-8 w-24 bg-slate-200 rounded-lg" />
                                </div>
                            </div>
                        ))
                    ) : filteredBranches.length === 0 ? (
                        <EmptyState onCreate={() => setIsCreateModalOpen(true)} />
                    ) : (
                        paginatedBranches.map((branch) => {
                            const isActive = branch.health !== 'Offline';
                            const serving = branch.serving || 0;
                            const total = branch.queues || 0;
                            const loadPct = total > 0 ? (serving / total) * 100 : 0;
                            return (
                                <div key={branch.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{branch.name}</p>
                                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Ref: {branch.slug}</p>
                                        </div>
                                        <StatusBadge active={isActive} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-[12px] bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <div>
                                            <p className="text-slate-400 font-medium mb-0.5">Active Queues</p>
                                            <p className="font-bold text-slate-900">{total === 0 ? '—' : total}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 font-medium mb-0.5">Counters Busy</p>
                                            <p className="font-bold text-slate-900">{serving} <span className="text-slate-400 font-medium">/ {total}</span></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => { setSelectedBranch(branch); setIsEditModalOpen(true); }}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 bg-white transition-colors"
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        <Link href={`/organization-admin/branches/${branch.id}`}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 bg-white transition-colors">
                                            <Eye size={13} />
                                        </Link>
                                        <Link
                                            href={`/organization-admin/branches/${branch.id}/admin#token=${getToken("org_admin") || ""}`}
                                            target="_blank"
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-lg transition-colors"
                                        >
                                            Dashboard <ExternalLink size={11} />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ── Desktop Table ── */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-100">
                                <th
                                    className="px-5 py-3 text-left cursor-pointer group"
                                    onClick={() => handleSort("name")}
                                >
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors">
                                        Branch Details <SortIcon field="name" />
                                    </div>
                                </th>
                                <th
                                    className="px-5 py-3 text-left cursor-pointer"
                                    onClick={() => handleSort("status")}
                                >
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors">
                                        Status <SortIcon field="status" />
                                    </div>
                                </th>
                                <th
                                    className="px-5 py-3 text-center cursor-pointer"
                                    onClick={() => handleSort("queues")}
                                >
                                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors">
                                        Active Queues <SortIcon field="queues" />
                                    </div>
                                </th>
                                <th
                                    className="px-5 py-3 text-center cursor-pointer"
                                    onClick={() => handleSort("serving_capacity")}
                                >
                                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors">
                                        Counters Busy <SortIcon field="serving_capacity" />
                                    </div>
                                </th>
                                <th className="px-5 py-3 text-right">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/80">
                            {isLoading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-5 py-4">
                                            <div className="h-4 bg-slate-200 rounded w-32 mb-1.5" />
                                            <div className="h-3 bg-slate-100 rounded w-20" />
                                        </td>
                                        <td className="px-5 py-4"><div className="h-6 bg-slate-100 rounded-full w-18" /></td>
                                        <td className="px-5 py-4 text-center"><div className="h-6 bg-slate-100 rounded-full w-10 mx-auto" /></td>
                                        <td className="px-5 py-4">
                                            <div className="h-4 bg-slate-200 rounded w-16 mx-auto mb-1.5" />
                                            <div className="h-1.5 bg-slate-100 rounded-full w-24 mx-auto" />
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                                                <div className="h-8 w-8 bg-slate-100 rounded-lg" />
                                                <div className="h-8 w-8 bg-slate-100 rounded-lg" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredBranches.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <EmptyState onCreate={() => setIsCreateModalOpen(true)} />
                                    </td>
                                </tr>
                            ) : (
                                paginatedBranches.map((branch) => {
                                    const isActive = branch.health !== 'Offline';
                                    const serving = branch.serving || 0;
                                    const total = branch.queues || 0;
                                    const loadPct = total > 0 ? Math.min(100, (serving / total) * 100) : 0;
                                    const loadBarColor = loadPct >= 90 ? 'bg-rose-500' : loadPct >= 60 ? 'bg-amber-400' : 'bg-indigo-500';

                                    return (
                                        <tr
                                            key={branch.id}
                                            className="group hover:bg-indigo-50/20 transition-colors"
                                        >
                                            {/* Branch Details */}
                                            <td className="pl-4 pr-5 py-4 border-l-2 border-transparent group-hover:border-indigo-400 transition-colors">
                                                <div className="font-semibold text-slate-900 text-[13.5px] group-hover:text-indigo-700 transition-colors">{branch.name}</div>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className="text-[11px] text-slate-400 font-medium">Ref: {branch.slug}</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(branch.slug);
                                                            toast.success("Reference ID copied");
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-all"
                                                        title="Copy Reference ID"
                                                    >
                                                        <Copy size={11} />
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-4">
                                                <StatusBadge active={isActive} />
                                            </td>

                                            {/* Active Queues */}
                                            <td className="px-5 py-4 text-center">
                                                {total === 0 ? (
                                                    <span className="text-slate-300 font-medium text-sm">—</span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
                                                        {total}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Counters Busy */}
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span className="text-[13px] font-bold text-slate-800">
                                                        {serving}
                                                        <span className="text-slate-400 font-medium text-xs ml-0.5"> / {total}</span>
                                                    </span>
                                                    <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-300 ${total === 0 ? 'bg-slate-200' : loadBarColor}`}
                                                            style={{ width: `${total === 0 ? 0 : loadPct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/organization-admin/branches/${branch.id}/admin#token=${getToken("org_admin") || ""}`}
                                                        target="_blank"
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-600 border border-indigo-200/80 hover:bg-indigo-50 hover:border-indigo-300 rounded-lg transition-all"
                                                    >
                                                        Dashboard <ExternalLink size={11} className="opacity-70" />
                                                    </Link>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedBranch(branch);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200/80 bg-white transition-colors"
                                                        title="Edit Branch"
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                    <Link
                                                        href={`/organization-admin/branches/${branch.id}`}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200/80 bg-white transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye size={13} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination Footer ── */}
                <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Left: rows per page + count */}
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                            Rows per page:
                        </span>
                        <div className="relative">
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg py-1.5 pl-3 pr-7 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer transition-all"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="w-px h-4 bg-slate-200 hidden sm:block" />
                        <span className="text-[12px] text-slate-500 hidden sm:block">
                            <strong className="text-slate-800 font-bold">
                                {filteredBranches.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, filteredBranches.length)}
                            </strong>
                            {" "}of{" "}
                            <strong className="text-slate-800 font-bold">{filteredBranches.length}</strong>
                        </span>
                    </div>

                    {/* Right: page controls */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1 || filteredBranches.length === 0}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 rotate-180" />
                        </button>

                        <div className="flex items-center gap-1 px-1">
                            {Array.from({ length: totalPages }).map((_, i) => {
                                const pageNum = i + 1;
                                if (
                                    pageNum === 1 ||
                                    pageNum === totalPages ||
                                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                ) {
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                                currentPage === pageNum
                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                    : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                    return <span key={pageNum} className="text-slate-300 text-xs px-0.5">···</span>;
                                }
                                return null;
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages || filteredBranches.length === 0}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <CreateBranchModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreated={loadBranches}
            />
            <EditBranchModal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setSelectedBranch(null); }}
                onUpdated={loadBranches}
                branch={selectedBranch}
            />
        </div>
    );
}

/* ── Reusable sub-components ──────────────────────────────────── */

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
            active
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                : 'bg-slate-100 text-slate-500 border-slate-200/60'
        }`}>
            {active ? (
                <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
            ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            )}
            {active ? 'Active' : 'Inactive'}
        </span>
    );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mb-4 border border-indigo-100">
                <Building2 size={24} />
            </div>
            <h3 className="text-[15px] font-bold text-slate-800 mb-1">No branches found</h3>
            <p className="text-[13px] text-slate-400 font-medium mb-5 max-w-xs">
                Create your first branch to start managing queues and tracking performance.
            </p>
            <button
                onClick={onCreate}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
            >
                <Plus size={15} />
                Create Branch
            </button>
        </div>
    );
}
