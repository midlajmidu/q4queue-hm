"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Search, Plus, ExternalLink, Eye, Building2, Pencil, ChevronRight, ChevronDown, Copy, Info, ArrowUpDown, ArrowUp, ArrowDown, MoreVertical, Flame } from "lucide-react";
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
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

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
        if (statusFilter === "Active") matchesStatus = b.health !== "Offline";
        else if (statusFilter === "Inactive") matchesStatus = b.health === "Offline";
        
        return matchesStatus && matchesSearch;
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
                            <div className="flex items-center gap-3 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <div className="flex items-center gap-1.5">
                                    <Building2 className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-600">
                                        <span className="text-slate-900 font-bold">{dashboardData.global_kpis?.total_branches || dashboardData.branch_count || 0}</span>
                                        <span className="mx-1 text-slate-300">/</span>
                                        {dashboardData.max_branches} Branches
                                    </span>
                                </div>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${(() => {
                                            const pct = ((dashboardData.global_kpis?.total_branches || dashboardData.branch_count || 0) / dashboardData.max_branches) * 100;
                                            if (pct >= 100) return 'bg-rose-500';
                                            if (pct >= 80) return 'bg-amber-500';
                                            return 'bg-indigo-500';
                                        })()}`}
                                        style={{ width: `${Math.min(100, ((dashboardData.global_kpis?.total_branches || dashboardData.branch_count || 0) / dashboardData.max_branches) * 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <p className="text-slate-500 text-sm mt-1">Monitor all branches and their current health status.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 group"
                >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                    Create Branch
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
                <div className="p-3 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                    <div className="relative w-full sm:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={14} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search branches..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all shadow-sm"
                        />
                    </div>
                    
                    <div className="flex p-1 bg-slate-100/80 rounded-lg border border-slate-200/60 overflow-x-auto hide-scrollbar">
                        {["All Statuses", "Active", "Inactive"].map((status) => (
                            <button
                                key={status}
                                onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
                                className={`px-4 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                                    statusFilter === status 
                                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mobile View List (spacious and clear on small screens) */}
                <div className="block md:hidden divide-y divide-slate-100 bg-white">
                    {isLoading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="p-4 space-y-4 animate-pulse">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="h-5 bg-slate-200 rounded w-32"></div>
                                        <div className="h-3 bg-slate-100 rounded w-24"></div>
                                    </div>
                                    <div className="h-6 bg-slate-100 rounded-full w-16"></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                                    <div className="flex justify-between py-0.5"><div className="h-3 bg-slate-200 rounded w-16"></div><div className="h-3 bg-slate-200 rounded w-6"></div></div>
                                    <div className="flex justify-between py-0.5"><div className="h-3 bg-slate-200 rounded w-16"></div><div className="h-3 bg-slate-200 rounded w-6"></div></div>
                                    <div className="flex justify-between py-0.5 col-span-2 border-t border-slate-100/60 pt-1.5 mt-1.5"><div className="h-3 bg-slate-200 rounded w-24"></div><div className="h-3 bg-slate-200 rounded w-20"></div></div>
                                    <div className="flex justify-between py-0.5 col-span-2 border-t border-slate-100/60 pt-1.5"><div className="h-3 bg-slate-200 rounded w-20"></div><div className="h-3 bg-slate-200 rounded w-4"></div></div>
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                    <div className="h-8 w-8 bg-slate-200 rounded"></div>
                                    <div className="h-8 w-8 bg-slate-200 rounded"></div>
                                    <div className="h-8 w-24 bg-slate-200 rounded"></div>
                                </div>
                            </div>
                        ))
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
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium shrink-0 border ${
                                        branch.health !== 'Offline' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' : 
                                        'bg-slate-50 text-slate-600 border-slate-200/50'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${branch.health !== 'Offline' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                        {branch.health !== 'Offline' ? 'Active' : 'Inactive'}
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
                                        <div className="flex items-center gap-2">
                                            {(() => {
                                                const pct = ((branch.serving || 0) / (branch.sessions || 1)) * 100;
                                                if (pct >= 80) {
                                                    return (
                                                        <div className="relative flex h-2 w-2" title="High Traffic Surge">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                            <span className="font-bold text-slate-900">{branch.avg_wait_time || "0m"}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 col-span-2 border-t border-slate-100/60 pt-1.5">
                                        <span className="text-slate-500 font-medium">Counters Busy</span>
                                        <span className="font-bold text-slate-900">{branch.serving || 0} <span className="text-slate-400 font-medium">of {branch.sessions || 0}</span></span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 col-span-2 border-t border-slate-100/60 pt-1.5">
                                        <span className="text-slate-500 font-medium">Staff Online</span>
                                        <span className="font-bold text-slate-900">{branch.online_staff || 0}</span>
                                    </div>
                                </div>

                                {/* Row 3: Action Buttons */}
                                <div className="flex items-center justify-end gap-2 pt-1">
                                    <div className="flex items-center justify-end gap-2 flex-1">
                                        <Link
                                            href={`/organization-admin/branches/${branch.id}/admin#token=${getToken("org_admin") || ""}`}
                                            target="_blank"
                                            title="Visit Website"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors shadow-sm"
                                        >
                                            Dashboard
                                            <ExternalLink size={12} className="opacity-70" />
                                        </Link>
                                        
                                        <div className="relative inline-block text-left">
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation();
                                                    e.nativeEvent.stopImmediatePropagation();
                                                    setOpenDropdownId(openDropdownId === branch.id ? null : branch.id); 
                                                }}
                                                className={`p-1.5 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
                                                    openDropdownId === branch.id 
                                                        ? 'bg-slate-100 text-slate-700' 
                                                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                                }`}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                            {openDropdownId === branch.id && (
                                                <div 
                                                    className="absolute right-0 bottom-full mb-2 w-44 bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-200/60 z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1.5"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.nativeEvent.stopImmediatePropagation();
                                                    }}
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedBranch(branch);
                                                            setIsEditModalOpen(true);
                                                            setOpenDropdownId(null);
                                                        }}
                                                        className="flex items-center w-full px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors group"
                                                    >
                                                        <Pencil size={14} className="mr-2.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                        Edit Branch
                                                    </button>
                                                    <Link
                                                        href={`/organization-admin/branches/${branch.id}`}
                                                        className="flex items-center w-full px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors group mt-0.5"
                                                    >
                                                        <Eye size={14} className="mr-2.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                        View Details
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop View Table (visible on medium & large screens) */}
                <div className="hidden md:block overflow-x-auto min-h-[180px]">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th 
                                    className="px-4 py-3 text-xs font-medium text-slate-500 text-left cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => handleSort("name")}
                                >
                                    <div className="flex items-center gap-1.5">
                                        Branch Details
                                        {sortField === "name" ? (sortDirection === "asc" ? <ArrowUp size={12} className="text-slate-700" /> : <ArrowDown size={12} className="text-slate-700" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-xs font-medium text-slate-500 text-left cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => handleSort("status")}
                                >
                                    <div className="flex items-center gap-1.5">
                                        Status
                                        {sortField === "status" ? (sortDirection === "asc" ? <ArrowUp size={12} className="text-slate-700" /> : <ArrowDown size={12} className="text-slate-700" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-xs font-medium text-slate-500 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => handleSort("queues")}
                                >
                                    <div className="flex items-center justify-end gap-1.5">
                                        Active Queues
                                        {sortField === "queues" ? (sortDirection === "asc" ? <ArrowUp size={12} className="text-slate-700" /> : <ArrowDown size={12} className="text-slate-700" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-xs font-medium text-slate-500 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => handleSort("serving_capacity")}
                                >
                                    <div className="flex items-center justify-end gap-1.5 relative group">
                                        Counters Busy 
                                        <div className="cursor-help text-slate-400">
                                            <Info size={14} />
                                        </div>
                                        {sortField === "serving_capacity" ? (sortDirection === "asc" ? <ArrowUp size={12} className="text-slate-700" /> : <ArrowDown size={12} className="text-slate-700" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                                        {/* Custom Tailwind Tooltip */}
                                        <div className="absolute top-full right-0 mt-2 w-56 p-2.5 bg-slate-900 text-white text-xs rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 normal-case tracking-normal font-medium text-left pointer-events-none">
                                            Shows how many open counters are actively serving a customer right now vs total open counters.
                                            {/* Tooltip Arrow */}
                                            <div className="absolute bottom-full right-4 border-4 border-transparent border-b-slate-900"></div>
                                        </div>
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-xs font-medium text-slate-500 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => handleSort("wait_time")}
                                >
                                    <div className="flex items-center justify-end gap-1.5">
                                        Live Wait Time
                                        {sortField === "wait_time" ? (sortDirection === "asc" ? <ArrowUp size={12} className="text-slate-700" /> : <ArrowDown size={12} className="text-slate-700" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                                    </div>
                                </th>
                                <th 
                                    className="px-4 py-3 text-xs font-medium text-slate-500 text-right cursor-pointer hover:bg-slate-100/50 transition-colors"
                                    onClick={() => handleSort("online_staff")}
                                >
                                    <div className="flex items-center justify-end gap-1.5">
                                        Staff Online
                                        {sortField === "online_staff" ? (sortDirection === "asc" ? <ArrowUp size={12} className="text-slate-700" /> : <ArrowDown size={12} className="text-slate-700" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-xs font-medium text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 py-4">
                                            <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                                            <div className="h-3 bg-slate-100 rounded w-24"></div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="h-5 bg-slate-100 rounded-full w-16"></div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="h-4 bg-slate-200 rounded w-8 ml-auto"></div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="h-3 bg-slate-200 rounded w-20 ml-auto mb-1.5"></div>
                                            <div className="h-1.5 bg-slate-100 rounded w-full max-w-[120px] ml-auto"></div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="h-4 bg-slate-200 rounded w-10 ml-auto"></div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="h-4 bg-slate-200 rounded w-6 ml-auto"></div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <div className="h-7 w-7 bg-slate-200 rounded"></div>
                                                <div className="h-7 w-7 bg-slate-200 rounded"></div>
                                                <div className="h-7 w-20 bg-slate-200 rounded"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
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
                                paginatedBranches.map((branch, index) => {
                                    const isLastFew = index >= paginatedBranches.length - 2 && paginatedBranches.length > 2;
                                    return (
                                    <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group border-b border-slate-50 last:border-b-0">
                                        <td className="px-4 py-3 text-left">
                                            <div className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-sm">{branch.name}</div>
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
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                                                branch.health !== 'Offline' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' : 
                                                'bg-slate-50 text-slate-600 border-slate-200/50'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${branch.health !== 'Offline' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                {branch.health !== 'Offline' ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className={`font-medium text-sm ${branch.queues === 0 ? 'text-slate-400' : 'text-slate-700'}`}>{branch.queues}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end">
                                                <span className="font-semibold text-slate-900">{branch.serving || 0} <span className="text-slate-400 font-medium">of {branch.sessions || 0}</span></span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {(() => {
                                                    const pct = ((branch.serving || 0) / (branch.sessions || 1)) * 100;
                                                    if (pct >= 80) {
                                                        return (
                                                            <div className="relative flex h-2 w-2" title="High Traffic Surge">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                                <div className={`font-medium text-sm ${!branch.avg_wait_time || branch.avg_wait_time === '0m' ? 'text-slate-400' : 'text-slate-700'}`}>{branch.avg_wait_time || "0m"}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className={`font-medium text-sm ${!branch.online_staff || branch.online_staff === 0 ? 'text-slate-400' : 'text-slate-700'}`}>{branch.online_staff || 0}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="relative group/tooltip inline-block">
                                                    <Link
                                                        href={`/organization-admin/branches/${branch.id}/admin#token=${getToken("org_admin") || ""}`}
                                                        target="_blank"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors shadow-sm"
                                                    >
                                                        Dashboard
                                                        <ExternalLink size={12} className="opacity-70" />
                                                    </Link>
                                                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11.5px] font-medium whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 shadow-lg z-[99]">
                                                        Visit website
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900" />
                                                    </div>
                                                </div>
                                                <div className="relative inline-block text-left">
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation();
                                                            e.nativeEvent.stopImmediatePropagation();
                                                            setOpenDropdownId(openDropdownId === branch.id ? null : branch.id); 
                                                        }}
                                                        className={`p-1.5 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
                                                            openDropdownId === branch.id 
                                                                ? 'bg-slate-100 text-slate-700' 
                                                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                                        }`}
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>
                                                    {openDropdownId === branch.id && (
                                                        <div 
                                                            className={`absolute right-0 w-44 bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-200/60 z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1.5 ${isLastFew ? 'bottom-full mb-2 slide-in-from-bottom-2' : 'top-full mt-2 slide-in-from-top-2'}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.nativeEvent.stopImmediatePropagation();
                                                            }}
                                                        >
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedBranch(branch);
                                                                    setIsEditModalOpen(true);
                                                                    setOpenDropdownId(null);
                                                                }}
                                                                className="flex items-center w-full px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors group"
                                                            >
                                                                <Pencil size={14} className="mr-2.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                                Edit Branch
                                                            </button>
                                                            <Link
                                                                href={`/organization-admin/branches/${branch.id}`}
                                                                className="flex items-center w-full px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors group mt-0.5"
                                                            >
                                                                <Eye size={14} className="mr-2.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                                                View Details
                                                            </Link>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                    
                                                </div>
                
                {/* Advanced Pagination Footer */}
                <div className="px-5 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                            Rows per page:
                        </span>
                        <div className="relative">
                            <select 
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg py-1.5 pl-3 pr-7 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all shadow-sm"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="w-px h-4 bg-slate-200 hidden sm:block mx-1"></div>
                        <span className="text-[11px] font-medium text-slate-500 hidden sm:inline-block">
                            <strong className="text-slate-900 font-bold">{filteredBranches.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredBranches.length)}</strong> of <strong className="text-slate-900 font-bold">{filteredBranches.length}</strong>
                        </span>
                    </div>

                    <div className="flex items-center justify-center gap-1 w-full sm:w-auto">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1 || filteredBranches.length === 0} 
                            className="p-1.5 border border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg disabled:text-slate-300 disabled:bg-transparent disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 rotate-180" />
                        </button>
                        
                        <div className="flex items-center gap-1 px-2">
                            {Array.from({ length: totalPages }).map((_, i) => {
                                // Simple logic to show current, prev, next, first, last
                                const pageNum = i + 1;
                                if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                                currentPage === pageNum 
                                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                    return <span key={pageNum} className="text-slate-400 text-xs px-1">...</span>;
                                }
                                return null;
                            })}
                        </div>

                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages || filteredBranches.length === 0} 
                            className="p-1.5 border border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg disabled:text-slate-300 disabled:bg-transparent disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
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
