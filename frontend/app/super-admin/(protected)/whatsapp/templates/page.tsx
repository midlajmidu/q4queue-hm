"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { WhatsAppTemplate, WhatsAppTemplateCreate } from "@/types/api";

const EVENT_OPTIONS = [
    { value: "queue_joined_v2", label: "Customer Joins Queue (Hybrid Gateway)" },
    { value: "queue.joined", label: "Customer Joins Queue (Legacy)" },
    { value: "queue.called", label: "Token Called" },
    { value: "queue.reminder", label: "Position ≤ 3 Reminder" },
    { value: "queue.removed", label: "Staff Removes Customer" },
    { value: "queue.cancelled", label: "Customer Leaves Queue" },
    { value: "queue.completed", label: "Service Completed" },
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
    status: "draft",
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

    const load = async () => {
        setLoading(true);
        try {
            const data = await api.listWhatsAppTemplates();
            setTemplates(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => {
        setEditTarget(null);
        setForm({ ...EMPTY_FORM });
        setError("");
        setShowModal(true);
    };

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
            setError("Template name and body are required.");
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
                .tpl-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
                .tpl-modal { background: #0f172a; border: 1px solid #334155; border-radius: 16px; padding: 28px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
                .tpl-input { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 9px 13px; color: #e2e8f0; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
                .tpl-input:focus { border-color: #6366f1; }
                .tpl-textarea { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 9px 13px; color: #e2e8f0; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; resize: vertical; min-height: 120px; font-family: inherit; }
                .tpl-textarea:focus { border-color: #6366f1; }
                .tpl-select { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 9px 13px; color: #e2e8f0; font-size: 13px; outline: none; width: 100%; box-sizing: border-box; }
                .tpl-btn { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 8px; padding: 9px 20px; font-size: 13px; font-weight: 600; cursor: pointer; }
                .tpl-btn:disabled { opacity: 0.6; }
                .tpl-btn-ghost { background: #1e293b; color: #94a3b8; border: 1px solid #334155; border-radius: 8px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
                .tpl-btn-danger { background: #7f1d1d; color: #fca5a5; border: none; border-radius: 8px; padding: 7px 14px; font-size: 12px; cursor: pointer; }
                .tpl-row { display: flex; align-items: flex-start; gap: 12px; padding: 14px 0; border-bottom: 1px solid #1e293b; }
                .label-sm { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 5px; }
            `}</style>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <h2 style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700, margin: 0 }}>Message Templates</h2>
                    <p style={{ color: "#64748b", fontSize: 13, margin: "4px 0 0" }}>Manage WhatsApp notification templates for each queue event.</p>
                </div>
                <button onClick={openCreate} className="tpl-btn">+ New Template</button>
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>Loading templates…</div>
            ) : templates.length === 0 ? (
                <div className="tpl-card" style={{ textAlign: "center", padding: 48 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
                    <p style={{ color: "#64748b", fontSize: 14 }}>No templates yet. Create your first template.</p>
                </div>
            ) : (
                <div className="tpl-card">
                    {templates.map(t => (
                        <div key={t.id} className="tpl-row">
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                    <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>{t.template_name}</span>
                                    <span style={{
                                        background: STATUS_COLORS[t.status] + "22",
                                        color: STATUS_COLORS[t.status],
                                        borderRadius: 6,
                                        padding: "2px 8px",
                                        fontSize: 11,
                                        fontWeight: 600,
                                    }}>{t.status}</span>
                                    {t.event_type && (
                                        <span style={{ background: "#1e293b", color: "#64748b", borderRadius: 6, padding: "2px 8px", fontSize: 11 }}>
                                            {EVENT_OPTIONS.find(e => e.value === t.event_type)?.label || t.event_type}
                                        </span>
                                    )}
                                </div>
                                <div style={{ color: "#475569", fontSize: 12, marginBottom: 4 }}>{t.description}</div>
                                <div style={{ color: "#334155", fontSize: 11, fontFamily: "monospace", whiteSpace: "pre-wrap", maxHeight: 48, overflow: "hidden" }}>
                                    {t.body_text.substring(0, 100)}{t.body_text.length > 100 ? "…" : ""}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                <button onClick={() => setPreview(t)} className="tpl-btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }}>Preview</button>
                                <button onClick={() => openEdit(t)} className="tpl-btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }}>Edit</button>
                                <button onClick={() => setDeleteConfirm(t.id)} className="tpl-btn-danger">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="tpl-modal-bg" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="tpl-modal">
                        <h3 style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: 20 }}>
                            {editTarget ? "Edit Template" : "New Template"}
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                            <div>
                                <div className="label-sm">Template Name *</div>
                                <input className="tpl-input" value={form.template_name} onChange={e => setForm(f => ({ ...f, template_name: e.target.value }))} placeholder="queue_joined" disabled={!!editTarget} />
                            </div>
                            <div>
                                <div className="label-sm">Event Type</div>
                                <select className="tpl-select" value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                                    <option value="">— Not mapped —</option>
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
                                <div className="label-sm">Status</div>
                                <select className="tpl-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                    <option value="draft">Draft</option>
                                    <option value="approved">Approved</option>
                                    <option value="pending">Pending (Meta)</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <div className="label-sm">Description</div>
                            <input className="tpl-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="When is this sent?" />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <div className="label-sm">Body Text * (use {"{{1}}"}, {"{{2}}"} for variables)</div>
                            <textarea className="tpl-textarea" value={form.body_text} onChange={e => setForm(f => ({ ...f, body_text: e.target.value }))} placeholder="Hello {{1}}! You joined {{2}}..." />
                        </div>
                        <div style={{ marginBottom: 16, fontSize: 11, color: "#475569", background: "#1e293b", borderRadius: 8, padding: "10px 14px" }}>
                            💡 Variables: <code>{"{{1}}"}</code> = first param, <code>{"{{2}}"}</code> = second, etc.
                            These are filled automatically with customer name, queue name, token number, etc.
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

            {/* Preview Modal */}
            {preview && (
                <div className="tpl-modal-bg" onClick={() => setPreview(null)}>
                    <div className="tpl-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: 4 }}>{preview.template_name}</h3>
                        <div style={{ color: "#64748b", fontSize: 12, marginBottom: 16 }}>{preview.description}</div>
                        <div style={{ background: "#1a2e1a", border: "1px solid #166534", borderRadius: 12, padding: 16, fontFamily: "inherit", fontSize: 13, color: "#dcfce7", lineHeight: 1.6, whiteSpace: "pre-wrap", borderTopLeftRadius: 4 }}>
                            {renderPreview(preview)}
                        </div>
                        <div style={{ marginTop: 12, fontSize: 11, color: "#475569" }}>Variables in [brackets] are filled at runtime.</div>
                        <button onClick={() => setPreview(null)} className="tpl-btn-ghost" style={{ marginTop: 16, width: "100%" }}>Close</button>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="tpl-modal-bg">
                    <div className="tpl-modal" style={{ maxWidth: 340 }}>
                        <h3 style={{ color: "#f87171", fontWeight: 700, marginBottom: 8 }}>Delete Template?</h3>
                        <p style={{ color: "#94a3b8", fontSize: 13 }}>This cannot be undone. Queue events mapped to this template will stop sending notifications.</p>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
                            <button onClick={() => setDeleteConfirm(null)} className="tpl-btn-ghost">Cancel</button>
                            <button onClick={() => deleteTemplate(deleteConfirm)} className="tpl-btn-danger" style={{ fontSize: 13, padding: "8px 18px" }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
