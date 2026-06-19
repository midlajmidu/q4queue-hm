"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type {
    WhatsAppConfig,
    WhatsAppGlobalStats,
    WhatsAppDailyChartItem,
    WhatsAppOrgStats,
    WhatsAppMessage,
} from "@/types/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_ICON = {
    pending: "⏳",
    sent: "✓",
    delivered: "✓✓",
    read: "👁",
    failed: "✗",
};

const STATUS_COLOR: Record<string, string> = {
    pending: "#94a3b8",
    sent: "#38bdf8",
    delivered: "#34d399",
    read: "#818cf8",
    failed: "#f87171",
};

const EVENT_LABEL: Record<string, string> = {
    "queue.joined": "Joined",
    "queue.called": "Called",
    "queue.reminder": "Reminder",
    "queue.removed": "Removed",
    "queue.cancelled": "Cancelled",
    "queue.completed": "Completed",
    test: "Test",
};

function fmtTime(iso?: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
}

// ── Mini SVG Line Chart ───────────────────────────────────────────────────────

function LineChart({ data }: { data: WhatsAppDailyChartItem[] }) {
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

// ── Connection Status Card ─────────────────────────────────────────────────────

function ConnectionStatusCard({ config }: { config: WhatsAppConfig | null }) {
    const connected = config?.status === "connected";
    return (
        <div className="wa-card">
            <h3 className="wa-card-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#25d366" }}>
                    <path fillRule="evenodd" clipRule="evenodd" d="M12.012 2C6.49 2 2 6.49 2 12.013c0 1.764.462 3.428 1.258 4.887L2 22l5.244-1.219a9.96 9.96 0 004.768 1.218h.004c5.52 0 10.01-4.488 10.01-10.009S17.534 2 12.012 2zm4.57 14.082c-.25-.125-1.482-.733-1.713-.816-.23-.084-.397-.126-.566.125-.168.252-.647.817-.792.984-.146.168-.293.188-.543.063a6.83 6.83 0 01-2.008-1.24 7.55 7.55 0 01-1.393-1.737c-.146-.252-.016-.388.11-.513.113-.112.25-.292.376-.439.125-.147.167-.251.25-.418.084-.168.042-.315-.021-.44-.063-.125-.565-1.36-.774-1.864-.203-.49-.408-.423-.566-.431-.146-.008-.313-.01-.48-.01a.92.92 0 00-.668.314c-.23.25-.878.858-.878 2.093 0 1.234.9 2.427 1.025 2.594.126.167 1.766 2.695 4.28 3.778 1.543.663 2.164.717 2.946.602.868-.126 2.673-1.09 3.05-2.146.376-1.055.376-1.956.262-2.145-.115-.188-.43-.303-.68-.428z" />
                </svg>
                Connection Status
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                    { label: "API Status", value: config ? config.status : "Not configured", ok: connected },
                    { label: "Business Verified", value: config?.business_verified ? "Yes" : "No", ok: config?.business_verified },
                    { label: "Webhook Active", value: config?.webhook_active ? "Active" : "Not set", ok: config?.webhook_active },
                    { label: "Payment Active", value: config?.payment_active ? "Active" : "Not set", ok: config?.payment_active },
                ].map(({ label, value, ok }) => (
                    <div key={label} className="wa-status-item">
                        <span className="wa-status-dot" style={{ background: ok ? "#34d399" : "#f87171" }} />
                        <div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
                            <div style={{ fontSize: 13, color: ok ? "#e2e8f0" : "#94a3b8", fontWeight: 500 }}>{String(value)}</div>
                        </div>
                    </div>
                ))}
            </div>
            {config?.phone_number_id && (
                <div style={{ marginTop: 12, fontSize: 12, color: "#64748b", borderTop: "1px solid #1e293b", paddingTop: 10 }}>
                    Phone ID: <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{config.phone_number_id}</span>
                </div>
            )}
        </div>
    );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
    return (
        <div className="wa-stat-card">
            <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

// ── Config Form ───────────────────────────────────────────────────────────────

function ConfigForm({ config, onSaved }: { config: WhatsAppConfig | null; onSaved: () => void }) {
    const [form, setForm] = useState({
        access_token: "",
        phone_number_id: "",
        waba_id: "",
        app_id: "",
        is_enabled: config?.is_enabled ?? false,
        payment_active: config?.payment_active ?? false,
        business_verified: config?.business_verified ?? false,
        webhook_active: config?.webhook_active ?? false,
    });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");

    const save = async () => {
        setSaving(true);
        setMsg("");
        try {
            const payload: Record<string, unknown> = { ...form };
            // Only send non-empty strings for sensitive fields
            if (!form.access_token) delete payload.access_token;
            if (!form.phone_number_id) delete payload.phone_number_id;
            if (!form.waba_id) delete payload.waba_id;
            if (!form.app_id) delete payload.app_id;

            await api.saveWhatsAppConfig(payload as never);
            setMsg("✓ Configuration saved successfully");
            onSaved();
        } catch {
            setMsg("✗ Failed to save. Check credentials and try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="wa-card">
            <h3 className="wa-card-title">Meta API Credentials</h3>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
                Enter credentials from your Meta Business Dashboard → WhatsApp → API Setup.
                Leave fields blank to keep existing values.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                    { key: "access_token", label: "Access Token", placeholder: "EAABs..." },
                    { key: "phone_number_id", label: "Phone Number ID", placeholder: "1234567890" },
                    { key: "waba_id", label: "WABA ID", placeholder: "1234567890" },
                    { key: "app_id", label: "App ID", placeholder: "1234567890" },
                ].map(({ key, label, placeholder }) => (
                    <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                        <input
                            type={key === "access_token" ? "password" : "text"}
                            value={form[key as keyof typeof form] as string}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="wa-input"
                        />
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
                {[
                    { key: "is_enabled", label: "Global Enable" },
                    { key: "payment_active", label: "Payment Active" },
                    { key: "business_verified", label: "Business Verified" },
                    { key: "webhook_active", label: "Webhook Active" },
                ].map(({ key, label }) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#94a3b8" }}>
                        <input
                            type="checkbox"
                            checked={form[key as keyof typeof form] as boolean}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                            style={{ accentColor: "#6366f1" }}
                        />
                        {label}
                    </label>
                ))}
            </div>
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={save} disabled={saving} className="wa-btn-primary">
                    {saving ? "Saving…" : "Save Configuration"}
                </button>
                {msg && <span style={{ fontSize: 13, color: msg.startsWith("✓") ? "#34d399" : "#f87171" }}>{msg}</span>}
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WhatsAppManagementPanel() {
    const [config, setConfig] = useState<WhatsAppConfig | null>(null);
    const [stats, setStats] = useState<WhatsAppGlobalStats | null>(null);
    const [chart, setChart] = useState<WhatsAppDailyChartItem[]>([]);
    const [orgStats, setOrgStats] = useState<WhatsAppOrgStats[]>([]);
    const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"overview" | "orgs" | "activity" | "config">("overview");

    const load = useCallback(async () => {
        try {
            const [cfg, s, ch, os, msgs] = await Promise.allSettled([
                api.getWhatsAppConfig(),
                api.getWhatsAppGlobalStats(),
                api.getWhatsAppDailyChart(30),
                api.getWhatsAppStatsByOrg(10),
                api.getWhatsAppMessages(20),
            ]);
            if (cfg.status === "fulfilled") setConfig(cfg.value);
            if (s.status === "fulfilled") setStats(s.value);
            if (ch.status === "fulfilled") setChart(ch.value);
            if (os.status === "fulfilled") setOrgStats(os.value);
            if (msgs.status === "fulfilled") setMessages(msgs.value.items || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: 60, color: "#64748b" }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ width: 32, height: 32, border: "3px solid #1e293b", borderTop: "3px solid #25d366", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
                    Loading WhatsApp dashboard…
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .wa-card {
                    background: #0f172a;
                    border: 1px solid #1e293b;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 16px;
                }
                .wa-card-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    color: #e2e8f0;
                    margin-bottom: 16px;
                }
                .wa-stat-card {
                    background: #0f172a;
                    border: 1px solid #1e293b;
                    border-radius: 10px;
                    padding: 16px 20px;
                }
                .wa-status-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    background: #1e293b;
                    border-radius: 8px;
                    padding: 10px 12px;
                }
                .wa-status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-top: 4px;
                    flex-shrink: 0;
                }
                .wa-input {
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 8px;
                    padding: 8px 12px;
                    color: #e2e8f0;
                    font-size: 13px;
                    outline: none;
                    width: 100%;
                    box-sizing: border-box;
                    font-family: monospace;
                }
                .wa-input:focus { border-color: #6366f1; }
                .wa-btn-primary {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 9px 20px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .wa-btn-primary:disabled { opacity: 0.6; cursor: default; }
                .wa-tab {
                    padding: 8px 16px;
                    border-radius: 8px;
                    border: 1px solid #1e293b;
                    background: transparent;
                    color: #64748b;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .wa-tab.active {
                    background: #1e293b;
                    color: #e2e8f0;
                    border-color: #334155;
                }
                .wa-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .wa-table th { text-align: left; color: #475569; font-weight: 500; padding: 8px 12px; border-bottom: 1px solid #1e293b; font-size: 11px; text-transform: uppercase; }
                .wa-table td { padding: 10px 12px; color: #94a3b8; border-bottom: 1px solid #0f172a; }
                .wa-table tr:hover td { background: #1e293b20; }
            `}</style>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {(["overview", "orgs", "activity", "config"] as const).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`wa-tab ${activeTab === t ? "active" : ""}`}>
                        {t === "overview" && "📊 Overview"}
                        {t === "orgs" && "🏢 Organizations"}
                        {t === "activity" && "📨 Recent Activity"}
                        {t === "config" && "⚙️ Configuration"}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
                <>
                    <ConnectionStatusCard config={config} />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
                        <StatCard label="Total Sent" value={stats?.total ?? 0} color="#6366f1" />
                        <StatCard label="Delivered" value={stats?.delivered ?? 0} color="#34d399" />
                        <StatCard label="Read" value={stats?.read ?? 0} color="#818cf8" />
                        <StatCard label="Failed" value={stats?.failed ?? 0} color="#f87171" />
                        <StatCard label="Success Rate" value={`${stats?.success_rate ?? 0}%`} color="#f59e0b" />
                    </div>
                    <div className="wa-card">
                        <h3 className="wa-card-title">📈 Messages Last 30 Days</h3>
                        <LineChart data={chart} />
                    </div>
                </>
            )}

            {/* Orgs Tab */}
            {activeTab === "orgs" && (
                <div className="wa-card">
                    <h3 className="wa-card-title">Organization Usage</h3>
                    {orgStats.length === 0 ? (
                        <p style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No organization data yet.</p>
                    ) : (
                        <table className="wa-table">
                            <thead>
                                <tr>
                                    <th>Organization</th>
                                    <th>Total</th>
                                    <th>Delivered</th>
                                    <th>Read</th>
                                    <th>Failed</th>
                                    <th>Success Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orgStats.map(o => (
                                    <tr key={o.organization_id}>
                                        <td style={{ color: "#e2e8f0", fontWeight: 500 }}>{o.org_name || o.organization_id}</td>
                                        <td>{o.total}</td>
                                        <td style={{ color: "#34d399" }}>{o.delivered}</td>
                                        <td style={{ color: "#818cf8" }}>{o.read}</td>
                                        <td style={{ color: "#f87171" }}>{o.failed}</td>
                                        <td>
                                            <span style={{ color: o.success_rate >= 80 ? "#34d399" : o.success_rate >= 50 ? "#f59e0b" : "#f87171" }}>
                                                {o.success_rate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Activity Tab */}
            {activeTab === "activity" && (
                <div className="wa-card">
                    <h3 className="wa-card-title">Recent Messages</h3>
                    {messages.length === 0 ? (
                        <p style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No messages sent yet.</p>
                    ) : (
                        <table className="wa-table">
                            <thead>
                                <tr>
                                    <th>Phone</th>
                                    <th>Customer</th>
                                    <th>Event</th>
                                    <th>Status</th>
                                    <th>Sent At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {messages.map(m => (
                                    <tr key={m.id}>
                                        <td style={{ fontFamily: "monospace", fontSize: 12 }}>{m.customer_phone}</td>
                                        <td style={{ color: "#e2e8f0" }}>{m.customer_name || "—"}</td>
                                        <td>
                                            <span style={{ background: "#1e293b", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>
                                                {EVENT_LABEL[m.event_type || ""] || m.event_type || "—"}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ color: STATUS_COLOR[m.status] || "#94a3b8", fontWeight: 600 }}>
                                                {STATUS_ICON[m.status as keyof typeof STATUS_ICON]} {m.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12 }}>{fmtTime(m.sent_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Config Tab */}
            {activeTab === "config" && (
                <>
                    <ConfigForm config={config} onSaved={load} />
                    <div className="wa-card" style={{ background: "#0c1a2e", border: "1px solid #1e3a5f" }}>
                        <h3 className="wa-card-title" style={{ color: "#93c5fd" }}>📋 Webhook Setup Instructions</h3>
                        <ol style={{ color: "#64748b", fontSize: 13, lineHeight: 2, paddingLeft: 20 }}>
                            <li>Go to <strong style={{ color: "#93c5fd" }}>Meta Business Dashboard</strong> → Apps → Your App → WhatsApp → Configuration</li>
                            <li>Set Webhook URL: <code style={{ background: "#1e293b", padding: "1px 6px", borderRadius: 4, color: "#e2e8f0" }}>https://yourdomain.com/api/v1/webhooks/whatsapp</code></li>
                            <li>Set Verify Token: <code style={{ background: "#1e293b", padding: "1px 6px", borderRadius: 4, color: "#e2e8f0" }}>qrq-whatsapp-webhook-secret</code></li>
                            <li>Subscribe to <strong style={{ color: "#93c5fd" }}>messages</strong> and <strong style={{ color: "#93c5fd" }}>message_status_updates</strong> fields</li>
                            <li>Click <strong style={{ color: "#93c5fd" }}>Verify and Save</strong> in Meta dashboard</li>
                        </ol>
                    </div>
                </>
            )}
        </>
    );
}
