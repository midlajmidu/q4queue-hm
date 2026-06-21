"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { TrackingResponse } from "@/types/api";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string; bg: string }> = {
    waiting: { label: "Waiting", color: "#f59e0b", icon: "⏳", bg: "#1c1400" },
    serving: { label: "It's Your Turn!", color: "#34d399", icon: "🔔", bg: "#001a0f" },
    done: { label: "Service Complete", color: "#818cf8", icon: "✅", bg: "#0c0a1e" },
    skipped: { label: "Skipped", color: "#94a3b8", icon: "⏭", bg: "#0f172a" },
    deleted: { label: "Removed", color: "#f87171", icon: "✗", bg: "#1a0000" },
    cancelled: { label: "Left Queue", color: "#64748b", icon: "👋", bg: "#0f172a" },
};

const formatTime12 = (time24?: string | null) => {
    if (!time24) return "";
    const [h, m] = time24.split(":");
    if (!h || !m) return time24;
    const hours = parseInt(h, 10);
    const suffix = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12}:${m} ${suffix}`;
};

export default function TrackingPage({ params }: { params: { trackingId: string } }) {
    const [data, setData] = useState<TrackingResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [leftQueue, setLeftQueue] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const load = useCallback(async () => {
        try {
            const result = await api.getTrackingInfo(params.trackingId);
            setData(result);
            setLastUpdated(new Date());
        } catch {
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    }, [params.trackingId]);

    useEffect(() => {
        load();
        // Poll every 10 seconds if still waiting or serving
        const interval = setInterval(() => {
            if (data?.status === "waiting" || data?.status === "serving") {
                load();
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [load, data?.status]);

    const handleLeave = async () => {
        if (!confirm("Are you sure you want to leave the queue?")) return;
        setLeaving(true);
        try {
            await api.leaveQueue(params.trackingId);
            setLeftQueue(true);
            await load();
        } catch {
            alert("Could not leave queue. Please try again.");
        } finally {
            setLeaving(false);
        }
    };

    const statusCfg = data ? (STATUS_CONFIG[data.status] || STATUS_CONFIG.waiting) : null;

    return (
        <div style={{
            minHeight: "100vh",
            background: "#020617",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 16px",
            fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
                @keyframes spin { to{transform:rotate(360deg)} }
                @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
                @keyframes ring { 0%{transform:scale(1)} 50%{transform:scale(1.08)} 100%{transform:scale(1)} }
            `}</style>

            {/* Header */}
            <div style={{ marginBottom: 32, textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#25d366">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12.012 2C6.49 2 2 6.49 2 12.013c0 1.764.462 3.428 1.258 4.887L2 22l5.244-1.219a9.96 9.96 0 004.768 1.218h.004c5.52 0 10.01-4.488 10.01-10.009S17.534 2 12.012 2zm4.57 14.082c-.25-.125-1.482-.733-1.713-.816-.23-.084-.397-.126-.566.125-.168.252-.647.817-.792.984-.146.168-.293.188-.543.063a6.83 6.83 0 01-2.008-1.24 7.55 7.55 0 01-1.393-1.737c-.146-.252-.016-.388.11-.513.113-.112.25-.292.376-.439.125-.147.167-.251.25-.418.084-.168.042-.315-.021-.44-.063-.125-.565-1.36-.774-1.864-.203-.49-.408-.423-.566-.431-.146-.008-.313-.01-.48-.01a.92.92 0 00-.668.314c-.23.25-.878.858-.878 2.093 0 1.234.9 2.427 1.025 2.594.126.167 1.766 2.695 4.28 3.778 1.543.663 2.164.717 2.946.602.868-.126 2.673-1.09 3.05-2.146.376-1.055.376-1.956.262-2.145-.115-.188-.43-.303-.68-.428z" />
                    </svg>
                    <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 18 }}>Queue Tracker</span>
                </div>
                <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>Live token tracking</p>
            </div>

            {/* Loading */}
            {loading && (
                <div style={{ textAlign: "center", animation: "fadeIn .3s ease" }}>
                    <div style={{ width: 40, height: 40, border: "3px solid #1e293b", borderTop: "3px solid #25d366", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
                    <p style={{ color: "#64748b", fontSize: 14 }}>Loading your token…</p>
                </div>
            )}

            {/* Not Found */}
            {!loading && notFound && (
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 40, textAlign: "center", maxWidth: 340, animation: "fadeIn .3s ease" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                    <h2 style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Token Not Found</h2>
                    <p style={{ color: "#64748b", fontSize: 13 }}>This tracking link is invalid or has expired. Please scan the QR code again.</p>
                </div>
            )}

            {/* Token Card */}
            {!loading && data && !notFound && (
                <div style={{ width: "100%", maxWidth: 380, animation: "fadeIn .3s ease" }}>
                    {/* Status Banner */}
                    <div style={{
                        background: statusCfg?.bg,
                        border: `1px solid ${statusCfg?.color}33`,
                        borderRadius: "16px 16px 0 0",
                        padding: "20px 24px",
                        textAlign: "center",
                        animation: data.status === "serving" ? "ring 1s ease infinite" : "none",
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>{statusCfg?.icon}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: statusCfg?.color }}>{statusCfg?.label}</div>
                    </div>

                    {/* Token Info */}
                    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderTop: "none", borderRadius: "0 0 16px 16px", padding: 24 }}>
                        {/* Token Number */}
                        <div style={{ textAlign: "center", marginBottom: 24 }}>
                            <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Your Token</div>
                            <div style={{ fontSize: 56, fontWeight: 800, color: "#e2e8f0", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                                {data.token_prefix}-{data.token_number}
                            </div>
                        </div>

                        {/* Queue + Org */}
                        <div style={{ background: "#1e293b", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>Queue</div>
                            <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{data.queue_name}</div>
                            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{data.org_name}</div>
                        </div>

                        {/* Service Hours */}
                        {data.open_time && data.close_time && (
                            <div style={{ background: "#1e293b", borderRadius: 10, padding: "12px 16px", marginBottom: 16, textAlign: "center" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Service Hours</div>
                                <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>
                                    {formatTime12(data.open_time)} - {formatTime12(data.close_time)}
                                </div>
                            </div>
                        )}

                        {/* Paused alert */}
                        {data.queue_is_paused && data.status === "waiting" && (
                            <div style={{ background: "#281204", border: "1px solid #7c2d12", borderRadius: 10, padding: "14px 16px", textAlign: "center", marginBottom: 16, animation: "pulse 2s infinite" }}>
                                <div style={{ color: "#fdba74", fontWeight: 700, fontSize: 15 }}>⏸ The queue is currently on a break</div>
                                <div style={{ color: "#fdba74", opacity: 0.8, fontSize: 12, marginTop: 4 }}>Service has been temporarily paused.</div>
                            </div>
                        )}

                        {/* Position (only if waiting) */}
                        {data.status === "waiting" && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                                <div style={{ background: "#1e293b", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                                    <div style={{ fontSize: 28, fontWeight: 700, color: "#f59e0b" }}>{data.position}</div>
                                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Position Ahead</div>
                                </div>
                                <div style={{ background: "#1e293b", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                                    <div style={{ fontSize: 28, fontWeight: 700, color: "#6366f1" }}>{data.position + 1}</div>
                                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Your Position</div>
                                </div>
                            </div>
                        )}

                        {/* Serving alert */}
                        {data.status === "serving" && (
                            <div style={{ background: "#001a0f", border: "1px solid #166534", borderRadius: 10, padding: "14px 16px", textAlign: "center", marginBottom: 16 }}>
                                <div style={{ color: "#34d399", fontWeight: 700, fontSize: 15 }}>🔔 Please proceed to the counter now!</div>
                                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>Your token is being served.</div>
                            </div>
                        )}

                        {/* Completed */}
                        {(data.status === "done") && (
                            <div style={{ background: "#0c0a1e", border: "1px solid #3730a3", borderRadius: 10, padding: "14px 16px", textAlign: "center", marginBottom: 16 }}>
                                <div style={{ color: "#818cf8", fontWeight: 700, fontSize: 15 }}>✅ Service Completed</div>
                                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>Thank you for visiting!</div>
                            </div>
                        )}

                        {/* Last updated */}
                        {lastUpdated && (
                            <div style={{ textAlign: "center", fontSize: 11, color: "#334155", marginBottom: 16 }}>
                                Updated {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 10s
                                <span style={{ display: "inline-block", width: 6, height: 6, background: "#22c55e", borderRadius: "50%", marginLeft: 6, verticalAlign: "middle", animation: "pulse 2s infinite" }} />
                            </div>
                        )}

                        {/* Leave button (only if waiting) */}
                        {data.status === "waiting" && !leftQueue && (
                            <button
                                onClick={handleLeave}
                                disabled={leaving}
                                style={{
                                    width: "100%",
                                    background: "transparent",
                                    border: "1px solid #334155",
                                    color: "#94a3b8",
                                    borderRadius: 10,
                                    padding: "11px 0",
                                    fontSize: 13,
                                    cursor: leaving ? "default" : "pointer",
                                    opacity: leaving ? 0.6 : 1,
                                }}
                            >
                                {leaving ? "Leaving…" : "Leave Queue"}
                            </button>
                        )}

                        {leftQueue && (
                            <div style={{ textAlign: "center", color: "#64748b", fontSize: 13 }}>
                                You have left the queue. See you next time! 👋
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#1e293b" }}>
                        Powered by Q4Queue
                    </div>
                </div>
            )}
        </div>
    );
}
