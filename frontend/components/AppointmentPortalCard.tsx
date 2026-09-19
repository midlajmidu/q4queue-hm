"use client";

import React, { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import {
    Link2,
    Copy,
    Check,
    ExternalLink,
    QrCode,
    X,
    Download
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AppointmentPortalCardProps {
    className?: string;
    variant?: "full" | "compact";
}

export default function AppointmentPortalCard({
    className = "",
}: AppointmentPortalCardProps) {
    const params = useParams();
    const { user } = useAuth();
    const orgSlug = (params?.orgSlug as string) || (params?.branchSlug as string) || user?.org_slug || "";

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const normalizedAppUrl = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
    const bookingUrl = orgSlug ? `${normalizedAppUrl}/${orgSlug}/book` : `${normalizedAppUrl}/book`;

    const [copied, setCopied] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const qrCanvasRef = useRef<HTMLDivElement>(null);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(bookingUrl);
            setCopied(true);
            toast.success("Booking link copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy link");
        }
    };

    const handleDownloadQR = () => {
        const qrCanvas = qrCanvasRef.current?.querySelector("canvas");
        if (!qrCanvas) return;

        const qrSize = qrCanvas.width;
        const paddingBottom = 40;
        const canvas = document.createElement("canvas");
        canvas.width = qrSize;
        canvas.height = qrSize + paddingBottom;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // White background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(qrCanvas, 0, 0);

        // Watermark / label
        ctx.textAlign = "center";
        ctx.font = "bold 13px Inter, system-ui, sans-serif";
        ctx.fillStyle = "#1e293b";
        ctx.fillText("Book Appointments • Q4QUEUE", canvas.width / 2, qrSize + 24);

        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `Appointment_Booking_QR_${orgSlug || "branch"}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("QR code image downloaded!");
    };

    return (
        <>
            <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs ${className}`}
            >
                {/* Left: Link indicator and URL */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Link2 className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0 hidden md:inline">
                            Customer Booking Link:
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0 md:hidden">
                            Link:
                        </span>
                        <div className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 min-w-0 max-w-full sm:max-w-md truncate">
                            <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold truncate block select-all">
                                {bookingUrl}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200/80 dark:border-white/10 transition-colors cursor-pointer"
                        title="Copy link"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                        <span>{copied ? "Copied" : "Copy Link"}</span>
                    </button>

                    <a
                        href={bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200/80 dark:border-white/10 transition-colors"
                        title="Open portal in new tab"
                    >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        <span>Open Portal</span>
                    </a>

                    <button
                        type="button"
                        onClick={() => setShowQrModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs shadow-indigo-600/20 transition-all cursor-pointer"
                        title="View QR Code"
                    >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Code</span>
                    </button>
                </div>
            </div>

            {/* QR Code Modal */}
            {showQrModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
                        onClick={() => setShowQrModal(false)}
                    />
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center z-10 animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowQrModal(false)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                            <QrCode className="w-5 h-5" />
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                            Appointment Booking QR
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                            Scan to open the public appointment scheduling page on any smartphone.
                        </p>

                        <div
                            ref={qrCanvasRef}
                            className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-white/10 mb-4 flex items-center justify-center"
                        >
                            <div className="bg-white p-3 rounded-xl shadow-md">
                                <QRCodeCanvas
                                    value={bookingUrl}
                                    size={200}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>
                        </div>

                        <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mb-5 px-2">
                            {bookingUrl}
                        </p>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleDownloadQR}
                                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download PNG</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                <span>{copied ? "Copied" : "Copy"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
