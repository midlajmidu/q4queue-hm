"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Building2,
    CalendarClock,
    CheckCircle2,
    Clock,
    Eye,
    EyeOff,
    FileText,
    Globe,
    Info,
    Link2,
    Loader2,
    Lock,
    Mail,
    Pencil,
    Phone,
    Play,
    RotateCcw,
    Search,
    ShieldCheck,
    Sliders,
    Sparkles,
    Trash2,
    User,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import { toast } from "sonner";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { api, ApiError } from "@/lib/api";
import type {
    ManagedCustomerDetail,
    ManagedCustomerLimits,
    ManagedCustomerUpdate,
    ManagedParentAdminCreate,
    SubscriptionAdminUpdate,
} from "@/types/api";

const LABELS: Record<string, string> = {
    "branches.max": "Branches",
    "queues.max": "Queues per branch",
    "staff_users.max": "Staff per branch",
    "sessions.created.max": "Sessions per queue",
    "tokens.created.max_per_session": "Tokens per session",
};

export default function CustomerDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [customer, setCustomer] = useState<ManagedCustomerDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const [action, setAction] = useState<SubscriptionAdminUpdate["action"] | null>(null);
    const [editingLimits, setEditingLimits] = useState(false);
    const [editingAccount, setEditingAccount] = useState(false);
    const [addingParentAdmin, setAddingParentAdmin] = useState(false);
    const [permanentlyDeleting, setPermanentlyDeleting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setCustomer(await api.getManagedCustomer(id));
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Unable to load customer");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void load();
    }, [load]);

    const limits = useMemo(() => customer?.subscription.entitlements || {}, [customer]);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
                <Building2 className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <h3 className="text-lg font-semibold text-white">Customer Not Found</h3>
                <p className="mt-1 text-sm text-slate-400">The requested customer account could not be found or has been removed.</p>
                <Link
                    href="/super-admin/customers"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-all"
                >
                    <ArrowLeft size={16} /> Back to Customers
                </Link>
            </div>
        );
    }

    const status = customer.is_active ? customer.subscription.status : "archived";

    const getStatusBadge = (st: string) => {
        switch (st) {
            case "active":
                return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
            case "trialing":
                return "border-indigo-500/30 bg-indigo-500/10 text-indigo-300";
            case "expired":
            case "suspended":
                return "border-amber-500/30 bg-amber-500/10 text-amber-400";
            case "archived":
            case "cancelled":
                return "border-rose-500/30 bg-rose-500/10 text-rose-400";
            default:
                return "border-slate-500/30 bg-slate-500/10 text-slate-400";
        }
    };

    return (
        <div className="space-y-8">
            {/* Top Navigation & Header */}
            <div>
                <Link
                    href="/super-admin/customers"
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white mb-4"
                >
                    <ArrowLeft size={16} /> Back to Customers
                </Link>

                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-white">{customer.name}</h1>
                            <span
                                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getStatusBadge(
                                    status
                                )}`}
                            >
                                {status}
                            </span>
                        </div>
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                            {customer.slug && (
                                <>
                                    <span className="font-mono text-xs bg-slate-800/80 text-indigo-300 px-2 py-0.5 rounded-md border border-slate-700/60 flex items-center gap-1">
                                        <Link2 size={12} className="text-indigo-400" />
                                        /{customer.slug}
                                    </span>
                                    <span>•</span>
                                </>
                            )}
                            <span className="flex items-center gap-1.5"><Mail size={14} />{customer.contact_email}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1.5"><Globe size={14} />{customer.timezone}</span>
                            <span>•</span>
                            <span className="capitalize">{customer.source.replaceAll("_", " ")}</span>
                        </p>
                    </div>

                    {/* Action buttons bar */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            onClick={() => setEditingAccount(true)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm font-medium text-slate-200 shadow-sm transition-all hover:bg-slate-700 hover:text-white hover:border-slate-600 active:scale-95"
                        >
                            <Pencil size={15} className="text-indigo-400" />
                            Edit Details
                        </button>

                        {status === "archived" ? (
                            <>
                                <button
                                    onClick={() => setAction("restore")}
                                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 active:scale-95"
                                >
                                    <RotateCcw size={15} />
                                    Restore Customer
                                </button>
                                <button
                                    onClick={() => setPermanentlyDeleting(true)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-400 transition-all hover:bg-rose-500/20 active:scale-95"
                                >
                                    <Trash2 size={15} />
                                    Permanently Delete
                                </button>
                            </>
                        ) : (
                            <>
                                {customer.subscription.mode === "legacy" ? (
                                    <button
                                        onClick={() => setAction("activate")}
                                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 active:scale-95"
                                    >
                                        <Sparkles size={15} />
                                        Move to Managed Access
                                    </button>
                                ) : (
                                    <>
                                        {status === "trialing" && (
                                            <>
                                                <button
                                                    onClick={() => setAction("extend_trial")}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm font-medium text-slate-200 transition-all hover:bg-slate-700 hover:text-white"
                                                >
                                                    <Clock size={15} className="text-amber-400" />
                                                    Extend Trial
                                                </button>
                                                <button
                                                    onClick={() => setAction("activate")}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500"
                                                >
                                                    <CheckCircle2 size={15} />
                                                    Convert to Active
                                                </button>
                                                <button
                                                    onClick={() => setAction("suspend")}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-sm font-medium text-amber-400 transition-all hover:bg-amber-500/20"
                                                >
                                                    <AlertTriangle size={15} />
                                                    Suspend
                                                </button>
                                            </>
                                        )}
                                        {status === "expired" && (
                                            <>
                                                <button
                                                    onClick={() => setAction("extend_trial")}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm font-medium text-slate-200 transition-all hover:bg-slate-700 hover:text-white"
                                                >
                                                    <Clock size={15} className="text-amber-400" />
                                                    Extend Trial
                                                </button>
                                                <button
                                                    onClick={() => setAction("activate")}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500"
                                                >
                                                    <CheckCircle2 size={15} />
                                                    Convert to Active
                                                </button>
                                            </>
                                        )}
                                        {status === "active" && (
                                            <>
                                                <button
                                                    onClick={() => setAction("suspend")}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-sm font-medium text-amber-400 transition-all hover:bg-amber-500/20"
                                                >
                                                    <AlertTriangle size={15} />
                                                    Suspend
                                                </button>
                                                <button
                                                    onClick={() => setAction("cancel")}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300"
                                                >
                                                    Cancel Subscription
                                                </button>
                                            </>
                                        )}
                                        {status === "suspended" && (
                                            <>
                                                <button
                                                    onClick={() => setAction("unsuspend")}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 active:scale-95 cursor-pointer"
                                                >
                                                    <Play size={15} />
                                                    Unsuspend Account
                                                </button>
                                                <button
                                                    onClick={() => setAction("cancel")}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300"
                                                >
                                                    Cancel Subscription
                                                </button>
                                            </>
                                        )}
                                        {status === "cancelled" && (
                                            <button
                                                onClick={() => setAction("reactivate")}
                                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 active:scale-95 cursor-pointer"
                                            >
                                                <RotateCcw size={15} />
                                                Reactivate Subscription
                                            </button>
                                        )}
                                    </>
                                )}
                                <button
                                    onClick={() => setAction("archive")}
                                    className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-400 transition-all hover:bg-rose-500/20"
                                >
                                    <Trash2 size={15} />
                                    Delete Customer
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                    icon={ShieldCheck}
                    iconColor="text-indigo-400"
                    label="Current Plan"
                    value={customer.subscription.plan_name || "Legacy"}
                />
                <Metric
                    icon={
                        customer.subscription.status === "active"
                            ? ShieldCheck
                            : CalendarClock
                    }
                    iconColor={
                        customer.subscription.status === "active"
                            ? "text-emerald-400"
                            : "text-amber-400"
                    }
                    label={
                        customer.subscription.status === "active"
                            ? "Account Status"
                            : "Trial Status"
                    }
                    value={
                        customer.subscription.status === "active"
                            ? "Active"
                            : customer.subscription.days_remaining != null
                            ? `${customer.subscription.days_remaining} days left`
                            : customer.subscription.status
                    }
                />
                <Metric
                    icon={Building2}
                    iconColor="text-emerald-400"
                    label="Total Branches"
                    value={String(customer.branches.length)}
                />
                <Metric
                    icon={Users}
                    iconColor="text-purple-400"
                    label="Total Users"
                    value={String(customer.users.length)}
                />
            </div>

            {/* Main Content Sections */}
            <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
                {/* Entitlements & Limits */}
                <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 shadow-sm backdrop-blur-sm overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-slate-900/90">
                        <div>
                            <h2 className="font-semibold text-white flex items-center gap-2">
                                <Sliders size={18} className="text-indigo-400" />
                                Entitlements & Usage
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">Effective customer limits after plan overrides.</p>
                        </div>
                        {customer.subscription && (
                            <button
                                onClick={() => setEditingLimits(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition-all hover:bg-indigo-500/20 active:scale-95 cursor-pointer"
                            >
                                <Pencil size={13} />
                                Edit Limits
                            </button>
                        )}
                    </div>
                    <div className="divide-y divide-slate-800/60">
                        {Object.values(limits).length ? (
                            Object.values(limits).map((item) => (
                                <div
                                    key={item.key}
                                    className="grid grid-cols-[1fr_auto_auto] items-center gap-5 px-6 py-4 transition-colors hover:bg-slate-800/30"
                                >
                                    <span className="text-sm font-medium text-slate-200">
                                        {LABELS[item.key] || item.key}
                                    </span>
                                    <span className="text-xs text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                                        Used {item.used ?? "—"}
                                    </span>
                                    <span className="min-w-20 text-right text-sm font-bold text-indigo-300">
                                        {item.limit ?? "Unlimited"}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="p-6 text-sm text-slate-400 italic">
                                Legacy account — existing organisation limits continue to apply.
                            </p>
                        )}
                    </div>
                </section>

                {/* Account Owner & Users */}
                <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 shadow-sm backdrop-blur-sm overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-slate-900/90">
                        <div>
                            <h2 className="font-semibold text-white flex items-center gap-2">
                                <Users size={18} className="text-purple-400" />
                                Account Owner & Users
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">Branch users and Parent Organisation administrators.</p>
                        </div>
                        {customer.is_active && (
                            <button
                                onClick={() => setAddingParentAdmin(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 transition-all hover:bg-purple-500/20 active:scale-95"
                            >
                                <UserPlus size={13} />
                                Add Parent Admin
                            </button>
                        )}
                    </div>
                    <div className="divide-y divide-slate-800/60">
                        {customer.users.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-4.5 transition-colors hover:bg-slate-800/30">
                                <div>
                                    <p className="text-sm font-semibold text-white">
                                        {user.first_name} {user.last_name}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {user.email} · <span className="text-slate-300">{user.branch_name || "Parent Account"}</span>
                                    </p>
                                </div>
                                <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                                    {user.role.replaceAll("_", " ")}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Branches List */}
            <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 shadow-sm backdrop-blur-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-slate-900/90">
                    <div>
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <Building2 size={18} className="text-emerald-400" />
                            Branches
                        </h2>
                        <p className="mt-1 text-xs text-slate-400">Branches currently owned by this customer account.</p>
                    </div>
                </div>
                <div className="grid gap-3.5 p-5 md:grid-cols-2">
                    {customer.branches.map((branch) => (
                        <div
                            key={branch.id}
                            className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 transition-all hover:border-slate-700 hover:bg-slate-950/80"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-white text-base">{branch.name}</p>
                                    <p className="mt-0.5 text-xs text-slate-400 font-mono">/{branch.slug}</p>
                                </div>
                                <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                        branch.is_active
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                            : "bg-slate-800 text-slate-400"
                                    }`}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                            branch.is_active ? "bg-emerald-400" : "bg-slate-500"
                                        }`}
                                    />
                                    {branch.is_active ? "Active" : "Inactive"}
                                </span>
                            </div>
                            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/60">
                                <span>{branch.queues} queues</span>
                                <span>{branch.staff} staff members</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Commercial Audit History */}
            <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 shadow-sm backdrop-blur-sm overflow-hidden">
                <div className="border-b border-slate-800 p-5 bg-slate-900/90">
                    <h2 className="font-semibold text-white flex items-center gap-2">
                        <FileText size={18} className="text-slate-400" />
                        Commercial Audit History
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">Recent customer and subscription changes recorded in history.</p>
                </div>
                <div className="divide-y divide-slate-800/60">
                    {customer.audit_events.length ? (
                        customer.audit_events.map((event) => (
                            <div key={event.id} className="flex items-center justify-between gap-4 p-4.5 transition-colors hover:bg-slate-800/30">
                                <div>
                                    <p className="text-sm font-semibold capitalize text-slate-200">
                                        {event.event_type.replaceAll(".", " ").replaceAll("_", " ")}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {typeof event.details?.reason === "string"
                                            ? event.details.reason
                                            : "Recorded system action"}
                                    </p>
                                </div>
                                <time className="shrink-0 text-xs font-mono text-slate-500">
                                    {new Date(event.created_at).toLocaleString()}
                                </time>
                            </div>
                        ))
                    ) : (
                        <p className="p-6 text-sm text-slate-400 italic">No commercial changes recorded yet.</p>
                    )}
                </div>
            </section>

            {/* Modals */}
            {action && (
                <ActionModal
                    action={action}
                    customerName={customer.name}
                    onClose={() => setAction(null)}
                    onDone={(value) => {
                        setCustomer(value);
                        setAction(null);
                    }}
                    parentId={id}
                />
            )}
            {editingLimits && (
                <LimitsModal
                    customer={customer}
                    onClose={() => setEditingLimits(false)}
                    onDone={(value) => {
                        setCustomer(value);
                        setEditingLimits(false);
                    }}
                />
            )}
            {editingAccount && (
                <EditCustomerModal
                    customer={customer}
                    onClose={() => setEditingAccount(false)}
                    onDone={(value) => {
                        setCustomer(value);
                        setEditingAccount(false);
                    }}
                />
            )}
            {addingParentAdmin && (
                <AddParentAdminModal
                    customer={customer}
                    onClose={() => setAddingParentAdmin(false)}
                    onDone={(value) => {
                        setCustomer(value);
                        setAddingParentAdmin(false);
                    }}
                />
            )}
            {permanentlyDeleting && (
                <PermanentDeleteModal
                    customer={customer}
                    onClose={() => setPermanentlyDeleting(false)}
                    onDeleted={() => router.push("/super-admin/customers")}
                />
            )}
        </div>
    );
}

function Metric({
    icon: Icon,
    iconColor,
    label,
    value,
}: {
    icon: typeof Building2;
    iconColor: string;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-sm backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Icon size={16} className={iconColor} />
                {label}
            </div>
            <p className="mt-3 text-2xl font-bold text-white tracking-tight">{value}</p>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MODAL DIALOGS
   ══════════════════════════════════════════════════════════════════════════════ */

function Modal({
    title,
    subtitle,
    icon: Icon = Pencil,
    iconBg = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    onClose,
    children,
}: {
    title: string;
    subtitle?: string;
    icon?: typeof Pencil;
    iconBg?: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <div
                onClick={onClose}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-lg rounded-3xl border border-slate-800/90 bg-slate-900/95 p-6 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl animate-in zoom-in-95 duration-200 my-8">
                {/* Top Glowing Accent Line */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-3xl" />

                {/* Header */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800/80 mb-5">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl border ${iconBg}`}>
                            <Icon size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white capitalize tracking-tight">{title}</h2>
                            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   1. EDIT CUSTOMER MODAL
   ───────────────────────────────────────────────────────────────────────────── */
