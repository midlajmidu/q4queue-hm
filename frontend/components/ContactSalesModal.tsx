"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, MessageSquareText, Phone, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";

type Props = {
    mode: "authenticated" | "expired";
    email?: string;
    organizationSlug?: string;
    password?: string;
    onClose: () => void;
    onSubmitted?: () => void;
};

export function ContactSalesModal({ mode, email, organizationSlug, password, onClose, onSubmitted }: Props) {
    const [phone, setPhone] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function submit(event: FormEvent) {
        event.preventDefault();
        setSaving(true); setError(null);
        try {
            if (mode === "expired") {
                if (!email || !organizationSlug || !password) throw new Error("Please enter your branch, email and password again, then retry.");
                await api.submitExpiredTrialContactSales({
                    email, organization_slug: organizationSlug, password,
                    contact_phone: phone.trim() || undefined,
                    message: message.trim() || undefined,
                });
            } else {
                await api.submitContactSales({
                    contact_phone: phone.trim() || undefined,
                    message: message.trim() || undefined,
                });
            }
            setSuccess(true);
            onSubmitted?.();
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : err instanceof Error ? err.message : "Unable to send your request. Please try again.");
        } finally { setSaving(false); }
    }

    return <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <button aria-label="Close contact sales" onClick={onClose} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
        <div role="dialog" aria-modal="true" aria-labelledby="contact-sales-title" className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
            {success ? <div className="py-5 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={28} /></div>
                <h2 id="contact-sales-title" className="mt-4 text-xl font-bold">Request received</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Your account and data are safe. Our sales team can now review your request and activate your account from Super Admin.</p>
                <button onClick={onClose} className="mt-6 h-11 w-full rounded-xl bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700">Done</button>
            </div> : <>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><MessageSquareText size={21} /></div>
                <h2 id="contact-sales-title" className="mt-4 text-xl font-bold">Continue with Q4Queue</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Send your details to our sales team. They will review your account, discuss the right limits, and activate your existing workspace.</p>
                {mode === "expired" && email && <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"><strong className="text-slate-800">Account:</strong> {email}<br /><strong className="text-slate-800">Branch:</strong> {organizationSlug}</div>}
                {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</div>}
                <form onSubmit={submit} className="mt-5 space-y-4">
                    <label className="block text-sm font-semibold text-slate-700">Phone number <span className="font-normal text-slate-400">(optional)</span><div className="mt-1.5 flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10"><Phone size={16} className="ml-3 text-slate-400" /><input value={phone} onChange={event => setPhone(event.target.value)} maxLength={30} placeholder="Your contact number" className="w-full rounded-xl bg-transparent px-2.5 py-2.5 text-sm outline-none" /></div></label>
                    <label className="block text-sm font-semibold text-slate-700">How can we help? <span className="font-normal text-slate-400">(optional)</span><textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={2000} placeholder="Tell us about your branches, queues, or expected usage" className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /></label>
                    <button disabled={saving} className="h-11 w-full rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50">{saving ? "Sending request…" : "Send request to sales"}</button>
                </form>
                <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">Submitting this request does not create a charge or automatically change your plan.</p>
            </>}
        </div>
    </div>;
}
