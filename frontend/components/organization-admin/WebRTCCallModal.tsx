"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    Phone,
    Mic,
    MicOff,
    Delete,
} from "lucide-react";
import { api } from "@/lib/api";

interface WebRTCCallModalProps {
    isOpen: boolean;
    onClose: () => void;
    tokenNumber: string;
    customerPhone: string;
    customerName?: string;
    queueId?: string;
    sessionId?: string;
    tokenId?: string;
    organizationId?: string;
}

export default function WebRTCCallModal({
    isOpen,
    onClose,
    tokenNumber,
    customerPhone,
    customerName,
    queueId,
    sessionId,
    tokenId,
    organizationId,
}: WebRTCCallModalProps) {
    const [status, setStatus] = useState<string>("Connecting");
    const [callDuration, setCallDuration] = useState<number>(0);
    const durationRef = useRef<number>(0);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [showKeypad, setShowKeypad] = useState<boolean>(false);
    const [dtmfDigits, setDtmfDigits] = useState<string>("");
    const plivoClientRef = useRef<any>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isCallingRef = useRef<boolean>(false);
    const isCleaningUpRef = useRef<boolean>(false);

    // Format seconds to clean MM:SS
    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const hasLoggedRef = useRef<boolean>(false);
    const callStartTimeRef = useRef<number>(0);

    const saveCallRecord = useCallback(async () => {
        if (hasLoggedRef.current) return;
        hasLoggedRef.current = true;

        let duration = durationRef.current;
        if (duration === 0 && callStartTimeRef.current > 0) {
            duration = Math.max(1, Math.round((Date.now() - callStartTimeRef.current) / 1000));
        }

        try {
            await api.logCall({
                organization_id: organizationId || undefined,
                queue_id: queueId || undefined,
                session_id: sessionId || undefined,
                token_id: tokenId || undefined,
                customer_name: customerName || undefined,
                customer_phone: customerPhone,
                duration_seconds: duration,
            });
            console.log("Call logged successfully, duration_seconds:", duration);
        } catch (err) {
            console.error("Failed to log call record:", err);
        }
    }, [organizationId, queueId, sessionId, tokenId, customerName, customerPhone]);

    const cleanupCall = useCallback(async () => {
        // Guard against double-cleanup race condition
        if (isCleaningUpRef.current) return;
        isCleaningUpRef.current = true;

        isCallingRef.current = false;
        if (timerRef.current) clearInterval(timerRef.current);

        await saveCallRecord();

        if (plivoClientRef.current) {
            const client = plivoClientRef.current;
            try {
                // Remove listeners first to prevent race condition callbacks
                client.removeAllListeners('onLogin');
                client.removeAllListeners('onLoginFailed');
                client.removeAllListeners('onCallRemoteRinging');
                client.removeAllListeners('onCallAnswered');
                client.removeAllListeners('onCallFailed');
                client.removeAllListeners('onCallTerminated');

                if (client.callSession) {
                    const originalConsoleError = console.error;
                    console.error = (...args: any[]) => {
                        const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(" ");
                        if (msg.includes("Outgoing call failed: Canceled") || msg.includes("Canceled")) {
                            return;
                        }
                        originalConsoleError.apply(console, args);
                    };

                    try {
                        client.hangup();
                    } catch (hangupErr) {
                        // ignore benign hangup error
                    } finally {
                        setTimeout(() => {
                            console.error = originalConsoleError;
                        }, 500);
                    }
                }
            } catch (e) {
                console.error("Cleanup error:", e);
            }
        }
        setIsConnected(false);
        setIsMuted(false);
        setShowKeypad(false);
        setDtmfDigits("");
        setCallDuration(0);
        durationRef.current = 0;
        callStartTimeRef.current = 0;
        setStatus("Disconnected");

        onClose();
        // Reset for next open
        setStatus("Connecting");
        isCleaningUpRef.current = false;
    }, [onClose, saveCallRecord]);

    const toggleMute = () => {
        if (!plivoClientRef.current) return;
        try {
            if (isMuted) {
                plivoClientRef.current.unmute?.();
                setIsMuted(false);
            } else {
                plivoClientRef.current.mute?.();
                setIsMuted(true);
            }
        } catch (e) {
            console.warn("Mute error:", e);
        }
    };

    const sendDTMF = (digit: string) => {
        if (!plivoClientRef.current) return;
        try {
            plivoClientRef.current.sendDigits?.(digit);
            setDtmfDigits((prev) => prev + digit);
        } catch (e) {
            console.warn("DTMF error:", e);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        setStatus("Connecting");
        setCallDuration(0);
        durationRef.current = 0;
        callStartTimeRef.current = Date.now();
        setIsMuted(false);
        setShowKeypad(false);
        setDtmfDigits("");
        isCleaningUpRef.current = false;

        const handleHungUp = (e: CustomEvent) => {
            const payload = e.detail;
            if (payload && payload.customer_phone === customerPhone) {
                setStatus("Call Ended");
                setTimeout(() => cleanupCall(), 1200);
            }
        };
        window.addEventListener("plivo_call_hung_up", handleHungUp as any);

        hasLoggedRef.current = false;
        setIsConnected(false);

        let script = document.getElementById("plivo-webrtc-sdk") as HTMLScriptElement;

        const initPlivo = async () => {
            if (!(window as any).Plivo) {
                setStatus("Unavailable");
                return;
            }

            try {
                setStatus("Connecting");
                const res = await api.getPlivoWebRTCToken();
                const { username, password } = res;

                let plivo = (window as any).plivoBrowserSdk;
                if (!plivo) {
                    plivo = new (window as any).Plivo({
                        debug: "INFO",
                        permOnClick: true,
                    });
                    (window as any).plivoBrowserSdk = plivo;
                }
                const client = plivo.client;
                plivoClientRef.current = client;

                client.on('onLogin', () => {
                    if (isCallingRef.current) return;
                    isCallingRef.current = true;

                    setStatus("Dialing");
                    callStartTimeRef.current = Date.now();
                    client.call(customerPhone, {
                        extraHeaders: {
                            'X-PH-OrgId': organizationId || queueId || "00000000-0000-0000-0000-000000000000",
                            'X-PH-QueueId': queueId || "",
                            'X-PH-SessionId': sessionId || "",
                            'X-PH-TokenId': tokenId || ""
                        }
                    });
                });

                client.on('onLoginFailed', () => {
                    setStatus("Failed");
                });

                client.on('onCallRemoteRinging', () => {
                    setStatus("Ringing");
                });

                client.on('onCallAnswered', () => {
                    setStatus("Connected");
                    setIsConnected(true);
                    callStartTimeRef.current = Date.now();

                    if (timerRef.current) clearInterval(timerRef.current);
                    timerRef.current = setInterval(() => {
                        durationRef.current += 1;
                        setCallDuration(durationRef.current);
                    }, 1000);
                });

                client.on('onCallFailed', (cause: any) => {
                    setStatus(`Failed: ${cause}`);
                    setTimeout(() => cleanupCall(), 1800);
                });

                client.on('onCallTerminated', () => {
                    cleanupCall();
                });

                if (client.isLoggedIn) {
                    if (isCallingRef.current) return;
                    isCallingRef.current = true;
                    setStatus("Dialing");
                    callStartTimeRef.current = Date.now();
                    client.call(customerPhone, {
                        extraHeaders: {
                            'X-PH-OrgId': organizationId || queueId || "00000000-0000-0000-0000-000000000000",
                            'X-PH-QueueId': queueId || "",
                            'X-PH-SessionId': sessionId || "",
                            'X-PH-TokenId': tokenId || ""
                        }
                    });
                } else {
                    client.login(username, password);
                }

            } catch (error) {
                console.error("WebRTC Error:", error);
                setStatus("Error");
            }
        };

        if (!script) {
            script = document.createElement("script");
            script.id = "plivo-webrtc-sdk";
            script.src = "https://cdn.plivo.com/sdk/browser/v2/plivo.min.js";
            script.async = true;
            script.onload = initPlivo;
            document.body.appendChild(script);
        } else {
            initPlivo();
        }

        return () => {
            window.removeEventListener("plivo_call_hung_up", handleHungUp as any);
            if (timerRef.current) clearInterval(timerRef.current);
            if (plivoClientRef.current) {
                const client = plivoClientRef.current;
                try {
                    client.removeAllListeners('onLogin');
                    client.removeAllListeners('onLoginFailed');
                    client.removeAllListeners('onCallRemoteRinging');
                    client.removeAllListeners('onCallAnswered');
                    client.removeAllListeners('onCallFailed');
                    client.removeAllListeners('onCallTerminated');
                } catch (e) { }
            }
        };
    }, [isOpen, customerPhone]);

    if (!isOpen) return null;

    // Display helpers
    const displayName = customerName?.trim() || `Customer (${tokenNumber})`;
    const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || tokenNumber.substring(0, 2).toUpperCase();

    const isRinging = status.toLowerCase().includes("ringing");
    const isDialing = status.toLowerCase().includes("dialing") || status.toLowerCase().includes("connecting");
    const isFailed = status.toLowerCase().includes("failed") || status.toLowerCase().includes("error");

    const statusLabel = isConnected
        ? "Connected"
        : isRinging
        ? "Ringing"
        : isDialing
        ? "Dialing"
        : status;

    const statusSubtext = isConnected
        ? "In Call"
        : isRinging
        ? "Ringing"
        : isDialing
        ? "Dialing"
        : status;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div
                className="relative w-full max-w-[380px] rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl text-white overflow-hidden"
                style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-0">
                    {/* Status indicator */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        <span
                            className={`w-1.5 h-1.5 rounded-full ${
                                isConnected
                                    ? "bg-emerald-500"
                                    : isRinging
                                    ? "bg-amber-500 animate-pulse"
                                    : isFailed
                                    ? "bg-red-500"
                                    : "bg-zinc-400 animate-pulse"
                            }`}
                        />
                        <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
                            {statusLabel}
                        </span>
                    </div>

                    {/* Avatar */}
                    <div className="flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-semibold select-none">
                            {initials}
                        </div>

                        {/* Name */}
                        <h2 className="text-xl font-semibold text-white mt-4 text-center">
                            {displayName}
                        </h2>

                        {/* Phone */}
                        <p className="text-sm text-zinc-400 mt-1 text-center">
                            {customerPhone}
                        </p>
                    </div>
                </div>

                {/* Timer / Keypad area */}
                <div className="px-6 py-6">
                    {showKeypad ? (
                        <div className="space-y-3">
                            {/* DTMF Digit Display */}
                            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700/50 min-h-[44px]">
                                <span className="text-xl font-mono tabular-nums text-white tracking-widest flex-1 text-center truncate">
                                    {dtmfDigits || <span className="text-zinc-600 text-sm font-sans tracking-normal">Press keys to dial</span>}
                                </span>
                                {dtmfDigits && (
                                    <button
                                        onClick={() => setDtmfDigits((prev) => prev.slice(0, -1))}
                                        className="ml-2 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors cursor-pointer"
                                        title="Delete last digit"
                                    >
                                        <Delete size={18} />
                                    </button>
                                )}
                            </div>

                            {/* Keypad Grid */}
                            <div className="grid grid-cols-3 gap-1.5">
                                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((digit) => (
                                    <button
                                        key={digit}
                                        onClick={() => sendDTMF(digit)}
                                        className="h-14 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 active:scale-95 text-white text-lg font-medium flex items-center justify-center transition-all cursor-pointer select-none"
                                    >
                                        {digit}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-4">
                            {/* Timer */}
                            <div className="text-3xl font-mono tabular-nums text-white font-medium">
                                {formatDuration(callDuration)}
                            </div>

                            {/* Status subtext */}
                            <div className="text-xs uppercase tracking-wider text-zinc-500 mt-1.5">
                                {statusSubtext}
                            </div>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-10 px-6 pb-8">
                    {/* Mute */}
                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            onClick={toggleMute}
                            disabled={!isConnected}
                            title={isMuted ? "Unmute" : "Mute"}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                                isMuted
                                    ? "bg-white text-zinc-900"
                                    : "bg-zinc-800 hover:bg-zinc-700 text-white"
                            }`}
                        >
                            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <span className="text-[11px] text-zinc-500">
                            {isMuted ? "Unmute" : "Mute"}
                        </span>
                    </div>

                    {/* End Call */}
                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            onClick={cleanupCall}
                            title="End Call"
                            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-400 active:scale-95 flex items-center justify-center transition-all cursor-pointer text-white"
                        >
                            <Phone size={22} className="text-white fill-white rotate-[135deg]" />
                        </button>
                        <span className="text-[11px] text-zinc-500">
                            End
                        </span>
                    </div>

                    {/* Keypad */}
                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            onClick={() => setShowKeypad(!showKeypad)}
                            disabled={!isConnected}
                            title="Keypad"
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                                showKeypad
                                    ? "bg-white text-zinc-900"
                                    : "bg-zinc-800 hover:bg-zinc-700 text-white"
                            }`}
                        >
                            <div className="grid grid-cols-3 gap-[3px] w-4 h-4 items-center justify-items-center">
                                {Array.from({ length: 9 }).map((_, i) => (
                                    <span key={i} className={`w-1 h-1 rounded-full ${showKeypad ? "bg-zinc-900" : "bg-zinc-300"}`} />
                                ))}
                            </div>
                        </button>
                        <span className="text-[11px] text-zinc-500">
                            Keypad
                        </span>
                    </div>
                </div>

                {/* Hidden Audio Elements for Plivo WebRTC */}
                <audio id="ui-speaker" autoPlay style={{ display: "none" }}></audio>
                <audio id="ui-ringtone" autoPlay style={{ display: "none" }}></audio>
            </div>
        </div>
    );
}
