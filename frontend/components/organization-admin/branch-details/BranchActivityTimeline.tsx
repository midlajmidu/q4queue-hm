"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
                const currentHour = new Date().getHours();
                
                // Helper to parse "5 PM" to 17
                const parseHour = (hStr: string) => {
                    if (!hStr || typeof hStr !== 'string') return 9; // Fallback
                    const parts = hStr.split(' ');
                    if (parts.length !== 2) return 9;
                    const [val, ampm] = parts;
                    let h = parseInt(val);
                    if (isNaN(h)) return 9;
                    if (ampm === 'PM' && h !== 12) h += 12;
                    if (ampm === 'AM' && h === 12) h = 0;
                    return h;
                };

                // Determine the range of hours to show
                let minHour = 9; // Default start at 9 AM
                trafficData.peak_traffic.forEach((pt: any) => {
                    const h = parseHour(pt.hour);
                    if (h < minHour) minHour = h;
                });
                
                const endHour = Math.max(currentHour, minHour + 4);
                
                const fullDayData = [];
                for (let i = minHour; i <= endHour; i++) {
                    const ampm = i < 12 ? "AM" : "PM";
                    const disp = i <= 12 ? (i === 0 ? 12 : i) : i - 12;
                    const hourStr = `${disp} ${ampm}`;
                    
                    const existing = trafficData.peak_traffic.find((pt: any) => pt.hour === hourStr);
                    fullDayData.push({
                        time: hourStr,
                        customers: existing ? existing.customers_arrived : 0
                    });
                }
                
                setTraffic(fullDayData);
            }
        }).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden animate-pulse">
                <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
                    <div className="w-48 h-5 bg-slate-100 rounded"></div>
                </div>
                <div className="flex flex-col lg:flex-row">
                    <div className="lg:w-2/3 p-6 border-b lg:border-b-0 lg:border-r border-slate-200">
                        <div className="h-48 bg-slate-50 rounded-lg"></div>
                    </div>
                    <div className="lg:w-1/3 p-6 space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-100 mt-1.5 shrink-0"></div>
                                <div className="space-y-2 flex-1">
                                    <div className="w-1/2 h-3.5 bg-slate-100 rounded"></div>
                                    <div className="w-3/4 h-3 bg-slate-50 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const totalCustomers = traffic.reduce((sum, t) => sum + t.customers, 0);
    const maxTraffic = Math.max(0, ...traffic.map(t => t.customers));
    const peakHourObj = traffic.find(t => t.customers === maxTraffic && maxTraffic > 0);
    const peakHourStr = peakHourObj ? peakHourObj.time : 'None';

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex flex-col overflow-hidden group hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-800 text-[14px]">Live Activity & Traffic</h3>
                </div>
                <span className="px-2.5 py-1 bg-white border border-slate-200 shadow-sm text-emerald-600 text-[11px] font-bold uppercase tracking-widest rounded-md flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live
                </span>
            </div>
            
            <div className="flex flex-col lg:flex-row">
                {/* Graph Section */}
                <div className="lg:w-2/3 p-6 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col relative">
                    <div className="flex justify-between items-end mb-6">
                        <h4 className="text-[12px] font-medium text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                            Traffic Trend
                        </h4>
                        
                        <div className="flex gap-4">
                            <div className="text-right">
                                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Total</div>
                                <div className="text-[15px] font-semibold text-slate-900 leading-tight">{totalCustomers}</div>
                            </div>
                            <div className="w-px h-8 bg-slate-200"></div>
                            <div className="text-right">
                                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">Peak Hour</div>
                                <div className="text-[15px] font-semibold text-slate-900 leading-tight">{peakHourStr}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 min-h-[220px] w-full">
                        {traffic.length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={traffic} margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0f172a" stopOpacity={0.08}/>
                                            <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" hide />
                                    <YAxis hide domain={[0, (dataMax: number) => Math.max(dataMax * 1.5, 5)]} />
                                    <Tooltip 
                                        cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '8px 12px' }}
                                        labelStyle={{ color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}
                                        itemStyle={{ color: '#0f172a', fontSize: '14px', fontWeight: '600' }}
                                        formatter={(value: any) => [`${value} Customers`, '']}
                                    />
                                    <Area type="monotone" dataKey="customers" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorCustomers)" animationDuration={1000} activeDot={{ r: 4, fill: '#0f172a', stroke: '#fff', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-lg border border-slate-200 border-dashed">
                                <svg className="w-5 h-5 mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                                <span className="text-[12px] font-medium uppercase tracking-widest text-slate-500">Gathering Traffic Data</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="lg:w-1/3 p-6 flex flex-col">
                    <h4 className="text-[12px] font-medium text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Recent Events
                    </h4>
                    
                    <div className="flex flex-col gap-5">
                        {logs.map((event, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-slate-200 ring-4 ring-white relative shrink-0 z-10">
                                    {i !== logs.length - 1 && (
                                        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-px h-[40px] bg-slate-200 -z-10" />
                                    )}
                                </div>
                                <div className="pb-2">
                                    <div className="text-[13px] font-semibold text-slate-900">{event.event_type}</div>
                                    <div className="text-[13px] text-slate-500 mt-0.5 leading-snug">{event.description}</div>
                                    <div className="text-[11px] font-medium text-slate-400 mt-1.5 uppercase tracking-wider">
                                        {new Date(event.timestamp).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <div className="text-[12px] font-medium text-slate-400 text-center py-6 bg-slate-50/50 rounded-lg border border-slate-200 border-dashed">
                                No recent activity logged
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
