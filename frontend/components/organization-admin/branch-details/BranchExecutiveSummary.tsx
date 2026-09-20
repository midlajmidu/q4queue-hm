"use client";
import { Users, CheckCircle2, UserX, Layers } from "lucide-react";

export default function BranchExecutiveSummary({ data }: { data: any }) {
    if (!data) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between h-[120px] animate-pulse">
                        <div className="flex justify-between items-start w-full">
                            <div className="w-24 h-4 bg-slate-100 rounded-md"></div>
                            <div className="w-8 h-8 rounded-lg bg-slate-100"></div>
                        </div>
                        <div className="w-16 h-8 bg-slate-100 rounded-md mt-auto"></div>
                    </div>
                ))}
            </div>
        );
    }

    const totalCustomers = data.total_customers ?? data.tokens_issued_today ?? 0;
    const served = data.customers_served ?? data.customers_served_today ?? 0;
    const skipped = data.customers_skipped ?? 0;
    const completionRate = data.completion_rate || (totalCustomers > 0 ? `${Math.round((served / totalCustomers) * 100)}%` : "0%");
    const skipRate = data.skip_rate || (totalCustomers > 0 ? `${Math.round((skipped / totalCustomers) * 100)}%` : "0%");

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* CARD 1: Total Customers */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 flex flex-col justify-between group hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all">
                <div className="flex justify-between items-center mb-3">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Customers</div>
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                        <Users size={16} strokeWidth={2.5} />
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums leading-none">
                        {totalCustomers.toLocaleString()}
                    </div>
                    <p className="text-[11px] font-medium text-slate-400 mt-2">
                        Total tickets issued
                    </p>
                </div>
            </div>

            {/* CARD 2: Served */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 flex flex-col justify-between group hover:border-emerald-200 hover:shadow-[0_4px_12px_rgba(16,185,129,0.06)] transition-all">
                <div className="flex justify-between items-center mb-3">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Served</div>
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                        <CheckCircle2 size={16} strokeWidth={2.5} />
                    </div>
                </div>
                <div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums leading-none">
                            {served.toLocaleString()}
                        </div>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {completionRate}
                        </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-400 mt-2">
                        Completed consultations
                    </p>
                </div>
            </div>

            {/* CARD 3: Skipped */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 flex flex-col justify-between group hover:border-rose-200 hover:shadow-[0_4px_12px_rgba(244,63,94,0.06)] transition-all">
                <div className="flex justify-between items-center mb-3">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Skipped</div>
                    <div className="p-2 bg-rose-50 rounded-lg text-rose-600 border border-rose-100 group-hover:bg-rose-100 transition-colors">
                        <UserX size={16} strokeWidth={2.5} />
                    </div>
                </div>
                <div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums leading-none">
                            {skipped.toLocaleString()}
                        </div>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {skipRate}
                        </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-400 mt-2">
                        No-shows & cancelled
                    </p>
                </div>
            </div>

            {/* CARD 4: Queues & Staff */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 flex flex-col justify-between group hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all">
                <div className="flex justify-between items-center mb-3">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Queues & Staff</div>
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-500 border border-slate-100 group-hover:bg-slate-100 transition-colors">
                        <Layers size={16} strokeWidth={2.5} />
                    </div>
                </div>
                <div>
                    <div className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums leading-none">
                        {data.active_queues ?? 0}
                    </div>
                    <p className="text-[11px] font-medium text-slate-400 mt-2">
                        Queues active &bull; {data.total_staff ?? 0} staff members
                    </p>
                </div>
            </div>

        </div>
    );
}