function EditCustomerModal({
    customer,
    onClose,
    onDone,
}: {
    customer: ManagedCustomerDetail;
    onClose: () => void;
    onDone: (value: ManagedCustomerDetail) => void;
}) {
    const [form, setForm] = useState<ManagedCustomerUpdate>({
        name: customer.name,
        slug: customer.slug || "",
        contact_email: customer.contact_email || "",
        contact_phone: customer.contact_phone || "",
        timezone: customer.timezone || "Asia/Kolkata",
        reason: "",
    });
    const [touched, setTouched] = useState({
        name: false,
        slug: false,
        contact_email: false,
        contact_phone: false,
        timezone: false,
        reason: false,
    });
    const [saving, setSaving] = useState(false);

    // Auto-generate slug when business name changes (same as create branch / customer behavior)
    const handleNameChange = (val: string) => {
        const generatedSlug = val
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .replace(/^-+|-+$/g, "");
        setForm(prev => ({
            ...prev,
            name: val,
            slug: generatedSlug,
        }));
        if (!touched.name) setTouched(prev => ({ ...prev, name: true }));
    };

    const handleSlugChange = (val: string) => {
        const sanitizedSlug = val
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
        setForm(prev => ({ ...prev, slug: sanitizedSlug }));
        if (!touched.slug) setTouched(prev => ({ ...prev, slug: true }));
    };

    // Dynamic filtering for phone input (numbers, +, -, spaces, parentheses only)
    const handlePhoneChange = (val: string) => {
        const filtered = val.replace(/[^0-9+\s\-()]/g, "").slice(0, 25);
        setForm(prev => ({ ...prev, contact_phone: filtered }));
        if (!touched.contact_phone) setTouched(prev => ({ ...prev, contact_phone: true }));
    };

    // Timezone validation helper
    const isValidTimezone = (tz: string) => {
        if (!tz || !tz.trim()) return false;
        try {
            Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
            return true;
        } catch {
            return false;
        }
    };

    // Validation computations
    const nameTrimmed = form.name.trim();
    const nameError = !nameTrimmed
        ? "Business name is required."
        : nameTrimmed.length < 2
        ? "Business name must be at least 2 characters."
        : nameTrimmed.length > 255
        ? "Business name cannot exceed 255 characters."
        : null;

    const slugTrimmed = (form.slug || "").trim();
    const slugError = !slugTrimmed
        ? "Slug is required."
        : slugTrimmed.length < 2
        ? "Slug must be at least 2 characters."
        : slugTrimmed.length > 100
        ? "Slug cannot exceed 100 characters."
        : !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugTrimmed)
        ? "Slug must contain only lowercase letters, numbers, and hyphens without consecutive hyphens."
        : null;

    const emailTrimmed = (form.contact_email || "").trim();
    const emailError = emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)
        ? "Please enter a valid email address (e.g. admin@example.com)."
        : null;

    const phoneTrimmed = (form.contact_phone || "").trim();
    const phoneDigits = phoneTrimmed.replace(/\D/g, "");
    const phoneError = phoneTrimmed
        ? !/^[\d\s+\-()]+$/.test(phoneTrimmed)
            ? "Phone contains invalid characters (numbers and + - ( ) only)."
            : phoneDigits.length < 7 || phoneDigits.length > 15
            ? "Phone number must contain between 7 and 15 digits."
            : null
        : null;

    const tzTrimmed = form.timezone.trim();
    const timezoneError = !tzTrimmed
        ? "Account timezone is required."
        : !isValidTimezone(tzTrimmed)
        ? "Please enter a valid IANA timezone (e.g. Asia/Kolkata, UTC, America/New_York)."
        : null;

    const reasonTrimmed = form.reason.trim();
    const reasonError = !reasonTrimmed
        ? "Reason for update is required for audit logs."
        : reasonTrimmed.length < 3
        ? "Reason must be at least 3 characters."
        : reasonTrimmed.length > 500
        ? "Reason cannot exceed 500 characters."
        : null;

    const isFormValid = !nameError && !slugError && !emailError && !phoneError && !timezoneError && !reasonError;

    // Timezone suggestions for datalist
    const commonTimezones = useMemo(() => {
        try {
            if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
                return (Intl as any).supportedValuesOf("timeZone") as string[];
            }
        } catch {}
        return [
            "UTC",
            "Asia/Kolkata",
            "Asia/Dubai",
            "Asia/Singapore",
            "Asia/Tokyo",
            "Europe/London",
            "Europe/Paris",
            "Europe/Berlin",
            "America/New_York",
            "America/Chicago",
            "America/Denver",
            "America/Los_Angeles",
            "America/Toronto",
            "Australia/Sydney",
            "Pacific/Auckland",
        ];
    }, []);

    const submit = async () => {
        setTouched({
            name: true,
            slug: true,
            contact_email: true,
            contact_phone: true,
            timezone: true,
            reason: true,
        });

        if (!isFormValid) {
            toast.error("Please correct the form validation errors before saving");
            return;
        }

        setSaving(true);
        try {
            const payload: ManagedCustomerUpdate = {
                name: nameTrimmed,
                slug: slugTrimmed,
                contact_email: emailTrimmed || undefined,
                contact_phone: phoneTrimmed || undefined,
                timezone: tzTrimmed,
                reason: reasonTrimmed,
            };
            const value = await api.updateManagedCustomer(customer.parent_organization_id, payload);
            toast.success("Customer details updated successfully");
            onDone(value);
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Update failed");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Edit Customer"
            subtitle="Update business contact and account profile information."
            icon={Pencil}
            iconBg="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            onClose={onClose}
        >
            <div className="space-y-4">
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Business Name <span className="text-rose-400">*</span>
                        </label>
                        {touched.name && nameError && (
                            <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1">
                                <AlertCircle size={11} className="shrink-0" /> {nameError}
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <Building2 size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${touched.name && nameError ? 'text-rose-400' : 'text-slate-500'}`} />
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                            className={`w-full rounded-xl border bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
                                touched.name && nameError
                                    ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20"
                                    : "border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                            }`}
                            placeholder="e.g. Apex Health Clinic"
                        />
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Slug <span className="text-slate-500 text-xs lowercase font-normal">(auto-generated)</span> <span className="text-rose-400">*</span>
                        </label>
                        {touched.slug && slugError && (
                            <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1">
                                <AlertCircle size={11} className="shrink-0" /> {slugError}
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <Link2 size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${touched.slug && slugError ? 'text-rose-400' : 'text-slate-500'}`} />
                        <input
                            type="text"
                            value={form.slug || ""}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            onBlur={() => setTouched(prev => ({ ...prev, slug: true }))}
                            className={`w-full rounded-xl border bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all font-mono ${
                                touched.slug && slugError
                                    ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20"
                                    : "border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                            }`}
                            placeholder="e.g. apex-health-clinic"
                        />
                    </div>
                    {touched.slug && slugError && (
                        <p className="text-[11px] font-medium text-rose-400 mt-1 pl-1 flex items-center gap-1">
                            <AlertCircle size={11} className="shrink-0" /> {slugError}
                        </p>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Contact Email
                            </label>
                            {touched.contact_email && emailError && (
                                <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1 truncate max-w-[150px]" title={emailError}>
                                    <AlertCircle size={11} className="shrink-0" /> Invalid
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <Mail size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${touched.contact_email && emailError ? 'text-rose-400' : 'text-slate-500'}`} />
                            <input
                                type="email"
                                value={form.contact_email}
                                onChange={(e) => {
                                    setForm({ ...form, contact_email: e.target.value });
                                    if (!touched.contact_email) setTouched(prev => ({ ...prev, contact_email: true }));
                                }}
                                onBlur={() => setTouched(prev => ({ ...prev, contact_email: true }))}
                                className={`w-full rounded-xl border bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
                                    touched.contact_email && emailError
                                        ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20"
                                        : "border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                                }`}
                                placeholder="admin@example.com"
                            />
                        </div>
                        {touched.contact_email && emailError && (
                            <p className="text-[11px] font-medium text-rose-400 mt-1 pl-1 flex items-center gap-1">
                                <AlertCircle size={11} className="shrink-0" /> {emailError}
                            </p>
                        )}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Contact Phone
                            </label>
                            {touched.contact_phone && phoneError && (
                                <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1 truncate max-w-[150px]" title={phoneError}>
                                    <AlertCircle size={11} className="shrink-0" /> Invalid
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <Phone size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${touched.contact_phone && phoneError ? 'text-rose-400' : 'text-slate-500'}`} />
                            <input
                                type="text"
                                value={form.contact_phone}
                                onChange={(e) => handlePhoneChange(e.target.value)}
                                onBlur={() => setTouched(prev => ({ ...prev, contact_phone: true }))}
                                className={`w-full rounded-xl border bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all ${
                                    touched.contact_phone && phoneError
                                        ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20"
                                        : "border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                                }`}
                                placeholder="+1 555-0192"
                            />
                        </div>
                        {touched.contact_phone && phoneError && (
                            <p className="text-[11px] font-medium text-rose-400 mt-1 pl-1 flex items-center gap-1">
                                <AlertCircle size={11} className="shrink-0" /> {phoneError}
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Account Timezone <span className="text-rose-400">*</span>
                        </label>
                        {touched.timezone && timezoneError && (
                            <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1">
                                <AlertCircle size={11} className="shrink-0" /> Invalid Timezone
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <Globe size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${touched.timezone && timezoneError ? 'text-rose-400' : 'text-slate-500'}`} />
                        <input
                            type="text"
                            list="sa-customer-timezones"
                            value={form.timezone}
                            onChange={(e) => {
                                setForm({ ...form, timezone: e.target.value });
                                if (!touched.timezone) setTouched(prev => ({ ...prev, timezone: true }));
                            }}
                            onBlur={() => setTouched(prev => ({ ...prev, timezone: true }))}
                            className={`w-full rounded-xl border bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all font-mono ${
                                touched.timezone && timezoneError
                                    ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20"
                                    : "border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                            }`}
                            placeholder="Asia/Kolkata or UTC"
                        />
                        <datalist id="sa-customer-timezones">
                            {commonTimezones.map(tz => (
                                <option key={tz} value={tz} />
                            ))}
                        </datalist>
                    </div>
                    {touched.timezone && timezoneError && (
                        <p className="text-[11px] font-medium text-rose-400 mt-1 pl-1 flex items-center gap-1">
                            <AlertCircle size={11} className="shrink-0" /> {timezoneError}
                        </p>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Reason for Update <span className="text-rose-400">*</span>
                        </label>
                        {touched.reason && reasonError && (
                            <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1">
                                <AlertCircle size={11} className="shrink-0" /> {reasonError}
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <FileText size={16} className={`absolute left-3.5 top-3 transition-colors ${touched.reason && reasonError ? 'text-rose-400' : 'text-slate-500'}`} />
                        <textarea
                            minLength={3}
                            value={form.reason}
                            onChange={(e) => {
                                setForm({ ...form, reason: e.target.value });
                                if (!touched.reason) setTouched(prev => ({ ...prev, reason: true }));
                            }}
                            onBlur={() => setTouched(prev => ({ ...prev, reason: true }))}
                            className={`w-full rounded-xl border bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all min-h-24 ${
                                touched.reason && reasonError
                                    ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20"
                                    : "border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                            }`}
                            placeholder="Required for commercial audit log tracking..."
                        />
                    </div>
                    <div className="flex justify-between items-center mt-1 px-1">
                        {touched.reason && reasonError ? (
                            <p className="text-[11px] font-medium text-rose-400 flex items-center gap-1">
                                <AlertCircle size={11} className="shrink-0" /> {reasonError}
                            </p>
                        ) : (
                            <span />
                        )}
                        <span className="text-[10px] text-slate-500 ml-auto">
                            {reasonTrimmed.length}/500 chars (min 3)
                        </span>
                    </div>
                </div>

                {/* Footer buttons */}
                <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={saving || !isFormValid}
                        onClick={submit}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {saving ? "Saving Changes..." : "Save Customer"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. EDIT LIMITS MODAL
   ───────────────────────────────────────────────────────────────────────────── */
function LimitsModal({
    customer,
    onClose,
    onDone,
}: {
    customer: ManagedCustomerDetail;
    onClose: () => void;
    onDone: (value: ManagedCustomerDetail) => void;
}) {
    const e = customer.subscription.entitlements;
    const initial: ManagedCustomerLimits = {
        branches: e["branches.max"]?.limit || 1,
        queues_per_branch: e["queues.max"]?.limit || 1,
        staff_per_branch: e["staff_users.max"]?.limit || 1,
        sessions: e["sessions.created.max"]?.limit || 3,
        tokens_per_session: e["tokens.created.max_per_session"]?.limit || 20,
    };

    const [limits, setLimits] = useState(initial);
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        try {
            const finalReason = reason.trim() || "Quota adjustment by Super Admin";
            const value = await api.updateManagedLimits(customer.parent_organization_id, limits, finalReason);
            toast.success("Customer limits updated successfully");
            onDone(value);
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Update failed");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Edit Customer Limits"
            subtitle="Configure operational quotas and feature capacities for this tenant."
            icon={Sliders}
            iconBg="bg-purple-500/10 text-purple-400 border-purple-500/20"
            onClose={onClose}
        >
            <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    {(Object.keys(limits) as Array<keyof ManagedCustomerLimits>).map((key) => (
                        <div key={key} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                {key === "sessions" ? "Sessions per queue" : key.replaceAll("_", " ")}
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={limits[key]}
                                onChange={(e) => setLimits({ ...limits, [key]: Math.max(1, Number(e.target.value) || 1) })}
                                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-bold"
                            />
                        </div>
                    ))}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Audit Reason <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all min-h-20"
                        placeholder="Explain reason for quota adjustment (optional)..."
                    />
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={submit}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-600/25 transition-all hover:bg-purple-500 disabled:opacity-50 active:scale-95 cursor-pointer"
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {saving ? "Saving Limits..." : "Save Quotas"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. ACTION MODAL (Extend Trial, Suspend, Activate, Cancel, Archive)
   ───────────────────────────────────────────────────────────────────────────── */
function ActionModal({
    action,
    customerName,
    parentId,
    onClose,
    onDone,
}: {
    action: SubscriptionAdminUpdate["action"];
    customerName: string;
    parentId: string;
    onClose: () => void;
    onDone: (value: ManagedCustomerDetail) => void;
}) {
    const [reason, setReason] = useState("");
    const [days, setDays] = useState(7);
    const [confirmation, setConfirmation] = useState("");
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        try {
            const value = await api.updateManagedSubscription(parentId, {
                action,
                reason,
                extension_days: action === "extend_trial" ? days : undefined,
            });
            toast.success("Subscription updated successfully");
            onDone(value);
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Update failed");
        } finally {
            setSaving(false);
        }
    };

    const isDanger = action === "archive" || action === "cancel";
    const isAmber = action === "suspend";
    const confirmationValid = (action !== "archive" && action !== "cancel") || confirmation === customerName;

    const actionTitle =
        action === "archive" ? "Delete Customer"
        : action === "suspend" ? "Suspend Customer Account"
        : action === "unsuspend" ? "Unsuspend Customer Account"
        : action === "cancel" ? "Cancel Subscription"
        : action === "reactivate" ? "Reactivate Subscription"
        : action === "extend_trial" ? "Extend Free Trial"
        : action === "activate" ? "Convert to Active Plan"
        : action.replaceAll("_", " ");

    const actionSubtitle =
        action === "suspend" ? `Temporarily freeze system access and queue operations for ${customerName}.`
        : action === "unsuspend" ? `Restore full access and resume operational queues for ${customerName}.`
        : action === "cancel" ? `Terminate commercial subscription and service for ${customerName}.`
        : action === "reactivate" ? `Restore an active commercial subscription for ${customerName}.`
        : action === "archive" ? `Archive customer and preserve data for ${customerName}.`
        : action === "extend_trial" ? `Extend the free trial period for ${customerName}.`
        : action === "activate" ? `Promote ${customerName} to an active commercial plan.`
        : `Perform commercial lifecycle action for ${customerName}.`;

    const confirmButtonLabel =
        saving ? "Updating..."
        : action === "archive" ? "Archive Customer"
        : action === "suspend" ? "Suspend Account"
        : action === "unsuspend" ? "Unsuspend Account"
        : action === "cancel" ? "Cancel Subscription"
        : action === "reactivate" ? "Reactivate Subscription"
        : action === "extend_trial" ? "Extend Trial"
        : action === "activate" ? "Convert to Active"
        : "Confirm Action";

    return (
        <Modal
            title={actionTitle}
            subtitle={actionSubtitle}
            icon={isDanger ? AlertTriangle : isAmber ? AlertTriangle : action === "unsuspend" ? Play : Sparkles}
            iconBg={
                isDanger
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : isAmber
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }
            onClose={onClose}
        >
            <div className="space-y-4">
                {action === "suspend" && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 flex items-start gap-3">
                        <AlertTriangle size={20} className="shrink-0 text-amber-400 mt-0.5" />
                        <div>
                            <strong className="block font-semibold text-amber-100 mb-0.5">Temporary Administrative Suspension</strong>
                            Suspending <strong className="text-white">{customerName}</strong> will immediately block login access for staff and branch administrators, and pause all active queues. All customer records, branches, token history, and configurations are safely preserved. You can unsuspend this account at any time to resume normal operations.
                        </div>
                    </div>
                )}

                {action === "unsuspend" && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 flex items-start gap-3">
                        <CheckCircle2 size={20} className="shrink-0 text-emerald-400 mt-0.5" />
                        <div>
                            <strong className="block font-semibold text-emerald-100 mb-0.5">Resume &amp; Unsuspend Account</strong>
                            This action will immediately lift the suspension for <strong className="text-white">{customerName}</strong>. Staff and branch administrators will regain login access, and all queues, sessions, and notifications will resume operation without any data loss.
                        </div>
                    </div>
                )}

                {action === "cancel" && (
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200 flex items-start gap-3">
                        <AlertTriangle size={20} className="shrink-0 text-rose-400 mt-0.5" />
                        <div>
                            <strong className="block font-semibold text-rose-100 mb-0.5">Cancel Commercial Subscription</strong>
                            Cancelling terminates commercial service for <strong className="text-white">{customerName}</strong>. Branch staff and admins will lose access to operational queues. Historical customer data and audit trails will remain preserved in the system for Super Admins.
                        </div>
                    </div>
                )}

                {action === "reactivate" && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 flex items-start gap-3">
                        <CheckCircle2 size={20} className="shrink-0 text-emerald-400 mt-0.5" />
                        <div>
                            <strong className="block font-semibold text-emerald-100 mb-0.5">Reactivate Subscription</strong>
                            This action restores an active commercial subscription for <strong className="text-white">{customerName}</strong> across all branches and staff seats. All queues, sessions, and historical records will be fully accessible.
                        </div>
                    </div>
                )}

                {action === "archive" && (
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200 flex items-start gap-3">
                        <AlertTriangle size={20} className="shrink-0 text-rose-400 mt-0.5" />
                        <div>
                            <strong className="block font-semibold text-rose-100 mb-0.5">Archive Customer Account</strong>
                            This action archives the customer and revokes all tenant access. Customer data will be safely preserved in an archived state and can be restored later by a Super Admin.
                        </div>
                    </div>
                )}

                {action === "extend_trial" && (
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                            Trial Extension Days
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={365}
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-sm text-white font-bold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <div className="mt-2 flex gap-2">
                            {[7, 14, 30, 60].map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setDays(d)}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-all ${
                                        days === d
                                            ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                                            : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                                    }`}
                                >
                                    +{d} days
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {(action === "archive" || action === "cancel") && (
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                            Type <strong className="text-white">{customerName}</strong> to confirm {action === "cancel" ? "cancellation" : "deletion"}
                        </label>
                        <input
                            value={confirmation}
                            onChange={(e) => setConfirmation(e.target.value)}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-mono"
                            placeholder={customerName}
                            autoComplete="off"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Audit Reason <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                        minLength={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-24"
                        placeholder="Required for commercial history tracking..."
                    />
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={saving || reason.trim().length < 3 || !confirmationValid}
                        onClick={submit}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-50 active:scale-95 ${
                            action === "suspend"
                                ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/25"
                                : isDanger
                                ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/25"
                                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25"
                        }`}
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {confirmButtonLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. ADD PARENT ADMIN MODAL
   ───────────────────────────────────────────────────────────────────────────── */
function AddParentAdminModal({
    customer,
    onClose,
    onDone,
}: {
    customer: ManagedCustomerDetail;
    onClose: () => void;
    onDone: (value: ManagedCustomerDetail) => void;
}) {
    const [form, setForm] = useState<ManagedParentAdminCreate>({
        first_name: "",
        last_name: "",
        email: "",
        temporary_password: "",
        reason: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        try {
            const value = await api.createManagedParentAdmin(customer.parent_organization_id, form);
            toast.success("Parent Organisation Admin created successfully");
            onDone(value);
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Unable to create Parent Admin");
        } finally {
            setSaving(false);
        }
    };

    const valid =
        form.first_name.trim() &&
        form.last_name.trim() &&
        form.email.includes("@") &&
        form.temporary_password.length >= 8 &&
        form.reason.trim().length >= 3;

    return (
        <Modal
            title="Add Parent Admin"
            subtitle="Provision an administrator account for managing this Parent Organisation."
            icon={UserPlus}
            iconBg="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            onClose={onClose}
        >
            <div className="space-y-4">
                <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-xs text-indigo-200 flex items-start gap-2.5">
                    <Info size={16} className="shrink-0 text-indigo-400 mt-0.5" />
                    <span>
                        This user will manage the Parent Organisation and all of its branches. They are not tied to a single branch.
                    </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                            First Name <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={form.first_name}
                                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="John"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                            Last Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.last_name}
                            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="Doe"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Login Email <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="admin@organization.com"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Temporary Password <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type={showPassword ? "text" : "password"}
                            minLength={8}
                            value={form.temporary_password}
                            onChange={(e) => setForm({ ...form, temporary_password: e.target.value })}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            placeholder="Minimum 8 characters"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Reason for Creation <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-20"
                        placeholder="Required for audit logging..."
                    />
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={saving || !valid}
                        onClick={submit}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 disabled:opacity-50 active:scale-95"
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {saving ? "Creating Admin..." : "Create Parent Admin"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   6. PERMANENT DELETE MODAL
   ───────────────────────────────────────────────────────────────────────────── */
function PermanentDeleteModal({
    customer,
    onClose,
    onDeleted,
}: {
    customer: ManagedCustomerDetail;
    onClose: () => void;
    onDeleted: () => void;
}) {
    const [name, setName] = useState("");
    const [phrase, setPhrase] = useState("");
    const [reason, setReason] = useState("");
    const [deleting, setDeleting] = useState(false);

    const valid = name === customer.name && phrase === "DELETE PERMANENTLY" && reason.trim().length >= 3;

    const submit = async () => {
        setDeleting(true);
        try {
            const result = await api.permanentlyDeleteManagedCustomer(customer.parent_organization_id, {
                confirmation_name: name,
                confirmation_phrase: phrase,
                reason,
            });
            if (result.file_cleanup_failures) {
                toast.warning(`Customer deleted; ${result.file_cleanup_failures} file(s) need manual cleanup`);
            } else {
                toast.success("Customer and all associated data permanently deleted");
            }
            onDeleted();
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Permanent deletion failed");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Modal
            title="Permanently Delete Customer"
            subtitle="Irreversible hard deletion of tenant and data."
            icon={AlertTriangle}
            iconBg="bg-rose-500/10 text-rose-400 border-rose-500/20"
            onClose={onClose}
        >
            <div className="space-y-4">
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-rose-100 text-sm">
                        <AlertTriangle size={16} /> Danger: Cannot Be Undone
                    </div>
                    <p>
                        All branches, administrators, staff users, queues, sessions, tokens, WhatsApp messages, backups, and audit trails will be permanently purged from the system.
                    </p>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Type customer name: <strong className="text-white font-mono">{customer.name}</strong>
                    </label>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-mono"
                        placeholder={customer.name}
                        autoComplete="off"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Type <strong className="text-white font-mono">DELETE PERMANENTLY</strong>
                    </label>
                    <input
                        value={phrase}
                        onChange={(e) => setPhrase(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-mono"
                        placeholder="DELETE PERMANENTLY"
                        autoComplete="off"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Deletion Reason <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 min-h-20"
                        placeholder="Reason for permanent deletion..."
                    />
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!valid || deleting}
                        onClick={submit}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-600/25 transition-all hover:bg-rose-500 disabled:opacity-50 active:scale-95"
                    >
                        {deleting && <Loader2 size={16} className="animate-spin" />}
                        {deleting ? "Deleting Data..." : "Permanently Delete Account"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
