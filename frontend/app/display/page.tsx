"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { config } from "@/lib/config";
import Image from "next/image";

export default function SmartTVPairingPage() {
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
                            router.push(`/display/${data.queue_id}`);
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
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
            {/* Background design */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
                <div className="absolute w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            </div>

            <div className="z-10 flex flex-col items-center max-w-2xl text-center">
                <div className="mb-12 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-600/20">Q</div>
                    <span className="text-3xl font-bold tracking-tight text-white">Q4Queue</span>
                </div>

                <div className="bg-white/5 border border-white/10 p-12 rounded-3xl backdrop-blur-md shadow-2xl flex flex-col items-center w-full min-w-[500px]">
                    <h1 className="text-2xl font-semibold text-slate-300 mb-2">Connect Smart TV</h1>
                    <p className="text-slate-400 mb-10 text-sm">Open the Queue Dashboard on your computer and enter this code.</p>

                    {status === "generating" ? (
                        <div className="h-[120px] flex flex-col items-center justify-center gap-4">
                            <div className="w-8 h-8 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
                            <span className="text-slate-400 text-sm animate-pulse">Generating code...</span>
                        </div>
                    ) : status === "expired" ? (
                        <div className="h-[120px] flex flex-col items-center justify-center gap-4">
                            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-red-400 text-sm">Pairing code expired. Generating new code...</span>
                        </div>
                    ) : status === "paired" ? (
                        <div className="h-[120px] flex flex-col items-center justify-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="text-emerald-400 font-semibold tracking-wide">Connected! Redirecting...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="tracking-[0.25em] text-7xl font-black text-white bg-white/10 px-10 py-6 rounded-2xl border border-white/20 mb-8 font-mono shadow-inner whitespace-nowrap">
                                {pairingCode}
                            </div>
                            
                            <div className="flex items-center gap-3 bg-blue-500/10 px-5 py-2.5 rounded-full border border-blue-500/20">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                </span>
                                <span className="text-blue-400 text-sm font-medium tracking-wide">Waiting for connection...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {status === "waiting" && (
                <div className="absolute bottom-8 text-slate-500 text-xs font-medium tracking-widest uppercase z-10 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Code expires in {Math.floor(expiresIn / 60)}:{(expiresIn % 60).toString().padStart(2, '0')}
                </div>
            )}
        </div>
    );
}
