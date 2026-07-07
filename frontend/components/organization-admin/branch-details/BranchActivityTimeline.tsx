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

    const totalCustomers = traffic.reduce((sum, t) => sum + t.customers, 0);
    const maxTraffic = Math.max(0, ...traffic.map(t => t.customers));
    const peakHourObj = traffic.find(t => t.customers === maxTraffic && maxTraffic > 0);
    const peakHourStr = peakHourObj ? peakHourObj.time : 'None';

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-[16px] text-slate-900 tracking-tight">Live Activity & Traffic</h3>
                    <p className="text-[12px] font-medium text-slate-500 mt-0.5">Real-time branch monitoring</p>
                </div>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm border border-indigo-100/50">Today</span>
            </div>
            
            {/* Graph Section */}
            <div className="p-5 border-b border-slate-100 bg-white relative">
                <div className="flex justify-between items-end mb-4">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                        Traffic Trend
                    </h4>
                    
                    <div className="flex gap-3">
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</div>
                            <div className="text-sm font-bold text-slate-700">{totalCustomers}</div>
                        </div>
                        <div className="w-px h-8 bg-slate-100"></div>
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peak Hour</div>
                            <div className="text-sm font-bold text-slate-700">{peakHourStr}</div>
                        </div>
                    </div>
                </div>
                
                <div className="h-32 w-full">
                    {traffic.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={traffic} margin={{ top: 10, right: 5, left: 5, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" hide />
                                {/* Ensure Y-axis has headroom so a 0-value flat line doesn't get cut off */}
                                <YAxis hide domain={[0, (dataMax: number) => Math.max(dataMax * 1.5, 5)]} />
                                <Tooltip 
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '10px 14px' }}
                                    labelStyle={{ color: '#64748b', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}
                                    itemStyle={{ color: '#4f46e5', fontSize: '15px', fontWeight: '900' }}
                                    formatter={(value: any) => [`${value} Customers`, '']}
                                />
                                <Area type="monotone" dataKey="customers" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorCustomers)" animationDuration={1000} activeDot={{ r: 5, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100/50 border-dashed">
                            <svg className="w-6 h-6 mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gathering Traffic Data...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="p-5 bg-slate-50/30 flex-1">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Recent Events
                </h4>
                
                <div className="space-y-4">
                    {logs.map((event, i) => (
                        <div key={i} className="group flex gap-4 p-4 bg-white rounded-2xl hover:shadow-md transition-all duration-300 border border-slate-200/60 hover:border-indigo-100">
                            <div className="w-3 h-3 mt-1.5 rounded-full bg-indigo-50 border-[3px] border-indigo-500 shadow-sm shrink-0 relative">
                                {/* Vertical line connecting events (except last) */}
                                {i !== logs.length - 1 && (
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-0.5 h-[60px] bg-slate-100" />
                                )}
                            </div>
                            <div>
                                <div className="text-[13px] font-bold text-slate-900">{event.event_type}</div>
                                <div className="text-[12px] font-medium text-slate-500 mt-1 leading-relaxed">{event.description}</div>
                                <div className="text-[10px] font-bold text-slate-400 mt-2.5 uppercase tracking-wider flex items-center gap-1.5">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    {new Date(event.timestamp).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="text-[13px] font-medium text-slate-400 text-center py-8 bg-white rounded-2xl border border-slate-100 border-dashed">
                            No recent activity logged yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
