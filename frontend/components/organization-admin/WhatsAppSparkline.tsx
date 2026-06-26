"use client";

import React from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const data = [
    { time: "8 AM", value: 400 },
    { time: "9 AM", value: 300 },
    { time: "10 AM", value: 550 },
    { time: "11 AM", value: 450 },
    { time: "12 PM", value: 700 },
    { time: "1 PM", value: 650 },
    { time: "2 PM", value: 800 },
];

export default function WhatsAppSparkline() {
    return (
        <div className="h-12 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#10b981" 
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
