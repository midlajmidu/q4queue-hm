const fs = require('fs');
const path = '/Users/muzammil/Documents/q4queue/q4queue-hm/frontend/app/organization-admin/analytics/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Add missing imports
if (!content.includes('UsersRound')) {
    content = content.replace(/import \{([\s\S]*?)UserMinus, UserCheck, Target, Layers, FileText, FileSpreadsheet, ChevronDown([\s\S]*?)\} from "lucide-react";/,
        'import { $1UserMinus, UserCheck, Target, Layers, FileText, FileSpreadsheet, ChevronDown, UsersRound, BarChart2, Trophy, User$2} from "lucide-react";');
}

// 2. Premium KPI Cards Replacement
const kpiStart = content.indexOf('{/* Merged High-Density KPI Cards */}');
const kpiEnd = content.indexOf('{/* Volume Trend Chart */}');
if (kpiStart !== -1 && kpiEnd !== -1) {
    const newKpiBlock = `{/* Merged High-Density KPI Cards */}
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
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Average duration customers wait before being served.">
                                <Clock size={14} className="text-slate-400" />
                                <span className="text-xs font-medium border-b border-dashed border-slate-300">Wait Time</span>
                            </div>
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">{data.time_metrics.avg_wait_time}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Average time staff spends serving each customer.">
                                <Zap size={14} className="text-amber-500/80" />
                                <span className="text-xs font-medium border-b border-dashed border-slate-300">Service Time</span>
                            </div>
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">{data.time_metrics.avg_service_time}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Percentage of queued customers successfully served.">
                                <CheckCircle2 size={14} className="text-emerald-500/80" />
                                <span className="text-xs font-medium border-b border-dashed border-slate-300">Completion</span>
                            </div>
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">{data.customer_metrics.completion_rate}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Total number of queue lanes active in this period.">
                                <Layers size={14} className="text-blue-500/80" />
                                <span className="text-xs font-medium border-b border-dashed border-slate-300">
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
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Overall number of customers fully processed.">
                                <Users size={14} className="text-emerald-500/80" />
                                <span className="text-xs font-medium border-b border-dashed border-slate-300">Served</span>
                            </div>
                            <span className="text-2xl font-semibold text-emerald-600 tracking-tight">{data.customer_metrics.customers_served}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Current volume of customers still in queue.">
                                <Activity size={14} className="text-indigo-500/80" />
                                <span className="text-xs font-medium border-b border-dashed border-slate-300">Waiting</span>
                            </div>
                            <span className="text-2xl font-semibold text-indigo-600 tracking-tight">{data.customer_metrics.customers_waiting}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="The busiest hour by customer volume.">
                                <TrendingUp size={14} className="text-rose-500/80" />
                                <span className="text-xs font-medium border-b border-dashed border-slate-300">Peak Hour</span>
                            </div>
                            <span className="text-[17px] font-semibold text-rose-600 tracking-tight leading-tight max-w-[120px]">{data.time_metrics.peak_hour}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Number of active branches generating data.">
                                <Building2 size={14} className="text-slate-700/80" />
                                <span className="text-xs font-medium border-b border-dashed border-slate-300">Branches</span>
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
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Customers who left the queue without service.">
                                <UserMinus size={14} className="text-rose-400" />
                                <span className="text-xs font-medium border-b border-dashed border-slate-300">Abandoned</span>
                            </div>
                            <span className="text-2xl font-semibold text-rose-600 tracking-tight">{data.customer_metrics.customers_abandoned}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Percentage ratio of abandoned customers.">
                                <TrendingDown size={14} className="text-rose-400" />
                                <span className="text-xs font-medium border-b border-dashed border-slate-300">Churn Rate</span>
                            </div>
                            <span className="text-2xl font-semibold text-rose-600 tracking-tight">{data.customer_metrics.abandonment_rate}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Number of staff members currently on shift.">
                                <UserCheck size={14} className="text-emerald-500/80" />
                                <span className="text-xs font-medium border-b border-dashed border-slate-300">Staff Online</span>
                            </div>
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">{data.operations_metrics.online_staff}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Average waiting customers per online staff member.">
                                <Target size={14} className="text-indigo-500/80" />
                                <span className="text-xs font-medium border-b border-dashed border-slate-300">Load / Staff</span>
                            </div>
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
                                {data.operations_metrics.online_staff > 0 ? (data.customer_metrics.customers_waiting / data.operations_metrics.online_staff).toFixed(1) : "-"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            `;
    content = content.substring(0, kpiStart) + newKpiBlock + content.substring(kpiEnd);
}

// 3. Move Peak Traffic Analysis to full width below grid
const ptStart = content.indexOf('{/* Peak Traffic Analysis */}');
const ptEnd = content.indexOf('</div>', content.indexOf('</div>', content.indexOf('</div>', content.indexOf('</div>', ptStart) + 1) + 1) + 1) + 7; 
const ptBlock = content.substring(ptStart, content.indexOf('</div>\n\n                </div>\n\n                {/* Right Column */}'));

if (ptBlock.includes('Hourly Traffic & Wait Time')) {
    // Remove from Left Column
    content = content.replace(ptBlock, '');
    
    // Add to bottom of grid
    const gridEndMatch = content.lastIndexOf('</div>\n            </div>\n        </div>\n    );\n}');
    if (gridEndMatch !== -1) {
        content = content.substring(0, gridEndMatch) + `</div>\n\n            {/* Full Width Peak Traffic Analysis */}\n            <div className="w-full">\n                ${ptBlock}\n            </div>\n        </div>\n    );\n}`;
    }
}


fs.writeFileSync(path, content, 'utf8');
console.log("Analytics page successfully patched and re-laid out");
