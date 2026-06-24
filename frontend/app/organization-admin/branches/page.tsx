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

    const filteredBranches = branches.filter(b => 
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search branches..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <th className="p-4">Branch</th>
                                <th className="p-4">Health</th>
                                <th className="p-4 text-center">Total Sessions</th>
                                <th className="p-4 text-center">Total Queues</th>
                                <th className="p-4 text-center">Total Served</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500">
                                        Loading branch overview...
                                    </td>
                                </tr>
                            ) : filteredBranches.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                                            <Building2 size={24} />
                                        </div>
                                        <p className="text-slate-500">No branches found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredBranches.map((branch) => (
                                    <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-slate-900">{branch.name}</div>
                                            <div className="text-xs text-slate-500 mt-1">{branch.slug}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    branch.health === 'Healthy' ? 'bg-green-100 text-green-800' : 
                                                    branch.health === 'Warning' ? 'bg-amber-100 text-amber-800' : 
                                                    'bg-slate-100 text-slate-800'
                                                }`}>
                                                    {branch.health === 'Healthy' ? '🟢' : branch.health === 'Warning' ? '🟡' : '🔴'} {branch.health}
                                                </span>
                                                {branch.alerts && branch.alerts.map((alert: string, idx: number) => (
                                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-100">
                                                        ⚠ {alert}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="font-medium text-slate-700">{branch.sessions}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="font-medium text-slate-700">{branch.queues}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="font-medium text-slate-700">{branch.served_today}</div>
                                        </td>
                                        <td className="p-4 text-right space-x-2 whitespace-nowrap">
                                            <Link
                                                href={`/organization-admin/branches/${branch.id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                                            >
                                                <Eye size={14} />
                                                View
                                            </Link>
                                            <a
                                                href={`/${branch.slug}/dashboard`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                                            >
                                                <ExternalLink size={14} />
                                                Dashboard
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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
