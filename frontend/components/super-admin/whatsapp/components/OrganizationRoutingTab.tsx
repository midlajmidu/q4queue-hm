"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { WhatsAppConfig, WhatsAppAdminOrgConfig } from "@/types/api";

// ── Organization Routing State & Types ────────────────────────────────────────

export interface OrgEditState {
    is_enabled: boolean;
    mode: "default" | "custom_phone" | "custom_full";
    delivery_mode: "button_reply_only" | "always_send";
    phone_number_id: string;
    waba_id: string;
    access_token: string;
    webhook_verify_token: string;
    app_id: string;
    app_secret: string;
    showToken?: boolean;
}

// ── Organization Routing Slide-Over Drawer / Modal ────────────────────────────

export interface OrgRoutingDrawerProps {
    org: WhatsAppAdminOrgConfig | null;
    globalConfig: WhatsAppConfig | null;
    onClose: () => void;
    onSaved: () => void;
}

function OrgRoutingDrawer({ org, globalConfig, onClose, onSaved }: OrgRoutingDrawerProps) {
    const [edit, setEdit] = useState<OrgEditState>({
        is_enabled: true,
        mode: "default",
        delivery_mode: "button_reply_only",
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
                delivery_mode: (org.delivery_mode as any) || "button_reply_only",
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
                delivery_mode: edit.delivery_mode,
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

                    <div>
                        <label style={{ fontSize: 11, color: "#10b981", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", display: "block", marginBottom: 10 }}>Select Follow-Up Notification Delivery Mode</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div onClick={() => setEdit((prev: OrgEditState) => ({ ...prev, delivery_mode: "button_reply_only" }))} style={{ background: edit.delivery_mode === "button_reply_only" ? "rgba(16, 185, 129, 0.08)" : "#0f172a", border: `1px solid ${edit.delivery_mode === "button_reply_only" ? "#10b981" : "#1e293b"}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", transition: "all 0.15s" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <input type="radio" name="org_delivery_mode" checked={edit.delivery_mode === "button_reply_only"} onChange={() => setEdit((prev: OrgEditState) => ({ ...prev, delivery_mode: "button_reply_only" }))} style={{ accentColor: "#10b981" }} />
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: edit.delivery_mode === "button_reply_only" ? "#34d399" : "#f1f5f9" }}>🟢 Only On Button Click (Free Session - Default)</div>
                                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, lineHeight: 1.4 }}>Sends initial ticket message with <strong>"Get Live Queue Updates"</strong> button. Follow-up notifications (5-ahead, called, completed, etc.) are ONLY sent if customer clicks the button, delivering as <strong>₹0 free session text messages</strong> and eliminating extra Meta template charges.</div>
                                    </div>
                                </div>
                            </div>
                            <div onClick={() => setEdit((prev: OrgEditState) => ({ ...prev, delivery_mode: "always_send" }))} style={{ background: edit.delivery_mode === "always_send" ? "rgba(245, 158, 11, 0.08)" : "#0f172a", border: `1px solid ${edit.delivery_mode === "always_send" ? "#f59e0b" : "#1e293b"}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", transition: "all 0.15s" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <input type="radio" name="org_delivery_mode" checked={edit.delivery_mode === "always_send"} onChange={() => setEdit((prev: OrgEditState) => ({ ...prev, delivery_mode: "always_send" }))} style={{ accentColor: "#f59e0b" }} />
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: edit.delivery_mode === "always_send" ? "#fbbf24" : "#f1f5f9" }}>⚡ Always Send All Messages Mode</div>
                                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, lineHeight: 1.4 }}>Sends all follow-up notifications (5-ahead, called, completed, etc.) regardless of whether customer clicked the button. If outside 24h window, sends paid Meta template messages.</div>
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

export interface OrganizationRoutingTabProps {
    globalConfig: WhatsAppConfig | null;
}

export function OrganizationRoutingTab({ globalConfig }: OrganizationRoutingTabProps) {
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
                                    <th>Follow-up Delivery Mode</th>
                                    <th>Outgoing Phone ID</th>
                                    <th>WABA ID</th>
                                    <th>WhatsApp</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedOrgs.map(org => {
                                    const mode = org.mode;
                                    const delMode = org.delivery_mode || "button_reply_only";
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

                                            {/* Follow-up Delivery Mode badge */}
                                            <td>
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    padding: "3px 8px",
                                                    borderRadius: 6,
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    background: delMode === "always_send" ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.12)",
                                                    border: `1px solid ${delMode === "always_send" ? "#f59e0b" : "#10b981"}`,
                                                    color: delMode === "always_send" ? "#fbbf24" : "#34d399",
                                                }}>
                                                    {delMode === "always_send" ? "⚡ Always Send All" : "🟢 Button Click Only (Free)"}
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

export default OrganizationRoutingTab;
