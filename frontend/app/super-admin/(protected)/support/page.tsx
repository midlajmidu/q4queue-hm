"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { setToken, setSuperAdminToken, getToken } from "@/lib/auth";
import type { OrgDetail } from "@/types/api";

export default function SupportToolsPage() {
    const [orgs, setOrgs] = useState<OrgDetail[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [impersonatingOrgId, setImpersonatingOrgId] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                // Fetch up to 100 orgs for support purposes
                const res = await api.listOrganizations({ limit: 100 });
                setOrgs(res.items);
            } catch (err) {
                console.error("Failed to load organizations", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrgs();
    }, []);

    const handleImpersonate = async (org: OrgDetail) => {
        if (!confirm(`Are you sure you want to login as ${org.name} admin? All your actions will be audited.`)) return;

        setImpersonatingOrgId(org.id);
        try {
            const currentToken = getToken();
            const response = await api.impersonateOrganization(org.id);
            
            // Save the current SA token so we can restore it later
            if (currentToken) {
                setSuperAdminToken(currentToken);
            }
            // Set the new org token
            setToken(response.access_token);
            
            // Hard redirect to the organization dashboard so the entire app context re-initializes
            window.location.href = `/${org.slug}/dashboard`;
        } catch (err) {
            console.error("Impersonation failed", err);
            let errMsg = "Failed to impersonate organization.";
            if (err instanceof ApiError) {
                errMsg = err.detail;
            }
            alert(errMsg);
            setImpersonatingOrgId(null);
        }
    };

    const filteredOrgs = orgs.filter(o => 
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.slug.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                        Support Tools
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Troubleshoot customer issues by securely logging into organization dashboards.</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                {/* Toolbar */}
                <div className="p-5 border-b border-slate-800 bg-slate-900/50">
                    <div className="relative max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by organization name or slug..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-800/50 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Organization Name</th>
                                <th className="px-6 py-4">URL Slug</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Support Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-6 h-6 border-2 border-slate-600 border-t-sky-500 rounded-full animate-spin" />
                                            <p>Loading organizations...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredOrgs.length > 0 ? (
                                filteredOrgs.map(org => (
                                    <tr key={org.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-slate-200 font-medium">{org.name}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-400 font-mono text-xs">/{org.slug}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                org.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${org.is_active ? "bg-emerald-400" : "bg-red-400"}`} />
                                                {org.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleImpersonate(org)}
                                                disabled={impersonatingOrgId !== null}
                                                className="inline-flex items-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs"
                                            >
                                                {impersonatingOrgId === org.id ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
                                                ) : (
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                                )}
                                                Login As Organization
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        No organizations found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
