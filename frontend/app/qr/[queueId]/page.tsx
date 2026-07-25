"use client";

import React, { useEffect, useState } from "react";
import { use } from "react";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import { QRCodeCanvas } from "qrcode.react";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";
import { getSystemTime, getQueueQrConfig } from "@/lib/api";

const totp = new TOTP({
    period: 15,
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin(),
});

export default function QrShowcaseDisplayPage({ params }: { params: Promise<{ queueId: string }> }) {
    const rawQueueId = use(params).queueId;
    const queueId = rawQueueId.length >= 36 ? rawQueueId.slice(-36) : rawQueueId;

    const { state: queueData, status } = useQueueSocket(queueId);

    const [joinUrl, setJoinUrl] = useState("");
    const [timeLeft, setTimeLeft] = useState(15);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted || !queueId) return;

        let isCancelled = false;
        let timerId: NodeJS.Timeout | null = null;

        const initAndStartTotp = async () => {
            try {
                const [{ server_time }, { qr_secret_seed }] = await Promise.all([
                    getSystemTime().catch(() => ({ server_time: Math.floor(Date.now() / 1000) })),
                    getQueueQrConfig(queueId),
                ]);

                if (isCancelled) return;

                const timeOffset = server_time * 1000 - Date.now();

                const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                const normalizedAppUrl = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;

                const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
                const normalizedApiUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl;

                let fullApiUrl = normalizedApiUrl;
                if (!normalizedApiUrl.startsWith("http")) {
                    fullApiUrl = normalizedAppUrl + normalizedApiUrl;
                }

                const updateCode = async () => {
                    const nowWithOffset = Date.now() + timeOffset;
                    const seconds = Math.floor(nowWithOffset / 1000);
                    const remaining = 15 - (seconds % 15);
                    setTimeLeft(remaining);

                    try {
                        const token = await totp.generate({ secret: qr_secret_seed, epoch: seconds });
                        const fullUrl = `${fullApiUrl}/queues/${queueId}/scan?totp=${token}`;
                        setJoinUrl(fullUrl);
                    } catch (err) {
                        console.error("Failed to generate TOTP:", err);
                    }
                };

                await updateCode();
                timerId = setInterval(updateCode, 1000);
            } catch (error) {
                console.error("Failed to initialize dynamic QR code:", error);
            }
        };

        initAndStartTotp();

        return () => {
            isCancelled = true;
            if (timerId) clearInterval(timerId);
        };
    }, [queueId, isMounted]);




    // ── Loading state ──
    if ((status === "connecting" || status === "disconnected") && !queueData) {
        return (
            <div className="qr-showcase-page qr-showcase-loading">
                <Loader2 className="qr-showcase-spinner" />
                <p className="qr-showcase-loading-text">Connecting to queue...</p>
            </div>
        );
    }

    // ── Error state ──
    if (status === "disconnected" && !queueData) {
        return (
            <div className="qr-showcase-page qr-showcase-loading">
                <div className="qr-showcase-error-icon">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="qr-showcase-error-title">Connection Error</h2>
                <p className="qr-showcase-error-desc">Unable to connect to the queue. Please check your network.</p>
            </div>
        );
    }

    if (!queueData || !joinUrl) return null;

    const queueName = queueData.queue_name || "Queue";
    const prefix = queueData.prefix || "";
    const waitingCount = queueData.waiting_count ?? 0;

    return (
        <>
            <style>{`
                .qr-showcase-page {
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: #ffffff;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    padding: 32px 24px;
                    position: relative;
                    overflow: hidden;
                }

                /* Subtle background pattern */
                .qr-showcase-page::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background:
                        radial-gradient(circle at 15% 85%, rgba(99,102,241,0.04) 0%, transparent 50%),
                        radial-gradient(circle at 85% 15%, rgba(99,102,241,0.03) 0%, transparent 50%);
                    pointer-events: none;
                }

                .qr-showcase-loading {
                    gap: 16px;
                    color: #64748b;
                }

                .qr-showcase-spinner {
                    width: 40px;
                    height: 40px;
                    color: #6366f1;
                    animation: spin 1s linear infinite;
                }

                .qr-showcase-loading-text {
                    font-size: 15px;
                    font-weight: 500;
                    color: #94a3b8;
                }

                .qr-showcase-error-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: #fef2f2;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #ef4444;
                    margin-bottom: 8px;
                }

                .qr-showcase-error-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0;
                }

                .qr-showcase-error-desc {
                    font-size: 14px;
                    color: #94a3b8;
                    margin: 8px 0 0;
                    text-align: center;
                    max-width: 320px;
                }

                /* ── Main Content ── */
                .qr-showcase-content {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100%;
                    max-width: 420px;
                }

                /* ── Header: queue name + badge ── */
                .qr-showcase-header {
                    text-align: center;
                    margin-bottom: 36px;
                }

                .qr-showcase-queue-name {
                    font-size: 28px;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0;
                    letter-spacing: -0.02em;
                    line-height: 1.2;
                }

                .qr-showcase-badges {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    margin-top: 14px;
                    flex-wrap: wrap;
                }

                .qr-showcase-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 5px 14px;
                    border-radius: 100px;
                    font-size: 12px;
                    font-weight: 600;
                    letter-spacing: 0.03em;
                }

                .qr-showcase-badge-active {
                    background: #ecfdf5;
                    color: #059669;
                }

                .qr-showcase-badge-active::before {
                    content: '';
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #10b981;
                    animation: pulse-dot 2s ease-in-out infinite;
                }

                .qr-showcase-badge-waiting {
                    background: #f1f5f9;
                    color: #475569;
                }

                .qr-showcase-badge-prefix {
                    background: #eef2ff;
                    color: #4f46e5;
                    font-weight: 700;
                    font-family: 'SF Mono', 'Fira Code', monospace;
                    letter-spacing: 0.08em;
                }

                @keyframes pulse-dot {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }

                /* ── QR Card ── */
                .qr-showcase-card {
                    width: 100%;
                    background: #ffffff;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 24px;
                    padding: 40px 32px 32px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    box-shadow:
                        0 1px 3px rgba(0,0,0,0.04),
                        0 8px 32px rgba(0,0,0,0.06);
                }

                .qr-showcase-qr-frame {
                    background: #f8fafc;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }

                /* Corner accent dots */
                .qr-showcase-qr-frame::before,
                .qr-showcase-qr-frame::after {
                    content: '';
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #6366f1;
                    opacity: 0.25;
                }
                .qr-showcase-qr-frame::before { top: 10px; left: 10px; }
                .qr-showcase-qr-frame::after { bottom: 10px; right: 10px; }

                .qr-showcase-qr-inner {
                    background: #ffffff;
                    border-radius: 14px;
                    padding: 16px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                }

                .qr-showcase-instruction {
                    margin-top: 28px;
                    text-align: center;
                }

                .qr-showcase-instruction-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0 0 6px;
                }

                .qr-showcase-instruction-desc {
                    font-size: 13px;
                    color: #94a3b8;
                    margin: 0;
                    line-height: 1.5;
                }

                /* ── Footer ── */
                .qr-showcase-footer {
                    margin-top: 56px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .qr-showcase-footer img {
                    height: 22px;
                    width: auto;
                    object-fit: contain;
                }

                /* ── Time ── */
                .qr-showcase-time {
                    position: absolute;
                    top: 20px;
                    right: 24px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #cbd5e1;
                    font-variant-numeric: tabular-nums;
                    z-index: 2;
                }

                /* ── Responsive ── */
                @media (min-width: 640px) {
                    .qr-showcase-queue-name {
                        font-size: 34px;
                    }
                    .qr-showcase-card {
                        padding: 48px 40px 40px;
                    }
                    .qr-showcase-qr-frame {
                        padding: 28px;
                    }
                }

                @media (min-width: 768px) {
                    .qr-showcase-queue-name {
                        font-size: 40px;
                    }
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>

            <div className="qr-showcase-page">

                {/* {ThemeToggle && <div style={{ position: 'absolute', top: 20, left: 24, zIndex: 2 }}><ThemeToggle /></div>} */}

                <div className="qr-showcase-content">
                    {/* Header */}
                    <div className="qr-showcase-header">
                        <h1 className="qr-showcase-queue-name">{queueName}</h1>
                        <div className="qr-showcase-badges">
                            <span className="qr-showcase-badge qr-showcase-badge-active">Active</span>
                            {prefix && (
                                <span className="qr-showcase-badge qr-showcase-badge-prefix">{prefix}</span>
                            )}
                            <span className="qr-showcase-badge qr-showcase-badge-waiting">
                                {waitingCount} waiting
                            </span>
                        </div>
                    </div>

                    {/* QR Card */}
                    <div className="qr-showcase-card">
                        <div className="qr-showcase-qr-frame">
                            <div className="qr-showcase-qr-inner">
                                <QRCodeCanvas
                                    value={joinUrl}
                                    size={220}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                        </div>

                        <div className="qr-showcase-instruction">
                            <p className="qr-showcase-instruction-title">Scan to join the queue</p>
                            <p className="qr-showcase-instruction-desc">
                                Open your phone camera and point it at the QR code to get your digital ticket instantly.
                            </p>
                            <div className="mt-4 flex justify-center">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold shadow-xs">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                                    </span>
                                    QR Refreshes In <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-200/80 px-1.5 py-0.5 rounded">{timeLeft}s</span>
                                </span>
                            </div>
                        </div>
                    </div>


                    {/* Footer */}
                    <div className="qr-showcase-footer">
                        <Image
                            src="/logo-main-trimmed.png"
                            alt="Q4Queue"
                            width={300}
                            height={60}
                            priority
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
