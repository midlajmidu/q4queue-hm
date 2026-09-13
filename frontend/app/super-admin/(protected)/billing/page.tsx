"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Search, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminSubscriptionItem } from "@/types/api";

export default function BillingManagementPage() {
    const [items, setItems] = useState<AdminSubscriptionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        api.listSubscriptions()
            .then(setItems)
            .catch(err => setError(err instanceof Error ? err.message : "Failed to load trials"))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return items;
        return items.filter(item => `${item.organization_name} ${item.organization_slug} ${item.status}`.toLowerCase().includes(term));
    }, [items, search]);

    return (
        <div className="space-y-6 p-6 lg:p-8">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">Commercial foundation</p>
                <h1 className="mt-2 text-2xl font-bold text-white">Trials &amp; subscriptions</h1>
                <p className="mt-1 text-sm text-slate-400">Real self-service trial accounts. Payment management is not enabled yet.</p>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organisations or status" className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-indigo-500" />
            </div>

            {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}
            {loading ? (
                <div className="py-20 text-center text-sm text-slate-400">Loading subscriptions…</div>
            ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center text-sm text-slate-400">No trial subscriptions found.</div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-slate-500">
                                <tr><th className="px-5 py-3">Organisation</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Branches</th><th className="px-5 py-3">Trial ends</th><th className="px-5 py-3">Source</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map(item => {
                                    const expired = item.status === "expired";
                                    return (
                                        <tr key={item.id} className="text-slate-300 hover:bg-white/[0.025]">
                                            <td className="px-5 py-4"><p className="font-semibold text-white">{item.organization_name}</p><p className="mt-0.5 text-xs text-slate-500">{item.organization_slug}</p></td>
                                            <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-indigo-400" />{item.plan_name}</span></td>
                                            <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${expired ? "bg-rose-500/10 text-rose-300" : "bg-emerald-500/10 text-emerald-300"}`}>{item.status}</span></td>
                                            <td className="px-5 py-4">{item.branch_count}</td>
                                            <td className="px-5 py-4"><span className="inline-flex items-center gap-2"><Clock3 size={14} className="text-slate-500" />{item.status === "active" ? "Active (Unlimited)" : item.trial_ends_at ? new Date(item.trial_ends_at).toLocaleDateString() : "—"}{item.status === "trialing" && item.days_remaining != null ? ` (${item.days_remaining}d)` : ""}</span></td>
                                            <td className="px-5 py-4 text-xs text-slate-500">{item.source.replaceAll("_", " ")}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
