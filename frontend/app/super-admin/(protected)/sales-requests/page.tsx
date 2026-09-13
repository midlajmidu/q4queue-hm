"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { 
    CheckCircle2, 
    Clock3, 
    Mail, 
    Phone, 
    Plus, 
    RefreshCw, 
    Search, 
    Send, 
    Trash2, 
    UserRoundCheck, 
    Users, 
    X,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from "lucide-react";
import { toast } from "sonner";
import ConfirmModal from "@/components/ConfirmModal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { api, ApiError } from "@/lib/api";
import type { AdminSalesRequestItem, SalesRecipientItem } from "@/types/api";

type ReviewAction = "approve" | "contacted" | "reject";

export default function SalesRequestsPage() {
    const [requests, setRequests] = useState<AdminSalesRequestItem[]>([]);
    const [recipients, setRecipients] = useState<SalesRecipientItem[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("pending");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [reviewing, setReviewing] = useState<{ item: AdminSalesRequestItem; action: ReviewAction } | null>(null);
    const [deletingRecipient, setDeletingRecipient] = useState<SalesRecipientItem | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [responsePage, emailRecipients] = await Promise.all([
                api.listSalesRequests({ 
                    status: statusFilter, 
                    search: search || undefined, 
                    skip: page * pageSize, 
                    limit: pageSize 
                }),
                api.listSalesRecipients(),
            ]);
            setRequests(responsePage.items);
            setTotal(responsePage.total);
            setCounts(responsePage.status_counts);
            setRecipients(emailRecipients);
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Unable to load sales requests");
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, statusFilter]);

    useEffect(() => {
        void load();
    }, [load]);

    async function removeRecipient() {
        if (!deletingRecipient) return;
        try {
            await api.deleteSalesRecipient(deletingRecipient.id);
            toast.success("Notification recipient removed");
            setDeletingRecipient(null);
            void load();
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Unable to remove recipient");
        }
    }

    async function retryNotification(item: AdminSalesRequestItem) {
        try {
            const result = await api.retrySalesNotification(item.id);
            if (result.notification_status === "sent") toast.success("Sales notification sent");
            else toast.error(result.notification_error || "Notification delivery failed");
            void load();
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Unable to retry notification");
        }
    }

    const totalPages = Math.ceil(total / pageSize);
    const startItem = total === 0 ? 0 : page * pageSize + 1;
    const endItem = Math.min((page + 1) * pageSize, total);

    const getPageNumbers = () => {
        const pages: number[] = [];
        const maxButtons = 5;
        let start = Math.max(0, page - Math.floor(maxButtons / 2));
        let end = Math.min(totalPages, start + maxButtons);

        if (end - start < maxButtons) {
            start = Math.max(0, end - maxButtons);
        }

        for (let i = start; i < end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="space-y-7">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">Commercial inbox</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Sales Requests</h1>
                <p className="mt-1 text-sm text-slate-400">Handle trial extensions and conversions separately from customer administration.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Pending" value={counts.pending || 0} icon={Clock3} color="text-amber-300" />
                <Metric label="Contacted" value={counts.contacted || 0} icon={Phone} color="text-blue-300" />
                <Metric label="Approved" value={counts.approved || 0} icon={CheckCircle2} color="text-emerald-300" />
                <Metric label="Email recipients" value={recipients.length} icon={Users} color="text-indigo-300" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70">
                    <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row">
                        <form 
                            onSubmit={(event) => { 
                                event.preventDefault(); 
                                setPage(0); 
                                setSearch(searchInput.trim()); 
                            }} 
                            className="relative flex-1"
                        >
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input 
                                value={searchInput} 
                                onChange={(event) => setSearchInput(event.target.value)} 
                                placeholder="Search customer, contact, email or phone" 
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-indigo-500" 
                            />
                        </form>
                        <select 
                            value={statusFilter} 
                            onChange={(event) => { 
                                setPage(0); 
                                setStatusFilter(event.target.value); 
                            }} 
                            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
                        >
                            <option value="pending">Pending</option>
                            <option value="contacted">Contacted</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="all">All requests</option>
                        </select>
                    </div>

                    {loading ? (
                        <div className="flex h-72 items-center justify-center">
                            <LoadingSpinner />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="py-20 text-center">
                            <Send className="mx-auto text-slate-600" />
                            <p className="mt-3 text-sm text-slate-400">No sales requests match this view.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {requests.map((item) => (
                                <article key={item.id} className="p-5">
                                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Link href={`/super-admin/customers/${item.parent_organization_id}`} className="font-semibold text-white hover:text-indigo-300">
                                                    {item.organization_name}
                                                </Link>
                                                <Status value={item.status} />
                                                <DeliveryStatus value={item.notification_status} />
                                            </div>
                                            <p className="mt-1 text-sm text-slate-300">
                                                {item.contact_name} <span className="ml-2 text-[10px] font-semibold uppercase text-slate-500">{item.source.replaceAll("_", " ")}</span>
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
                                                <a href={`mailto:${item.contact_email}`} className="inline-flex items-center gap-1.5 hover:text-white">
                                                    <Mail size={13} />
                                                    {item.contact_email}
                                                </a>
                                                {item.contact_phone && (
                                                    <a href={`tel:${item.contact_phone}`} className="inline-flex items-center gap-1.5 hover:text-white">
                                                        <Phone size={13} />
                                                        {item.contact_phone}
                                                    </a>
                                                )}
                                                <time>{new Date(item.created_at).toLocaleString()}</time>
                                            </div>
                                            {item.message && (
                                                <p className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm leading-6 text-slate-300">
                                                    {item.message}
                                                </p>
                                            )}
                                            {item.notification_error && (
                                                <p className="mt-2 text-xs text-amber-300">Email alert: {item.notification_error}</p>
                                            )}
                                            {item.review_note && (
                                                <p className="mt-2 text-xs text-slate-500">Internal note: {item.review_note}</p>
                                            )}
                                        </div>
                                        <div className="flex shrink-0 flex-wrap gap-2">
                                            {item.notification_status !== "sent" && (
                                                <button onClick={() => void retryNotification(item)} className="action-secondary">
                                                    <RefreshCw size={14} className="mr-1.5" />
                                                    Retry email
                                                </button>
                                            )}
                                            {item.status === "pending" && (
                                                <button onClick={() => setReviewing({ item, action: "contacted" })} className="action-secondary">
                                                    Mark contacted
                                                </button>
                                            )}
                                            {["pending", "contacted"].includes(item.status) && (
                                                <>
                                                    <button onClick={() => setReviewing({ item, action: "reject" })} className="action-danger">
                                                        Reject
                                                    </button>
                                                    <button onClick={() => setReviewing({ item, action: "approve" })} className="action-primary">
                                                        Approve & activate
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {/* Rich Pagination Bar */}
                    {total > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 p-4 text-xs text-slate-400">
                            {/* Telemetry and Page Size Selector */}
                            <div className="flex items-center gap-4 flex-wrap">
                                <span>
                                    Showing <strong className="text-white font-semibold">{startItem}</strong>–<strong className="text-white font-semibold">{endItem}</strong> of <strong className="text-white font-semibold">{total}</strong> requests
                                </span>
                                <div className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
                                    <span>Per page:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setPage(0);
                                        }}
                                        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>

                            {/* Page Navigation Buttons */}
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    {/* First Page */}
                                    <button
                                        disabled={page === 0 || loading}
                                        onClick={() => setPage(0)}
                                        title="First page"
                                        className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                                    >
                                        <ChevronsLeft size={14} />
                                    </button>
                                    {/* Previous Page */}
                                    <button
                                        disabled={page === 0 || loading}
                                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                                        title="Previous page"
                                        className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>

                                    {/* Numbered Page Buttons */}
                                    <div className="flex items-center gap-1 px-1">
                                        {getPageNumbers().map((p) => (
                                            <button
                                                key={p}
                                                disabled={loading}
                                                onClick={() => setPage(p)}
                                                className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                                    p === page
                                                        ? "bg-indigo-600 text-white shadow-sm font-bold"
                                                        : "border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white"
                                                }`}
                                            >
                                                {p + 1}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Next Page */}
                                    <button
                                        disabled={page >= totalPages - 1 || loading}
                                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                        title="Next page"
                                        className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                    {/* Last Page */}
                                    <button
                                        disabled={page >= totalPages - 1 || loading}
                                        onClick={() => setPage(totalPages - 1)}
                                        title="Last page"
                                        className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                                    >
                                        <ChevronsRight size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                <RecipientsPanel recipients={recipients} onAdded={() => void load()} onDelete={setDeletingRecipient} />
            </div>

            {reviewing && (
                <ReviewModal 
                    value={reviewing} 
                    onClose={() => setReviewing(null)} 
                    onDone={() => { 
                        setReviewing(null); 
                        void load(); 
                    }} 
                />
            )}
            <ConfirmModal 
                isOpen={Boolean(deletingRecipient)} 
                title="Remove sales email" 
                message={`Stop sending sales-request notifications to ${deletingRecipient?.email || "this recipient"}?`} 
                confirmLabel="Remove recipient" 
                confirmVariant="danger" 
                onConfirm={removeRecipient} 
                onCancel={() => setDeletingRecipient(null)} 
            />
        </div>
    );
}

function RecipientsPanel({ recipients, onAdded, onDelete }: { recipients: SalesRecipientItem[]; onAdded: () => void; onDelete: (item: SalesRecipientItem) => void }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [saving, setSaving] = useState(false);

    async function submit(event: FormEvent) {
        event.preventDefault();
        setSaving(true);
        try {
            await api.addSalesRecipient({ email: email.trim(), name: name.trim() || undefined });
            toast.success("Sales notification email added");
            setEmail("");
            setName("");
            onAdded();
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Unable to add email");
        } finally {
            setSaving(false);
        }
    }

    return (
        <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-900/70">
            <div className="border-b border-slate-800 p-5">
                <div className="flex items-center gap-2">
                    <Mail size={17} className="text-indigo-300" />
                    <h2 className="font-semibold text-white">Sales email notifications</h2>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Every new request is emailed from the configured Q4Queue SMTP account to all recipients below.</p>
            </div>
            <form onSubmit={submit} className="space-y-3 border-b border-slate-800 p-5">
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="Employee name (optional)" className="field" />
                <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="sales@company.com" className="field" />
                <button disabled={saving || !email} className="action-primary w-full justify-center">
                    <Plus size={15} className="mr-1.5" />
                    {saving ? "Adding…" : "Add notification email"}
                </button>
            </form>
            <div className="divide-y divide-slate-800">
                {recipients.length ? (
                    recipients.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 p-4">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white">{item.name || "Sales team"}</p>
                                <p className="mt-1 truncate text-xs text-slate-500">{item.email}</p>
                            </div>
                            <button onClick={() => onDelete(item)} aria-label={`Remove ${item.email}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300">
                                <Trash2 size={15} />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="p-5 text-center">
                        <p className="text-sm text-amber-300">No email recipients configured</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Requests will still appear here, but no employee will receive an email alert.</p>
                    </div>
                )}
            </div>
        </aside>
    );
}

function ReviewModal({ value, onClose, onDone }: { value: { item: AdminSalesRequestItem; action: ReviewAction }; onClose: () => void; onDone: () => void }) {
    const { item, action } = value;
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    async function submit() {
        setSaving(true);
        try {
            await api.reviewSalesRequest(item.parent_organization_id, item.id, { action, note });
            toast.success(action === "approve" ? "Customer approved and activated" : `Request marked ${action}`);
            onDone();
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Unable to review request");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-white">
                    <X size={18} />
                </button>
                <UserRoundCheck className={action === "approve" ? "text-emerald-400" : "text-indigo-400"} />
                <h2 className="mt-3 text-xl font-bold text-white">
                    {action === "approve" ? "Approve and activate" : action === "contacted" ? "Mark as contacted" : "Reject request"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                    {action === "approve" ? `${item.organization_name} will immediately regain access using its existing data and limits.` : `Record the outcome for ${item.organization_name}. Their stored data will not be changed.`}
                </p>
                <label className="mt-5 block text-sm text-slate-300">
                    Internal review note
                    <textarea value={note} onChange={(event) => setNote(event.target.value)} minLength={3} maxLength={1000} placeholder="Required for the audit trail" className="field mt-1.5 min-h-24" />
                </label>
                <button disabled={saving || note.trim().length < 3} onClick={submit} className={`${action === "approve" ? "action-primary" : action === "reject" ? "action-danger" : "action-secondary"} mt-5 w-full justify-center disabled:opacity-50`}>
                    {saving ? "Saving…" : action === "approve" ? "Approve & activate customer" : "Confirm"}
                </button>
            </div>
        </div>
    );
}

function Metric({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Clock3; color: string }) {
    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between text-sm text-slate-400">
                <span>{label}</span>
                <Icon size={18} className={color} />
            </div>
            <p className="mt-3 text-3xl font-bold text-white">{value}</p>
        </div>
    );
}

function Status({ value }: { value: string }) {
    const style = value === "pending" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : value === "approved" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : value === "contacted" ? "border-blue-500/30 bg-blue-500/10 text-blue-300" : "border-red-500/30 bg-red-500/10 text-red-300";
    return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${style}`}>{value}</span>;
}

function DeliveryStatus({ value }: { value: string }) {
    const sent = value === "sent";
    return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${sent ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>{sent ? "Email sent" : `Email ${value.replaceAll("_", " ")}`}</span>;
}
