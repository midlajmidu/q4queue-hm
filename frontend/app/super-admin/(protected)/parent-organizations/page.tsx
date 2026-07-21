"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ParentOrganization, ParentOrganizationCreate } from "@/types/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ParentOrgRow from "./ParentOrgRow";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

export default function ParentOrganizationsPage() {
    const [parents, setParents] = useState<ParentOrganization[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formData, setFormData] = useState<ParentOrganizationCreate>({ name: "", slug: "", contact_email: "", contact_phone: "" });
    const [creating, setCreating] = useState(false);

    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    const fetchParents = async () => {
        setLoading(true);
        try {
            const data = await api.listParentOrganizations({
                search: searchTerm || undefined,
                status: statusFilter === "all" ? undefined : statusFilter,
                skip: (page - 1) * limit,
                limit
            });
            setParents(data.items);
            setTotal(data.total);
        } catch (error: any) {
            toast.error(error.detail || "Failed to load parent organizations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParents();
    }, [searchTerm, statusFilter, page]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchTerm(searchInput);
        setPage(1);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const finalSlug = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            await api.createParentOrganization({ ...formData, slug: finalSlug });
            toast.success("Parent Organization created successfully");
            setIsCreateModalOpen(false);
            setFormData({ name: "", slug: "", contact_email: "", contact_phone: "" });
            fetchParents();
        } catch (error: any) {
            toast.error(error.detail || "Failed to create");
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Parent Organizations</h1>
                        <p className="text-sm text-slate-400 mt-1">Manage top-level organizations and their assigned branches.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search parent organizations..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </form>

                    <div className="flex gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-auto">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full sm:w-auto pl-10 pr-10 py-2.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 appearance-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all whitespace-nowrap"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                            Add Parent Org
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900/80 backdrop-blur-2xl rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-700/50">
                        <thead className="bg-slate-800/80">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Metrics</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {parents.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                                        No parent organizations found
                                    </td>
                                </tr>
                            ) : (
                                parents.map((parent) => (
                                    <ParentOrgRow key={parent.id} parent={parent} onRefresh={fetchParents} />
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {total > 0 && (
                        <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-between bg-slate-800/30">
                            <div className="text-sm text-slate-400">
                                Showing <span className="font-medium text-slate-200">{(page - 1) * limit + 1}</span> to{" "}
                                <span className="font-medium text-slate-200">{Math.min(page * limit, total)}</span> of{" "}
                                <span className="font-medium text-slate-200">{total}</span> results
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page * limit >= total}
                                    className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)} />
                    <div className="relative bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-white mb-6">Create Parent Organization</h3>
                        <form onSubmit={handleCreate} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Organization Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        const autoSlug = newName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                                        setFormData({ ...formData, name: newName, slug: autoSlug });
                                    }}
                                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-500 transition-all shadow-inner"
                                    placeholder="e.g. HM Leisure"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Contact Email</label>
                                <input
                                    type="email"
                                    value={formData.contact_email}
                                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-500 transition-all shadow-inner"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Branch Limit (Optional)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.max_branches || ""}
                                    onChange={(e) => setFormData({ ...formData, max_branches: e.target.value ? parseInt(e.target.value) : null })}
                                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 placeholder:text-slate-500 transition-all shadow-inner"
                                    placeholder="Leave empty for unlimited"
                                />
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-950/50 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors mt-4">
                                <input
                                    type="checkbox"
                                    checked={formData.enable_shared_tokens || false}
                                    onChange={(e) => setFormData({ ...formData, enable_shared_tokens: e.target.checked })}
                                    className="h-4.5 w-4.5 text-indigo-600 focus:ring-indigo-500/30 bg-slate-900 border-slate-600 rounded"
                                />
                                <div>
                                    <div className="text-sm font-semibold text-slate-200">Enable Shared Tokens</div>
                                    <div className="text-xs text-slate-400 mt-0.5">Allow customers with pax count &gt; 1 to be served on multiple lanes</div>
                                </div>
                            </label>
                            <div className="pt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-600 rounded-lg hover:bg-slate-700 hover:text-white transition-all shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-lg shadow-indigo-500/30 disabled:opacity-50 transition-all duration-200"
                                >
                                    {creating ? "Creating..." : "Create Organization"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
