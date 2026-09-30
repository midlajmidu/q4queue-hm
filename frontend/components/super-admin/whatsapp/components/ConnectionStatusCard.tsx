import React from "react";
import type { WhatsAppConfig } from "@/types/api";

export function ConnectionStatusCard({ config }: { config: WhatsAppConfig | null }) {
    const connected = config?.status === "connected";
    return (
        <div className="wa-card">
            <h3 className="wa-card-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#25d366" }}>
                    <path fillRule="evenodd" clipRule="evenodd" d="M12.012 2C6.49 2 2 6.49 2 12.013c0 1.764.462 3.428 1.258 4.887L2 22l5.244-1.219a9.96 9.96 0 004.768 1.218h.004c5.52 0 10.01-4.488 10.01-10.009S17.534 2 12.012 2zm4.57 14.082c-.25-.125-1.482-.733-1.713-.816-.23-.084-.397-.126-.566.125-.168.252-.647.817-.792.984-.146.168-.293.188-.543.063a6.83 6.83 0 01-2.008-1.24 7.55 7.55 0 01-1.393-1.737c-.146-.252-.016-.388.11-.513.113-.112.25-.292.376-.439.125-.147.167-.251.25-.418.084-.168.042-.315-.021-.44-.063-.125-.565-1.36-.774-1.864-.203-.49-.408-.423-.566-.431-.146-.008-.313-.01-.48-.01a.92.92 0 00-.668.314c-.23.25-.878.858-.878 2.093 0 1.234.9 2.427 1.025 2.594.126.167 1.766 2.695 4.28 3.778 1.543.663 2.164.717 2.946.602.868-.126 2.673-1.09 3.05-2.146.376-1.055.376-1.956.262-2.145-.115-.188-.43-.303-.68-.428z" />
                </svg>
                Connection Status
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                    { label: "API Status", value: config ? config.status : "Not configured", ok: connected },
                    { label: "Business Verified", value: config?.business_verified ? "Yes" : "No", ok: config?.business_verified },
                    { label: "Webhook Active", value: config?.webhook_active ? "Active" : "Not set", ok: config?.webhook_active },
                    { label: "Payment Active", value: config?.payment_active ? "Active" : "Not set", ok: config?.payment_active },
                ].map(({ label, value, ok }) => (
                    <div key={label} className="wa-status-item">
                        <span className="wa-status-dot" style={{ background: ok ? "#34d399" : "#f87171" }} />
                        <div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
                            <div style={{ fontSize: 13, color: ok ? "#e2e8f0" : "#94a3b8", fontWeight: 500 }}>{String(value)}</div>
                        </div>
                    </div>
                ))}
            </div>
            {config?.phone_number_id && (
                <div style={{ marginTop: 12, fontSize: 12, color: "#64748b", borderTop: "1px solid #1e293b", paddingTop: 10 }}>
                    Phone ID: <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{config.phone_number_id}</span>
                </div>
            )}
        </div>
    );
}
