"use client";

import React, { useEffect, useState, useCallback, Fragment } from "react";
import { api } from "@/lib/api";
import type {
    WhatsAppConfig,
    WhatsAppGlobalStats,
    WhatsAppDailyChartItem,
    WhatsAppOrgStats,
    WhatsAppMessage,
} from "@/types/api";
import { fmtTime } from "./whatsapp/utils/formatters";
import { LineChart } from "./whatsapp/components/LineChart";
import { ConnectionStatusCard } from "./whatsapp/components/ConnectionStatusCard";
import { StatCard } from "./whatsapp/components/StatCard";
import { UsageAnalyticsTab } from "./whatsapp/components/UsageAnalyticsTab";
import { ActivityLogTab } from "./whatsapp/components/ActivityLogTab";
import { OrganizationRoutingTab } from "./whatsapp/components/OrganizationRoutingTab";



// ── Config Form ───────────────────────────────────────────────────────────────

// ── Config Form ───────────────────────────────────────────────────────────────

function ConfigForm({ config, onSaved }: { config: WhatsAppConfig | null; onSaved: () => void }) {
    const [form, setForm] = useState({
        access_token: "",
        phone_number_id: "",
        waba_id: "",
        app_id: "",
        app_secret: "",
        business_id: "",
        webhook_verify_token: "qrq-whatsapp-webhook-secret",
        is_enabled: false,
        payment_active: false,
        business_verified: false,
        webhook_active: false,
    });
    const [showToken, setShowToken] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
    const [testResult, setTestResult] = useState<{ ok: boolean; message: string; details?: any } | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Sync form with loaded config
    useEffect(() => {
        if (config) {
            setForm({
                access_token: config.access_token || "",
                phone_number_id: config.phone_number_id || "",
                waba_id: config.waba_id || "",
                app_id: config.app_id || "",
                app_secret: config.app_secret || "",
                business_id: config.business_id || "",
                webhook_verify_token: config.webhook_verify_token || "qrq-whatsapp-webhook-secret",
                is_enabled: config.is_enabled ?? false,
                payment_active: config.payment_active ?? false,
                business_verified: config.business_verified ?? false,
                webhook_active: config.webhook_active ?? false,
            });
        }
    }, [config]);

    const copyToClipboard = (text: string, fieldId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const save = async () => {
        setSaving(true);
        setMsg(null);
        try {
            const payload: Record<string, unknown> = {
                phone_number_id: form.phone_number_id.trim(),
                waba_id: form.waba_id.trim(),
                app_id: form.app_id.trim(),
                app_secret: form.app_secret.trim(),
                business_id: form.business_id.trim(),
                webhook_verify_token: form.webhook_verify_token.trim() || "qrq-whatsapp-webhook-secret",
                is_enabled: form.is_enabled,
                payment_active: form.payment_active,
                business_verified: form.business_verified,
                webhook_active: form.webhook_active,
            };
            if (form.access_token) {
                payload.access_token = form.access_token.trim();
            }

            await api.saveWhatsAppConfig(payload as never);
            setMsg({ text: "✓ Configuration saved to database successfully as default.", ok: true });
            onSaved();
        } catch (err: any) {
            setMsg({ text: `✗ Failed to save: ${err?.message || "Check fields and try again."}`, ok: false });
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await api.testWhatsAppConnection({
                access_token: form.access_token.trim() || undefined,
                phone_number_id: form.phone_number_id.trim() || undefined,
                waba_id: form.waba_id.trim() || undefined,
            });
            if (res.success) {
                setTestResult({
                    ok: true,
                    message: res.message || "Connected to Meta Cloud API successfully!",
                    details: res.details,
                });
            } else {
                setTestResult({
                    ok: false,
                    message: res.error || "Connection failed. Please verify credentials.",
                    details: res.details,
                });
            }
        } catch (err: any) {
            setTestResult({
                ok: false,
                message: err?.message || "Failed to reach server during connection test.",
            });
        } finally {
            setTesting(false);
        }
    };

    const webhookUrl = typeof window !== "undefined"
        ? `${window.location.origin}/api/v1/webhooks/whatsapp`
        : "https://yourdomain.com/api/v1/webhooks/whatsapp";

    return (
        <div className="space-y-6">
            <div className="wa-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h3 className="wa-card-title" style={{ margin: 0, fontSize: 16 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#25d366" }}>
                                <path fillRule="evenodd" clipRule="evenodd" d="M12.012 2C6.49 2 2 6.49 2 12.013c0 1.764.462 3.428 1.258 4.887L2 22l5.244-1.219a9.96 9.96 0 004.768 1.218h.004c5.52 0 10.01-4.488 10.01-10.009S17.534 2 12.012 2zm4.57 14.082c-.25-.125-1.482-.733-1.713-.816-.23-.084-.397-.126-.566.125-.168.252-.647.817-.792.984-.146.168-.293.188-.543.063a6.83 6.83 0 01-2.008-1.24 7.55 7.55 0 01-1.393-1.737c-.146-.252-.016-.388.11-.513.113-.112.25-.292.376-.439.125-.147.167-.251.25-.418.084-.168.042-.315-.021-.44-.063-.125-.565-1.36-.774-1.864-.203-.49-.408-.423-.566-.431-.146-.008-.313-.01-.48-.01a.92.92 0 00-.668.314c-.23.25-.878.858-.878 2.093 0 1.234.9 2.427 1.025 2.594.126.167 1.766 2.695 4.28 3.778 1.543.663 2.164.717 2.946.602.868-.126 2.673-1.09 3.05-2.146.376-1.055.376-1.956.262-2.145-.115-.188-.43-.303-.68-.428z" />
                            </svg>
                            Meta WhatsApp Cloud API Configuration
                        </h3>
                        <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                            Configure your WhatsApp Business Cloud credentials here. This configuration is stored securely in the database and serves as the default for all organizations.
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={testing || saving}
                            style={{
                                background: "#1e293b",
                                border: "1px solid #3b82f6",
                                color: "#60a5fa",
                                borderRadius: 8,
                                padding: "8px 16px",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            {testing ? "Testing…" : "⚡ Test Meta API"}
                        </button>
                    </div>
                </div>

                {testResult && (
                    <div style={{
                        marginTop: 16,
                        padding: "12px 16px",
                        borderRadius: 8,
                        background: testResult.ok ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        border: `1px solid ${testResult.ok ? "#059669" : "#dc2626"}`,
                        color: testResult.ok ? "#34d399" : "#f87171",
                        fontSize: 13,
                    }}>
                        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                            {testResult.ok ? "✓ " : "✕ "} {testResult.message}
                        </div>
                        {testResult.details && (
                            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9, lineHeight: 1.6 }}>
                                {testResult.details.display_phone_number && <div>Phone: <strong>{testResult.details.display_phone_number}</strong> ({testResult.details.verified_name || "Unverified Name"})</div>}
                                {testResult.details.quality_rating && <div>Quality Rating: <strong>{testResult.details.quality_rating}</strong></div>}
                                {testResult.details.code_verification_status && <div>Verification: <strong>{testResult.details.code_verification_status}</strong></div>}
                            </div>
                        )}
                    </div>
                )}

                <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {/* Phone Number ID */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                            Phone Number ID <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={form.phone_number_id}
                            onChange={e => setForm(f => ({ ...f, phone_number_id: e.target.value }))}
                            placeholder="e.g. 109283746501928"
                            className="wa-input"
                        />
                        <span style={{ fontSize: 11, color: "#64748b" }}>From Meta App Dashboard → WhatsApp → API Setup</span>
                    </div>

                    {/* WABA ID */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                            WhatsApp Business Account (WABA) ID
                        </label>
                        <input
                            type="text"
                            value={form.waba_id}
                            onChange={e => setForm(f => ({ ...f, waba_id: e.target.value }))}
                            placeholder="e.g. 987654321098765"
                            className="wa-input"
                        />
                        <span style={{ fontSize: 11, color: "#64748b" }}>Meta Business Manager Account ID</span>
                    </div>

                    {/* Permanent Access Token */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "span 2" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <label style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                                Permanent System User Access Token <span style={{ color: "#ef4444" }}>*</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowToken(!showToken)}
                                style={{ background: "none", border: "none", color: "#818cf8", fontSize: 11, cursor: "pointer" }}
                            >
                                {showToken ? "Hide Token" : "Show Token"}
                            </button>
                        </div>
                        <input
                            type={showToken ? "text" : "password"}
                            value={form.access_token}
                            onChange={e => setForm(f => ({ ...f, access_token: e.target.value }))}
                            placeholder="EAABs..."
                            className="wa-input"
                        />
                        <span style={{ fontSize: 11, color: "#64748b" }}>Permanent Token from Meta Business Manager → System Users → Generate Token (with whatsapp_business_messaging permissions)</span>
                    </div>

                    {/* App ID */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Meta App ID (Optional)
                        </label>
                        <input
                            type="text"
                            value={form.app_id}
                            onChange={e => setForm(f => ({ ...f, app_id: e.target.value }))}
                            placeholder="e.g. 123456789012345"
                            className="wa-input"
                        />
                    </div>

                    {/* App Secret */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <label style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Meta App Secret (Optional)
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowSecret(!showSecret)}
                                style={{ background: "none", border: "none", color: "#818cf8", fontSize: 11, cursor: "pointer" }}
                            >
                                {showSecret ? "Hide" : "Show"}
                            </button>
                        </div>
                        <input
                            type={showSecret ? "text" : "password"}
                            value={form.app_secret}
                            onChange={e => setForm(f => ({ ...f, app_secret: e.target.value }))}
                            placeholder="Meta App Secret"
                            className="wa-input"
                        />
                    </div>

                    {/* Business ID */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Business Manager ID (Optional)
                        </label>
                        <input
                            type="text"
                            value={form.business_id}
                            onChange={e => setForm(f => ({ ...f, business_id: e.target.value }))}
                            placeholder="Meta Business ID"
                            className="wa-input"
                        />
                    </div>

                    {/* Webhook Verify Token */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Webhook Verify Token
                        </label>
                        <input
                            type="text"
                            value={form.webhook_verify_token}
                            onChange={e => setForm(f => ({ ...f, webhook_verify_token: e.target.value }))}
                            placeholder="qrq-whatsapp-webhook-secret"
                            className="wa-input"
                        />
                        <span style={{ fontSize: 11, color: "#64748b" }}>Must match the Verify Token entered in Meta Webhook config</span>
                    </div>
                </div>

                {/* Toggles */}
                <div style={{ display: "flex", gap: 24, marginTop: 24, flexWrap: "wrap", borderTop: "1px solid #1e293b", paddingTop: 16 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: form.is_enabled ? "#34d399" : "#94a3b8", fontWeight: 600 }}>
                        <input
                            type="checkbox"
                            checked={form.is_enabled}
                            onChange={e => setForm(f => ({ ...f, is_enabled: e.target.checked }))}
                            style={{ accentColor: "#10b981", width: 16, height: 16 }}
                        />
                        Global WhatsApp Active (Send Messages)
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#94a3b8" }}>
                        <input
                            type="checkbox"
                            checked={form.payment_active}
                            onChange={e => setForm(f => ({ ...f, payment_active: e.target.checked }))}
                            style={{ accentColor: "#6366f1", width: 16, height: 16 }}
                        />
                        Payment Method Attached
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#94a3b8" }}>
                        <input
                            type="checkbox"
                            checked={form.business_verified}
                            onChange={e => setForm(f => ({ ...f, business_verified: e.target.checked }))}
                            style={{ accentColor: "#6366f1", width: 16, height: 16 }}
                        />
                        Business Verified
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#94a3b8" }}>
                        <input
                            type="checkbox"
                            checked={form.webhook_active}
                            onChange={e => setForm(f => ({ ...f, webhook_active: e.target.checked }))}
                            style={{ accentColor: "#6366f1", width: 16, height: 16 }}
                        />
                        Webhook Subscribed
                    </label>
                </div>

                <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 16 }}>
                    <button onClick={save} disabled={saving} className="wa-btn-primary" style={{ padding: "10px 24px", fontSize: 14 }}>
                        {saving ? "Saving Configuration…" : "💾 Save Configuration"}
                    </button>
                    {msg && (
                        <span style={{ fontSize: 13, fontWeight: 500, color: msg.ok ? "#34d399" : "#f87171" }}>
                            {msg.text}
                        </span>
                    )}
                </div>
            </div>

            {/* Webhook Instructions Card */}
            <div className="wa-card" style={{ background: "#0c1a2e", border: "1px solid #1e3a5f" }}>
                <h3 className="wa-card-title" style={{ color: "#93c5fd" }}>📋 Meta Webhook Setup Instructions</h3>
                <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.8 }}>
                    <p style={{ marginBottom: 12 }}>
                        Meta needs to send message status updates (sent, delivered, read) to your server endpoint:
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        <div style={{ background: "#0f172a", padding: 12, borderRadius: 8, border: "1px solid #1e293b" }}>
                            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Callback URL</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                <code style={{ color: "#e2e8f0", fontSize: 12, wordBreak: "break-all" }}>{webhookUrl}</code>
                                <button
                                    onClick={() => copyToClipboard(webhookUrl, "url")}
                                    style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer", flexShrink: 0 }}
                                >
                                    {copiedField === "url" ? "✓ Copied" : "Copy"}
                                </button>
                            </div>
                        </div>

                        <div style={{ background: "#0f172a", padding: 12, borderRadius: 8, border: "1px solid #1e293b" }}>
                            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Verify Token</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                <code style={{ color: "#e2e8f0", fontSize: 12 }}>{form.webhook_verify_token || "qrq-whatsapp-webhook-secret"}</code>
                                <button
                                    onClick={() => copyToClipboard(form.webhook_verify_token || "qrq-whatsapp-webhook-secret", "token")}
                                    style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer", flexShrink: 0 }}
                                >
                                    {copiedField === "token" ? "✓ Copied" : "Copy"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <ol style={{ paddingLeft: 20, lineHeight: 1.8 }}>
                        <li>Open <strong style={{ color: "#93c5fd" }}>Meta for Developers Dashboard</strong> → Apps → Your App → WhatsApp → Configuration.</li>
                        <li>Click <strong>Edit</strong> next to Webhook, paste the <strong>Callback URL</strong> and <strong>Verify Token</strong> above, then click <strong>Verify and Save</strong>.</li>
                        <li>Under <strong>Webhook fields</strong>, click <strong>Manage</strong> and subscribe to <code style={{ background: "#1e293b", padding: "1px 4px", borderRadius: 4 }}>messages</code>.</li>
                    </ol>
                </div>
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
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"overview" | "org_config" | "usage" | "activity" | "config">("overview");

    const load = useCallback(async () => {
        try {
            const [cfg, s, ch, os] = await Promise.allSettled([
                api.getWhatsAppConfig(),
                api.getWhatsAppGlobalStats(),
                api.getWhatsAppDailyChart(30),
                api.getWhatsAppStatsByOrg(100),
            ]);
            if (cfg.status === "fulfilled") setConfig(cfg.value);
            if (s.status === "fulfilled") setStats(s.value);
            if (ch.status === "fulfilled") setChart(ch.value);
            if (os.status === "fulfilled") setOrgStats(os.value);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

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
                    font-size: 15px;
                    font-weight: 600;
                    color: #f1f5f9;
                    margin-top: 0;
                    margin-bottom: 14px;
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
                    background: #0f172a;
                    border: 1px solid #334155;
                    border-radius: 8px;
                    padding: 8px 12px;
                    color: #f8fafc;
                    font-size: 13px;
                    width: 100%;
                    box-sizing: border-box;
                    outline: none;
                    transition: border-color 0.15s;
                }
                .wa-input:focus {
                    border-color: #6366f1;
                }
                .wa-btn-primary {
                    background: #25d366;
                    color: #0f172a;
                    font-weight: 700;
                    border: none;
                    border-radius: 8px;
                    padding: 8px 18px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: opacity 0.15s;
                }
                .wa-btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .wa-btn-secondary {
                    background: #1e293b;
                    color: #e2e8f0;
                    border: 1px solid #334155;
                    border-radius: 8px;
                    padding: 8px 14px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .wa-btn-secondary:hover {
                    background: #334155;
                }
                .wa-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                }
                .wa-table th {
                    text-align: left;
                    padding: 8px 12px;
                    color: #64748b;
                    font-weight: 600;
                    font-size: 11px;
                    text-transform: uppercase;
                    border-bottom: 1px solid #1e293b;
                }
                .wa-table td {
                    padding: 10px 12px;
                    border-bottom: 1px solid #1e293b;
                    color: #cbd5e1;
                }
                .wa-table tr:hover td {
                    background: rgba(30, 41, 59, 0.4);
                }
            `}</style>

            {/* Tab Navigation */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid #1e293b", paddingBottom: 8, overflowX: "auto" }}>
                {(
                    [
                        { id: "overview", label: "📊 Overview" },
                        { id: "org_config", label: "🏢 Organization Routing" },
                        { id: "usage", label: "📈 Usage Statistics" },
                        { id: "activity", label: "💬 Activity Log" },
                        { id: "config", label: "⚙️ Global Settings" },
                    ] as const
                ).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            background: activeTab === tab.id ? "#6366f1" : "transparent",
                            color: activeTab === tab.id ? "#fff" : "#94a3b8",
                            border: "none",
                            borderRadius: 8,
                            padding: "8px 16px",
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: "pointer",
                            transition: "all 0.15s",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {tab.label}
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

            {/* Organization Configuration & Routing Tab */}
            {activeTab === "org_config" && (
                <OrganizationRoutingTab globalConfig={config} />
            )}

            {/* Orgs Usage Tab with Hierarchical Breakdown */}
            {activeTab === "usage" && (
                <UsageAnalyticsTab orgStats={orgStats} onRefresh={load} />
            )}

            {/* Activity Tab */}
            {activeTab === "activity" && (
                <ActivityLogTab />
            )}

            {/* Config Tab */}
            {activeTab === "config" && (
                <ConfigForm config={config} onSaved={load} />
            )}
        </>
    );
}
