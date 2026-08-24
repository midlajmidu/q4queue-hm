"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { WhatsAppTemplate, WhatsAppTemplateCreate } from "@/types/api";

const EVENT_OPTIONS = [
    { value: "queue_joined_v4", label: "Queue Ticket Confirmed (Header Image)", badge: "Initial Join" },
    { value: "queue_nearby_5_v3", label: "5 People Ahead Warning", badge: "Position Alert" },
    { value: "queue_nearby_3_v3", label: "3 People Ahead Urgent Alert", badge: "Position Alert" },
    { value: "queue_called_v3", label: "Token Called to Counter", badge: "Service Call" },
    { value: "queue_completed_v3", label: "Service Completed", badge: "Completion" },
    { value: "queue_skipped_v3", label: "Token Skipped", badge: "Skipped" },
    { value: "queue_recalled_v2", label: "Token Recalled", badge: "Recalled" },
    { value: "queue_removed_v3", label: "Ticket Removed / Cancelled", badge: "Removal" },
];

const STATUS_COLORS: Record<string, string> = {
    approved: "#34d399",
    pending: "#f59e0b",
    draft: "#64748b",
    rejected: "#f87171",
};

const EMPTY_FORM: WhatsAppTemplateCreate = {
    template_name: "",
    category: "UTILITY",
    language: "en",
    description: "",
    body_text: "",
    event_type: "",
    status: "approved",
    variables: {},
};

