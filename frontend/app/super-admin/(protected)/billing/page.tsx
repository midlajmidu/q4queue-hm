"use client";

import { useState } from "react";

type DummyBillingOrg = {
    id: string;
    organization: string;
    currentPlan: string;
    subscriptionStatus: "Active" | "Past Due" | "Canceled" | "Trial";
    renewalDate: string;
    credits: number;
    hasPartnerDiscount: boolean;
};

const DUMMY_DATA: DummyBillingOrg[] = [
    { id: "1", organization: "TechCorp Inc", currentPlan: "Enterprise", subscriptionStatus: "Active", renewalDate: "Oct 15, 2026", credits: 5000, hasPartnerDiscount: true },
    { id: "2", organization: "HealthPlus Clinic", currentPlan: "Professional", subscriptionStatus: "Active", renewalDate: "Nov 01, 2026", credits: 1200, hasPartnerDiscount: false },
    { id: "3", organization: "City Bank", currentPlan: "Enterprise", subscriptionStatus: "Past Due", renewalDate: "Sep 30, 2026", credits: 0, hasPartnerDiscount: false },
    { id: "4", organization: "Fresh Market", currentPlan: "Starter", subscriptionStatus: "Active", renewalDate: "Dec 12, 2026", credits: 350, hasPartnerDiscount: true },
    { id: "5", organization: "AutoCare Services", currentPlan: "Starter", subscriptionStatus: "Trial", renewalDate: "Oct 05, 2026", credits: 100, hasPartnerDiscount: false },
];

export default function BillingManagementPage() {
    const [orgs, setOrgs] = useState<DummyBillingOrg[]>(DUMMY_DATA);
    const [search, setSearch] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const handleAction = (orgId: string, actionName: "Add Credits" | "Remove Credits" | "Toggle Discount") => {
        setActionLoading(`${orgId}-${actionName}`);
        setTimeout(() => {
            setOrgs(prev => prev.map(org => {
                if (org.id === orgId) {
                    if (actionName === "Add Credits") return { ...org, credits: org.credits + 500 };
                    if (actionName === "Remove Credits") return { ...org, credits: Math.max(0, org.credits - 500) };
                    if (actionName === "Toggle Discount") return { ...org, hasPartnerDiscount: !org.hasPartnerDiscount };
                }
                return org;
            }));
            setActionLoading(null);
        }, 600);
    };

    const filteredOrgs = orgs.filter(o => 
        o.organization.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Billing Management
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Manage organization subscriptions, credits, and partner discounts.</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Dummy Data (Testing Only)
                    </div>
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
                            placeholder="Search by organization name..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-800/50 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Organization & Plan</th>
                                <th className="px-6 py-4">Status & Renewal</th>
                                <th className="px-6 py-4 text-center">Current Credits</th>
                                <th className="px-6 py-4 text-center">Manage Credits</th>
                                <th className="px-6 py-4 text-right">Partner Discount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {filteredOrgs.length > 0 ? (
                                filteredOrgs.map(org => (
                                    <tr key={org.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-200 font-medium">{org.organization}</span>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                        org.currentPlan === "Enterprise" ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" :
                                                        org.currentPlan === "Professional" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                                        "bg-slate-800 text-slate-300 border border-slate-700"
                                                    }`}>
                                                        {org.currentPlan}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex items-center gap-1.5 w-max px-2 py-0.5 rounded-full text-xs font-medium border ${
                                                    org.subscriptionStatus === "Active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                    org.subscriptionStatus === "Trial" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                    org.subscriptionStatus === "Past Due" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                    "bg-slate-800 text-slate-400 border-slate-700"
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        org.subscriptionStatus === "Active" ? "bg-emerald-400" :
                                                        org.subscriptionStatus === "Trial" ? "bg-blue-400" :
                                                        org.subscriptionStatus === "Past Due" ? "bg-red-400" :
                                                        "bg-slate-400"
                                                    }`} />
                                                    {org.subscriptionStatus}
                                                </span>
                                                <span className="text-[11px] text-slate-500">Renews: {org.renewalDate}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-lg font-bold text-slate-200">{org.credits.toLocaleString()}</span>
                                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Credits</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => handleAction(org.id, "Remove Credits")}
                                                    disabled={actionLoading !== null || org.credits <= 0}
                                                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
                                                    title="Remove 500 Credits"
                                                >
                                                    {actionLoading === `${org.id}-Remove Credits` ? (
                                                        <div className="w-3 h-3 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
                                                    )}
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(org.id, "Add Credits")}
                                                    disabled={actionLoading !== null}
                                                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
                                                    title="Add 500 Credits"
                                                >
                                                    {actionLoading === `${org.id}-Add Credits` ? (
                                                        <div className="w-3 h-3 border-2 border-emerald-400 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end">
                                                <button 
                                                    onClick={() => handleAction(org.id, "Toggle Discount")}
                                                    disabled={actionLoading !== null}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border disabled:opacity-50 flex items-center gap-1.5 ${
                                                        org.hasPartnerDiscount 
                                                        ? "bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border-violet-500/30" 
                                                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                                                    }`}
                                                >
                                                    {actionLoading === `${org.id}-Toggle Discount` ? (
                                                        "Updating..."
                                                    ) : (
                                                        <>
                                                            {org.hasPartnerDiscount ? (
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                                                            ) : (
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                                            )}
                                                            {org.hasPartnerDiscount ? "Discount Active" : "Launch Discount"}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No organizations found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Developer Alert */}
            <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                    <h3 className="text-sm font-semibold text-amber-400">Developer Note</h3>
                    <p className="text-sm text-amber-400/80 mt-1">
                        The content on this page is currently using dummy data for UI testing and demonstration purposes. It is not yet connected to a live database.
                    </p>
                </div>
            </div>
        </div>
    );
}
