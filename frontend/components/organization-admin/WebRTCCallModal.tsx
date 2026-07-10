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

    const cleanupCall = async () => {
        isCallingRef.current = false;
        if (timerRef.current) clearInterval(timerRef.current);
        
        // Log the call if we have an org ID, ensuring it only logs once per modal open
        if (!hasLoggedRef.current && organizationId) {
            hasLoggedRef.current = true;
            try {
                await api.logCall({
                    organization_id: organizationId,
                    queue_id: queueId,
                    session_id: sessionId,
                    token_id: tokenId,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    duration_seconds: durationRef.current
                });
            } catch (err) {
                console.error("Failed to log call", err);
                hasLoggedRef.current = false; // Allow retry if it failed
            }
        }
        
        if (plivoClientRef.current) {
            const client = plivoClientRef.current;
            try {
                // Only hangup if there's an active call session
                if (client.callSession) {
                    client.hangup();
                }
                // Prevent memory leak / stale closure execution
                client.removeAllListeners('onLogin');
                client.removeAllListeners('onLoginFailed');
                client.removeAllListeners('onCallRemoteRinging');
                client.removeAllListeners('onCallAnswered');
                client.removeAllListeners('onCallFailed');
                client.removeAllListeners('onCallTerminated');
            } catch (e) {
                console.error("Cleanup error:", e);
            }
        }
        setIsConnected(false);
        setCallDuration(0);
        durationRef.current = 0;
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
                    // Initiate call to customer
                    client.call(customerPhone);
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
                    
                    // Start timer
                    if (timerRef.current) clearInterval(timerRef.current);
                    timerRef.current = setInterval(() => {
                        setCallDuration(prev => {
                            const next = prev + 1;
                            durationRef.current = next;
                            return next;
                        });
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
                    client.call(customerPhone);
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
                } catch(e) {}
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
