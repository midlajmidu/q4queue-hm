"use client";

import { useState } from "react";
import { WhatsAppPortal } from "@/components/organization-admin/WhatsAppPortal";
import { CallLogsSection } from "@/components/dashboard/CallLogsSection";

export default function CommunicationDashboardPage() {
    const [channel, setChannel] = useState<"whatsapp" | "calls">("whatsapp");

    return (
        <div className="w-full animate-in fade-in duration-300">
            {channel === "whatsapp" ? (
                <WhatsAppPortal channel={channel} onChannelChange={setChannel} />
            ) : (
                <CallLogsSection channel={channel} onChannelChange={setChannel} />
            )}
        </div>
    );
}
