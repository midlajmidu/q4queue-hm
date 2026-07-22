"use client";

import { CallLogsSection } from "@/components/dashboard/CallLogsSection";

export function CallLogsPortal() {
    return (
        <div className="w-full pb-12 animate-in fade-in duration-300">
            <CallLogsSection />
        </div>
    );
}
