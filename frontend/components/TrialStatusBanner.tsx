"use client";

import { useEffect, useState } from "react";
import { Clock3, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { SubscriptionSummary } from "@/types/api";
import { ContactSalesModal } from "@/components/ContactSalesModal";

const labels: Record<string, string> = {
    "branches.max": "Branches",
    "queues.max": "Queues",
    "staff_users.max": "Staff",
    "sessions.created.max": "Sessions",
    "tokens.created.max_per_session": "Tokens / session",
};

export function TrialStatusBanner() {
    const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
    const [showSales, setShowSales] = useState(false);
    const [requestSent, setRequestSent] = useState(false);

    useEffect(() => {
        api.getCurrentSubscription().then(setSubscription).catch(() => {});
    }, []);

    if (!subscription || subscription.mode === "legacy" || subscription.status === "active") return null;
    const expired = !subscription.is_operational;

    return (
        <section className={`${expired ? "bg-rose-600" : "bg-indigo-600"} text-white px-4 py-3 shadow-sm`}>
            <div className="max-w-7xl mx-auto flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-white/15 p-2 mt-0.5">
                        {expired ? <Clock3 size={18} /> : <Sparkles size={18} />}
                    </div>
                    <div>
                        <p className="font-semibold text-sm">
                            {expired ? "Your free trial has ended" : `${subscription.days_remaining ?? 0} days left in your free trial`}
                        </p>
                        <p className="text-xs text-white/80 mt-0.5">
                            {expired ? "Your data is safe. Contact us to restore queue operations." : "Explore Q4Queue with your trial allowances."}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {!expired && Object.values(subscription.entitlements).filter(item => item.used != null).map(item => (
                        <span key={item.key} className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-medium">
                            {labels[item.key] || item.key}: {item.used}/{item.limit ?? "∞"}
                        </span>
                    ))}
                    <button onClick={() => setShowSales(true)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50">
                        {requestSent ? "Request sent" : "Contact sales"}
                    </button>
                </div>
            </div>
            {showSales && <ContactSalesModal mode="authenticated" onClose={() => setShowSales(false)} onSubmitted={() => setRequestSent(true)} />}
        </section>
    );
}
