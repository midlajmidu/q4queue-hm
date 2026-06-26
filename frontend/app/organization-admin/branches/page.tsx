"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Plus, Search, Building2, Eye, ExternalLink } from "lucide-react";
import Link from "next/link";
import CreateBranchModal from "@/components/organization-admin/CreateBranchModal";

export default function BranchesPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Statuses");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const loadBranches = useCallback(async () => {
        try {
            const data = await api.getOrgAdminBranchesOverview();
            setBranches(data);
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Branch Overview</h1>
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
                <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white">
                    <div className="relative w-72">
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
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest mr-2">Filter</label>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-slate-200 bg-slate-50 text-slate-700 text-sm rounded-md py-1.5 pl-3 pr-8 outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="All Statuses">All Statuses</option>
                            <option value="Healthy">Healthy</option>
                            <option value="Warning">Warning</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-slate-50/80 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-left">Branch Details</th>
                                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-left">Status</th>
                                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Active Queues</th>
                                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Live Wait Time</th>
                                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Staff Online</th>
                                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                                        Loading branch overview...
                                    </td>
                                </tr>
                            ) : filteredBranches.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-slate-50 text-slate-400 mb-3 border border-slate-200 shadow-sm">
                                            <Building2 size={20} />
                                        </div>
                                        <p className="text-slate-600 font-medium text-sm">No branches found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredBranches.map((branch) => (
                                    <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                                        <td className="px-4 py-3 text-left">
                                            <div className="font-semibold text-slate-900 hover:text-blue-600 transition-colors text-sm">{branch.name}</div>
                                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">Ref: {branch.slug}</div>
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
                                            <div className={`font-medium text-sm ${!branch.avg_wait_time || branch.avg_wait_time === '0m' ? 'text-slate-400' : 'text-slate-700'}`}>{branch.avg_wait_time || "0m"}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className={`font-medium text-sm ${!branch.online_staff || branch.online_staff === 0 ? 'text-slate-400' : 'text-slate-700'}`}>{branch.online_staff || 0}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/organization-admin/branches/${branch.id}`}
                                                    className="inline-flex items-center justify-center p-1.5 text-slate-400 bg-transparent hover:bg-slate-100 hover:text-slate-600 rounded-md transition-colors"
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </Link>
                                                <a
                                                    href={`/${branch.slug}/dashboard`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-sm"
                                                >
                                                    <ExternalLink size={14} />
                                                    Dashboard
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Clean Table Footer */}
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">
                        Showing <strong className="text-slate-900 font-bold">{filteredBranches.length > 0 ? 1 : 0}-{filteredBranches.length}</strong> of <strong className="text-slate-900 font-bold">{branches.length}</strong> Branches
                    </p>
                    <div className="flex items-center gap-2">
                        <button disabled className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-md text-xs font-bold uppercase tracking-wider disabled:text-slate-300 disabled:bg-transparent disabled:hover:bg-transparent disabled:border-slate-100 disabled:cursor-not-allowed transition-colors">
                            Previous
                        </button>
                        <button disabled className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-md text-xs font-bold uppercase tracking-wider disabled:text-slate-300 disabled:bg-transparent disabled:hover:bg-transparent disabled:border-slate-100 disabled:cursor-not-allowed transition-colors">
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
        </div>
    );
}
