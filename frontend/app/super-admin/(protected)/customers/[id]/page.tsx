"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
    AvailableBranchItem,
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
    "sessions.created.max": "Sessions",
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
    const [assigningBranches, setAssigningBranches] = useState(false);
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
                                        {(status === "trialing" || status === "expired") && (
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
                                            <button
                                                onClick={() => setAction("suspend")}
                                                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-sm font-medium text-amber-400 transition-all hover:bg-amber-500/20"
                                            >
                                                <AlertTriangle size={15} />
                                                Suspend
                                            </button>
                                        )}
                                        {(status === "suspended" || status === "cancelled") && (
                                            <button
                                                onClick={() => setAction("reactivate")}
                                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 active:scale-95 cursor-pointer"
                                            >
                                                <RotateCcw size={15} />
                                                Retake / Reactivate Subscription
                                            </button>
                                        )}
                                        {status !== "cancelled" && (
                                            <button
                                                onClick={() => setAction("cancel")}
                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
                                            >
                                                Cancel Subscription
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
                    <button
                        onClick={() => setAssigningBranches(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-700 hover:text-white"
                    >
                        <Link2 size={14} className="text-emerald-400" />
                        Assign Existing Branch
                    </button>
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
            {assigningBranches && (
                <AssignBranchesModal
                    customer={customer}
                    onClose={() => setAssigningBranches(false)}
                    onDone={(value) => {
                        setCustomer(value);
                        setAssigningBranches(false);
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
        contact_email: customer.contact_email || "",
        contact_phone: customer.contact_phone || "",
        timezone: customer.timezone,
        reason: "",
    });
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        try {
            const value = await api.updateManagedCustomer(customer.parent_organization_id, form);
            toast.success("Customer details updated successfully");
            onDone(value);
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Update failed");
        } finally {
            setSaving(false);
        }
    };

    const isFormValid = form.name.trim().length >= 2 && form.reason.trim().length >= 3;

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
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Business Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                        <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            placeholder="e.g. Apex Health Clinic"
                        />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                            Contact Email
                        </label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="email"
                                value={form.contact_email}
                                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                placeholder="admin@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                            Contact Phone
                        </label>
                        <div className="relative">
                            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={form.contact_phone}
                                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                placeholder="+1 555-0192"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Account Timezone
                    </label>
                    <div className="relative">
                        <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={form.timezone}
                            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                            placeholder="Asia/Kolkata or UTC"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Reason for Update <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                        <FileText size={16} className="absolute left-3.5 top-3 text-slate-500" />
                        <textarea
                            minLength={3}
                            value={form.reason}
                            onChange={(e) => setForm({ ...form, reason: e.target.value })}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-24"
                            placeholder="Required for commercial audit log tracking..."
                        />
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
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 disabled:opacity-50 active:scale-95"
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
                                {key.replaceAll("_", " ")}
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

    const isDanger = action === "archive" || action === "suspend" || action === "cancel";
    const confirmationValid = action !== "archive" || confirmation === customerName;
    const actionTitle = action === "archive" ? "Delete Customer" : action.replaceAll("_", " ");

    return (
        <Modal
            title={actionTitle}
            subtitle={`Perform commercial lifecycle action for ${customerName}.`}
            icon={isDanger ? AlertTriangle : Sparkles}
            iconBg={
                isDanger
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }
            onClose={onClose}
        >
            <div className="space-y-4">
                {action === "reactivate" && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 flex items-start gap-3">
                        <CheckCircle2 size={20} className="shrink-0 text-emerald-400 mt-0.5" />
                        <div>
                            <strong className="block font-semibold text-emerald-100 mb-0.5">Retake &amp; Reactivate Subscription</strong>
                            This action restores active subscription status for <strong className="text-white">{customerName}</strong> across all branches and staff seats. All existing queues, sessions, and historical data will be fully operational and intact.
                        </div>
                    </div>
                )}

                {action === "archive" && (
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200 flex items-start gap-3">
                        <AlertTriangle size={20} className="shrink-0 text-rose-400 mt-0.5" />
                        <div>
                            <strong className="block font-semibold text-rose-100">Archiving Account</strong>
                            This action archives the customer and blocks access. Customer data will be preserved and can be restored later.
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

                {action === "archive" && (
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                            Type <strong className="text-white">{customerName}</strong> to confirm
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
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all disabled:opacity-50 active:scale-95 ${
                            isDanger
                                ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/25"
                                : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25"
                        }`}
                    >
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {saving ? "Updating..." : action === "archive" ? "Archive Customer" : "Confirm Action"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. ASSIGN BRANCHES MODAL
   ───────────────────────────────────────────────────────────────────────────── */
function AssignBranchesModal({
    customer,
    onClose,
    onDone,
}: {
    customer: ManagedCustomerDetail;
    onClose: () => void;
    onDone: (value: ManagedCustomerDetail) => void;
}) {
    const [branches, setBranches] = useState<AvailableBranchItem[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.listAvailableBranches(customer.parent_organization_id)
            .then(setBranches)
            .catch((error) => toast.error(error instanceof ApiError ? error.detail : "Unable to load branches"))
            .finally(() => setLoading(false));
    }, [customer.parent_organization_id]);

    const toggle = (id: string) =>
        setSelected((current) =>
            current.includes(id) ? current.filter((val) => val !== id) : [...current, id]
        );

    const filteredBranches = useMemo(() => {
        if (!search.trim()) return branches;
        const q = search.toLowerCase();
        return branches.filter((b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q));
    }, [branches, search]);

    const submit = async () => {
        setSaving(true);
        try {
            const value = await api.assignManagedBranches(customer.parent_organization_id, selected);
            toast.success(`${selected.length} branch${selected.length === 1 ? "" : "es"} assigned`);
            onDone(value);
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Unable to assign branches");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Assign Existing Branches"
            subtitle="Link unassigned standalone branches directly to this parent customer account."
            icon={Link2}
            iconBg="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            onClose={onClose}
        >
            <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search unassigned branches..."
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-10 pr-4 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                </div>

                {loading ? (
                    <div className="flex h-44 items-center justify-center">
                        <LoadingSpinner />
                    </div>
                ) : filteredBranches.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center text-sm text-slate-500">
                        No unassigned branches matching search criteria.
                    </div>
                ) : (
                    <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                        {filteredBranches.map((branch) => {
                            const isChecked = selected.includes(branch.id);
                            return (
                                <label
                                    key={branch.id}
                                    className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition-all ${
                                        isChecked
                                            ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm"
                                            : "border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-950"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggle(branch.id)}
                                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-white text-sm">{branch.name}</p>
                                        <p className="mt-0.5 truncate text-xs text-slate-400 font-mono">
                                            /{branch.slug}
                                            {branch.admin_email ? ` · ${branch.admin_email}` : " · No Admin"}
                                        </p>
                                    </div>
                                    <span
                                        className={`text-xs font-semibold ${
                                            branch.is_active ? "text-emerald-400" : "text-slate-500"
                                        }`}
                                    >
                                        {branch.is_active ? "Active" : "Inactive"}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                )}

                <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">
                        {selected.length} branch{selected.length === 1 ? "" : "es"} selected
                    </span>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={saving || selected.length === 0}
                            onClick={submit}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500 disabled:opacity-50 active:scale-95"
                        >
                            {saving && <Loader2 size={16} className="animate-spin" />}
                            {saving ? "Assigning..." : `Assign Selected (${selected.length})`}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. ADD PARENT ADMIN MODAL
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
