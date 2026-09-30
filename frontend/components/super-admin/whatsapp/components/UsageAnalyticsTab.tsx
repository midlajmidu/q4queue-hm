import React, { useState, Fragment } from "react";
import type { WhatsAppOrgStats } from "@/types/api";

export interface UsageAnalyticsTabProps {
    orgStats: WhatsAppOrgStats[];
    onRefresh: () => void;
}

export function UsageAnalyticsTab({ orgStats, onRefresh }: UsageAnalyticsTabProps) {
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
                                alignContent: "center",
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
                                                                                        display: "inline-block",
                                                                                        padding: "2px 6px",
                                                                                        borderRadius: 4,
                                                                                        fontSize: 11,
                                                                                        fontWeight: 700,
                                                                                        background: branch.success_rate >= 80 ? "rgba(16, 185, 129, 0.15)" : branch.success_rate >= 50 ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                                                                        color: branch.success_rate >= 80 ? "#34d399" : branch.success_rate >= 50 ? "#f59e0b" : "#f87171",
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
