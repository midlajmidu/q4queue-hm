"use client";

import React, { useEffect, useState, useRef } from "react";
import { Phone, PhoneOff } from "lucide-react";
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
    const [status, setStatus] = useState<string>("Initializing...");
    const [callDuration, setCallDuration] = useState<number>(0);
    const durationRef = useRef<number>(0);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const plivoClientRef = useRef<any>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isCallingRef = useRef<boolean>(false);

    // Format seconds to MM:SS
    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const hasLoggedRef = useRef<boolean>(false);
    const callStartTimeRef = useRef<number>(0);

    const saveCallRecord = async () => {
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
    };

    const cleanupCall = async () => {
        isCallingRef.current = false;
        if (timerRef.current) clearInterval(timerRef.current);

        await saveCallRecord();

        if (plivoClientRef.current) {
            const client = plivoClientRef.current;
            try {
                // Prevent memory leak / stale closure execution & stop duplicate callbacks
                client.removeAllListeners('onLogin');
                client.removeAllListeners('onLoginFailed');
                client.removeAllListeners('onCallRemoteRinging');
                client.removeAllListeners('onCallAnswered');
                client.removeAllListeners('onCallFailed');
                client.removeAllListeners('onCallTerminated');

                // Only hangup if there's an active call session
                if (client.callSession) {
                    // Temporarily silence Plivo SDK's internal console.error("Outgoing call failed: Canceled")
                    // which triggers the Next.js dev error modal during intentional user hangups
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
        setCallDuration(0);
        durationRef.current = 0;
        callStartTimeRef.current = 0;
        setStatus("Disconnected");

        // Close modal immediately
        onClose();
        setStatus("Initializing...");
    };

    useEffect(() => {
        if (!isOpen) return;

        // Reset state
        setStatus("Initializing...");
        setCallDuration(0);
        durationRef.current = 0;
        callStartTimeRef.current = Date.now();

        const handleHungUp = (e: CustomEvent) => {
            const payload = e.detail;
            // If the webhook reports the same phone number disconnected, force close
            if (payload && payload.customer_phone === customerPhone) {
                setStatus("Call Rejected / Ended");
                setTimeout(() => cleanupCall(), 1500);
            }
        };
        window.addEventListener("plivo_call_hung_up", handleHungUp as any);

        hasLoggedRef.current = false;
        setIsConnected(false);

        let script = document.getElementById("plivo-webrtc-sdk") as HTMLScriptElement;

        const initPlivo = async () => {
            if (!(window as any).Plivo) {
                setStatus("Error: Plivo SDK not loaded");
                return;
            }

            try {
                setStatus("Fetching credentials...");
                // Fetch credentials from our secure Python backend
                const res = await api.getPlivoWebRTCToken();
                const { username, password } = res;

                // Initialize Plivo as a singleton
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

                    setStatus("Calling customer...");
                    callStartTimeRef.current = Date.now();
                    // Initiate call to customer with metadata for the backend webhook
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
                    setStatus("Failed to connect to Plivo endpoint");
                });

                client.on('onCallRemoteRinging', () => {
                    setStatus("Ringing...");
                });

                client.on('onCallAnswered', () => {
                    setStatus("Connected (Active)");
                    setIsConnected(true);
                    callStartTimeRef.current = Date.now();

                    // Start timer
                    if (timerRef.current) clearInterval(timerRef.current);
                    timerRef.current = setInterval(() => {
                        durationRef.current += 1;
                        setCallDuration(durationRef.current);
                    }, 1000);
                });

                client.on('onCallFailed', (cause: any) => {
                    setStatus(`Call Failed: ${cause}`);
                    setTimeout(() => cleanupCall(), 2000);
                });

                client.on('onCallTerminated', () => {
                    cleanupCall();
                });

                // If already logged in, skip login and just call
                if (client.isLoggedIn) {
                    if (isCallingRef.current) return;
                    isCallingRef.current = true;
                    setStatus("Calling customer...");
                    callStartTimeRef.current = Date.now();
                    // Initiate call to customer with metadata for the backend webhook
                    client.call(customerPhone, {
                        extraHeaders: {
                            'X-PH-OrgId': organizationId || queueId || "00000000-0000-0000-0000-000000000000",
                            'X-PH-QueueId': queueId || "",
                            'X-PH-SessionId': sessionId || "",
                            'X-PH-TokenId': tokenId || ""
                        }
                    });
                } else {
                    // Login to the SIP Endpoint
                    client.login(username, password);
                }

            } catch (error) {
                console.error("WebRTC Error:", error);
                setStatus("Error initializing call");
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="relative w-full max-w-sm bg-slate-900 rounded-3xl p-8 shadow-2xl flex flex-col items-center border border-slate-700/50">

                {/* Header */}
                <h3 className="text-white text-lg font-semibold tracking-wide mb-1">
                    Calling {tokenNumber}
                </h3>
                <p className="text-slate-400 text-sm mb-8 font-mono tracking-wider">
                    {customerPhone}
                </p>

                {/* Radar Pulse Animation */}
                <div className="relative flex items-center justify-center w-32 h-32 mb-8">
                    {isConnected ? (
                        // Active Call Animation
                        <>
                            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                            <div className="absolute inset-2 bg-green-500/30 rounded-full animate-pulse"></div>
                            <div className="relative z-10 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                                <Phone className="w-8 h-8 text-white animate-bounce" />
                            </div>
                        </>
                    ) : (
                        // Ringing/Connecting Animation
                        <>
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" style={{ animationDuration: '1.5s' }}></div>
                            <div className="absolute inset-4 bg-blue-500/30 rounded-full animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }}></div>
                            <div className="relative z-10 w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                                <Phone className="w-8 h-8 text-white" />
                            </div>
                        </>
                    )}
                </div>

                {/* Hidden Audio Elements for Plivo WebRTC */}
                <audio id="ui-speaker" autoPlay style={{ display: 'none' }}></audio>
                <audio id="ui-ringtone" autoPlay style={{ display: 'none' }}></audio>

                {/* Call Stats & Timer */}
                <div className="text-center mb-8">
                    <p className={`text-sm font-medium transition-colors ${isConnected ? 'text-green-400' : 'text-blue-400'}`}>
                        {status}
                    </p>
                    <p className="text-white text-3xl font-light tabular-nums mt-2 tracking-widest">
                        {formatDuration(callDuration)}
                    </p>
                </div>

                {/* End Call Action */}
                <button
                    onClick={cleanupCall}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.6)]"
                >
                    <PhoneOff className="w-8 h-8 text-white" />
                </button>
                <p className="text-slate-500 text-xs mt-3 font-medium uppercase tracking-widest">End Call</p>
            </div>
        </div>
    );
}
