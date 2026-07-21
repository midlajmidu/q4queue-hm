"use client";

import React, { useEffect, useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

interface QueueQRCodeProps {
    queueId: string;
    queueName: string;
    isCollapsible?: boolean;
    className?: string;
}

export default function QueueQRCode({ queueId, queueName, isCollapsible = false, className = "" }: QueueQRCodeProps) {
    const [joinUrl, setJoinUrl] = useState("");
    const [isExpanded, setIsExpanded] = useState(!isCollapsible);
    const qrRef = useRef<HTMLDivElement>(null);

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const safeName = queueName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setJoinUrl(`${baseUrl}/join/${safeName}-${queueId}`);
    }, [queueId, queueName, isMounted]);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (joinUrl) {
            navigator.clipboard.writeText(joinUrl);
            alert("Join URL copied to clipboard!");
        }
    };

    const generateWatermarkedQRUrl = (): string | null => {
        const qrCanvas = qrRef.current?.querySelector("canvas");
        if (!qrCanvas) return null;

        // If size is 220, and pixelRatio is 2, qrSize = 440
        const qrSize = qrCanvas.width;
        
        // Scale ratio based on a base size of 220
        const scale = qrSize / 220; 
        
        const paddingBottom = 30 * scale; 
        
        const canvas = document.createElement("canvas");
        canvas.width = qrSize;
        canvas.height = qrSize + paddingBottom;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) return null;

        // Fill white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw original QR code
        ctx.drawImage(qrCanvas, 0, 0);

        // Draw text
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        
        const fontSize = 11 * scale;
        const textY = qrSize + (paddingBottom / 2) - (2 * scale);

        const text1 = "Powered by ";
        const text2 = "Q4QUEUE";
        
        ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
        const metrics1 = ctx.measureText(text1);
        
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
        const metrics2 = ctx.measureText(text2);
        
        const totalWidth = metrics1.width + metrics2.width;
        const startX = (canvas.width - totalWidth) / 2;
        
        ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = "#64748b";
        ctx.fillText(text1, startX, textY);
        
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = "#1e293b";
        ctx.fillText(text2, startX + metrics1.width, textY);
        
        return canvas.toDataURL("image/png");
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = generateWatermarkedQRUrl();
        if (url) {
            const a = document.createElement("a");
            a.href = url;
            a.download = `Queue_${queueName}_QR.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const handleOpenQR = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = generateWatermarkedQRUrl();
        if (url) {
            const win = window.open();
            if (win) {
                win.document.write(`<html><body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#f8fafc;"><img src="${url}" style="max-width:90%;max-height:90%;border-radius:1rem;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);" /></body></html>`);
            }
        }
    };

    if (!joinUrl) return null;

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden ${className}`}>
            {isCollapsible ? (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                    aria-expanded={isExpanded}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/60 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">Join Queue QR Code</span>
                    </div>
                    <svg
                        className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            ) : (
                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Queue QR Code</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Scan to join the {queueName} queue</p>
                </div>
            )}

            <div className={`transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
                <div className={`p-6 flex flex-col items-center ${isCollapsible ? "border-t border-slate-100 dark:border-white/10" : ""}`}>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-white/10 mb-4 flex items-center justify-center w-full" ref={qrRef}>
                        <div className="bg-white p-3.5 rounded-xl shadow-md flex items-center justify-center">
                            <QRCodeCanvas
                                value={joinUrl}
                                size={200}
                                level={"H"}
                                includeMargin={false}
                            />
                        </div>
                    </div>

                    <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline mb-4 truncate w-full max-w-[250px] text-center opacity-90 transition-colors" title={joinUrl}>
                        {joinUrl}
                    </a>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={handleOpenQR}
                            className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                            Open QR
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex-1 py-2 px-3 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium text-sm rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                            </svg>
                            Download
                        </button>
                    </div>

                    <div className="mt-5 flex items-center justify-center">
                        <div className="flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity cursor-default">
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Powered by</span>
                            <span className="font-bold text-slate-800 dark:text-white text-[11px] tracking-wide">Q4QUEUE</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
