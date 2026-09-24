"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    Phone,
    Mic,
    MicOff,
    Delete,
    X,
    RefreshCw,
    AlertCircle,
    RotateCcw,
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
    appointmentId?: string;
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
    appointmentId,
    organizationId,
}: WebRTCCallModalProps) {
    const [status, setStatus] = useState<string>("Connecting");
    const [callDuration, setCallDuration] = useState<number>(0);
    const durationRef = useRef<number>(0);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [showKeypad, setShowKeypad] = useState<boolean>(false);
    const [dtmfDigits, setDtmfDigits] = useState<string>("");
    const [isMediaDenied, setIsMediaDenied] = useState<boolean>(false);
    const isMediaDeniedRef = useRef<boolean>(false);
    const [isRetryingMic, setIsRetryingMic] = useState<boolean>(false);

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
    const isCalleeAnsweredRef = useRef<boolean>(false);
    const calleeAnswerTimeRef = useRef<number>(0);
    const lastFailureCauseRef = useRef<string | null>(null);

    const saveCallRecord = useCallback(async () => {
        if (hasLoggedRef.current) return;
        hasLoggedRef.current = true;

        const isAnswered = isCalleeAnsweredRef.current;
        let duration = 0;
        let ringDuration = 0;
        let call_status = "no_answer";

        const now = Date.now();
        if (isAnswered) {
            duration = durationRef.current;
            if (duration === 0 && calleeAnswerTimeRef.current > 0) {
                duration = Math.max(1, Math.round((now - calleeAnswerTimeRef.current) / 1000));
            }
            ringDuration = calleeAnswerTimeRef.current > callStartTimeRef.current 
                ? Math.max(0, Math.round((calleeAnswerTimeRef.current - callStartTimeRef.current) / 1000))
                : 0;
            call_status = "completed";
        } else {
            duration = 0;
            ringDuration = callStartTimeRef.current > 0 
                ? Math.max(0, Math.round((now - callStartTimeRef.current) / 1000))
                : 0;

            if (lastFailureCauseRef.current) {
                const c = lastFailureCauseRef.current.toLowerCase();
                if (c.includes("busy")) call_status = "busy";
                else if (c.includes("no answer") || c.includes("timeout")) call_status = "no_answer";
                else call_status = "failed";
            } else {
                call_status = ringDuration < 5 ? "cancelled" : "no_answer";
            }
        }

        try {
            await api.logCall({
                organization_id: organizationId || undefined,
                queue_id: queueId || undefined,
                session_id: sessionId || undefined,
                token_id: tokenId || undefined,
                appointment_id: appointmentId || undefined,
                customer_name: customerName || undefined,
                customer_phone: customerPhone,
                duration_seconds: duration,
                ring_duration_seconds: ringDuration,
                call_status,
            });
            console.log("Call logged successfully:", { duration_seconds: duration, ring_duration_seconds: ringDuration, call_status });
        } catch (err) {
            console.error("Failed to log call record:", err);
        }
    }, [organizationId, queueId, sessionId, tokenId, appointmentId, customerName, customerPhone]);

    const cleanupCall = useCallback(async () => {
        if (isCleaningUpRef.current) return;
        isCleaningUpRef.current = true;

        isCallingRef.current = false;
        if (timerRef.current) clearInterval(timerRef.current);

        // Don't save a phantom failed customer call if it was just a local microphone permission block
        if (!isMediaDeniedRef.current) {
            await saveCallRecord();
        }

        if (plivoClientRef.current) {
            const client = plivoClientRef.current;
            try {
                client.removeAllListeners?.('onLogin');
                client.removeAllListeners?.('onLoginFailed');
                client.removeAllListeners?.('onCallRemoteRinging');
                client.removeAllListeners?.('onCallAnswered');
                client.removeAllListeners?.('onMediaConnected');
                client.removeAllListeners?.('onCallFailed');
                client.removeAllListeners?.('onCallTerminated');
                client.removeAllListeners?.('onMediaPermission');

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
        isCalleeAnsweredRef.current = false;
        calleeAnswerTimeRef.current = 0;
        lastFailureCauseRef.current = null;
        isMediaDeniedRef.current = false;
        setIsMediaDenied(false);
        setStatus("Disconnected");

        onClose();
        setStatus("Connecting");
        isCleaningUpRef.current = false;
    }, [onClose, saveCallRecord]);

    const toggleMute = () => {
        if (!plivoClientRef.current) return;
        try {
            const nextMuted = !isMuted;
            if (nextMuted) {
                if (typeof plivoClientRef.current.mute === "function") {
                    plivoClientRef.current.mute();
                } else if (typeof plivoClientRef.current.callSession?.mute === "function") {
                    plivoClientRef.current.callSession.mute();
                }
                setIsMuted(true);
            } else {
                if (typeof plivoClientRef.current.unmute === "function") {
                    plivoClientRef.current.unmute();
                } else if (typeof plivoClientRef.current.callSession?.unmute === "function") {
                    plivoClientRef.current.callSession.unmute();
                }
                setIsMuted(false);
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

    const markCallConnected = useCallback((callInfo?: any) => {
        if (isCalleeAnsweredRef.current) return;
        console.log("Plivo WebRTC: Remote call answered by callee!", callInfo);
        isCalleeAnsweredRef.current = true;
        calleeAnswerTimeRef.current = Date.now();
        setStatus("Connected");
        setIsConnected(true);

        if (timerRef.current) clearInterval(timerRef.current);
        durationRef.current = 0;
        setCallDuration(0);
        timerRef.current = setInterval(() => {
            durationRef.current += 1;
            setCallDuration(durationRef.current);
        }, 1000);

        if (isMuted) {
            try {
                if (typeof plivoClientRef.current?.mute === "function") {
                    plivoClientRef.current.mute();
                } else if (typeof plivoClientRef.current?.callSession?.mute === "function") {
                    plivoClientRef.current.callSession.mute();
                }
            } catch {}
        }
    }, [isMuted]);

// Utility to normalize Indian & international phone numbers to standard E.164 (+<country_code><number>)
const normalizePhoneE164 = (phone: string): string => {
    if (!phone) return "";
    let clean = phone.replace(/[\s\-\(\)]/g, "");
    if (clean.startsWith("+")) return clean;
    if (clean.startsWith("00")) return "+" + clean.slice(2);
    // 10 digits starting with 6, 7, 8, 9 (standard Indian mobile numbers)
    if (clean.length === 10 && /^[6-9]/.test(clean)) {
        return "+91" + clean;
    }
    // 11 digits starting with 0 followed by 6-9 (e.g. 09539679027)
    if (clean.length === 11 && clean.startsWith("0") && /^[6-9]/.test(clean.slice(1))) {
        return "+91" + clean.slice(1);
    }
    // 12 digits starting with 91 (e.g. 919539679027)
    if (clean.length === 12 && clean.startsWith("91")) {
        return "+" + clean;
    }
    return clean.startsWith("+") ? clean : "+" + clean;
};

    const makePlivoCall = useCallback((client: any) => {
        if (isCallingRef.current) return;
        isCallingRef.current = true;

        const dialedNumber = normalizePhoneE164(customerPhone);
        console.log("Plivo WebRTC: Dialing destination number:", dialedNumber, "Original:", customerPhone);

        setStatus("Dialing");
        callStartTimeRef.current = Date.now();
        isCalleeAnsweredRef.current = false;
        calleeAnswerTimeRef.current = 0;
        try {
            client.call(dialedNumber, {
                extraHeaders: {
                    'X-PH-OrgId': organizationId || queueId || "00000000-0000-0000-0000-000000000000",
                    'X-PH-QueueId': queueId || "",
                    'X-PH-SessionId': sessionId || "",
                    'X-PH-TokenId': tokenId || ""
                }
            });
        } catch (err: any) {
            console.error("Failed to execute client.call:", err);
            isCallingRef.current = false;
            setStatus("Call Error");
        }
    }, [customerPhone, organizationId, queueId, sessionId, tokenId]);

    const initPlivo = useCallback(async () => {
        if (!(window as any).Plivo) {
            setStatus("Unavailable");
            return;
        }

        try {
            // Pre-flight check: Test if microphone access is allowed
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    // Check if permission query reports denied
                    if (navigator.permissions && (navigator.permissions as any).query) {
                        try {
                            const pStatus = await (navigator.permissions as any).query({ name: "microphone" });
                            if (pStatus.state === "denied") {
                                console.warn("Microphone permission explicitly denied by browser");
                                isMediaDeniedRef.current = true;
                                setIsMediaDenied(true);
                                setStatus("Microphone Blocked");
                                return;
                            }
                        } catch {}
                    }

                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach((track) => track.stop());
                    isMediaDeniedRef.current = false;
                    setIsMediaDenied(false);
                } catch (micErr: any) {
                    console.warn("Microphone access pre-check failed:", micErr);
                    isMediaDeniedRef.current = true;
                    setIsMediaDenied(true);
                    setStatus("Microphone Blocked");
                    return;
                }
            }

            setStatus("Connecting");
            const res = await api.getPlivoWebRTCToken();
            const { username, password } = res;

            let plivo = (window as any).plivoBrowserSdk;
            if (!plivo) {
                plivo = new (window as any).Plivo({
                    debug: "INFO",
                    permOnClick: false,
                });
                (window as any).plivoBrowserSdk = plivo;
            }
            const client = plivo.client;
            plivoClientRef.current = client;

            client.removeAllListeners?.('onLogin');
            client.removeAllListeners?.('onLoginFailed');
            client.removeAllListeners?.('onCalling');
            client.removeAllListeners?.('onCallConnected');
            client.removeAllListeners?.('onCallRemoteRinging');
            client.removeAllListeners?.('onCallAnswered');
            client.removeAllListeners?.('onMediaConnected');
            client.removeAllListeners?.('onCallFailed');
            client.removeAllListeners?.('onCallTerminated');
            client.removeAllListeners?.('onMediaPermission');

            client.on('onLogin', () => {
                makePlivoCall(client);
            });

            client.on('onLoginFailed', () => {
                setStatus("Failed");
            });

            client.on('onCalling', () => {
                setStatus("Dialing");
            });

            client.on('onCallConnected', (callInfo: any) => {
                console.log("Plivo onCallConnected (remote ringing started):", callInfo);
                setStatus("Ringing");
            });

            client.on('onCallRemoteRinging', (callInfo: any) => {
                console.log("Plivo onCallRemoteRinging:", callInfo);
                setStatus("Ringing");
            });

            client.on('onMediaConnected', (callInfo: any) => {
                console.log("Plivo onMediaConnected (audio stream ready for ringtone):", callInfo);
                // Early media connects so the agent hears the ringing tone.
                // DO NOT start call timer here — wait until customer actually picks up!
                if (!isCalleeAnsweredRef.current) {
                    setStatus("Ringing");
                }
            });

            client.on('onCallAnswered', (callInfo: any) => {
                console.log("Plivo onCallAnswered (Customer answered):", callInfo);
                markCallConnected(callInfo);
            });

            client.on('onMediaPermission', (event: any) => {
                console.log("Plivo onMediaPermission event:", event);
                if (event && (event.status === 'failure' || event.stream === false)) {
                    isCallingRef.current = false;
                    isMediaDeniedRef.current = true;
                    setIsMediaDenied(true);
                    setStatus("Microphone Blocked");
                } else if (event && event.status === 'success') {
                    isMediaDeniedRef.current = false;
                    setIsMediaDenied(false);
                }
            });

            client.on('onCallFailed', (cause: any) => {
                const causeStr = typeof cause === 'object' ? JSON.stringify(cause) : String(cause || '');
                console.warn("Plivo onCallFailed:", causeStr);
                lastFailureCauseRef.current = causeStr;

                const isMediaFailure =
                    causeStr.toLowerCase().includes("media") ||
                    causeStr.toLowerCase().includes("denied") ||
                    causeStr.toLowerCase().includes("permission") ||
                    causeStr.toLowerCase().includes("notallowed") ||
                    causeStr.toLowerCase().includes("user denied");

                if (isMediaFailure) {
                    isCallingRef.current = false;
                    isMediaDeniedRef.current = true;
                    setIsMediaDenied(true);
                    setStatus("Microphone Blocked");
                    // Keep modal open so user can grant permission and retry
                    return;
                }

                if (causeStr.toLowerCase().includes("busy")) {
                    setStatus("User Busy / Call Rejected");
                } else if (causeStr.toLowerCase().includes("timeout") || causeStr.toLowerCase().includes("no answer")) {
                    setStatus("No Answer");
                } else {
                    setStatus(`Failed: ${typeof cause === 'string' ? cause : 'Call Failed'}`);
                }
                setTimeout(() => {
                    if (!isMediaDeniedRef.current) {
                        cleanupCall();
                    }
                }, 2500);
            });

            client.on('onCallTerminated', () => {
                console.log("Plivo onCallTerminated fired. isMediaDenied:", isMediaDeniedRef.current);
                if (isMediaDeniedRef.current) {
                    // DO NOT close the modal! Keep open for permission guidance
                    return;
                }
                cleanupCall();
            });

            if (client.isLoggedIn) {
                makePlivoCall(client);
            } else {
                client.login(username, password);
            }

        } catch (error: any) {
            console.error("WebRTC Error:", error);
            const msg = error?.response?.data?.detail || error?.detail || error?.message || "";
            if (msg.includes("Free Trial") || error?.response?.status === 403) {
                setStatus("Disabled in Free Trial");
            } else {
                setStatus("Error");
            }
        }
    }, [makePlivoCall, markCallConnected, cleanupCall]);

    // Handle user clicking "Allow Microphone & Retry Call" button
    const handleRetryPermission = async () => {
        setIsRetryingMic(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());
            isMediaDeniedRef.current = false;
            setIsMediaDenied(false);
            setStatus("Connecting");

            if (plivoClientRef.current && plivoClientRef.current.isLoggedIn) {
                isCallingRef.current = false;
                makePlivoCall(plivoClientRef.current);
            } else {
                await initPlivo();
            }
        } catch (err: any) {
            console.warn("Retry microphone permission failed:", err);
            isMediaDeniedRef.current = true;
            setIsMediaDenied(true);
            setStatus("Microphone Blocked");
        } finally {
            setIsRetryingMic(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        setStatus("Connecting");
        isMediaDeniedRef.current = false;
        setIsMediaDenied(false);
        setIsRetryingMic(false);
        setCallDuration(0);
        durationRef.current = 0;
        callStartTimeRef.current = Date.now();
        setIsMuted(false);
        setShowKeypad(false);
        setDtmfDigits("");
        isCleaningUpRef.current = false;
        isCallingRef.current = false;

        // Listen for live permission changes (e.g. user toggles Allow in browser bar)
        if (navigator.permissions && (navigator.permissions as any).query) {
            (navigator.permissions as any).query({ name: "microphone" })
                .then((pStatus: any) => {
                    if (pStatus.state === "denied") {
                        isMediaDeniedRef.current = true;
                        setIsMediaDenied(true);
                        setStatus("Microphone Blocked");
                    }
                    pStatus.onchange = () => {
                        console.log("Live microphone permission change:", pStatus.state);
                        if (pStatus.state === "granted") {
                            isMediaDeniedRef.current = false;
                            setIsMediaDenied(false);
                            setStatus("Connecting");
                            handleRetryPermission();
                        } else if (pStatus.state === "denied") {
                            isMediaDeniedRef.current = true;
                            setIsMediaDenied(true);
                            setStatus("Microphone Blocked");
                        }
                    };
                })
                .catch(() => {});
        }

        const isMatchingPhone = (p1?: string, p2?: string) => {
            if (!p1 || !p2) return false;
            const c1 = p1.replace(/\D/g, "");
            const c2 = p2.replace(/\D/g, "");
            if (!c1 || !c2) return false;
            return c1 === c2 || c1.endsWith(c2) || c2.endsWith(c1);
        };

        const handleHungUp = (e: CustomEvent) => {
            const payload = e.detail;
            if (payload && isMatchingPhone(payload.customer_phone, customerPhone)) {
                setStatus("Call Ended");
                setTimeout(() => cleanupCall(), 1200);
            }
        };

        const handleCalleeAnswered = (e: CustomEvent) => {
            const payload = e.detail;
            console.log("WebSocket event plivo_call_answered:", payload);
            if (payload && isMatchingPhone(payload.customer_phone, customerPhone)) {
                markCallConnected(payload);
            }
        };

        window.addEventListener("plivo_call_hung_up", handleHungUp as any);
        window.addEventListener("plivo_call_answered", handleCalleeAnswered as any);

        hasLoggedRef.current = false;
        setIsConnected(false);

        let script = document.getElementById("plivo-webrtc-sdk") as HTMLScriptElement;

        if (!script) {
            script = document.createElement("script");
            script.id = "plivo-webrtc-sdk";
            script.src = "https://cdn.plivo.com/sdk/browser/v2/plivo.min.js";
            script.async = true;
            script.onload = () => {
                initPlivo();
            };
            document.body.appendChild(script);
        } else {
            initPlivo();
        }

        return () => {
            window.removeEventListener("plivo_call_hung_up", handleHungUp as any);
            window.removeEventListener("plivo_call_answered", handleCalleeAnswered as any);
            if (timerRef.current) clearInterval(timerRef.current);
            if (plivoClientRef.current) {
                const client = plivoClientRef.current;
                try {
                    client.removeAllListeners?.('onLogin');
                    client.removeAllListeners?.('onLoginFailed');
                    client.removeAllListeners?.('onCallRemoteRinging');
                    client.removeAllListeners?.('onCallAnswered');
                    client.removeAllListeners?.('onMediaConnected');
                    client.removeAllListeners?.('onCallFailed');
                    client.removeAllListeners?.('onCallTerminated');
                    client.removeAllListeners?.('onMediaPermission');
                } catch (e) { }
            }
        };
    }, [isOpen, customerPhone, initPlivo, markCallConnected, cleanupCall]);

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
    const isFailed = status.toLowerCase().includes("failed") || status.toLowerCase().includes("error") || isMediaDenied;
    const isCallActive = (isConnected || isRinging || isDialing) && !isMediaDenied;

    const statusLabel = isMediaDenied
        ? "Microphone Blocked"
        : isConnected
        ? "Connected"
        : isRinging
        ? "Ringing"
        : isDialing
        ? "Dialing"
        : status;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div
                className="relative w-full max-w-[390px] rounded-3xl bg-zinc-900 border border-zinc-800/80 shadow-2xl text-white overflow-hidden"
                style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
            >
                {/* Top Close Button */}
                <button
                    onClick={cleanupCall}
                    className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer z-10"
                    title="Close"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="px-6 pt-6 pb-0">
                    {/* Status indicator */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                isConnected
                                    ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                                    : isRinging
                                    ? "bg-amber-500 animate-pulse"
                                    : isFailed
                                    ? "bg-rose-500"
                                    : "bg-zinc-400 animate-pulse"
                            }`}
                        />
                        <span className={`text-xs uppercase tracking-wider font-semibold ${isMediaDenied ? "text-rose-400" : "text-zinc-400"}`}>
                            {statusLabel}
                        </span>
                    </div>

                    {/* Avatar */}
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-semibold select-none shadow-lg shadow-indigo-600/20">
                            {initials}
                        </div>

                        {/* Name */}
                        <h2 className="text-lg font-semibold text-white mt-3 text-center truncate max-w-[280px]">
                            {displayName}
                        </h2>

                        {/* Phone */}
                        <p className="text-xs text-zinc-400 mt-0.5 text-center font-mono">
                            {normalizePhoneE164(customerPhone) || customerPhone}
                        </p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="px-6 py-5">
                    {isMediaDenied ? (
                        /* Dedicated Microphone Permission Blocked Screen */
                        <div className="space-y-3.5 text-center">
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-left space-y-2.5">
                                <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>Microphone Access Blocked</span>
                                </div>
                                <p className="text-[11px] text-zinc-300 leading-relaxed">
                                    Your browser is preventing microphone access. To allow calls:
                                </p>
                                <ol className="text-[11px] text-zinc-400 space-y-1.5 pl-4 list-decimal leading-relaxed">
                                    <li>Click the <strong>tune 🎚️ / lock 🔒</strong> icon in your browser URL bar.</li>
                                    <li>Set <strong>Microphone</strong> to <strong className="text-emerald-400 font-semibold">Allow</strong>.</li>
                                    <li>On Mac: Check <em>System Settings → Privacy & Security → Microphone</em>.</li>
                                    <li>Then click <strong>Allow & Retry</strong> or <strong>Reload</strong> below.</li>
                                </ol>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={handleRetryPermission}
                                    disabled={isRetryingMic}
                                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/25 disabled:opacity-60"
                                >
                                    {isRetryingMic ? (
                                        <>
                                            <RefreshCw size={15} className="animate-spin" />
                                            Checking Microphone...
                                        </>
                                    ) : (
                                        <>
                                            <Mic size={15} />
                                            Allow Microphone & Retry Call
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <RotateCcw size={13} />
                                    Reload Page
                                </button>
                            </div>
                        </div>
                    ) : status === "Disabled in Free Trial" ? (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center space-y-2">
                            <p className="text-amber-400 font-semibold text-sm">Voice Calling Restricted</p>
                            <p className="text-zinc-400 text-xs leading-relaxed">
                                Voice calling is disabled during the Free Trial. Upgrade to a commercial plan to make live calls.
                            </p>
                        </div>
                    ) : showKeypad ? (
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
                                        className="h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 active:scale-95 text-white text-base font-medium flex items-center justify-center transition-all cursor-pointer select-none"
                                    >
                                        {digit}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-4">
                            {isConnected ? (
                                <>
                                    {/* Timer */}
                                    <div className="text-3xl font-mono tabular-nums text-white font-medium">
                                        {formatDuration(callDuration)}
                                    </div>
                                    {/* Status subtext */}
                                    <div className="text-xs uppercase tracking-wider text-emerald-400 mt-1.5 font-medium">
                                        Connected
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-lg font-medium text-zinc-300 animate-pulse">
                                        {isRinging ? "Ringing..." : isDialing ? "Calling..." : status}
                                    </div>
                                    <div className="text-xs uppercase tracking-wider text-zinc-500 mt-1.5">
                                        Waiting for answer
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                {isMediaDenied ? (
                    <div className="px-6 pb-6 pt-1">
                        <button
                            onClick={cleanupCall}
                            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Dismiss
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-10 px-6 pb-7">
                        {/* Mute */}
                        <div className="flex flex-col items-center gap-1.5">
                            <button
                                onClick={toggleMute}
                                disabled={!isCallActive}
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
                                className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-400 active:scale-95 flex items-center justify-center transition-all cursor-pointer text-white shadow-lg shadow-rose-500/20"
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
                )}

                {/* Hidden Audio Elements for Plivo WebRTC */}
                <audio id="ui-speaker" autoPlay style={{ display: "none" }}></audio>
                <audio id="ui-ringtone" autoPlay style={{ display: "none" }}></audio>
            </div>
        </div>
    );
}
