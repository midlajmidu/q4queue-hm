"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Search, Plus, ExternalLink, Eye, Building2, Pencil, ChevronRight, Copy, Info, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
    const itemsPerPage = 10;

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const [dashboardData, setDashboardData] = useState<any>(null);

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

    useEffect(() => {
        loadBranches();
    }, [loadBranches]);

    const filteredBranches = branches.filter(b => {
        const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              b.slug.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesStatus = true;
        if (statusFilter === "Healthy") matchesStatus = b.health === "Healthy";
        else if (statusFilter === "Warning") matchesStatus = b.health === "Warning";
        else if (statusFilter === "Inactive") matchesStatus = b.health === "Offline";
        
        return matchesSearch && matchesStatus;
    });

    const sortedBranches = [...filteredBranches].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        if (sortField === "wait_time") {
            const parseTime = (timeStr: string) => {
                if (!timeStr || timeStr === "0m") return 0;
                let secs = 0;
                const mMatch = timeStr.match(/(\d+)m/);
                const sMatch = timeStr.match(/(\d+)s/);
                if (mMatch) secs += parseInt(mMatch[1]) * 60;
                if (sMatch) secs += parseInt(sMatch[1]);
                return secs;
            };
            aValue = parseTime(a.avg_wait_time);
            bValue = parseTime(b.avg_wait_time);
        } else if (sortField === "serving_capacity") {
            aValue = (a.serving || 0) / (a.sessions || 1);
            bValue = (b.serving || 0) / (b.sessions || 1);
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-slate-900">Branch Overview</h1>
                        {dashboardData?.max_branches ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md shadow-sm">
                                <Building2 className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600 font-medium">
                                    <span className="text-slate-900 font-bold">{dashboardData.global_kpis?.total_branches || dashboardData.branch_count || 0}</span>
                                    <span className="mx-1 text-slate-300">/</span>
                                    {dashboardData.max_branches} Used
                                </span>
                            </div>
                        ) : null}
                    </div>
                    <p className="text-slate-500 text-sm mt-1">Monitor all branches and their current health status.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus size={16} />
                    Create Branch
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
                    <div className="relative w-full sm:w-72">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={14} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search branches..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 outline-none transition-all placeholder:text-slate-400"
                        />
                    </div>
                    <div className="flex items-center justify-end w-full sm:w-auto">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest mr-2 hidden sm:inline-block">Filter</label>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-slate-200 bg-slate-50 text-slate-700 text-sm rounded-md py-1.5 pl-3 pr-8 outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-auto"
                        >
                            <option value="All Statuses">All Statuses</option>
                            <option value="Healthy">Healthy</option>
                            <option value="Warning">Warning</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                {/* Mobile View List (spacious and clear on small screens) */}
                <div className="block md:hidden divide-y divide-slate-100 bg-white">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            Loading branch overview...
                        </div>
                    ) : filteredBranches.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-slate-50 text-slate-400 mb-3 border border-slate-200 shadow-sm">
                                <Building2 size={20} />
                            </div>
                            <p className="text-slate-600 font-medium text-sm">No branches found</p>
                        </div>
                    ) : (
                        paginatedBranches.map((branch) => (
                            <div key={branch.id} className="p-4 space-y-4 hover:bg-slate-50/30 transition-colors">
                                {/* Row 1: Name and Health */}
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-base">{branch.name}</h4>
                                        <div className="flex items-center gap-1.5 mt-0.5 group/copy">
                                            <span className="text-xs text-slate-500 font-medium">Ref: {branch.slug}</span>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(branch.slug);
                                                    toast.success("Reference ID copied to clipboard");
                                                }}
                                                className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-all"
                                                title="Copy Reference ID"
                                            >
                                                <Copy size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                        branch.health === 'Healthy' ? 'bg-emerald-50 text-emerald-700' : 
                                        branch.health === 'Warning' ? 'bg-amber-50 text-amber-700' : 
                                        'bg-slate-50 text-slate-600'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${branch.health === 'Healthy' ? 'bg-emerald-500' : branch.health === 'Warning' ? 'bg-amber-500' : 'bg-slate-500'}`}></span>
                                        {branch.health === 'Offline' ? 'Inactive' : branch.health}
                                    </span>
                                </div>

                                {/* Row 2: Metrics Grid */}
                                <div className="grid grid-cols-2 gap-3 bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-xs">
                                    <div className="flex justify-between items-center py-0.5">
                                        <span className="text-slate-500 font-medium">Active Queues</span>
                                        <span className="font-bold text-slate-900">{branch.queues}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5">
                                        <span className="text-slate-500 font-medium">Live Wait</span>
                                        <span className="font-bold text-slate-900">{branch.avg_wait_time || "0m"}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 col-span-2 border-t border-slate-100/60 pt-1.5">
                                        <span className="text-slate-500 font-medium">Serving Capacity</span>
                                        <span className="font-bold text-slate-950">{branch.serving || 0} / {branch.sessions || 0} counters</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 col-span-2 border-t border-slate-100/60 pt-1.5">
                                        <span className="text-slate-500 font-medium">Staff Online</span>
                                        <span className="font-bold text-slate-900">{branch.online_staff || 0}</span>
                                    </div>
                                </div>

                                {/* Row 3: Action Buttons */}
                                <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                        onClick={() => {
                                            setSelectedBranch(branch);
                                            setIsEditModalOpen(true);
                                        }}
                                        className="inline-flex items-center justify-center p-2 text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
                                        title="Edit Branch"
                                    >
                                        <Pencil size={15} />
                                    </button>
                                    <Link
                                        href={`/organization-admin/branches/${branch.id}`}
                                        className="inline-flex items-center justify-center p-2 text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"
                                        title="View Branch Details"
                                    >
                                        <Eye size={15} />
                                    </Link>
                                    <Link
                                        href={`/organization-admin/branches/${branch.id}/admin#token=${getToken("org_admin") || ""}`}
                                        target="_blank"
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-sm text-center"
                                    >
                                        Dashboard
                                        <ChevronRight size={14} strokeWidth={2.5} />
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop View Table (visible on medium & large screens) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-slate-50/80 border-b border-slate-200">
                            <tr>
                                <th 
                                    className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-left cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => handleSort("name")}
                                >
                                    <div className="flex items-center gap-1.5">
                                        Branch Details
                                        {sortField === "name" ? (sortDirection === "asc" ? <ArrowUp size={12} className="text-slate-700" /> : <ArrowDown size={12} className="text-slate-700" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-left cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => handleSort("status")}
                                >
                                    <div className="flex items-center gap-1.5">
                                        Status
                                        {sortField === "status" ? (sortDirection === "asc" ? <ArrowUp size={12} className="text-slate-700" /> : <ArrowDown size={12} className="text-slate-700" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => handleSort("queues")}
                                >
                                    <div className="flex items-center justify-end gap-1.5">
                                        Active Queues
                                        {sortField === "queues" ? (sortDirection === "asc" ? <ArrowUp size={12} className="text-slate-700" /> : <ArrowDown size={12} className="text-slate-700" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => handleSort("serving_capacity")}
                                >
                                    <div className="flex items-center justify-end gap-1.5 relative group">
                                        Serving Capacity 
                                        <div className="cursor-help text-slate-400">
                                            <Info size={14} />
                                        </div>
                                        {sortField === "serving_capacity" ? (sortDirection === "asc" ? <ArrowUp size={12} className="text-slate-700" /> : <ArrowDown size={12} className="text-slate-700" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                                        {/* Custom Tailwind Tooltip */}
                                        <div className="absolute top-full right-0 mt-2 w-56 p-2.5 bg-slate-900 text-white text-xs rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 normal-case tracking-normal font-medium text-left pointer-events-none">
                                            Shows how many open counters are actively serving a customer right now.
                                            {/* Tooltip Arrow */}
                                            <div className="absolute bottom-full right-4 border-4 border-transparent border-b-slate-900"></div>
                                        </div>
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => handleSort("wait_time")}
                                >
                                    <div className="flex items-center justify-end gap-1.5">
                                        Live Wait Time
                                        {sortField === "wait_time" ? (sortDirection === "asc" ? <ArrowUp size={12} className="text-slate-700" /> : <ArrowDown size={12} className="text-slate-700" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => handleSort("online_staff")}
                                >
                                    <div className="flex items-center justify-end gap-1.5">
                                        Staff Online
                                        {sortField === "online_staff" ? (sortDirection === "asc" ? <ArrowUp size={12} className="text-slate-700" /> : <ArrowDown size={12} className="text-slate-700" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                                    </div>
                                </th>
                                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500 text-sm">
                                        Loading branch overview...
                                    </td>
                                </tr>
                            ) : filteredBranches.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-slate-50 text-slate-400 mb-3 border border-slate-200 shadow-sm">
                                            <Building2 size={20} />
                                        </div>
                                        <p className="text-slate-600 font-medium text-sm">No branches found</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedBranches.map((branch) => (
                                    <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                                        <td className="px-4 py-3 text-left">
                                            <div className="font-semibold text-slate-900 hover:text-blue-600 transition-colors text-sm">{branch.name}</div>
                                            <div className="flex items-center gap-1.5 mt-0.5 group/copy">
                                                <div className="text-[11px] text-slate-500 font-medium">Ref: {branch.slug}</div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(branch.slug);
                                                        toast.success("Reference ID copied to clipboard");
                                                    }}
                                                    className="opacity-0 group-hover/copy:opacity-100 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                                                    title="Copy Reference ID"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-left">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                                branch.health === 'Healthy' ? 'bg-emerald-50 text-emerald-700' : 
                                                branch.health === 'Warning' ? 'bg-amber-50 text-amber-700' : 
                                                'bg-slate-50 text-slate-600'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${branch.health === 'Healthy' ? 'bg-emerald-500' : branch.health === 'Warning' ? 'bg-amber-500' : 'bg-slate-500'}`}></span>
                                                {branch.health === 'Offline' ? 'Inactive' : branch.health}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className={`font-medium text-sm ${branch.queues === 0 ? 'text-slate-400' : 'text-slate-700'}`}>{branch.queues}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex flex-col gap-1 items-end justify-center w-full max-w-[120px] ml-auto">
                                                <div className="flex items-center justify-end w-full text-[10px] font-bold text-slate-500">
                                                    <span>{branch.serving || 0} / {branch.sessions || 0} counters</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${(() => {
                                                            const pct = ((branch.serving || 0) / (branch.sessions || 1)) * 100;
                                                            if (pct >= 100) return 'bg-rose-500';
                                                            if (pct >= 80) return 'bg-amber-500';
                                                            return 'bg-indigo-500';
                                                        })()}`} 
                                                        style={{ width: `${Math.min(100, ((branch.serving || 0) / (branch.sessions || 1)) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className={`font-medium text-sm ${!branch.avg_wait_time || branch.avg_wait_time === '0m' ? 'text-slate-400' : 'text-slate-700'}`}>{branch.avg_wait_time || "0m"}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className={`font-medium text-sm ${!branch.online_staff || branch.online_staff === 0 ? 'text-slate-400' : 'text-slate-700'}`}>{branch.online_staff || 0}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedBranch(branch);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    className="inline-flex items-center justify-center p-1.5 text-slate-400 bg-transparent hover:bg-slate-100 hover:text-slate-600 rounded-md transition-colors"
                                                    title="Edit Branch"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <Link
                                                    href={`/organization-admin/branches/${branch.id}`}
                                                    className="inline-flex items-center justify-center p-1.5 text-slate-400 bg-transparent hover:bg-slate-100 hover:text-slate-600 rounded-md transition-colors"
                                                    title="View Branch Details"
                                                >
                                                    <Eye size={16} />
                                                </Link>
                                                <Link
                                                    href={`/organization-admin/branches/${branch.id}/admin#token=${getToken("org_admin") || ""}`}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-md transition-all shadow-sm"
                                                >
                                                    Dashboard
                                                    <ChevronRight size={14} strokeWidth={2.5} />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Clean Table Footer */}
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs font-medium text-slate-500">
                        Showing <strong className="text-slate-900 font-bold">{filteredBranches.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredBranches.length)}</strong> of <strong className="text-slate-900 font-bold">{filteredBranches.length}</strong> Branches
                    </p>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1 || filteredBranches.length === 0} 
                            className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-md text-xs font-bold uppercase tracking-wider disabled:text-slate-300 disabled:bg-transparent disabled:hover:bg-transparent disabled:border-slate-100 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages || filteredBranches.length === 0} 
                            className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-md text-xs font-bold uppercase tracking-wider disabled:text-slate-300 disabled:bg-transparent disabled:hover:bg-transparent disabled:border-slate-100 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            <CreateBranchModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onCreated={loadBranches}
            />

            <EditBranchModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedBranch(null);
                }}
                onUpdated={loadBranches}
                branch={selectedBranch}
            />
        </div>
    );
}
