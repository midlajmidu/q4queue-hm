"use client";

import React, { useEffect, useState, useCallback, Fragment } from "react";
import { api } from "@/lib/api";
import type {
    WhatsAppConfig,
    WhatsAppGlobalStats,
    WhatsAppDailyChartItem,
    WhatsAppOrgStats,
    WhatsAppMessage,
    WhatsAppAdminOrgConfig,
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

// ── Organization Routing State & Types ────────────────────────────────────────

interface OrgEditState {
    is_enabled: boolean;
    mode: "default" | "custom_phone" | "custom_full";
    phone_number_id: string;
    waba_id: string;
    access_token: string;
    webhook_verify_token: string;
    app_id: string;
    app_secret: string;
    showToken?: boolean;
}

// ── Organization Routing Slide-Over Drawer / Modal ────────────────────────────

interface OrgRoutingDrawerProps {
    org: WhatsAppAdminOrgConfig | null;
    globalConfig: WhatsAppConfig | null;
    onClose: () => void;
    onSaved: () => void;
}

function OrgRoutingDrawer({ org, globalConfig, onClose, onSaved }: OrgRoutingDrawerProps) {
    const [edit, setEdit] = useState<OrgEditState>({
        is_enabled: true,
        mode: "default",
        phone_number_id: "",
        waba_id: "",
        access_token: "",
        webhook_verify_token: "",
        app_id: "",
        app_secret: "",
        showToken: false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
    const [testResult, setTestResult] = useState<{ ok: boolean; message: string; details?: any } | null>(null);

    useEffect(() => {
        if (org) {
            setEdit({
                is_enabled: org.is_enabled,
                mode: org.mode as any,
                phone_number_id: org.phone_number_id || "",
                waba_id: org.waba_id || "",
                access_token: org.access_token || "",
                webhook_verify_token: org.webhook_verify_token || "",
                app_id: org.app_id || "",
                app_secret: org.app_secret || "",
                showToken: false,
            });
            setFeedback(null);
            setTestResult(null);
        }
    }, [org]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    if (!org) return null;

    const handleSave = async () => {
        setIsSaving(true);
        setFeedback(null);
        try {
            const payload = {
                is_enabled: edit.is_enabled,
                mode: edit.mode,
                phone_number_id: edit.mode !== "default" ? edit.phone_number_id.trim() || null : null,
                waba_id: edit.mode === "custom_full" ? edit.waba_id.trim() || null : null,
                access_token: edit.mode === "custom_full" ? edit.access_token.trim() || null : null,
                webhook_verify_token: edit.mode === "custom_full" ? edit.webhook_verify_token.trim() || null : null,
                app_id: edit.mode === "custom_full" ? edit.app_id.trim() || null : null,
                app_secret: edit.mode === "custom_full" ? edit.app_secret.trim() || null : null,
            };
            await api.updateAdminWhatsAppOrg(org.org_id, payload);
            setFeedback({ text: "✓ Routing configuration saved successfully!", ok: true });
            onSaved();
            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err: any) {
            setFeedback({ text: `✗ Save failed: ${err?.message || "Error saving"}`, ok: false });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const payload = {
                access_token: edit.mode === "custom_full" ? edit.access_token.trim() || undefined : undefined,
                phone_number_id: edit.mode !== "default" ? edit.phone_number_id.trim() || undefined : undefined,
                waba_id: edit.mode === "custom_full" ? edit.waba_id.trim() || undefined : undefined,
            };
            const res = await api.testOrgWhatsAppConnection(org.org_id, payload);
            if (res.success) {
                setTestResult({
                    ok: true,
                    message: res.message || "Connected to Meta Graph API successfully!",
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
                message: err?.message || "Failed to reach Meta server during test.",
            });
        } finally {
            setIsTesting(false);
        }
    };

    const globalPhone = globalConfig?.phone_number_id || org.global_phone_number_id || "(Not configured)";
    const globalWaba = globalConfig?.waba_id || org.global_waba_id || "(Not configured)";

    return (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div style={{ width: "100%", maxWidth: "560px", background: "#0b132b", borderLeft: "1px solid #1e293b" }} className="relative z-10 h-full flex flex-col shadow-2xl text-slate-200 overflow-hidden">
                <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e293b", background: "#0f172a" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc" }}>{org.name}</span>
                                <span style={{ fontSize: 11, background: "#1e293b", color: "#94a3b8", padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>{org.slug}</span>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✕</button>
                    </div>
                </div>

                <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }} className="space-y-6">
                    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>WhatsApp Notifications Status</div>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{edit.is_enabled ? "Active — Customer notifications will be sent" : "Paused — No WhatsApp alerts will be sent"}</div>
                        </div>
                        <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={edit.is_enabled}
                                onChange={e => setEdit((prev: OrgEditState) => ({ ...prev, is_enabled: e.target.checked }))}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{ position: "absolute", cursor: "pointer", inset: 0, background: edit.is_enabled ? "#10b981" : "#334155", borderRadius: 24, transition: "0.2s" }}>
                                <span style={{ position: "absolute", content: '""', height: 18, width: 18, left: edit.is_enabled ? 23 : 3, bottom: 3, background: "white", borderRadius: "50%", transition: "0.2s" }} />
                            </span>
                        </label>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, color: "#818cf8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", display: "block", marginBottom: 10 }}>Select WhatsApp Routing Mode</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div onClick={() => setEdit((prev: OrgEditState) => ({ ...prev, mode: "default" }))} style={{ background: edit.mode === "default" ? "rgba(56, 189, 248, 0.08)" : "#0f172a", border: `1px solid ${edit.mode === "default" ? "#38bdf8" : "#1e293b"}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", transition: "all 0.15s" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <input type="radio" name="org_mode" checked={edit.mode === "default"} onChange={() => setEdit((prev: OrgEditState) => ({ ...prev, mode: "default" }))} style={{ accentColor: "#38bdf8" }} />
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: edit.mode === "default" ? "#38bdf8" : "#f1f5f9" }}>🟢 Global Default (Inherited)</div>
                                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Uses global Phone Number ID, WABA ID, and Meta Access Token from the Configuration tab.</div>
                                    </div>
                                </div>
                            </div>
                            <div onClick={() => setEdit((prev: OrgEditState) => ({ ...prev, mode: "custom_phone" }))} style={{ background: edit.mode === "custom_phone" ? "rgba(99, 102, 241, 0.08)" : "#0f172a", border: `1px solid ${edit.mode === "custom_phone" ? "#6366f1" : "#1e293b"}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", transition: "all 0.15s" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <input type="radio" name="org_mode" checked={edit.mode === "custom_phone"} onChange={() => setEdit((prev: OrgEditState) => ({ ...prev, mode: "custom_phone" }))} style={{ accentColor: "#6366f1" }} />
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: edit.mode === "custom_phone" ? "#818cf8" : "#f1f5f9" }}>🔵 Change Phone Number ID Only</div>
                                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Sends from a dedicated phone line under the shared global WhatsApp Business Account (WABA).</div>
                                    </div>
                                </div>
                            </div>
                            <div onClick={() => setEdit((prev: OrgEditState) => ({ ...prev, mode: "custom_full" }))} style={{ background: edit.mode === "custom_full" ? "rgba(168, 85, 247, 0.08)" : "#0f172a", border: `1px solid ${edit.mode === "custom_full" ? "#a855f7" : "#1e293b"}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", transition: "all 0.15s" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <input type="radio" name="org_mode" checked={edit.mode === "custom_full"} onChange={() => setEdit((prev: OrgEditState) => ({ ...prev, mode: "custom_full" }))} style={{ accentColor: "#a855f7" }} />
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: edit.mode === "custom_full" ? "#c084fc" : "#f1f5f9" }}>🟣 Dedicated Meta WhatsApp Account</div>
                                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Completely independent Meta Developer App & WABA (custom Token, WABA ID & Phone ID).</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {edit.mode === "custom_phone" && (
                        <div style={{ background: "#0f172a", padding: "16px", borderRadius: 10, border: "1px solid #4f46e5" }} className="space-y-4">
                            <div>
                                <label style={{ fontSize: 11, color: "#818cf8", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Custom Phone Number ID *</label>
                                <input type="text" placeholder="e.g. 1139051305960874" value={edit.phone_number_id} onChange={e => setEdit((prev: OrgEditState) => ({ ...prev, phone_number_id: e.target.value }))} className="wa-input" />
                                <span style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "block" }}>Reuses the global WABA ID (<code>{globalWaba}</code>) and System Access Token.</span>
                            </div>
                        </div>
                    )}

                    {edit.mode === "custom_full" && (
                        <div style={{ background: "#0f172a", padding: "16px", borderRadius: 10, border: "1px solid #9333ea" }} className="space-y-4">
                            <div>
                                <label style={{ fontSize: 11, color: "#c084fc", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Phone Number ID *</label>
                                <input type="text" placeholder="e.g. 1139051305960874" value={edit.phone_number_id} onChange={e => setEdit((prev: OrgEditState) => ({ ...prev, phone_number_id: e.target.value }))} className="wa-input" />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: "#c084fc", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>WhatsApp Business Account (WABA) ID *</label>
                                <input type="text" placeholder="e.g. 1034155465720837" value={edit.waba_id} onChange={e => setEdit((prev: OrgEditState) => ({ ...prev, waba_id: e.target.value }))} className="wa-input" />
                            </div>
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                    <label style={{ fontSize: 11, color: "#c084fc", textTransform: "uppercase", fontWeight: 600 }}>Meta Permanent Access Token *</label>
                                    <button type="button" onClick={() => setEdit((prev: OrgEditState) => ({ ...prev, showToken: !prev.showToken }))} style={{ background: "none", border: "none", color: "#a5b4fc", fontSize: 11, cursor: "pointer" }}>{edit.showToken ? "Hide" : "Show"}</button>
                                </div>
                                <input type={edit.showToken ? "text" : "password"} placeholder="EAAB..." value={edit.access_token} onChange={e => setEdit((prev: OrgEditState) => ({ ...prev, access_token: e.target.value }))} className="wa-input" />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: "#c084fc", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Webhook Verify Token (Optional)</label>
                                <input type="text" placeholder="qrq-whatsapp-webhook-secret" value={edit.webhook_verify_token} onChange={e => setEdit((prev: OrgEditState) => ({ ...prev, webhook_verify_token: e.target.value }))} className="wa-input" />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, color: "#c084fc", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 4 }}>Meta App ID (Optional)</label>
                                <input type="text" placeholder="e.g. 523456789012345" value={edit.app_id} onChange={e => setEdit((prev: OrgEditState) => ({ ...prev, app_id: e.target.value }))} className="wa-input" />
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ padding: "16px 24px", borderTop: "1px solid #1e293b", background: "#0f172a", display: "flex", justifyContent: "flex-end", gap: 12 }}>
                    <button type="button" onClick={onClose} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button type="button" onClick={handleSave} disabled={isSaving} style={{ background: edit.mode === "custom_full" ? "#9333ea" : edit.mode === "custom_phone" ? "#4f46e5" : "#0f766e", color: "white", border: "none", borderRadius: 8, padding: "8px 24px", fontSize: 13, fontWeight: 600, cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.6 : 1 }}>{isSaving ? "Saving…" : "Save Configuration"}</button>
                </div>
            </div>
        </div>
    );
}

function OrganizationRoutingTab({ globalConfig }: { globalConfig: WhatsAppConfig | null }) {
    const [orgs, setOrgs] = useState<WhatsAppAdminOrgConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modeFilter, setModeFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedOrg, setSelectedOrg] = useState<WhatsAppAdminOrgConfig | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [quickTestingOrgId, setQuickTestingOrgId] = useState<string | null>(null);
    const [quickTestResult, setQuickTestResult] = useState<Record<string, { ok: boolean; message: string }>>({});

    const loadOrgs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getAdminWhatsAppOrgs();
            setOrgs(data);
        } catch (err: any) {
            console.error("Failed to load orgs whatsapp routing:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOrgs();
    }, [loadOrgs]);

    const handleQuickTest = async (e: React.MouseEvent, org: WhatsAppAdminOrgConfig) => {
        e.stopPropagation();
        setQuickTestingOrgId(org.org_id);
        try {
            const res = await api.testOrgWhatsAppConnection(org.org_id);
            setQuickTestResult((prev: Record<string, { ok: boolean; message: string }>) => ({
                ...prev,
                [org.org_id]: {
                    ok: res.success,
                    message: res.success ? `✓ Online (${res.details?.display_phone_number || "Verified"})` : `✕ ${res.error || "Failed"}`,
                },
            }));
            setTimeout(() => {
                setQuickTestResult((prev: Record<string, { ok: boolean; message: string }>) => {
                    const next = { ...prev };
                    delete next[org.org_id];
                    return next;
                });
            }, 5000);
        } catch (err: any) {
            setQuickTestResult((prev: Record<string, { ok: boolean; message: string }>) => ({
                ...prev,
                [org.org_id]: { ok: false, message: "✕ Error contacting server" },
            }));
        } finally {
            setQuickTestingOrgId(null);
        }
    };

    const handleToggleOrg = async (e: React.MouseEvent, org: WhatsAppAdminOrgConfig) => {
        e.stopPropagation();
        try {
            const nextVal = !org.is_enabled;
            await api.updateAdminWhatsAppOrg(org.org_id, { is_enabled: nextVal });
            setOrgs(prev => prev.map(o => o.org_id === org.org_id ? { ...o, is_enabled: nextVal } : o));
        } catch (err) {
            console.error("Failed to toggle organization:", err);
        }
    };

    const filtered = orgs.filter(o => {
        const q = search.toLowerCase();
        const matchSearch = o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q) || (o.parent_org_name && o.parent_org_name.toLowerCase().includes(q)) || o.effective_phone_number_id.includes(q);
        const matchMode = modeFilter === "all" ? true : o.mode === modeFilter;
        const matchStatus = statusFilter === "all" ? true : statusFilter === "enabled" ? o.is_enabled : !o.is_enabled;
        return matchSearch && matchMode && matchStatus;
    });

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const paginatedOrgs = filtered.slice(startIndex, startIndex + pageSize);

    const defaultCount = orgs.filter(o => o.mode === "default").length;
    const customPhoneCount = orgs.filter(o => o.mode === "custom_phone").length;
    const customFullCount = orgs.filter(o => o.mode === "custom_full").length;
    const globalPhone = globalConfig?.phone_number_id || "(Not configured)";
    const globalWaba = globalConfig?.waba_id || "(Not configured)";

    return (
        <div className="space-y-6">
            {/* Global Context & Quick Metric Cards */}
            <div className="wa-card" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", border: "1px solid #4338ca" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <h3 className="wa-card-title" style={{ margin: 0, fontSize: 16, color: "#e0e7ff" }}>
                            🏢 Organization WhatsApp Environment & Routing Hub
                        </h3>
                        <p style={{ fontSize: 13, color: "#c7d2fe", marginTop: 6, lineHeight: 1.6 }}>
                            Manage Meta WhatsApp Cloud API credentials per organization. Click on any organization row to customize its Phone ID or link a dedicated Meta Account.
                        </p>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16, borderTop: "1px solid rgba(99, 102, 241, 0.2)", paddingTop: 14 }}>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: 8, border: "1px solid #312e81" }}>
                        <div style={{ fontSize: 11, color: "#818cf8", textTransform: "uppercase", fontWeight: 600 }}>Default Global Phone ID</div>
                        <div style={{ fontSize: 13, color: "#f8fafc", fontFamily: "monospace", marginTop: 2 }}>{globalPhone}</div>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: 8, border: "1px solid #312e81" }}>
                        <div style={{ fontSize: 11, color: "#818cf8", textTransform: "uppercase", fontWeight: 600 }}>Default Global WABA ID</div>
                        <div style={{ fontSize: 13, color: "#f8fafc", fontFamily: "monospace", marginTop: 2 }}>{globalWaba}</div>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: 8, border: "1px solid #312e81" }}>
                        <div style={{ fontSize: 11, color: "#38bdf8", textTransform: "uppercase", fontWeight: 600 }}>Global Default Mode</div>
                        <div style={{ fontSize: 14, color: "#38bdf8", fontWeight: 700, marginTop: 2 }}>{defaultCount} Orgs</div>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: 8, border: "1px solid #312e81" }}>
                        <div style={{ fontSize: 11, color: "#a855f7", textTransform: "uppercase", fontWeight: 600 }}>Custom / Dedicated</div>
                        <div style={{ fontSize: 14, color: "#c084fc", fontWeight: 700, marginTop: 2 }}>{customPhoneCount + customFullCount} Orgs</div>
                    </div>
                </div>
            </div>

            {/* Organizations Table Card */}
            <div className="wa-card">
                {/* Search & Filter Toolbar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260, maxWidth: 400 }}>
                        <input
                            type="text"
                            placeholder="🔍 Search organization, slug, phone ID..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="wa-input"
                            style={{ height: 38, fontSize: 13 }}
                        />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {/* Mode Filter */}
                        <select
                            value={modeFilter}
                            onChange={e => { setModeFilter(e.target.value); setCurrentPage(1); }}
                            style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}
                        >
                            <option value="all">All Routing Modes</option>
                            <option value="default">🟢 Global Default</option>
                            <option value="custom_phone">🔵 Custom Phone ID</option>
                            <option value="custom_full">🟣 Dedicated Meta Account</option>
                        </select>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}
                        >
                            <option value="all">All Status</option>
                            <option value="enabled">Enabled Only</option>
                            <option value="disabled">Paused Only</option>
                        </select>

                        {/* Per Page */}
                        <select
                            value={pageSize}
                            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                            style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}
                        >
                            <option value={10}>10 / page</option>
                            <option value={20}>20 / page</option>
                            <option value={50}>50 / page</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ padding: 50, textAlign: "center", color: "#64748b" }}>
                        <div style={{ width: 28, height: 28, border: "3px solid #1e293b", borderTop: "3px solid #6366f1", borderRadius: "50%", margin: "0 auto 10px", animation: "spin 1s linear infinite" }} />
                        Loading organizations…
                    </div>
                ) : paginatedOrgs.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                        No organizations found matching the selected filters.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table className="wa-table" style={{ width: "100%" }}>
                            <thead>
                                <tr>
                                    <th>Organization / Branch</th>
                                    <th>Routing Mode</th>
                                    <th>Outgoing Phone ID</th>
                                    <th>WABA ID</th>
                                    <th>WhatsApp</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedOrgs.map(org => {
                                    const mode = org.mode;
                                    const isTesting = quickTestingOrgId === org.org_id;
                                    const testRes = quickTestResult[org.org_id];

                                    return (
                                        <tr
                                            key={org.org_id}
                                            onClick={() => setSelectedOrg(org)}
                                            style={{ cursor: "pointer", transition: "background 0.15s" }}
                                        >
                                            {/* Name & tags */}
                                            <td>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span style={{ fontWeight: 600, color: "#f8fafc", fontSize: 14 }}>
                                                        {org.name}
                                                    </span>
                                                    <span style={{ fontSize: 11, background: "#1e293b", color: "#94a3b8", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>
                                                        {org.slug}
                                                    </span>
                                                    {org.parent_org_name && (
                                                        <span style={{ fontSize: 10, background: "#312e81", color: "#a5b4fc", padding: "1px 6px", borderRadius: 4 }}>
                                                            {org.parent_org_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Mode badge */}
                                            <td>
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    padding: "3px 8px",
                                                    borderRadius: 6,
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    background: mode === "custom_full" ? "rgba(168, 85, 247, 0.15)" : mode === "custom_phone" ? "rgba(99, 102, 241, 0.15)" : "rgba(56, 189, 248, 0.12)",
                                                    border: `1px solid ${mode === "custom_full" ? "#9333ea" : mode === "custom_phone" ? "#4f46e5" : "#0284c7"}`,
                                                    color: mode === "custom_full" ? "#d8b4fe" : mode === "custom_phone" ? "#a5b4fc" : "#38bdf8",
                                                }}>
                                                    {mode === "custom_full" && "🟣 Dedicated Account"}
                                                    {mode === "custom_phone" && "🔵 Custom Phone ID"}
                                                    {mode === "default" && "🟢 Global Default"}
                                                </span>
                                            </td>

                                            {/* Phone ID */}
                                            <td>
                                                <span style={{ fontFamily: "monospace", fontSize: 12, color: mode !== "default" ? "#a5b4fc" : "#94a3b8" }}>
                                                    {org.effective_phone_number_id || "—"}
                                                </span>
                                            </td>

                                            {/* WABA ID */}
                                            <td>
                                                <span style={{ fontFamily: "monospace", fontSize: 12, color: mode === "custom_full" ? "#c084fc" : "#94a3b8" }}>
                                                    {org.effective_waba_id || "—"}
                                                </span>
                                            </td>

                                            {/* WhatsApp status toggle */}
                                            <td>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleToggleOrg(e, org)}
                                                    style={{
                                                        background: org.is_enabled ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.1)",
                                                        border: `1px solid ${org.is_enabled ? "#10b981" : "#475569"}`,
                                                        color: org.is_enabled ? "#34d399" : "#64748b",
                                                        borderRadius: 6,
                                                        padding: "2px 8px",
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    {org.is_enabled ? "● Enabled" : "○ Paused"}
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td style={{ textAlign: "right" }}>
                                                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
                                                    {testRes && (
                                                        <span style={{ fontSize: 11, color: testRes.ok ? "#34d399" : "#f87171", fontWeight: 500 }}>
                                                            {testRes.message}
                                                        </span>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleQuickTest(e, org)}
                                                        disabled={isTesting}
                                                        style={{
                                                            background: "#1e293b",
                                                            border: "1px solid #334155",
                                                            color: "#60a5fa",
                                                            borderRadius: 6,
                                                            padding: "4px 10px",
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            cursor: isTesting ? "default" : "pointer",
                                                            opacity: isTesting ? 0.6 : 1,
                                                        }}
                                                        title="Test Meta Graph API connectivity"
                                                    >
                                                        {isTesting ? "…" : "⚡ Test"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedOrg(org)}
                                                        style={{
                                                            background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: 6,
                                                            padding: "4px 12px",
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        ⚙️ Configure
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && totalItems > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, borderTop: "1px solid #1e293b", paddingTop: 14, flexWrap: "wrap", gap: 12 }}>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                            Showing <strong>{startIndex + 1}</strong> – <strong>{Math.min(startIndex + pageSize, totalItems)}</strong> of <strong>{totalItems}</strong> organizations
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={safeCurrentPage === 1}
                                style={{
                                    background: "#1e293b",
                                    border: "1px solid #334155",
                                    color: safeCurrentPage === 1 ? "#475569" : "#e2e8f0",
                                    borderRadius: 6,
                                    padding: "5px 12px",
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: safeCurrentPage === 1 ? "default" : "pointer",
                                    opacity: safeCurrentPage === 1 ? 0.5 : 1,
                                }}
                            >
                                ‹ Previous
                            </button>

                            {/* Page numbers */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                                Math.max(0, safeCurrentPage - 3),
                                Math.min(totalPages, safeCurrentPage + 2)
                            ).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setCurrentPage(p)}
                                    style={{
                                        background: safeCurrentPage === p ? "#6366f1" : "#1e293b",
                                        border: "1px solid",
                                        borderColor: safeCurrentPage === p ? "#6366f1" : "#334155",
                                        color: safeCurrentPage === p ? "#ffffff" : "#94a3b8",
                                        borderRadius: 6,
                                        width: 32,
                                        height: 30,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    {p}
                                </button>
                            ))}

                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={safeCurrentPage === totalPages}
                                style={{
                                    background: "#1e293b",
                                    border: "1px solid #334155",
                                    color: safeCurrentPage === totalPages ? "#475569" : "#e2e8f0",
                                    borderRadius: 6,
                                    padding: "5px 12px",
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: safeCurrentPage === totalPages ? "default" : "pointer",
                                    opacity: safeCurrentPage === totalPages ? 0.5 : 1,
                                }}
                            >
                                Next ›
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Slide-Over Drawer Modal */}
            <OrgRoutingDrawer
                org={selectedOrg}
                globalConfig={globalConfig}
                onClose={() => setSelectedOrg(null)}
                onSaved={loadOrgs}
            />
        </div>
    );
}

// ── Usage Analytics Tab (Hierarchical Org & Branch Breakdown) ───────────────────

function UsageAnalyticsTab({ orgStats, onRefresh }: { orgStats: WhatsAppOrgStats[]; onRefresh: () => void }) {
    const [search, setSearch] = useState("");
    const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());

    const toggleOrg = (id: string) => {
        setExpandedOrgs(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (expandedOrgs.size === filteredOrgs.length) {
            setExpandedOrgs(new Set());
        } else {
            setExpandedOrgs(new Set(filteredOrgs.map(o => o.id || o.organization_id || o.name || "")));
        }
    };

    const filteredOrgs = orgStats.filter(o => {
        const q = search.toLowerCase();
        const matchOrg = (o.name || o.org_name || "").toLowerCase().includes(q) || (o.slug || "").toLowerCase().includes(q);
        const matchBranch = o.branches?.some(b => b.branch_name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q));
        return matchOrg || matchBranch;
    });

    const totalParentOrgs = orgStats.length;
    const totalBranches = orgStats.reduce((acc, o) => acc + (o.branches?.length || (o.is_parent ? 0 : 1)), 0);
    const totalMessages = orgStats.reduce((acc, o) => acc + (o.total || 0), 0);
    const totalDelivered = orgStats.reduce((acc, o) => acc + (o.delivered || 0), 0);
    const avgDeliveryRate = totalMessages > 0 ? ((totalDelivered / totalMessages) * 100).toFixed(1) : "0.0";

    const allExpanded = filteredOrgs.length > 0 && expandedOrgs.size === filteredOrgs.length;

    return (
        <div className="space-y-6">
            {/* Header Metrics Banner */}
            <div className="wa-card" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", border: "1px solid #4338ca" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <h3 className="wa-card-title" style={{ margin: 0, fontSize: 16, color: "#e0e7ff" }}>
                            📊 Organization & Branch WhatsApp Usage Analytics
                        </h3>
                        <p style={{ fontSize: 13, color: "#c7d2fe", marginTop: 6, lineHeight: 1.6 }}>
                            Track message volumes by organization. Click the arrow (▶) on any organization to expand and view the breakdown across its branches.
                        </p>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 16, borderTop: "1px solid rgba(99, 102, 241, 0.2)", paddingTop: 14 }}>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: 8, border: "1px solid #312e81" }}>
                        <div style={{ fontSize: 11, color: "#818cf8", textTransform: "uppercase", fontWeight: 600 }}>Total Organizations</div>
                        <div style={{ fontSize: 14, color: "#f8fafc", fontWeight: 700, marginTop: 2 }}>{totalParentOrgs}</div>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: 8, border: "1px solid #312e81" }}>
                        <div style={{ fontSize: 11, color: "#818cf8", textTransform: "uppercase", fontWeight: 600 }}>Total Active Branches</div>
                        <div style={{ fontSize: 14, color: "#f8fafc", fontWeight: 700, marginTop: 2 }}>{totalBranches} Branches</div>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: 8, border: "1px solid #312e81" }}>
                        <div style={{ fontSize: 11, color: "#38bdf8", textTransform: "uppercase", fontWeight: 600 }}>Total Messages Sent</div>
                        <div style={{ fontSize: 14, color: "#38bdf8", fontWeight: 700, marginTop: 2 }}>{totalMessages.toLocaleString()}</div>
                    </div>
                    <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "10px 14px", borderRadius: 8, border: "1px solid #312e81" }}>
                        <div style={{ fontSize: 11, color: "#34d399", textTransform: "uppercase", fontWeight: 600 }}>Overall Delivery Rate</div>
                        <div style={{ fontSize: 14, color: "#34d399", fontWeight: 700, marginTop: 2 }}>{avgDeliveryRate}%</div>
                    </div>
                </div>
            </div>

            {/* Organizations Table Card */}
            <div className="wa-card">
                {/* Search & Actions Toolbar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                    <input
                        type="text"
                        placeholder="🔍 Search organization, branch name, or slug..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="wa-input"
                        style={{ maxWidth: 360, height: 38, fontSize: 13 }}
                    />

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                            type="button"
                            onClick={toggleAll}
                            style={{
                                background: "#1e293b",
                                border: "1px solid #334155",
                                color: "#cbd5e1",
                                borderRadius: 8,
                                padding: "8px 14px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            <span>{allExpanded ? "Collapse All" : "Expand All"}</span>
                            <span>{allExpanded ? "▲" : "▼"}</span>
                        </button>
                    </div>
                </div>

                {filteredOrgs.length === 0 ? (
                    <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: "30px 0" }}>
                        No organization usage data found.
                    </p>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table className="wa-table" style={{ width: "100%" }}>
                            <thead>
                                <tr>
                                    <th style={{ width: 40, textAlign: "center" }}></th>
                                    <th>Organization / Group</th>
                                    <th style={{ textAlign: "right" }}>Total Sent</th>
                                    <th style={{ textAlign: "right" }}>Delivered</th>
                                    <th style={{ textAlign: "right" }}>Read</th>
                                    <th style={{ textAlign: "right" }}>Failed</th>
                                    <th style={{ textAlign: "right" }}>Success Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrgs.map(org => {
                                    const orgId = org.id || org.organization_id || org.name || "";
                                    const isExpanded = expandedOrgs.has(orgId);
                                    const branches = org.branches || [];
                                    const hasBranches = branches.length > 0;

                                    return (
                                        <Fragment key={orgId}>
                                            {/* Top-Level Organization Row */}
                                            <tr
                                                onClick={() => toggleOrg(orgId)}
                                                style={{
                                                    cursor: "pointer",
                                                    background: isExpanded ? "rgba(99, 102, 241, 0.08)" : undefined,
                                                    borderLeft: isExpanded ? "3px solid #6366f1" : "3px solid transparent",
                                                    transition: "all 0.15s ease-in-out",
                                                }}
                                            >
                                                {/* Arrow Button */}
                                                <td style={{ textAlign: "center", padding: "12px 6px" }}>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleOrg(orgId);
                                                        }}
                                                        style={{
                                                            background: isExpanded ? "#6366f1" : "#1e293b",
                                                            border: `1px solid ${isExpanded ? "#4f46e5" : "#334155"}`,
                                                            color: isExpanded ? "#ffffff" : "#94a3b8",
                                                            borderRadius: 6,
                                                            width: 26,
                                                            height: 26,
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontSize: 10,
                                                            cursor: "pointer",
                                                            transition: "transform 0.2s, background 0.15s",
                                                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                                        }}
                                                        title={isExpanded ? "Collapse branches" : "Expand branch breakdown"}
                                                    >
                                                        ▶
                                                    </button>
                                                </td>

                                                {/* Org Name & Tags */}
                                                <td>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                        <span style={{ color: "#f8fafc", fontWeight: 700, fontSize: 14 }}>
                                                            {org.name || org.org_name}
                                                        </span>
                                                        {org.slug && (
                                                            <span style={{ fontSize: 11, background: "#1e293b", color: "#94a3b8", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>
                                                                {org.slug}
                                                            </span>
                                                        )}
                                                        {org.is_parent ? (
                                                            <span style={{ fontSize: 10, fontWeight: 600, background: "#312e81", color: "#a5b4fc", padding: "2px 8px", borderRadius: 12 }}>
                                                                {branches.length} {branches.length === 1 ? "Branch" : "Branches"}
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: 10, background: "#0f766e", color: "#99f6e4", padding: "2px 8px", borderRadius: 12 }}>
                                                                Standalone Branch
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Metric Columns */}
                                                <td style={{ textAlign: "right", fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>
                                                    {org.total.toLocaleString()}
                                                </td>
                                                <td style={{ textAlign: "right", color: "#34d399", fontWeight: 600 }}>
                                                    {org.delivered.toLocaleString()}
                                                </td>
                                                <td style={{ textAlign: "right", color: "#818cf8", fontWeight: 600 }}>
                                                    {org.read.toLocaleString()}
                                                </td>
                                                <td style={{ textAlign: "right", color: org.failed > 0 ? "#f87171" : "#64748b", fontWeight: 600 }}>
                                                    {org.failed.toLocaleString()}
                                                </td>
                                                <td style={{ textAlign: "right" }}>
                                                    <span style={{
                                                        display: "inline-block",
                                                        padding: "2px 8px",
                                                        borderRadius: 6,
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        background: org.success_rate >= 80 ? "rgba(16, 185, 129, 0.15)" : org.success_rate >= 50 ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                                        color: org.success_rate >= 80 ? "#34d399" : org.success_rate >= 50 ? "#f59e0b" : "#f87171",
                                                        border: `1px solid ${org.success_rate >= 80 ? "#059669" : org.success_rate >= 50 ? "#d97706" : "#dc2626"}`,
                                                    }}>
                                                        {org.success_rate}%
                                                    </span>
                                                </td>
                                            </tr>

                                            {/* Expanded Sub-Table: Branch Breakdown */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={7} style={{ padding: "0 0 16px 0", background: "rgba(15, 23, 42, 0.5)" }}>
                                                        <div style={{
                                                            margin: "8px 16px 8px 48px",
                                                            background: "#080e1e",
                                                            border: "1px solid #1e293b",
                                                            borderRadius: 10,
                                                            padding: "12px 16px",
                                                            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
                                                        }}>
                                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderBottom: "1px solid #1e293b", paddingBottom: 6 }}>
                                                                <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                                    🏢 Branch Breakdown ({branches.length} Registered)
                                                                </span>
                                                                <span style={{ fontSize: 11, color: "#64748b" }}>
                                                                    Sub-totals for {org.name || org.org_name}
                                                                </span>
                                                            </div>

                                                            {branches.length === 0 ? (
                                                                <div style={{ color: "#64748b", fontSize: 12, padding: "8px 0" }}>
                                                                    No branches registered under this organization yet.
                                                                </div>
                                                            ) : (
                                                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                                                    <thead>
                                                                        <tr style={{ borderBottom: "1px solid #1e293b", color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>
                                                                            <th style={{ textAlign: "left", padding: "6px 8px" }}>Branch Name</th>
                                                                            <th style={{ textAlign: "right", padding: "6px 8px" }}>Sent</th>
                                                                            <th style={{ textAlign: "right", padding: "6px 8px" }}>Delivered</th>
                                                                            <th style={{ textAlign: "right", padding: "6px 8px" }}>Read</th>
                                                                            <th style={{ textAlign: "right", padding: "6px 8px" }}>Failed</th>
                                                                            <th style={{ textAlign: "right", padding: "6px 8px" }}>Success</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {branches.map(branch => (
                                                                            <tr key={branch.organization_id} style={{ borderBottom: "1px solid #0f172a" }}>
                                                                                <td style={{ padding: "8px", color: "#e2e8f0" }}>
                                                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                                                        <span style={{ color: branch.is_active ? "#10b981" : "#ef4444", fontSize: 9 }}>●</span>
                                                                                        <strong style={{ color: "#f1f5f9" }}>{branch.branch_name}</strong>
                                                                                        <span style={{ fontSize: 10, background: "#1e293b", color: "#94a3b8", padding: "1px 4px", borderRadius: 3, fontFamily: "monospace" }}>
                                                                                            {branch.slug}
                                                                                        </span>
                                                                                    </div>
                                                                                </td>
                                                                                <td style={{ textAlign: "right", padding: "8px", fontFamily: "monospace", color: "#e2e8f0", fontWeight: 600 }}>
                                                                                    {branch.total.toLocaleString()}
                                                                                </td>
                                                                                <td style={{ textAlign: "right", padding: "8px", fontFamily: "monospace", color: "#34d399" }}>
                                                                                    {branch.delivered.toLocaleString()}
                                                                                </td>
                                                                                <td style={{ textAlign: "right", padding: "8px", fontFamily: "monospace", color: "#818cf8" }}>
                                                                                    {branch.read.toLocaleString()}
                                                                                </td>
                                                                                <td style={{ textAlign: "right", padding: "8px", fontFamily: "monospace", color: branch.failed > 0 ? "#f87171" : "#64748b" }}>
                                                                                    {branch.failed.toLocaleString()}
                                                                                </td>
                                                                                <td style={{ textAlign: "right", padding: "8px" }}>
                                                                                    <span style={{
                                                                                        color: branch.success_rate >= 80 ? "#34d399" : branch.success_rate >= 50 ? "#f59e0b" : "#f87171",
                                                                                        fontWeight: 600,
                                                                                    }}>
                                                                                        {branch.success_rate}%
                                                                                    </span>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
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
    const [activeTab, setActiveTab] = useState<"overview" | "org_config" | "usage" | "activity" | "config">("overview");

    const load = useCallback(async () => {
        try {
            const [cfg, s, ch, os, msgs] = await Promise.allSettled([
                api.getWhatsAppConfig(),
                api.getWhatsAppGlobalStats(),
                api.getWhatsAppDailyChart(30),
                api.getWhatsAppStatsByOrg(100),
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
                <ConfigForm config={config} onSaved={load} />
            )}
        </>
    );
}
