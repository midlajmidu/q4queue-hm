"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AlertCircle } from "lucide-react";

interface PageProps {
    params: Promise<{ queueId: string }>;
}

export default function DirectQueueBookingRedirect({ params }: PageProps) {
    const resolvedParams = use(params);
    const queueId = resolvedParams.queueId;
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!queueId) return;

        api.getPublicQueueBookingInfo(queueId)
            .then((info) => {
                if (info?.org_slug) {
                    router.replace(`/${info.org_slug}/book?queueId=${queueId}`);
                } else {
                    setError("Unable to find branch booking portal for this queue.");
                }
            })
            .catch(() => {
                setError("Queue or service not found. Please check your link or contact reception.");
            });
    }, [queueId, router]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            {error ? (
                <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-white/10 text-center shadow-lg">
                    <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Service Not Found</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{error}</p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        Redirecting to booking portal...
                    </p>
                </div>
            )}
        </div>
    );
}
