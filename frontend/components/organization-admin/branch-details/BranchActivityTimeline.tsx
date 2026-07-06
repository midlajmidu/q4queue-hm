"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

export default function BranchActivityTimeline({ branchId }: { branchId: string }) {
    const [logs, setLogs] = useState<any[]>([]);
    const [traffic, setTraffic] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.getBranchTimeline(branchId),
            api.getOrgAdminTrafficChart(branchId)
        ]).then(([timelineData, trafficData]) => {
            setLogs(timelineData.slice(0, 3)); // Only show top 3 logs to save space
            
            // Format traffic data for the mini chart
            if (trafficData && trafficData.peak_traffic) {
                setTraffic(trafficData.peak_traffic.map((pt: any) => ({
                    time: pt.hour,
                    customers: pt.customers_arrived
                })));
            }
        }).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-pulse">
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                    <div className="w-32 h-5 bg-slate-200 rounded"></div>
                </div>
                <div className="h-24 bg-slate-50 border-b border-slate-100"></div>
                <div className="p-5 space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-4">
                            <div className="w-2 h-2 rounded-full bg-slate-200 mt-1.5"></div>
                            <div className="space-y-2 flex-1">
                                <div className="w-1/4 h-4 bg-slate-200 rounded"></div>
                                <div className="w-1/2 h-3 bg-slate-100 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <span className="font-semibold text-lg tracking-tight text-slate-900">Live Activity & Traffic</span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today</span>
            </div>
            
            {/* Live Traffic Sparkline */}
            <div className="h-24 w-full bg-slate-50/50 border-b border-slate-100/70">
                {traffic.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={traffic} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="customers" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCustomers)" />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">No traffic data yet</div>
                )}
            </div>

            {/* Recent Activity Feed */}
            <div className="p-2 space-y-1">
                {logs.map((event, i) => (
                    <div key={i} className="group flex gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-default">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-500 transition-colors shrink-0 shadow-sm" />
                        <div>
                            <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{event.event_type}</div>
                            <div className="text-xs font-medium text-slate-500 mt-0.5">{event.description}</div>
                            <div className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider">
                                {new Date(event.timestamp).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                {logs.length === 0 && (
                    <div className="text-sm text-slate-500 text-center py-2">No recent activity</div>
                )}
            </div>
        </div>
    );
}
