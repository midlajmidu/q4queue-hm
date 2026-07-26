"use client";

import { useEffect, useState } from "react";
import { useBranchFilter } from "@/context/BranchFilterContext";
import { api } from "@/lib/api";
import { Building2, ChevronDown } from "lucide-react";

export default function BranchSelector() {
    const { selectedBranchId, setSelectedBranchId } = useBranchFilter();
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getOrgAdminBranchesOverview()
            .then(data => setBranches(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="h-9 w-44 bg-slate-100 rounded-xl animate-pulse" />;

    return (
        <div className="relative inline-flex items-center">
            <select
                value={selectedBranchId || ""}
                onChange={(e) => setSelectedBranchId(e.target.value || null)}
                className="appearance-none pl-9 pr-8 py-2 bg-white border border-slate-200/80 text-slate-700 text-sm font-medium rounded-xl hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm cursor-pointer min-w-[160px]"
            >
                <option value="">All Branches</option>
                {branches.map(b => (
                    <option key={b.id} value={b.id}>
                        {b.name}
                    </option>
                ))}
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Building2 size={15} />
            </div>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-300">
                <ChevronDown size={13} />
            </div>
        </div>
    );
}
