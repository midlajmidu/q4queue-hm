"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

export default function QueuesRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [status, setStatus] = useState("Checking for active sessions...");

    useEffect(() => {
        const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";
        
        async function checkTodaySession() {
            try {
                // Check if there is a session for today
                const today = new Date().toISOString().slice(0, 10);
                const res = await api.listSessions(1, 0, today);
                
                if (res.items && res.items.length > 0) {
                    const todaysSession = res.items[0];
                    setStatus("Found today's session, redirecting...");
                    const qs = searchParams.toString();
                    router.replace(`${dashBase}/sessions/${todaysSession.id}/queues${qs ? `?${qs}` : ""}`);
                } else {
                    setStatus("No active session today. Redirecting to sessions list...");
                    const qs = searchParams.toString();
                    router.replace(`${dashBase}/sessions?alert=no_session${qs ? `&${qs}` : ""}`);
                }
            } catch (error) {
                console.error("Failed to check sessions", error);
                router.replace(`${dashBase}/sessions`);
            }
        }

        if (user) {
            checkTodaySession();
        }
    }, [user, router]);

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-10 py-12 text-center max-w-xs w-full">
                <div className="w-10 h-10 border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-5" />
                <p className="text-sm font-semibold text-gray-700 mb-1">Loading Queues</p>
                <p className="text-xs text-gray-400 font-medium leading-relaxed">{status}</p>
            </div>
        </div>
    );
}
