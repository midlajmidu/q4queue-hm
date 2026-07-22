"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { config } from "@/lib/config";
import { QrCode } from "lucide-react";

export default function QrShowcasePairingPage() {
    const router = useRouter();
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<"generating" | "waiting" | "paired" | "expired">("generating");
    const wsRef = useRef<WebSocket | null>(null);
    
    const [expiresIn, setExpiresIn] = useState<number>(300);
    const expireTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const generateCode = async () => {
        setStatus("generating");
        setError(null);
        try {
            const res = await api.generatePairingCode();
            if (res.code) {
                setPairingCode(res.code);
                setStatus("waiting");
            } else {
                throw new Error("Invalid response");
            }
        } catch (err: any) {
            setError(err.message || "Failed to generate pairing code. Retrying...");
            setTimeout(generateCode, 3000);
        }
    };

    useEffect(() => {
        generateCode();
        return () => {
            if (wsRef.current) wsRef.current.close();
            if (expireTimerRef.current) clearInterval(expireTimerRef.current);
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (status === "waiting") {
            setExpiresIn(300);
            if (expireTimerRef.current) clearInterval(expireTimerRef.current);
            expireTimerRef.current = setInterval(() => {
                setExpiresIn(prev => {
                    if (prev <= 1) {
                        setStatus("expired");
                        setPairingCode(null);
                        setTimeout(generateCode, 2000);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (expireTimerRef.current) clearInterval(expireTimerRef.current);
        }
    }, [status, generateCode]);

    useEffect(() => {
        if (!pairingCode || status !== "waiting") return;

        let isReconnecting = false;
        let isPaired = false;
        
        const connectWs = () => {
            const wsUrl = `${config.wsBaseUrl}/pairing/${pairingCode}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("Connected to pairing socket for code:", pairingCode);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.action === "redirect" && data.queue_id) {
                        isPaired = true;
                        setStatus("paired");
                        ws.close();
                        setTimeout(() => {
                            router.push(`/qr/${data.queue_id}`);
                        }, 1500); // 1.5s success delay
                    }
                } catch (err) {
                    console.error("Failed to parse WebSocket message", err);
                }
            };

            ws.onclose = (event) => {
                if (isPaired || isReconnecting) return;
                
                if (event.code === 4404) {
                    setStatus("expired");
                    setPairingCode(null);
                    setTimeout(generateCode, 2000);
                } else {
                    // Reconnect with same code if transient failure
                    reconnectTimerRef.current = setTimeout(() => {
                        if (status === "waiting") {
                            connectWs();
                        }
                    }, 3000);
                }
            };
        };

        connectWs();

        return () => {
            isReconnecting = true;
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        };
    }, [pairingCode, router, status]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] flex flex-col items-center justify-center p-6 sm:p-12 text-slate-900 dark:text-white relative overflow-hidden font-sans">
            <div className="z-10 flex flex-col items-center w-full max-w-xl text-center">
                {/* Brand Logo */}
                <div className="mb-12">
                    <img src="/logo-main-trimmed.png" alt="Q4Queue" className="h-8 opacity-80 dark:hidden" />
                    <img src="/q4queue-darkThemeLogo.png" alt="Q4Queue" className="h-8 opacity-80 hidden dark:block" />
                </div>

                <div className="bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 p-8 sm:p-12 rounded-[2rem] shadow-sm flex flex-col items-center w-full max-w-md backdrop-blur-xl">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                        <QrCode size={32} strokeWidth={1.5} />
                    </div>
                    
                    <h1 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-white mb-2">Connect this Display</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-10 px-4">
                        Open your Dashboard, navigate to <strong className="font-medium text-slate-700 dark:text-slate-300">Pair Showcase Device</strong>, and enter this code.
                    </p>

                    {status === "generating" ? (
                        <div className="h-[120px] flex flex-col items-center justify-center gap-5 w-full">
                            <div className="w-8 h-8 border-[3px] border-slate-100 dark:border-slate-800 border-t-indigo-500 rounded-full animate-spin"></div>
                            <span className="text-slate-400 dark:text-slate-500 text-sm tracking-wide">Generating secure code...</span>
                        </div>
                    ) : status === "expired" ? (
                        <div className="h-[120px] flex flex-col items-center justify-center gap-4 w-full">
                            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-1">
                                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <span className="text-slate-600 dark:text-slate-400 text-sm">Code expired. Generating new...</span>
                        </div>
                    ) : status === "paired" ? (
                        <div className="h-[120px] flex flex-col items-center justify-center gap-4 w-full">
                            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center mb-1 shadow-sm">
                                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="text-slate-800 dark:text-white font-medium tracking-wide">Connected successfully</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center w-full">
                            {/* Segmented PIN Display */}
                            <div className="grid grid-cols-6 gap-2 w-full mb-10">
                                {Array.from({ length: 6 }).map((_, i) => {
                                    const char = pairingCode?.[i] || "";
                                    return (
                                        <div
                                            key={i}
                                            className="h-14 sm:h-16 rounded-xl border border-slate-200/80 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-center font-mono text-2xl sm:text-3xl font-light text-slate-800 dark:text-slate-100 shadow-sm"
                                        >
                                            {char}
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                <span className="text-[13px] font-medium tracking-wide">Ready to pair</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {status === "waiting" && (
                <div className="absolute bottom-10 text-slate-400 dark:text-slate-500 text-xs font-medium tracking-widest uppercase flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Expires in {Math.floor(expiresIn / 60)}:{(expiresIn % 60).toString().padStart(2, '0')}
                </div>
            )}
        </div>
    );
}
