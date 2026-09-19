"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

function BookIndexContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    useEffect(() => {
        const query = searchParams.toString();
        const suffix = query ? `?${query}` : "";
        if (user?.org_slug) {
            router.replace(`/${user.org_slug}/book${suffix}`);
        } else {
            router.replace(`/login${suffix}`);
        }
    }, [user, router, searchParams]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="flex flex-col items-center gap-3">
                <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Redirecting to booking portal...
                </p>
            </div>
        </div>
    );
}

export default function BookIndexRedirect() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <BookIndexContent />
        </Suspense>
    );
}
