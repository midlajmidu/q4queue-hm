import React from "react";
import type { WhatsAppDailyChartItem } from "@/types/api";

export function LineChart({ data }: { data: WhatsAppDailyChartItem[] }) {
    if (!data.length) {
        return (
            <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                No data yet
            </div>
        );
    }
    const W = 600, H = 140, PAD = 20;
    const maxTotal = Math.max(...data.map(d => d.total), 1);
    const points = (key: keyof WhatsAppDailyChartItem) =>
        data
            .map((d, i) => {
                const x = PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2);
                const y = H - PAD - ((Number(d[key]) / maxTotal) * (H - PAD * 2));
                return `${x},${y}`;
            })
            .join(" ");

    return (
        <div style={{ overflowX: "auto" }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
                <polyline points={points("total")} fill="none" stroke="#6366f1" strokeWidth="2" />
                <polyline points={points("delivered")} fill="none" stroke="#34d399" strokeWidth="2" />
                <polyline points={points("failed")} fill="none" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4,3" />
            </svg>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                <span><span style={{ color: "#6366f1" }}>●</span> Total</span>
                <span><span style={{ color: "#34d399" }}>●</span> Delivered</span>
                <span><span style={{ color: "#f87171" }}>●</span> Failed</span>
            </div>
        </div>
    );
}
