"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";

export interface TokenDetailData {
    id?: string;
    token_number: number;
    prefix?: string;
    customer_name: string;
    customer_age: number | null;
    customer_phone: string;
    companion_names?: string[];
    status: string;
    created_at?: string | null;
    served_at?: string | null;
    completed_at?: string | null;
    entry_type?: "manual" | "qr" | "auto" | null;
    queue_name?: string;
    removed_by?: string | null;
    assigned_line?: number | null;
    called_via_invite?: boolean;
    served_by_staff_name?: string | null;
    completed_by_staff_name?: string | null;
    deleted_at?: string | null;
    skipped_at?: string | null;
    recalled_at?: string | null;
}

interface TokenDetailModalProps {
    token: TokenDetailData | null;
    onClose: () => void;
    onRecall?: () => void;
}

function fmt(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString([], {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function fmtTime(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function calcWaitingTime(created?: string | null, served?: string | null, status?: string): string {
    if (!served) {
        if (status === 'deleted' || status === 'skipped') return "—";
        return "Waiting…";
    }
    if (!created) return "—";
    const diffMs = new Date(served).getTime() - new Date(created).getTime();
    if (diffMs < 0) return "—";
    const mins = Math.floor(diffMs / 60000);
    if (mins === 0) return "< 1 min";
    return `${mins} min${mins !== 1 ? "s" : ""}`;
}

function calcServiceTime(served?: string | null, completed?: string | null): string {
    if (!served || !completed) return "—";
    const diffMs = new Date(completed).getTime() - new Date(served).getTime();
    if (diffMs < 0) return "—";
    const mins = Math.floor(diffMs / 60000);
    if (mins === 0) return "< 1 min";
    return `${mins} min${mins !== 1 ? "s" : ""}`;
}

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
    waiting: { badge: "bg-amber-100 text-amber-700", label: "Waiting" },
    serving: { badge: "bg-blue-100 text-blue-700", label: "Serving" },
    done: { badge: "bg-emerald-100 text-emerald-700", label: "Completed" },
    skipped: { badge: "bg-gray-100 text-gray-500", label: "Skipped" },
    deleted: { badge: "bg-red-100 text-red-700", label: "Removed" },
};

const ENTRY_STYLES: Record<string, string> = {
    manual: "bg-violet-100 text-violet-700",
    qr: "bg-cyan-100 text-cyan-700",
    auto: "bg-orange-100 text-orange-700",
};

export default function TokenDetailModal({ token, onClose, onRecall }: TokenDetailModalProps) {
    const [fullToken, setFullToken] = useState<TokenDetailData | null>(token);

    useEffect(() => {
        setFullToken(token);
        // If the token came from WebSockets (live queue), it won't have customer_phone for privacy.
        // We fetch the full details (which includes phone and age) securely from the REST API.
        if (token && token.id && !token.customer_phone) {
            api.restoreToken(token.id).then(data => {
                setFullToken(prev => prev ? { ...prev, ...data } : null);
            }).catch(() => {});
        }
    }, [token]);

    if (!fullToken) return null;

    const statusInfo = STATUS_STYLES[fullToken.status] ?? { badge: "bg-gray-100 text-gray-500", label: fullToken.status };
    const entryType = fullToken.entry_type ?? "manual";
    const waitingTime = calcWaitingTime(fullToken.created_at, fullToken.served_at, fullToken.status);
    const serviceTime = calcServiceTime(fullToken.served_at, fullToken.completed_at);
    

    // Close on backdrop click
    const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            onClick={handleBackdrop}
            role="dialog"
            aria-modal="true"
            aria-label="Token details"
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-5 flex items-start justify-between">
                    <div>
                        <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-1">Token</p>
                        <p className="text-4xl font-black text-white tabular-nums leading-none">
                            {fullToken.prefix || ""}{fullToken.token_number}
                        </p>
                        {fullToken.queue_name && (
                            <p className="text-blue-200 text-xs mt-2 font-medium">{fullToken.queue_name}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusInfo.badge}`}>
                            {statusInfo.label}
                        </span>
                        <button
                            onClick={onClose}
                            className="ml-2 p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            aria-label="Close"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Customer profile */}
                <div className="px-6 py-5 space-y-4">
                    {/* Customer info */}
                    <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                        <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-base font-bold text-gray-900 truncate">{fullToken.customer_name || "—"}</p>
                            <p className="text-sm text-gray-500">{fullToken.customer_phone || "—"}</p>
                        </div>
                        <span className={`ml-auto px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${ENTRY_STYLES[entryType] || ENTRY_STYLES.manual}`}>
                            {entryType.toUpperCase()}
                        </span>
                    </div>

                    {/* Detail grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <DetailItem label="Phone Number" value={fullToken.customer_phone || "Not Provided"} />
                        {fullToken.companion_names && fullToken.companion_names.length > 0 && (
                            <div className="col-span-2 bg-emerald-50/50 rounded-xl px-3 py-2.5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 mb-1.5">Companions</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {fullToken.companion_names.map((name, i) => (
                                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {fullToken.assigned_line != null && (
                            <DetailItem label="Line Number" value={String(fullToken.assigned_line)} highlight="emerald" />
                        )}
                        <DetailItem label="Age" value={fullToken.customer_age != null ? `${fullToken.customer_age} yrs` : "Not Provided"} />
                        <DetailItem label="Entry Type" value={entryType.charAt(0).toUpperCase() + entryType.slice(1)} />
                        {fullToken.called_via_invite !== undefined && (
                            <DetailItem label="Call Method" value={fullToken.called_via_invite ? "Invited by No." : "Call Next"} highlight={fullToken.called_via_invite ? "amber" : undefined} />
                        )}
                        <DetailItem label="Created" value={fmtTime(fullToken.created_at)} />
                        <DetailItem label="Called" value={fmtTime(fullToken.served_at)} />
                        {fullToken.completed_at && (
                            <DetailItem label="Completed" value={fmtTime(fullToken.completed_at)} />
                        )}
                        {fullToken.deleted_at && (
                            <DetailItem label="Removed" value={fmtTime(fullToken.deleted_at)} highlight="amber" />
                        )}
                        {fullToken.status === "deleted" && fullToken.removed_by && (
                            <DetailItem 
                                label="Removed By" 
                                value={fullToken.removed_by === "customer" ? "Customer" : (fullToken.removed_by === "session_end" ? "System (Session End)" : "Staff")} 
                                highlight="amber" 
                            />
                        )}
                        {fullToken.served_by_staff_name && (
                            <DetailItem label="Served By" value={fullToken.served_by_staff_name} />
                        )}
                        {fullToken.completed_by_staff_name && (
                            <DetailItem label="Completed By" value={fullToken.completed_by_staff_name} />
                        )}
                        <DetailItem
                            label="Waiting Time"
                            value={waitingTime}
                            highlight={fullToken.served_at ? (parseInt(waitingTime) > 15 ? "amber" : "emerald") : undefined}
                        />
                        {fullToken.completed_at && fullToken.served_at && (
                            <DetailItem
                                label="Service Time"
                                value={serviceTime}
                                highlight="emerald"
                            />
                        )}
                    </div>

                    {/* Full timestamps */}
                    {fullToken.created_at && (
                        <div className="pt-3 border-t border-gray-50">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Timestamps</p>
                            <div className="space-y-1.5 text-xs text-gray-500">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Registered</span>
                                    <span className="font-medium text-gray-700">{fmt(fullToken.created_at)}</span>
                                </div>
                                {fullToken.served_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Called</span>
                                        <span className="font-medium text-gray-700">{fmt(fullToken.served_at)}</span>
                                    </div>
                                )}
                                {fullToken.skipped_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Last Skipped</span>
                                        <span className="font-medium text-gray-700">{fmt(fullToken.skipped_at)}</span>
                                    </div>
                                )}
                                {fullToken.recalled_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Last Recalled</span>
                                        <span className="font-medium text-gray-700">{fmt(fullToken.recalled_at)}</span>
                                    </div>
                                )}
                                {fullToken.completed_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Completed</span>
                                        <span className="font-medium text-gray-700">{fmt(fullToken.completed_at)}</span>
                                    </div>
                                )}
                                {fullToken.deleted_at && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Removed</span>
                                        <span className="font-medium text-gray-700">{fmt(fullToken.deleted_at)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 flex gap-3">
                    {fullToken.status === "skipped" && onRecall && (
                        <button
                            onClick={() => { onClose(); onRecall(); }}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                            Recall Token
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function DetailItem({
    label,
    value,
    highlight,
}: {
    label: string;
    value: string;
    highlight?: "emerald" | "amber";
}) {
    const valCls = highlight === "emerald"
        ? "text-emerald-700 font-bold"
        : highlight === "amber"
            ? "text-amber-700 font-bold"
            : "text-gray-900 font-semibold";

    return (
        <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
            <p className={`text-sm ${valCls} truncate`}>{value}</p>
        </div>
    );
}
