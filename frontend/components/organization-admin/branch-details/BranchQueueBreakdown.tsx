"use client";
import { useState, useMemo } from "react";
import { List, Search, ArrowUpDown } from "lucide-react";

export default function BranchQueueBreakdown({ data }: { data: any[] }) {
    const [search, setSearch] = useState("");
    const [sortField, setSortField] = useState<string>("total_customers");
    const [sortAsc, setSortAsc] = useState(false);

    const queues = data || [];

    const filteredQueues = useMemo(() => {
        let result = queues;
        if (search.trim()) {
            const query = search.toLowerCase();
            result = result.filter(q => 
                (q.queue_name && q.queue_name.toLowerCase().includes(query)) ||
                (q.queue_prefix && q.queue_prefix.toLowerCase().includes(query))
            );
        }

        return [...result].sort((a, b) => {
            let valA = a[sortField] ?? 0;
            let valB = b[sortField] ?? 0;
            if (typeof valA === "string") valA = valA.toLowerCase();
            if (typeof valB === "string") valB = valB.toLowerCase();
            if (valA < valB) return sortAsc ? -1 : 1;
            if (valA > valB) return sortAsc ? 1 : -1;
            return 0;
        });
    }, [queues, search, sortField, sortAsc]);

    // Totals across all filtered queues
    const totals = useMemo(() => {
        return filteredQueues.reduce((acc, q) => {
            acc.total += q.total_customers ?? 0;
            acc.served += q.served_count ?? q.completed_today ?? 0;
            acc.skipped += q.skipped_count ?? 0;
            acc.waiting += q.waiting_count ?? 0;
            return acc;
        }, { total: 0, served: 0, skipped: 0, waiting: 0 });
    }, [filteredQueues]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    };

    if (!data) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-pulse">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="w-36 h-5 bg-slate-200 rounded"></div>
                    <div className="w-48 h-8 bg-slate-200 rounded-lg"></div>
                </div>
                <div className="p-5 space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex justify-between items-center">
                            <div className="w-1/4 h-4 bg-slate-100 rounded"></div>
                            <div className="w-1/6 h-4 bg-slate-100 rounded"></div>
                            <div className="w-1/6 h-4 bg-slate-100 rounded"></div>
                            <div className="w-1/6 h-4 bg-slate-100 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Header + Search */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-white rounded-md text-indigo-600 border border-slate-200 shadow-xs">
                        <List size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-[13px] uppercase tracking-wider">Queue Breakdown</h3>
                        <p className="text-[11px] text-slate-400 font-medium">Performance and customer flow by queue</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative w-48 sm:w-56">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Filter queues..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                        {filteredQueues.length} {filteredQueues.length === 1 ? "Queue" : "Queues"}
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/60 border-b border-slate-200 text-slate-500">
                        <tr>
                            <th 
                                onClick={() => handleSort("queue_name")}
                                className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wider cursor-pointer hover:text-slate-900 transition-colors whitespace-nowrap"
                            >
                                <div className="flex items-center gap-1.5">
                                    Queue Name
                                    <ArrowUpDown size={11} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-center whitespace-nowrap">
                                Status
                            </th>
                            <th 
                                onClick={() => handleSort("total_customers")}
                                className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-right cursor-pointer hover:text-slate-900 transition-colors whitespace-nowrap"
                            >
                                <div className="flex items-center justify-end gap-1.5">
                                    Total
                                    <ArrowUpDown size={11} />
                                </div>
                            </th>
                            <th 
                                onClick={() => handleSort("served_count")}
                                className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-right cursor-pointer hover:text-slate-900 transition-colors whitespace-nowrap"
                            >
                                <div className="flex items-center justify-end gap-1.5">
                                    Served
                                    <ArrowUpDown size={11} />
                                </div>
                            </th>
                            <th 
                                onClick={() => handleSort("skipped_count")}
                                className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-right cursor-pointer hover:text-slate-900 transition-colors whitespace-nowrap"
                            >
                                <div className="flex items-center justify-end gap-1.5">
                                    Skipped
                                    <ArrowUpDown size={11} />
                                </div>
                            </th>
                            <th 
                                onClick={() => handleSort("waiting_count")}
                                className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-center cursor-pointer hover:text-slate-900 transition-colors whitespace-nowrap"
                            >
                                <div className="flex items-center justify-center gap-1.5">
                                    Waiting
                                    <ArrowUpDown size={11} />
                                </div>
                            </th>
                            <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-center whitespace-nowrap">
                                Current
                            </th>
                            <th className="px-4 py-3 text-[10.5px] font-bold uppercase tracking-wider text-right whitespace-nowrap">
                                Avg Wait
                            </th>
                            <th className="px-5 py-3 text-[10.5px] font-bold uppercase tracking-wider text-right whitespace-nowrap">
                                Avg Service
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredQueues.map((q, i) => {
                            const total = q.total_customers ?? 0;
                            const served = q.served_count ?? q.completed_today ?? 0;
                            const skipped = q.skipped_count ?? 0;
                            const compRate = q.completion_rate || (total > 0 ? `${Math.round((served / total) * 100)}%` : "-");

                            return (
                                <tr key={q.queue_id || i} className="hover:bg-slate-50/60 transition-colors group">
                                    {/* Queue Name */}
                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {q.queue_prefix && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                                    {q.queue_prefix}
                                                </span>
                                            )}
                                            <span className="text-[13px] font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                {q.queue_name}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide uppercase ${
                                            q.status === 'Active' 
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${q.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            {q.status}
                                        </span>
                                    </td>

                                    {/* Total Customers */}
                                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                        <span className="text-[13px] font-extrabold text-slate-900 tabular-nums">
                                            {total}
                                        </span>
                                    </td>

                                    {/* Served */}
                                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                        <div className="inline-flex flex-col items-end">
                                            <span className="text-[13px] font-bold text-emerald-600 tabular-nums">
                                                {served}
                                            </span>
                                            {total > 0 && (
                                                <span className="text-[10px] font-semibold text-slate-400">
                                                    {compRate}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Skipped */}
                                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                        <span className={`text-[13px] font-bold tabular-nums ${skipped > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                            {skipped}
                                        </span>
                                    </td>

                                    {/* Waiting */}
                                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                        <span className={`inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                                            q.waiting_count > 0 
                                                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                                : 'text-slate-400'
                                        }`}>
                                            {q.waiting_count ?? 0}
                                        </span>
                                    </td>

                                    {/* Current Token */}
                                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                        <span className="text-xs font-mono font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200/80">
                                            {q.current_token || '-'}
                                        </span>
                                    </td>

                                    {/* Avg Wait */}
                                    <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                                        {q.average_wait || '-'}
                                    </td>

                                    {/* Avg Service */}
                                    <td className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                                        {q.average_service_time || '-'}
                                    </td>
                                </tr>
                            );
                        })}

                        {filteredQueues.length === 0 && (
                            <tr>
                                <td colSpan={9} className="p-12 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                                            <List size={18} strokeWidth={2} className="text-slate-400" />
                                        </div>
                                        <p className="text-[13px] font-bold text-slate-800 mb-1">
                                            {search ? "No matching queues" : "No queues found"}
                                        </p>
                                        <p className="text-xs text-slate-400 max-w-[220px]">
                                            {search ? "Try adjusting your search filter." : "This branch currently has no queues configured."}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>

                    {/* Totals Footer Row */}
                    {filteredQueues.length > 0 && (
                        <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-slate-900 font-bold text-xs">
                            <tr>
                                <td className="px-5 py-3 uppercase tracking-wider font-extrabold text-[11px] text-slate-600">
                                    Total ({filteredQueues.length} Queues)
                                </td>
                                <td className="px-4 py-3 text-center text-slate-400">—</td>
                                <td className="px-4 py-3 text-right text-[13px] tabular-nums font-black text-slate-900">
                                    {totals.total}
                                </td>
                                <td className="px-4 py-3 text-right text-[13px] tabular-nums font-black text-emerald-600">
                                    {totals.served}
                                </td>
                                <td className="px-4 py-3 text-right text-[13px] tabular-nums font-black text-rose-600">
                                    {totals.skipped}
                                </td>
                                <td className="px-4 py-3 text-center text-xs tabular-nums font-black text-slate-700">
                                    {totals.waiting}
                                </td>
                                <td className="px-4 py-3 text-center text-slate-400">—</td>
                                <td className="px-4 py-3 text-right text-slate-400">—</td>
                                <td className="px-5 py-3 text-right text-slate-400">—</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}
