import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { WhatsAppMessage, WhatsAppAdminOrgConfig } from "@/types/api";
import { fmtTime } from "../utils/formatters";

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

export function ActivityLogTab() {
    const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [orgs, setOrgs] = useState<WhatsAppAdminOrgConfig[]>([]);

    const [selectedOrgId, setSelectedOrgId] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [phoneSearch, setPhoneSearch] = useState<string>("");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);

    useEffect(() => {
        api.getAdminWhatsAppOrgs()
            .then(data => setOrgs(data))
            .catch(err => console.error("Failed to load org list for filters:", err));
    }, []);

    const fetchMessages = useCallback(async () => {
        setLoading(true);
        try {
            const offset = (page - 1) * pageSize;
            const res = await api.getWhatsAppMessages({
                limit: pageSize,
                offset: offset,
                organizationId: selectedOrgId !== "all" ? selectedOrgId : undefined,
                status: selectedStatus !== "all" ? selectedStatus : undefined,
                customerPhone: phoneSearch.trim() || undefined,
            });
            setMessages(res.items || []);
            setTotal(res.total || 0);
        } catch (err) {
            console.error("Failed to fetch activity log messages:", err);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, selectedOrgId, selectedStatus, phoneSearch]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const orgMap = new Map<string, string>();
    orgs.forEach(o => orgMap.set(o.org_id, o.name));

    return (
        <div className="space-y-6">
            <div className="wa-card" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", border: "1px solid #4338ca" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <h3 className="wa-card-title" style={{ margin: 0, fontSize: 16, color: "#e0e7ff" }}>
                            💬 WhatsApp Message & Activity Log
                        </h3>
                        <p style={{ fontSize: 13, color: "#c7d2fe", marginTop: 6, lineHeight: 1.6 }}>
                            Real-time audit log of all outbound WhatsApp queue notifications across organizations and branches with delivery tracking.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={fetchMessages}
                        disabled={loading}
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
                        {loading ? "Refreshing…" : "🔄 Refresh Log"}
                    </button>
                </div>
            </div>
            <div className="wa-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 240, maxWidth: 360 }}>
                        <input
                            type="text"
                            placeholder="🔍 Filter by customer phone number..."
                            value={phoneSearch}
                            onChange={e => { setPhoneSearch(e.target.value); setPage(1); }}
                            className="wa-input"
                            style={{ height: 38, fontSize: 13 }}
                        />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {/* Branch / Organization Filter */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Branch / Org:</label>
                            <select
                                value={selectedOrgId}
                                onChange={e => { setSelectedOrgId(e.target.value); setPage(1); }}
                                style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12, maxWidth: 220 }}
                            >
                                <option value="all">🏢 All Organizations & Branches</option>
                                {orgs.map(o => (
                                    <option key={o.org_id} value={o.org_id}>
                                        {o.name} ({o.slug})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Delivery Status Filter */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Status:</label>
                            <select
                                value={selectedStatus}
                                onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
                                style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}
                            >
                                <option value="all">All Delivery Statuses</option>
                                <option value="sent">✓ Sent</option>
                                <option value="delivered">✓✓ Delivered</option>
                                <option value="read">👁 Read</option>
                                <option value="failed">✗ Failed</option>
                                <option value="pending">⏳ Pending</option>
                                <option value="skipped">🚫 Skipped</option>
                            </select>
                        </div>

                        {/* Page Size */}
                        <select
                            value={pageSize}
                            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                            style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}
                        >
                            <option value={10}>10 / page</option>
                            <option value={25}>25 / page</option>
                            <option value={50}>50 / page</option>
                            <option value={100}>100 / page</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Messages Table Card */}
            <div className="wa-card">
                {loading ? (
                    <div style={{ padding: 50, textAlign: "center", color: "#64748b" }}>
                        <div style={{ width: 28, height: 28, border: "3px solid #1e293b", borderTop: "3px solid #6366f1", borderRadius: "50%", margin: "0 auto 10px", animation: "spin 1s linear infinite" }} />
                        Loading activity logs…
                    </div>
                ) : messages.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                        No WhatsApp message activity logged matching the selected filters.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table className="wa-table" style={{ width: "100%" }}>
                            <thead>
                                <tr>
                                    <th>Organization / Branch</th>
                                    <th>Phone Number</th>
                                    <th>Customer Name</th>
                                    <th>Event / Template</th>
                                    <th>Delivery Status</th>
                                    <th style={{ textAlign: "right" }}>Sent At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {messages.map(m => {
                                    const orgName = m.organization_id ? (orgMap.get(m.organization_id) || "Branch") : "System / Global";
                                    return (
                                        <tr key={m.id}>
                                            <td>
                                                <div style={{ fontWeight: 600, color: "#f8fafc", fontSize: 13 }}>
                                                    {orgName}
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ fontFamily: "monospace", fontSize: 12, color: "#a5b4fc", fontWeight: 600 }}>
                                                    {m.customer_phone}
                                                </span>
                                            </td>
                                            <td style={{ color: "#e2e8f0", fontWeight: 500 }}>
                                                {m.customer_name || "—"}
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                                    <span style={{ background: "#1e293b", border: "1px solid #334155", color: "#cbd5e1", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, width: "fit-content" }}>
                                                        {EVENT_LABEL[m.event_type || ""] || m.event_type || "—"}
                                                    </span>
                                                    {m.template_name && (
                                                        <span style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>
                                                            {m.template_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                                    <span style={{
                                                        color: STATUS_COLOR[m.status] || "#94a3b8",
                                                        fontWeight: 700,
                                                        fontSize: 12,
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 4
                                                    }}>
                                                        <span>{STATUS_ICON[m.status as keyof typeof STATUS_ICON]}</span>
                                                        <span style={{ textTransform: "capitalize" }}>{m.status}</span>
                                                    </span>
                                                    {m.error_message && (
                                                        <span style={{ fontSize: 10, color: "#f87171", maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={m.error_message}>
                                                            {m.error_message}
                                                        </span>
                                                    )}
                                                    {m.meta_message_id && (
                                                        <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }} title={`Meta ID: ${m.meta_message_id}`}>
                                                            {m.meta_message_id.slice(0, 16)}…
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: "right", fontSize: 12, color: "#94a3b8" }}>
                                                {fmtTime(m.sent_at || m.created_at)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && total > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, borderTop: "1px solid #1e293b", paddingTop: 14, flexWrap: "wrap", gap: 12 }}>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                            Showing <strong>{((page - 1) * pageSize) + 1}</strong> – <strong>{Math.min(page * pageSize, total)}</strong> of <strong>{total}</strong> messages logged
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button
                                type="button"
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                disabled={page === 1}
                                style={{
                                    background: "#1e293b",
                                    border: "1px solid #334155",
                                    color: page === 1 ? "#475569" : "#e2e8f0",
                                    borderRadius: 6,
                                    padding: "5px 12px",
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: page === 1 ? "default" : "pointer",
                                    opacity: page === 1 ? 0.5 : 1,
                                }}
                            >
                                ‹ Previous
                            </button>

                            {/* Page numbers */}
                            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                                Math.max(0, page - 3),
                                Math.min(totalPages, page + 2)
                            ).map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPage(p)}
                                    style={{
                                        background: page === p ? "#6366f1" : "#1e293b",
                                        border: "1px solid",
                                        borderColor: page === p ? "#6366f1" : "#334155",
                                        color: page === p ? "#ffffff" : "#94a3b8",
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
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={page === totalPages}
                                style={{
                                    background: "#1e293b",
                                    border: "1px solid #334155",
                                    color: page === totalPages ? "#475569" : "#e2e8f0",
                                    borderRadius: 6,
                                    padding: "5px 12px",
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: page === totalPages ? "default" : "pointer",
                                    opacity: page === totalPages ? 0.5 : 1,
                                }}
                            >
                                Next ›
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
