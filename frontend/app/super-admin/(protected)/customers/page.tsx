"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Building2, Clock3, Plus, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import type { AdminCustomerCreate, ManagedCustomerListItem } from "@/types/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { TIMEZONE_GROUPS, TIMEZONES, detectBrowserTimezone } from "@/lib/timezones";

const INITIAL_FORM: AdminCustomerCreate = {
    business_name: "",
    branch_name: "Main Branch",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    timezone: "Asia/Kolkata",
    account_type: "trial",
    trial_days: 14,
    limits: { branches: 1, queues_per_branch: 1, staff_per_branch: 1, sessions: 3, tokens_per_session: 20 },
};

const statusStyle: Record<string, string> = {
    trialing: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    expired: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    suspended: "border-red-500/30 bg-red-500/10 text-red-300",
    cancelled: "border-slate-600 bg-slate-800 text-slate-400",
    archived: "border-red-500/30 bg-red-500/10 text-red-300",
    legacy: "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

function StatusBadge({ value }: { value: string }) {
    return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyle[value] || statusStyle.legacy}`}>{value.replaceAll("_", " ")}</span>;
}

export default function CustomersPage() {
    const [items, setItems] = useState<ManagedCustomerListItem[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [showCreate, setShowCreate] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await api.listManagedCustomers({ search: search || undefined, commercial_status: filter, limit: 200 });
            setItems(result.items);
            setCounts(result.status_counts);
            setTotal(result.total);
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Unable to load customers");
        } finally {
            setLoading(false);
        }
    }, [filter, search]);

    useEffect(() => { void load(); }, [load]);

    const cards = [
        { label: "Customer accounts", value: total, icon: Building2, color: "text-indigo-300" },
        { label: "Active trials", value: counts.trialing || 0, icon: Sparkles, color: "text-blue-300" },
        { label: "Active customers", value: counts.active || 0, icon: ShieldCheck, color: "text-emerald-300" },
        { label: "Expired trials", value: counts.expired || 0, icon: Clock3, color: "text-amber-300" },
    ];

    return (
        <div className="space-y-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">Customer lifecycle</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Customers</h1>
                    <p className="mt-1 text-sm text-slate-400">Manage each commercial account, its branches, users, trial and operating limits.</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-500">
                    <Plus size={17} /> Add customer
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                        <div className="flex items-center justify-between"><span className="text-sm text-slate-400">{label}</span><Icon size={18} className={color} /></div>
                        <p className="mt-3 text-3xl font-bold text-white">{value}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70">
                <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row">
                    <form onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); }} className="relative flex-1">
                        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search business, slug or owner email" className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-indigo-500" />
                    </form>
                    <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500">
                        <option value="all">All statuses</option><option value="trialing">Trialing</option><option value="active">Active</option><option value="expired">Expired</option><option value="suspended">Suspended</option><option value="cancelled">Cancelled</option><option value="legacy">Legacy</option>
                    </select>
                </div>
                {loading ? <div className="flex h-56 items-center justify-center"><LoadingSpinner /></div> : items.length === 0 ? (
                    <div className="py-16 text-center"><Users className="mx-auto text-slate-600" /><p className="mt-3 text-sm text-slate-400">No customer accounts match this view.</p></div>
                ) : (
                    <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Commercial status</th><th className="px-5 py-4">Branches & users</th><th className="px-5 py-4">Trial / plan</th><th className="px-5 py-4 text-right">Action</th></tr></thead>
                        <tbody className="divide-y divide-slate-800">{items.map((item) => (
                            <tr key={item.parent_organization_id} className="transition hover:bg-white/[0.025]">
                                <td className="px-5 py-4"><p className="font-semibold text-white">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.owner_email || item.contact_email || item.slug}</p></td>
                                <td className="px-5 py-4"><StatusBadge value={item.commercial_status} /><p className="mt-2 text-[11px] capitalize text-slate-500">{item.source.replaceAll("_", " ")}</p></td>
                                <td className="px-5 py-4 text-slate-300">{item.branch_count} branch{item.branch_count === 1 ? "" : "es"}<p className="mt-1 text-xs text-slate-500">{item.user_count} users</p></td>
                                <td className="px-5 py-4 text-slate-300">{item.plan_name || "Enterprise Access"}<p className="mt-1 text-xs text-slate-500">{item.commercial_status === "active" ? "Active subscription" : item.days_remaining !== undefined && item.commercial_status === "trialing" ? `${item.days_remaining} days remaining` : item.commercial_status === "expired" ? "Trial expired" : item.commercial_status === "cancelled" ? "Cancelled" : "Active"}</p></td>
                                <td className="px-5 py-4 text-right"><Link href={`/super-admin/customers/${item.parent_organization_id}`} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-indigo-500 hover:text-white">Manage</Link></td>
                            </tr>
                        ))}</tbody>
                    </table></div>
                )}
            </div>
            {showCreate && <CreateCustomerModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); void load(); }} />}
        </div>
    );
}

function CreateCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState<AdminCustomerCreate>(() => ({
        ...INITIAL_FORM,
        timezone: detectBrowserTimezone("Asia/Kolkata"),
    }));
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const markTouched = (fields: string[]) => {
        setTouched(prev => {
            const next = { ...prev };
            fields.forEach(f => { next[f] = true; });
            return next;
        });
    };

    const handlePhoneChange = (val: string) => {
        const filtered = val.replace(/[^0-9+\s\-()]/g, "").slice(0, 25);
        setForm(current => ({ ...current, phone: filtered }));
        if (!touched.phone) setTouched(prev => ({ ...prev, phone: true }));
    };

    const setLimit = (key: keyof AdminCustomerCreate["limits"], value: number) => {
        setForm(current => ({ ...current, limits: { ...current.limits, [key]: value } }));
        if (!touched[`limits_${key}`]) setTouched(prev => ({ ...prev, [`limits_${key}`]: true }));
    };

    // Step 1 Validation
    const businessNameTrimmed = form.business_name.trim();
    const businessNameError = !businessNameTrimmed
        ? "Business name is required."
        : businessNameTrimmed.length < 2
        ? "Business name must be at least 2 characters."
        : businessNameTrimmed.length > 255
        ? "Business name cannot exceed 255 characters."
        : null;

    const branchNameTrimmed = form.branch_name.trim();
    const branchNameError = !branchNameTrimmed
        ? "First branch name is required."
        : branchNameTrimmed.length < 2
        ? "Branch name must be at least 2 characters."
        : branchNameTrimmed.length > 255
        ? "Branch name cannot exceed 255 characters."
        : null;

    const phoneTrimmed = (form.phone || "").trim();
    const phoneDigits = phoneTrimmed.replace(/\D/g, "");
    const phoneError = phoneTrimmed
        ? !/^[\d\s+\-()]+$/.test(phoneTrimmed)
            ? "Phone contains invalid characters (numbers and + - ( ) only)."
            : phoneDigits.length < 7 || phoneDigits.length > 15
            ? "Phone number must contain between 7 and 15 digits."
            : null
        : null;

    const isValidTimezone = (tz: string) => {
        if (!tz || !tz.trim()) return false;
        try {
            Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
            return true;
        } catch {
            return false;
        }
    };
    const timezoneError = !form.timezone || !isValidTimezone(form.timezone)
        ? "Please select a valid timezone."
        : null;

    const isStep1Valid = !businessNameError && !branchNameError && !phoneError && !timezoneError;

    // Step 2 Validation
    const trialDaysError = form.account_type === "trial"
        ? !Number.isInteger(form.trial_days) || form.trial_days < 1 || form.trial_days > 365
            ? "Trial days must be an integer between 1 and 365."
            : null
        : null;

    const limitKeys = ["branches", "queues_per_branch", "staff_per_branch", "sessions", "tokens_per_session"] as const;
    const limitErrors: Record<string, string | null> = {};
    let hasLimitError = false;
    for (const key of limitKeys) {
        const val = form.limits[key];
        if (val === undefined || val === null || isNaN(val) || val < 1 || !Number.isInteger(val)) {
            limitErrors[key] = "Must be at least 1.";
            hasLimitError = true;
        } else {
            limitErrors[key] = null;
        }
    }
    const isStep2Valid = !trialDaysError && !hasLimitError;

    // Step 3 Validation
    const firstNameTrimmed = form.first_name.trim();
    const firstNameError = !firstNameTrimmed
        ? "First name is required."
        : firstNameTrimmed.length > 50
        ? "First name cannot exceed 50 characters."
        : null;

    const lastNameTrimmed = form.last_name.trim();
    const lastNameError = !lastNameTrimmed
        ? "Last name is required."
        : lastNameTrimmed.length > 50
        ? "Last name cannot exceed 50 characters."
        : null;

    const emailTrimmed = form.email.trim();
    const emailError = !emailTrimmed
        ? "Admin email is required."
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)
        ? "Please enter a valid email address."
        : null;

    const passwordTrimmed = form.password.trim();
    const passwordError = !passwordTrimmed
        ? "Temporary password is required."
        : passwordTrimmed.length < 8
        ? "Password must be at least 8 characters."
        : passwordTrimmed.length > 128
        ? "Password cannot exceed 128 characters."
        : null;

    const isStep3Valid = !firstNameError && !lastNameError && !emailError && !passwordError;

    const handleNext = (event: FormEvent) => {
        event.preventDefault();
        if (step === 1) {
            markTouched(["business_name", "branch_name", "phone", "timezone"]);
            if (!isStep1Valid) {
                toast.error("Please fill in all required fields correctly before continuing.");
                return;
            }
            setStep(2);
        } else if (step === 2) {
            markTouched(["trial_days", ...limitKeys.map(k => `limits_${k}`)]);
            if (!isStep2Valid) {
                toast.error("Please ensure all limits are positive integers.");
                return;
            }
            setStep(3);
        } else if (step === 3) {
            void submit();
        }
    };

    const submit = async () => {
        markTouched(["first_name", "last_name", "email", "password"]);
        if (!isStep1Valid || !isStep2Valid || !isStep3Valid) {
            toast.error("Please complete all steps with valid information.");
            return;
        }

        setSaving(true);
        const payload: AdminCustomerCreate = {
            ...form,
            business_name: form.business_name.trim(),
            branch_name: form.branch_name.trim(),
            phone: form.phone?.trim() || undefined,
            timezone: form.timezone.trim(),
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
        };

        try {
            await api.createManagedCustomer(payload);
            toast.success("Customer account created successfully");
            onCreated();
        } catch (error) {
            toast.error(error instanceof ApiError ? error.detail : "Unable to create customer");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <button aria-label="Close" className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={onClose} />
            <form onSubmit={handleNext} noValidate className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Step {step} of 3</p>
                        <h2 className="mt-1 text-xl font-bold text-white">
                            {step === 1 ? "Customer account" : step === 2 ? "Subscription and limits" : "Account owner"}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-500 hover:text-white transition">✕</button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {step === 1 && (
                        <>
                            <Field label="Business name" error={touched.business_name ? businessNameError : null}>
                                <input
                                    required
                                    value={form.business_name}
                                    onChange={e => {
                                        setForm({ ...form, business_name: e.target.value });
                                        if (!touched.business_name) setTouched(prev => ({ ...prev, business_name: true }));
                                    }}
                                    onBlur={() => setTouched(prev => ({ ...prev, business_name: true }))}
                                    placeholder="e.g. Mayura Clinic"
                                    className={`field ${touched.business_name && businessNameError ? "border-rose-500/50 focus:border-rose-500" : ""}`}
                                />
                            </Field>
                            <Field label="First branch" error={touched.branch_name ? branchNameError : null}>
                                <input
                                    required
                                    value={form.branch_name}
                                    onChange={e => {
                                        setForm({ ...form, branch_name: e.target.value });
                                        if (!touched.branch_name) setTouched(prev => ({ ...prev, branch_name: true }));
                                    }}
                                    onBlur={() => setTouched(prev => ({ ...prev, branch_name: true }))}
                                    placeholder="e.g. Main Branch"
                                    className={`field ${touched.branch_name && branchNameError ? "border-rose-500/50 focus:border-rose-500" : ""}`}
                                />
                            </Field>
                            <Field
                                label="Contact phone (optional)"
                                error={touched.phone ? phoneError : null}
                                hint="Include country code, e.g. +91 98765 43210"
                            >
                                <input
                                    value={form.phone || ""}
                                    onChange={e => handlePhoneChange(e.target.value)}
                                    onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                                    placeholder="+91 98765 43210"
                                    className={`field ${touched.phone && phoneError ? "border-rose-500/50 focus:border-rose-500" : ""}`}
                                />
                            </Field>
                            <Field
                                label="Timezone"
                                error={touched.timezone ? timezoneError : null}
                                hint="Governs operating hours, queues, session resets, and analytics"
                            >
                                <select
                                    required
                                    value={form.timezone}
                                    onChange={e => {
                                        setForm({ ...form, timezone: e.target.value });
                                        if (!touched.timezone) setTouched(prev => ({ ...prev, timezone: true }));
                                    }}
                                    className={`field cursor-pointer ${touched.timezone && timezoneError ? "border-rose-500/50 focus:border-rose-500" : ""}`}
                                >
                                    {!TIMEZONES.some(t => t.value === form.timezone) && form.timezone && (
                                        <option value={form.timezone}>{form.timezone}</option>
                                    )}
                                    {TIMEZONE_GROUPS.map(group => (
                                        <optgroup key={group.region} label={group.region} className="bg-slate-900 text-slate-400 font-bold">
                                            {group.zones.map(tz => (
                                                <option key={tz.value} value={tz.value} className="bg-slate-950 text-white font-normal">
                                                    {tz.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </Field>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Field label="Account type">
                                <select
                                    value={form.account_type}
                                    onChange={e => setForm({ ...form, account_type: e.target.value as "trial" | "active" })}
                                    className="field cursor-pointer"
                                >
                                    <option value="trial">Free trial</option>
                                    <option value="active">Active — manually approved</option>
                                </select>
                            </Field>
                            {form.account_type === "trial" && (
                                <Field label="Trial days" error={touched.trial_days ? trialDaysError : null}>
                                    <input
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={form.trial_days || ""}
                                        onChange={e => {
                                            const val = parseInt(e.target.value, 10);
                                            setForm({ ...form, trial_days: isNaN(val) ? 0 : val });
                                            if (!touched.trial_days) setTouched(prev => ({ ...prev, trial_days: true }));
                                        }}
                                        onBlur={() => setTouched(prev => ({ ...prev, trial_days: true }))}
                                        className={`field ${touched.trial_days && trialDaysError ? "border-rose-500/50 focus:border-rose-500" : ""}`}
                                    />
                                </Field>
                            )}
                            {(["branches", "queues_per_branch", "staff_per_branch", "sessions", "tokens_per_session"] as const).map(key => (
                                <Field
                                    key={key}
                                    label={key === "sessions" ? "sessions per queue" : key.replaceAll("_", " ")}
                                    error={touched[`limits_${key}`] ? limitErrors[key] : null}
                                >
                                    <input
                                        type="number"
                                        min={1}
                                        required
                                        value={form.limits[key] ?? ""}
                                        onChange={e => {
                                            const val = parseInt(e.target.value, 10);
                                            setLimit(key, isNaN(val) ? 0 : val);
                                        }}
                                        onBlur={() => setTouched(prev => ({ ...prev, [`limits_${key}`]: true }))}
                                        className={`field ${touched[`limits_${key}`] && limitErrors[key] ? "border-rose-500/50 focus:border-rose-500" : ""}`}
                                    />
                                </Field>
                            ))}
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <Field label="First name" error={touched.first_name ? firstNameError : null}>
                                <input
                                    required
                                    value={form.first_name}
                                    onChange={e => {
                                        setForm({ ...form, first_name: e.target.value });
                                        if (!touched.first_name) setTouched(prev => ({ ...prev, first_name: true }));
                                    }}
                                    onBlur={() => setTouched(prev => ({ ...prev, first_name: true }))}
                                    placeholder="John"
                                    className={`field ${touched.first_name && firstNameError ? "border-rose-500/50 focus:border-rose-500" : ""}`}
                                />
                            </Field>
                            <Field label="Last name" error={touched.last_name ? lastNameError : null}>
                                <input
                                    required
                                    value={form.last_name}
                                    onChange={e => {
                                        setForm({ ...form, last_name: e.target.value });
                                        if (!touched.last_name) setTouched(prev => ({ ...prev, last_name: true }));
                                    }}
                                    onBlur={() => setTouched(prev => ({ ...prev, last_name: true }))}
                                    placeholder="Doe"
                                    className={`field ${touched.last_name && lastNameError ? "border-rose-500/50 focus:border-rose-500" : ""}`}
                                />
                            </Field>
                            <Field label="Admin email" error={touched.email ? emailError : null}>
                                <input
                                    required
                                    type="email"
                                    value={form.email}
                                    onChange={e => {
                                        setForm({ ...form, email: e.target.value });
                                        if (!touched.email) setTouched(prev => ({ ...prev, email: true }));
                                    }}
                                    onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                                    placeholder="admin@example.com"
                                    className={`field ${touched.email && emailError ? "border-rose-500/50 focus:border-rose-500" : ""}`}
                                />
                            </Field>
                            <Field
                                label="Temporary password"
                                error={touched.password ? passwordError : null}
                                hint="Minimum 8 characters"
                            >
                                <input
                                    required
                                    type="password"
                                    minLength={8}
                                    value={form.password}
                                    onChange={e => {
                                        setForm({ ...form, password: e.target.value });
                                        if (!touched.password) setTouched(prev => ({ ...prev, password: true }));
                                    }}
                                    onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                                    placeholder="••••••••"
                                    className={`field ${touched.password && passwordError ? "border-rose-500/50 focus:border-rose-500" : ""}`}
                                />
                            </Field>
                            <div className="sm:col-span-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm text-slate-300">
                                One confirmation creates the Parent Organisation, first branch, Branch Admin, subscription and limits together.
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-7 flex justify-between">
                    <button
                        type="button"
                        onClick={() => step === 1 ? onClose() : setStep(step - 1)}
                        className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition"
                    >
                        {step === 1 ? "Cancel" : "Back"}
                    </button>
                    <button
                        type="submit"
                        disabled={
                            saving ||
                            (step === 1 && touched.business_name && !isStep1Valid) ||
                            (step === 2 && !isStep2Valid) ||
                            (step === 3 && touched.email && !isStep3Valid)
                        }
                        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                    >
                        {saving ? "Creating…" : step === 3 ? "Create customer" : "Continue"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({
    label,
    children,
    error,
    hint,
    className = "",
}: {
    label: string;
    children: React.ReactNode;
    error?: string | null;
    hint?: string;
    className?: string;
}) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="block text-sm font-medium capitalize text-slate-300">
                {label}
            </label>
            {children}
            {error ? (
                <p className="text-xs text-rose-400 font-medium">{error}</p>
            ) : hint ? (
                <p className="text-xs text-slate-500">{hint}</p>
            ) : null}
        </div>
    );
}
