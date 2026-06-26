"use client";

import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function TableSparkline({ data, color }: { data: any[], color: string }) {
    return (
        <div className="h-6 w-16 opacity-70 group-hover:opacity-100 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={color} 
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
