"use client";

import React from "react";
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

const mockData = [
    { time: "8 AM", customers: 20, waitTime: 5 },
    { time: "9 AM", customers: 45, waitTime: 8 },
    { time: "10 AM", customers: 85, waitTime: 12 },
    { time: "11 AM", customers: 120, waitTime: 18 },
    { time: "12 PM", customers: 145, waitTime: 22 },
    { time: "1 PM", customers: 110, waitTime: 15 },
    { time: "2 PM", customers: 90, waitTime: 12 },
    { time: "3 PM", customers: 105, waitTime: 14 },
    { time: "4 PM", customers: 135, waitTime: 19 },
    { time: "5 PM", customers: 160, waitTime: 25 },
    { time: "6 PM", customers: 85, waitTime: 12 },
    { time: "7 PM", customers: 40, waitTime: 7 },
    { time: "8 PM", customers: 15, waitTime: 4 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-3 text-sm flex flex-col gap-1.5">
                <p className="font-bold text-slate-900 mb-1">{label}</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <p className="text-slate-600 font-medium">
                        <span className="text-slate-900 font-bold">{payload[0].value}</span> Customers
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <p className="text-slate-600 font-medium">
                        <span className="text-slate-900 font-bold">{payload[1].value}m</span> Avg Wait
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export default function TrafficChart() {
    return (
        <PremiumCard className="p-6 w-full mb-8" hoverEffect={false}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Global Traffic & Wait Time Trends
                </h2>
                <div className="flex items-center gap-4 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span className="text-slate-500">Volume</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-slate-500">Wait Time</span>
                    </div>
                </div>
            </div>
            
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={mockData}
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
        </PremiumCard>
    );
}
