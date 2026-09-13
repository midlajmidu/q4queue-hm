"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Building2, Clock3, Plus, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";
import type { AdminCustomerCreate, ManagedCustomerListItem } from "@/types/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

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
    const [form, setForm] = useState<AdminCustomerCreate>(INITIAL_FORM);
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const setLimit = (key: keyof AdminCustomerCreate["limits"], value: number) => setForm(current => ({ ...current, limits: { ...current.limits, [key]: value } }));
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (step < 3) { setStep(step + 1); return; }
        setSaving(true);
        try { await api.createManagedCustomer(form); toast.success("Customer account created"); onCreated(); }
        catch (error) { toast.error(error instanceof ApiError ? error.detail : "Unable to create customer"); }
        finally { setSaving(false); }
    };
    return <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <button aria-label="Close" className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={onClose} />
        <form onSubmit={submit} className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Step {step} of 3</p><h2 className="mt-1 text-xl font-bold text-white">{step === 1 ? "Customer account" : step === 2 ? "Subscription and limits" : "Account owner"}</h2></div><button type="button" onClick={onClose} className="text-slate-500 hover:text-white">✕</button></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {step === 1 && <><Field label="Business name"><input required value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} className="field" /></Field><Field label="First branch"><input required value={form.branch_name} onChange={e => setForm({ ...form, branch_name: e.target.value })} className="field" /></Field><Field label="Contact phone"><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="field" /></Field><Field label="Timezone"><input required value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })} className="field" /></Field></>}
                {step === 2 && <><Field label="Account type"><select value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value as "trial" | "active" })} className="field"><option value="trial">Free trial</option><option value="active">Active — manually approved</option></select></Field>{form.account_type === "trial" && <Field label="Trial days"><input type="number" min={1} max={365} value={form.trial_days} onChange={e => setForm({ ...form, trial_days: Number(e.target.value) })} className="field" /></Field>}{(["branches", "queues_per_branch", "staff_per_branch", "sessions", "tokens_per_session"] as const).map(key => <Field key={key} label={key.replaceAll("_", " ")}><input type="number" min={1} required value={form.limits[key]} onChange={e => setLimit(key, Number(e.target.value))} className="field" /></Field>)}</>}
                {step === 3 && <><Field label="First name"><input required value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} className="field" /></Field><Field label="Last name"><input required value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} className="field" /></Field><Field label="Admin email"><input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="field" /></Field><Field label="Temporary password"><input required type="password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="field" /></Field><div className="sm:col-span-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm text-slate-300">One confirmation creates the Parent Organisation, first branch, Branch Admin, subscription and limits together.</div></>}
            </div>
            <div className="mt-7 flex justify-between"><button type="button" onClick={() => step === 1 ? onClose() : setStep(step - 1)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-300">{step === 1 ? "Cancel" : "Back"}</button><button disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Creating…" : step === 3 ? "Create customer" : "Continue"}</button></div>
        </form>
    </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="space-y-1.5 text-sm font-medium capitalize text-slate-300"><span>{label}</span>{children}</label>;
}