export default function WhatsAppTemplatesPage() {
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<WhatsAppTemplate | null>(null);
    const [form, setForm] = useState<WhatsAppTemplateCreate>({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [preview, setPreview] = useState<WhatsAppTemplate | null>(null);
    const [syncingMeta, setSyncingMeta] = useState(false);
    const [syncResult, setSyncResult] = useState<{ message: string; success: boolean } | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await api.listWhatsAppTemplates();
            setTemplates(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openEdit = (t: WhatsAppTemplate) => {
        setEditTarget(t);
        setForm({
            template_name: t.template_name,
            category: t.category,
            language: t.language,
            description: t.description || "",
            body_text: t.body_text,
            event_type: t.event_type || "",
            status: t.status,
            variables: t.variables || {},
        });
        setError("");
        setShowModal(true);
    };

    const saveTemplate = async () => {
        if (!form.template_name.trim() || !form.body_text.trim()) {
            setError("Template name and body text are required.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const payload = { ...form };
            if (editTarget) {
                await api.updateWhatsAppTemplate(editTarget.id, payload);
            } else {
                await api.createWhatsAppTemplate(payload);
            }
            setShowModal(false);
            await load();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to save template");
        } finally {
            setSaving(false);
        }
    };

    const deleteTemplate = async (id: string) => {
        try {
            await api.deleteWhatsAppTemplate(id);
            setDeleteConfirm(null);
            await load();
        } catch {
            alert("Failed to delete template.");
        }
    };

    const handleSyncMeta = async () => {
        setSyncingMeta(true);
        setSyncResult(null);
        try {
            const res = await api.syncMetaTemplates();
            setSyncResult({
                success: res.success,
                message: res.message || "Meta WABA synchronized successfully.",
            });
            await load();
        } catch (err: unknown) {
            setSyncResult({
                success: false,
                message: err instanceof Error ? err.message : "Failed to communicate with Meta Graph API.",
            });
        } finally {
            setSyncingMeta(false);
        }
    };

    const renderPreview = (tpl: WhatsAppTemplate) => {
        const varEntries = Object.entries(tpl.variables || {});
        let body = tpl.body_text;
        varEntries.forEach(([k, v]) => {
            body = body.replace(`{{${k}}}`, `[${v}]`);
        });
        return body;
    };

    return (
        <>
            <style>{`
                .tpl-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; }
                .tpl-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
                .tpl-modal { background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 24px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); }
                .tpl-input { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 9px 13px; color: #e2e8f0; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
                .tpl-input:focus { border-color: #6366f1; }
                .tpl-textarea { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 9px 13px; color: #e2e8f0; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; resize: vertical; min-height: 120px; font-family: inherit; }
                .tpl-textarea:focus { border-color: #6366f1; }
                .tpl-select { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 9px 13px; color: #e2e8f0; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
                .tpl-btn { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 8px; padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; alignItems: center; gap: 6px; }
                .tpl-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .tpl-btn-ghost { background: #1e293b; color: #94a3b8; border: 1px solid #334155; border-radius: 8px; padding: 8px 14px; font-size: 13px; cursor: pointer; transition: all 0.15s; }
                .tpl-btn-ghost:hover { background: #334155; color: #f8fafc; }
                .tpl-btn-danger { background: #7f1d1d; color: #fca5a5; border: 1px solid #991b1b; border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; }
                .tpl-btn-danger:hover { background: #991b1b; color: #fff; }
                .tpl-row { display: flex; align-items: flex-start; gap: 16px; padding: 18px 0; border-bottom: 1px solid #1e293b; }
                .tpl-row:last-child { border-bottom: none; }
                .label-sm { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 5px; font-weight: 600; }
            `}</style>

            <div className="space-y-6">
                {/* Header with Navigation and Sync Action */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <Link
                                href="/super-admin/whatsapp"
                                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
                            >
                                ← Back to WhatsApp Hub
                            </Link>
                        </div>
                        <h1 style={{ color: "#f8fafc", fontSize: 22, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                            <span>📋</span> WhatsApp Message Templates
                        </h1>
                        <p style={{ color: "#94a3b8", fontSize: 13, margin: "6px 0 0" }}>
                            The 8 official WhatsApp utility notification templates active in QRQ. All deprecated templates are automatically purged.
                        </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                            onClick={handleSyncMeta}
                            disabled={syncingMeta}
                            className="tpl-btn"
                            style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
                            title="Purge all legacy templates from Meta WABA and sync active 8 templates"
                        >
                            {syncingMeta ? "⚡ Syncing Meta WABA…" : "⚡ Clean & Sync Meta WABA"}
                        </button>
                    </div>
                </div>

                {/* Sync Result Banner */}
                {syncResult && (
                    <div style={{
                        background: syncResult.success ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                        border: `1px solid ${syncResult.success ? "#059669" : "#dc2626"}`,
                        borderRadius: 10,
                        padding: "12px 16px",
                        color: syncResult.success ? "#34d399" : "#f87171",
                        fontSize: 13,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}>
                        <div>
                            <strong>{syncResult.success ? "✓ Meta Sync Complete:" : "⚠ Meta Sync Notice:"}</strong> {syncResult.message}
                        </div>
                        <button
                            onClick={() => setSyncResult(null)}
                            style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: 14 }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Templates List */}
                {loading ? (
                    <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>Loading templates…</div>
                ) : templates.length === 0 ? (
                    <div className="tpl-card" style={{ textAlign: "center", padding: 48 }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
                        <p style={{ color: "#94a3b8", fontSize: 14 }}>No templates found. Click below to synchronize the 8 official templates.</p>
                        <button onClick={handleSyncMeta} className="tpl-btn" style={{ marginTop: 12 }}>
                            ⚡ Initialize Official Templates
                        </button>
                    </div>
                ) : (
                    <div className="tpl-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #1e293b", paddingBottom: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Official Templates ({templates.length} Active)
                            </div>
                            <span style={{ fontSize: 12, background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid #059669", padding: "2px 10px", borderRadius: 12, fontWeight: 600 }}>
                                Meta Utility Tier Approved
                            </span>
                        </div>

                        {templates.map((t, idx) => {
                            const eventConfig = EVENT_OPTIONS.find(e => e.value === t.event_type);
                            const isHeaderImage = t.template_name === "ticket_confirmed_v1";

                            return (
                                <div key={t.id} className="tpl-row">
                                    <div style={{ color: "#64748b", fontWeight: 700, fontSize: 14, width: 24, flexShrink: 0 }}>
                                        {idx + 1}.
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                                            <span style={{ color: "#f8fafc", fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>
                                                {t.template_name}
                                            </span>
                                            <span style={{
                                                background: STATUS_COLORS[t.status] + "22",
                                                color: STATUS_COLORS[t.status],
                                                border: `1px solid ${STATUS_COLORS[t.status]}55`,
                                                borderRadius: 6,
                                                padding: "1px 8px",
                                                fontSize: 11,
                                                fontWeight: 700,
                                                textTransform: "uppercase",
                                            }}>
                                                {t.status}
                                            </span>
                                            <span style={{ background: "#1e293b", color: "#a5b4fc", borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>
                                                {t.category} ({t.language})
                                            </span>
                                            {isHeaderImage && (
                                                <span style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid #2563eb", borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 600 }}>
                                                    🖼️ Dynamic Ticket Card Header
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                            <span style={{ fontSize: 12, color: "#818cf8", fontWeight: 600 }}>
                                                Trigger: {eventConfig?.label || t.event_type || "Queue Event"}
                                            </span>
                                            {eventConfig?.badge && (
                                                <span style={{ fontSize: 10, background: "#334155", color: "#cbd5e1", padding: "1px 6px", borderRadius: 4 }}>
                                                    {eventConfig.badge}
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>
                                            {t.description}
                                        </div>

                                        {/* Variables Pills */}
                                        {t.variables && Object.keys(t.variables).length > 0 && (
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                                                {Object.entries(t.variables).map(([num, name]) => (
                                                    <span key={num} style={{ background: "#0b1329", border: "1px solid #1e293b", color: "#93c5fd", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontFamily: "monospace" }}>
                                                        {`{{${num}}}`} {name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Snippet preview */}
                                        <div style={{ color: "#64748b", fontSize: 12, fontFamily: "monospace", background: "#090d16", border: "1px solid #1e293b", borderRadius: 6, padding: "8px 12px", whiteSpace: "pre-wrap", maxHeight: 64, overflow: "hidden" }}>
                                            {t.body_text.substring(0, 140)}{t.body_text.length > 140 ? "…" : ""}
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                        <button onClick={() => setPreview(t)} className="tpl-btn-ghost" style={{ fontSize: 12, padding: "6px 14px" }}>
                                            👁 Preview
                                        </button>
                                        <button onClick={() => openEdit(t)} className="tpl-btn-ghost" style={{ fontSize: 12, padding: "6px 14px" }}>
                                            ✏️ Edit
                                        </button>
                                        <button onClick={() => setDeleteConfirm(t.id)} className="tpl-btn-danger">
                                            🗑 Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Edit Modal */}
                {showModal && (
                    <div className="tpl-modal-bg" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                        <div className="tpl-modal">
                            <h3 style={{ color: "#f8fafc", fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
                                {editTarget ? `Edit Template: ${editTarget.template_name}` : "New Template"}
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                                <div>
                                    <div className="label-sm">Template Name *</div>
                                    <input className="tpl-input" value={form.template_name} onChange={e => setForm(f => ({ ...f, template_name: e.target.value }))} placeholder="ticket_confirmed_v1" disabled={!!editTarget} />
                                </div>
                                <div>
                                    <div className="label-sm">Event Trigger</div>
                                    <select className="tpl-select" value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                                        <option value="">— Select Event Trigger —</option>
                                        {EVENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <div className="label-sm">Category</div>
                                    <select className="tpl-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                        <option value="UTILITY">UTILITY</option>
                                        <option value="MARKETING">MARKETING</option>
                                        <option value="AUTHENTICATION">AUTHENTICATION</option>
                                    </select>
                                </div>
                                <div>
                                    <div className="label-sm">Language</div>
                                    <select className="tpl-select" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                                        <option value="en">English (en)</option>
                                        <option value="en_US">English US (en_US)</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <div className="label-sm">Description</div>
                                <input className="tpl-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Briefly describe when this notification is dispatched..." />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <div className="label-sm">Body Text (use {"{{1}}"}, {"{{2}}"} for runtime variables)</div>
                                <textarea className="tpl-textarea" value={form.body_text} onChange={e => setForm(f => ({ ...f, body_text: e.target.value }))} placeholder="Greetings {{1}}! Your ticket {{2}} is confirmed..." style={{ minHeight: 140 }} />
                            </div>
                            {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}
                            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                <button onClick={() => setShowModal(false)} className="tpl-btn-ghost">Cancel</button>
                                <button onClick={saveTemplate} disabled={saving} className="tpl-btn">
                                    {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Template"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* WhatsApp Phone Mockup Preview Modal */}
                {preview && (
                    <div className="tpl-modal-bg" onClick={() => setPreview(null)}>
                        <div className="tpl-modal" style={{ maxWidth: 440, background: "#0b141a", border: "1px solid #1f2c34" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid #1f2c34", paddingBottom: 10 }}>
                                <div>
                                    <h3 style={{ color: "#e9edef", fontWeight: 700, margin: 0, fontSize: 15 }}>{preview.template_name}</h3>
                                    <div style={{ color: "#8696a0", fontSize: 12, marginTop: 2 }}>{preview.description}</div>
                                </div>
                                <button onClick={() => setPreview(null)} style={{ background: "none", border: "none", color: "#8696a0", fontSize: 16, cursor: "pointer" }}>✕</button>
                            </div>

                            {/* WhatsApp Bubble View */}
                            <div style={{ background: "#005c4b", border: "1px solid #005c4b", borderRadius: 10, padding: 14, color: "#e9edef", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", borderTopLeftRadius: 0, boxShadow: "0 2px 5px rgba(0,0,0,0.3)" }}>
                                {preview.template_name === "ticket_confirmed_v1" && (
                                    <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 10, marginBottom: 10, textAlign: "center", border: "1px dashed rgba(255,255,255,0.2)" }}>
                                        <div style={{ fontSize: 11, color: "#8696a0", textTransform: "uppercase", fontWeight: 700 }}>🖼️ Dynamic Ticket Card Header</div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 2 }}>[Personalized Token Image]</div>
                                    </div>
                                )}
                                {renderPreview(preview)}
                            </div>

                            <div style={{ marginTop: 14, fontSize: 11, color: "#8696a0", textAlign: "center" }}>
                                Parameters in [brackets] are dynamically substituted from queue state at delivery time.
                            </div>

                            <button onClick={() => setPreview(null)} className="tpl-btn-ghost" style={{ marginTop: 16, width: "100%" }}>
                                Close Preview
                            </button>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteConfirm && (
                    <div className="tpl-modal-bg">
                        <div className="tpl-modal" style={{ maxWidth: 360 }}>
                            <h3 style={{ color: "#f87171", fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Delete Template?</h3>
                            <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 }}>
                                This will remove the template from the database and request deletion from Meta WABA.
                            </p>
                            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
                                <button onClick={() => setDeleteConfirm(null)} className="tpl-btn-ghost">Cancel</button>
                                <button onClick={() => deleteTemplate(deleteConfirm)} className="tpl-btn-danger" style={{ fontSize: 13, padding: "8px 18px" }}>
                                    Delete from System & Meta
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
