"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function SessionsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/organization-admin/monitoring/queues");
    }, [router]);

    return (
        <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
            <LoadingSpinner size="md" />
            <span className="text-sm font-medium">Redirecting to Live Queues...</span>
        </div>
    );
}
