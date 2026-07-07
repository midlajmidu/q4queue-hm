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

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const canvas = qrRef.current?.querySelector("canvas");
        if (canvas) {
            const url = canvas.toDataURL("image/png");
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
        const canvas = qrRef.current?.querySelector("canvas");
        if (canvas) {
            const url = canvas.toDataURL("image/png");
            const win = window.open();
            if (win) {
                win.document.write(`<html><body style="margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#f8fafc;"><img src="${url}" style="max-width:90%;max-height:90%;border-radius:1rem;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);" /></body></html>`);
            }
        }
    };

    if (!joinUrl) return null;

    return (
        <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
            {isCollapsible ? (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none"
                    aria-expanded={isExpanded}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">Join Queue QR Code</span>
                    </div>
                    <svg
                        className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            ) : (
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Queue QR Code</h2>
                    <p className="text-sm text-gray-500">Scan to join the {queueName} queue</p>
                </div>
            )}

            <div className={`transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
                <div className={`p-6 flex flex-col items-center ${isCollapsible ? "border-t border-gray-100" : ""}`}>
                    {/* Removed duplicated scan instruction */}

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4 flex justify-center w-full" ref={qrRef}>
                        <QRCodeCanvas
                            value={joinUrl}
                            size={220}
                            level={"H"}
                            includeMargin={true}
                        />
                    </div>

                    <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline mb-4 truncate w-full max-w-[250px] text-center opacity-80 transition-colors" title={joinUrl}>
                        {joinUrl}
                    </a>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={handleOpenQR}
                            className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                            Open QR
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex-1 py-2 px-3 bg-blue-50 text-blue-700 font-medium text-sm rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                            </svg>
                            Download
                        </button>
                    </div>

                    <div className="mt-5 flex items-center justify-center">
                        <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-default">
                            <span className="text-[11px] font-medium text-slate-500">Powered by</span>
                            <span className="font-bold text-slate-800 text-[11px] tracking-wide">Q4QUEUE</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
