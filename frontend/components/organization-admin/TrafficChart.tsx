"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    AreaChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { api } from "@/lib/api";
import { useBranchFilter } from "@/context/BranchFilterContext";
import { RefreshCw } from "lucide-react";

interface TrafficDataPoint {
    time: string;
    customers: number;
    waitTime: number;
    is_peak?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-3 text-sm flex flex-col gap-1.5">
                <p className="font-bold text-slate-900 mb-1">{label}</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <p className="text-slate-600 font-medium">
                        <span className="text-slate-900 font-bold">{payload[0]?.value ?? 0}</span> Customers
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <p className="text-slate-600 font-medium">
                        <span className="text-slate-900 font-bold">{payload[1]?.value ?? 0}m</span> Avg Wait
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

// Skeleton loader for chart
function ChartSkeleton() {
    return (
        <div className="h-[300px] w-full flex items-end gap-1 px-4 pb-6 animate-pulse">
            {Array.from({ length: 13 }).map((_, i) => {
                const h = [30, 55, 70, 90, 100, 80, 65, 75, 95, 110, 65, 35, 15];
                return (
                    <div
                        key={i}
                        className="flex-1 bg-indigo-100 rounded-t"
                        style={{ height: `${(h[i] / 110) * 100}%` }}
                    />
                );
            })}
        </div>
    );
}

export default function TrafficChart() {
    const { selectedBranchId } = useBranchFilter();
    const [data, setData] = useState<TrafficDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [peakTime, setPeakTime] = useState<string | null>(null);

    const loadTrafficData = useCallback(async () => {
        try {
            const res = await api.getOrgAdminTrafficChart(selectedBranchId || undefined);
            const peak: any[] = res?.peak_traffic ?? [];

            if (peak.length === 0) {
                setData([]);
                setLoading(false);
                return;
            }

            const mapped: TrafficDataPoint[] = peak.map((p: any) => ({
                time: p.time_block,
                customers: p.customers_arrived ?? 0,
                waitTime: p.avg_wait_minutes ?? 0,
                is_peak: p.is_peak ?? false,
            }));

            setData(mapped);
            setPeakTime(res?.peak_hour ?? null);
            setLastUpdated(new Date());
        } catch {
            // Silently fail – keep previous data
        } finally {
            setLoading(false);
        }
    }, [selectedBranchId]);

    useEffect(() => {
        setLoading(true);
        loadTrafficData();
        const interval = setInterval(loadTrafficData, 60_000); // refresh every 60 s
        return () => clearInterval(interval);
    }, [loadTrafficData]);

    const isEmpty = !loading && data.length === 0;

    return (
        <PremiumCard className="p-6 w-full mb-8" hoverEffect={false}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                        Global Traffic &amp; Wait Time Trends
                    </h2>
                    {lastUpdated && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                            Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {peakTime && peakTime !== "-" && (
                                <> &middot; Peak: <span className="text-amber-500 font-semibold">{peakTime}</span></>
                            )}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span className="text-slate-500">Volume</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span className="text-slate-500">Wait Time (min)</span>
                        </div>
                    </div>
                    <button
                        onClick={() => { setLoading(true); loadTrafficData(); }}
                        title="Refresh"
                        className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Chart area */}
            {loading ? (
                <ChartSkeleton />
            ) : isEmpty ? (
                <div className="h-[300px] w-full flex flex-col items-center justify-center text-slate-400">
                    <svg className="w-10 h-10 mb-3 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-400">No traffic data for today</p>
                    <p className="text-xs text-slate-300 mt-1">Data will appear once customers join queues</p>
                </div>
            ) : (
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

                            <XAxis
                                dataKey="time"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                                dy={10}
                            />

                            {/* Primary Y-Axis (Volume) */}
                            <YAxis
                                yAxisId="left"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                dx={-10}
                            />

                            {/* Secondary Y-Axis (Wait Time) */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                dx={10}
                                unit="m"
                            />

                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />

                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="customers"
                                stroke="#6366f1"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorCustomers)"
                                activeDot={{ r: 6, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
                            />

                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="waitTime"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Peak highlight bar */}
            {!loading && !isEmpty && data.some(d => d.is_peak) && (
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></div>
                    <span>
                        Peak hour:{" "}
                        <strong className="text-slate-700">
                            {data.find(d => d.is_peak)?.time}
                        </strong>{" "}
                        &mdash; {data.find(d => d.is_peak)?.customers ?? 0} customers,{" "}
                        {data.find(d => d.is_peak)?.waitTime ?? 0}m avg wait
                    </span>
                </div>
            )}
        </PremiumCard>
    );
}
