const fs = require('fs');
const path = '/Users/muzammil/Documents/q4queue/q4queue-hm/frontend/app/organization-admin/analytics/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const sStart = '            {/* Merged High-Density KPI Cards */}';
const sEnd = '            {/* Volume Trend Chart */}';

const iStart = content.indexOf(sStart);
const iEnd = content.indexOf(sEnd);

if (iStart === -1 || iEnd === -1) {
    console.error("Markers not found");
    process.exit(1);
}

const replacement = `            {/* Merged High-Density KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                
                {/* Efficiency Focus */}
                <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2.5">
                            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                                <Activity size={16} />
                            </div>
                            <h2 className="font-semibold text-slate-800 text-sm">Efficiency Metrics</h2>
                        </div>
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">Average</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Clock size={14} className="text-slate-400" />
                                <span className="text-xs font-medium">Wait Time</span>
                            </div>
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">{data.time_metrics.avg_wait_time}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Zap size={14} className="text-amber-500/80" />
                                <span className="text-xs font-medium">Service Time</span>
                            </div>
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">{data.time_metrics.avg_service_time}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <CheckCircle2 size={14} className="text-emerald-500/80" />
                                <span className="text-xs font-medium">Completion</span>
                            </div>
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">{data.customer_metrics.completion_rate}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Layers size={14} className="text-blue-500/80" />
                                <span className="text-xs font-medium">
                                    {dateRange.preset === "today" ? "Live Queues" : "Queues"}
                                </span>
                            </div>
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
                                {dateRange.preset === "today" ? data.operations_metrics.active_queues : data.operations_metrics.operated_queues}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Volume Focus */}
                <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2.5">
                            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                                <Users size={16} />
                            </div>
                            <h2 className="font-semibold text-slate-800 text-sm">Volume & Scale</h2>
                        </div>
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">Total</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Users size={14} className="text-emerald-500/80" />
                                <span className="text-xs font-medium">Total Served</span>
                            </div>
                            <span className="text-2xl font-semibold text-emerald-600 tracking-tight">{data.customer_metrics.customers_served}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Activity size={14} className="text-indigo-500/80" />
                                <span className="text-xs font-medium">Waiting</span>
                            </div>
                            <span className="text-2xl font-semibold text-indigo-600 tracking-tight">{data.customer_metrics.customers_waiting}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <TrendingUp size={14} className="text-rose-500/80" />
                                <span className="text-xs font-medium">Peak Hour</span>
                            </div>
                            <span className="text-[20px] font-semibold text-rose-600 tracking-tight whitespace-nowrap">{data.time_metrics.peak_hour}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Building2 size={14} className="text-slate-700/80" />
                                <span className="text-xs font-medium">Branches</span>
                            </div>
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">{data.operations_metrics.active_branches}</span>
                        </div>
                    </div>
                </div>

                {/* Retention & Load */}
                <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-shadow md:col-span-2 xl:col-span-1">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2.5">
                            <div className="bg-rose-50 p-2 rounded-lg text-rose-600">
                                <TrendingDown size={16} />
                            </div>
                            <h2 className="font-semibold text-slate-800 text-sm">Retention & Load</h2>
                        </div>
                        <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-rose-100">Critical</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <UserMinus size={14} className="text-rose-400" />
                                <span className="text-xs font-medium">Abandoned</span>
                            </div>
                            <span className="text-2xl font-semibold text-rose-600 tracking-tight">{data.customer_metrics.customers_abandoned}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <TrendingDown size={14} className="text-rose-400" />
                                <span className="text-xs font-medium">Churn Rate</span>
                            </div>
                            <span className="text-2xl font-semibold text-rose-600 tracking-tight">{data.customer_metrics.abandonment_rate}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <UserCheck size={14} className="text-emerald-500/80" />
                                <span className="text-xs font-medium">Online Staff</span>
                            </div>
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">{data.operations_metrics.online_staff}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Target size={14} className="text-indigo-500/80" />
                                <span className="text-xs font-medium">Cust / Staff</span>
                            </div>
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
                                {data.operations_metrics.online_staff > 0 ? (data.customer_metrics.customers_waiting / data.operations_metrics.online_staff).toFixed(1) : "-"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

`;

const newContent = content.substring(0, iStart) + replacement + content.substring(iEnd);

fs.writeFileSync(path, newContent, 'utf8');
console.log("Updated KPI cards successfully");
