"use client";

import React, { use, useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, Clock, Share2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import {
    getSoundsEnabled,
    setSoundsEnabled,
    checkAndNotifyMilestone,
    freshMilestoneState,
    type MilestoneState,
} from "@/utils/queueNotifications";
import ConnectionBadge from "@/components/ConnectionBadge";
import ConfirmModal from "@/components/ConfirmModal";
import type { JoinResponse, TokenStatus } from "@/types/api";

interface PageProps {
    params: Promise<{ trackingId: string }>;
}

const STORAGE_KEY = (queueId: string) => `queue_token_${queueId}`;

const COUNTRY_CODES = [
    { code: "+91", country: "India", flag: "🇮🇳" },
    { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
    { code: "+44", country: "UK", flag: "🇬🇧" },
    { code: "+971", country: "UAE", flag: "🇦🇪" },
    { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
    { code: "+49", country: "Germany", flag: "🇩🇪" },
    { code: "+33", country: "France", flag: "🇫🇷" },
    { code: "+81", country: "Japan", flag: "🇯🇵" },
    { code: "+86", country: "China", flag: "🇨🇳" },
    { code: "+65", country: "Singapore", flag: "🇸🇬" },
];

function saveTokenToStorage(queueId: string, tokenId: string) {
    try {
        localStorage.setItem(STORAGE_KEY(queueId), tokenId);
    } catch { /* SSR or storage unavailable */ }
}

function getTokenFromStorage(queueId: string): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY(queueId));
    } catch { return null; }
}

function clearTokenFromStorage(queueId: string) {
    try {
        localStorage.removeItem(STORAGE_KEY(queueId));
    } catch { /* ignore */ }
}

const formatTime12 = (time24?: string | null) => {
    if (!time24) return "";
    const [h, m] = time24.split(":");
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, "0")}:${m} ${ampm}`;
};

export default function TrackingPage({ params }: PageProps) {
    const { trackingId } = use(params);
    const [queueId, setQueueId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { state: live, status: wsStatus } = useQueueSocket(queueId || '');

    const [joinData, setJoinData] = useState<JoinResponse | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(false);


    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Tracks which milestone alerts have already fired to prevent repeats
    const triggeredRef = useRef<MilestoneState>(freshMilestoneState());
    // Whether user has interacted (unlocks autoplay)
    const interactedRef = useRef(false);

    // Init Audio + read stored preferences on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const enabled = getSoundsEnabled();
            setSoundEnabled(enabled);

            const audio = new Audio("/sounds/ringtone-you-would-be-glad-to-know.mp3");
            audio.preload = "auto";
            audio.volume = 1.0;
            audioRef.current = audio;
        }
    }, []);

    const handleEnableSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
            }).catch(() => { /* ignore */ });
        }
        setSoundsEnabled(true);
        setSoundEnabled(true);
        interactedRef.current = true; // unlock autoplay milestone alerts
    }, []);

    const handleToggleSound = useCallback(() => {
        const next = !soundEnabled;
        setSoundsEnabled(next);
        setSoundEnabled(next);
        if (next) interactedRef.current = true;
    }, [soundEnabled]);


    const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);

    // ── Fetch Tracking Info on Mount ────────────────────────
    useEffect(() => {
        let mounted = true;
        const fetchTracking = async () => {
            try {
                const info = await api.getTrackingInfo(trackingId);
                if (mounted) {
                    setQueueId(info.queue_id);
                    setJoinData({
                        id: info.token_id,
                        token_number: info.token_number,
                        position: info.position,
                        current_serving: 0, // will be updated by websocket
                        queue_prefix: info.token_prefix,
                        session_id: "", // tracking page doesn't strictly need session validation like join did, but we'll adapt
                        tracking_id: info.tracking_id
                    });
                    setTokenStatus(info.status as TokenStatus);
                    setIsLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setError("Tracking link is invalid or expired.");
                    setIsLoading(false);
                }
            }
        };
        fetchTracking();
        return () => { mounted = false; };
    }, [trackingId]);
    

    // Fetch exact status on live update or when joinData changes
    useEffect(() => {
        let mounted = true;
        const fetchStatus = async () => {
            if (!joinData?.token_number || !joinData?.session_id) return;

            let newStatus: TokenStatus | null = null;

            if (live?.recent_tokens) {
                const recent = live.recent_tokens.find(
                    (t: { token_number: number; status: TokenStatus }) =>
                        t.token_number === joinData.token_number
                );
                if (recent) newStatus = recent.status;
            }

            if (!newStatus && live?.current_serving === joinData.token_number) {
                newStatus = "serving";
            }

            try {
                if (!newStatus) {
                    const res = await api.getTrackingInfo(trackingId);
                    if (false) {
                        if (mounted) {
                            newStatus = "deleted";
                            setError("This queue session has ended. Your token is no longer valid.");
                        }
                    } else {
                        newStatus = res.status;
                    }
                }
            } catch (err: unknown) {
                if (err instanceof ApiError && err.status === 404) {
                    if (mounted) {
                        newStatus = "deleted";
                        setError("This queue session has ended. Your token was removed.");
                    }
                }
            }

            if (newStatus && mounted) {
                setTokenStatus(newStatus);

                // Auto-clear storage if token reaches end state
                if (newStatus === "done" || newStatus === "skipped" || newStatus === "deleted") {
                    
                }

                if (typeof window !== "undefined") {
                    const storageKey = `fc_audio_stage_${queueId}`;
                    const lastStage = sessionStorage.getItem(storageKey);

                    if (newStatus !== lastStage) {
                        sessionStorage.setItem(storageKey, newStatus);
                        if (newStatus === "serving" && lastStage !== "serving" && soundEnabled && audioRef.current) {
                            audioRef.current.currentTime = 0;
                            audioRef.current.play().catch(() => { /* block */ });
                        }
                    }
                }
            }
        };

        fetchStatus();
        return () => { mounted = false; };
    }, [queueId, joinData?.token_number, joinData?.session_id, live, soundEnabled]);

    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    const handleConfirmCancel = useCallback(async () => {
        if (!joinData || isCancelling) return;
        setIsCancelling(true);
        try {
            await api.leaveQueue(trackingId);
            
            setJoinData(null);
            setTokenStatus(null);
            setError(null);
            setShowCancelConfirm(false);
        } catch (err: unknown) {
            setError(err instanceof ApiError ? err.detail : "Failed to cancel token");
            setShowCancelConfirm(false);
        } finally {
            setIsCancelling(false);
        }
    }, [joinData, queueId, isCancelling]);

    const handleCancelRequest = () => setShowCancelConfirm(true);

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'My Queue Ticket',
                    text: `Track my live queue position at ${live?.queue_name || 'the queue'}:`,
                    url: url,
                });
            } catch (err) {
                // Ignore AbortError if user cancelled share
                if ((err as Error).name !== 'AbortError') {
                    console.error("Error sharing", err);
                }
            }
        } else {
            navigator.clipboard.writeText(url);
            alert("Tracking link copied to clipboard!");
        }
    };

    // Derived: compute live position
    const myNumber = joinData?.token_number ?? null;
    const serving = live?.current_serving ?? 0;

    const actualStatus = tokenStatus || "waiting";
    const isMyTurn = actualStatus === "serving";
    const isDone = actualStatus === "done";
    const isSkipped = actualStatus === "skipped";
    const isDeleted = actualStatus === "deleted";

    const alreadyServed = isDone || isSkipped || isDeleted || (myNumber !== null && myNumber < serving && actualStatus !== "waiting");
    const peopleAhead = myNumber !== null && actualStatus === "waiting" && myNumber > serving ? myNumber - serving - 1 : 0;
    const isNext = peopleAhead === 0 && actualStatus === "waiting" && myNumber !== null;

    // ── Remaining-count milestone: sound via utility ────
    useEffect(() => {
        if (!joinData?.token_number || !live?.current_serving || !joinData?.session_id) return;
        if (!interactedRef.current) return; // needs prior user interaction

        // Session isolation check: Do not fire alerts for old sessions
        if (live?.session_id && live.session_id !== joinData.session_id) return;

        // Sound utility (handles its own enabled check)
        checkAndNotifyMilestone(joinData.token_number, live.current_serving, triggeredRef.current);

    }, [joinData?.token_number, joinData?.session_id, live?.current_serving, live?.session_id, soundEnabled]);

    const queueClosed = live?.is_active === false;
    const queuePaused = live?.is_paused === true;
    const queueName = live?.queue_name || "Queue";
    const prefix = live?.prefix || joinData?.queue_prefix || "";

    let positionMessage = "";
    if (myNumber !== null) {
        if (isMyTurn) positionMessage = "It's your turn! Please proceed.";
        else if (isDeleted) positionMessage = "Your token was removed.";
        else if (isSkipped) positionMessage = "Your token was skipped.";
        else if (alreadyServed) positionMessage = "Your token has been served.";
        else if (isNext) positionMessage = "You are next!";
        else if (peopleAhead === 1) positionMessage = "1 person ahead of you";
        else positionMessage = `${peopleAhead} people ahead of you`;
    }

    const brandColor = live?.org_brand_color || '#2563eb';
    const logoUrl = live?.org_logo_url;
    const fullLogoUrl = logoUrl ? (logoUrl.startsWith('http') ? logoUrl : process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}${logoUrl}` : `http://localhost:8000${logoUrl}`) : null;

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-7 text-center text-white relative transition-colors duration-500" style={{ backgroundColor: brandColor }}>
                    <div className="absolute top-3 right-3">
                        <ConnectionBadge status={queueClosed ? "disconnected" : wsStatus} />
                    </div>

                    {fullLogoUrl && (
                        <div className="flex justify-center mb-3">
                            <img 
                                src={fullLogoUrl} 
                                alt="Organization Logo" 
                                className="h-16 object-contain bg-white/10 rounded-lg p-1.5 backdrop-blur-sm border border-white/20 shadow-sm"
                            />
                        </div>
                    )}

                    <h1 className="text-2xl font-extrabold mb-1">{queueName}</h1>
                    <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">
                        {queueClosed ? "Currently Closed" : "Now Serving"}
                    </p>

                    <div className="mt-4 text-6xl font-black tabular-nums tracking-tight py-4 bg-white/10 rounded-xl border border-white/20" aria-live="polite" aria-atomic="true" aria-label={`Currently serving token ${prefix}${serving}`}>
                        {prefix}{serving}
                    </div>

                    <div className="mt-3 flex justify-center gap-6 text-xs text-blue-200">
                        <span>Waiting: <strong className="text-white">{live?.waiting_count ?? "—"}</strong></span>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Service Hours Badge */}
                    {live?.open_time && live?.close_time && (
                        <div className="flex justify-center -mt-2 mb-2 relative z-10">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm shadow-sm border border-slate-200/60 rounded-full text-xs font-semibold text-slate-600 tracking-wide">
                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                <span>{formatTime12(live.open_time)} - {formatTime12(live.close_time)}</span>
                            </div>
                        </div>
                    )}
                    
                    {live?.is_paused && (
                        <div role="alert" className="bg-amber-50 text-amber-800 text-sm font-bold p-4 rounded-xl border border-amber-200 shadow-sm animate-pulse flex items-center gap-3">
                            <span className="text-xl">⏸️</span>
                            <div>
                                <p className="mb-0.5 uppercase tracking-wide text-xs text-amber-600">Paused</p>
                                <p>The queue is currently on a break. Service will resume shortly.</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div role="alert" className="bg-red-50 text-red-700 text-sm font-medium p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {joinData && (
                        /* ── Ticket Card ── */
                        <div className="space-y-4">
                            {/* ── Alert Settings Card ── */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
                                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Alert Settings</p>

                                {/* Sound toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🔔</span>
                                        <div>
                                            <p className="text-sm font-medium text-indigo-900">Sound Alerts</p>
                                            <p className="text-xs text-indigo-500">Plays ringtone at milestones</p>
                                        </div>
                                    </div>
                                    {soundEnabled ? (
                                        <button
                                            onClick={handleToggleSound}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${soundEnabled ? "bg-indigo-600" : "bg-gray-300"}`}
                                            role="switch"
                                            aria-checked={soundEnabled}
                                            aria-label="Toggle sound alerts"
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${soundEnabled ? "translate-x-6" : "translate-x-1"}`} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleEnableSound}
                                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
                                        >
                                            Enable
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Announcement */}
                            {live?.announcement && (
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex items-center gap-2 mb-2 text-indigo-800">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
                                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-900">Announcement</span>
                                    </div>
                                    <p className="text-sm text-indigo-900 whitespace-pre-wrap">{live.announcement}</p>
                                </div>
                            )}



                            {isMyTurn && (
                                <div role="alert" className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border-2 border-emerald-300 text-center font-bold text-lg animate-pulse">
                                    🎉 It&apos;s your turn! Please proceed.
                                </div>
                            )}
                            {isNext && !isMyTurn && (
                                <div role="status" className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-200 text-center font-bold text-base">
                                    ⏳ You are next! Get ready.
                                </div>
                            )}
                            {isSkipped && !isDone && !isMyTurn && !isDeleted && (
                                <div className="bg-amber-50 text-amber-600 p-4 rounded-xl border border-amber-200 text-center text-sm">
                                    Your token was skipped. Please see the receptionist.
                                </div>
                            )}
                            {isDeleted && !isDone && !isMyTurn && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-center text-sm">
                                    {error ? error : "Your token has been removed from the waiting list."}
                                </div>
                            )}
                            {alreadyServed && !isSkipped && !isDeleted && (
                                <div className="bg-gray-50 text-gray-600 p-4 rounded-xl border border-gray-200 text-center text-sm">
                                    Your token has already been served. Thank you for visiting!
                                </div>
                            )}

                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center shadow-inner" aria-label="Your ticket information">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                                    Your Ticket
                                </p>
                                <div className={`text-7xl font-black tabular-nums mb-2 ${isMyTurn ? "text-emerald-600" : alreadyServed ? "text-gray-400" : ""}`} style={(!isMyTurn && !alreadyServed) ? { color: brandColor } : {}}>
                                    {prefix}{myNumber}
                                </div>

                                <p aria-live="polite" className={`text-sm font-semibold mb-4 ${isMyTurn ? "text-emerald-600" : alreadyServed ? "text-gray-400" : (!isNext ? "text-gray-600" : "")}`} style={isNext ? { color: brandColor } : {}}>
                                    {positionMessage}
                                </p>

                                <div className="flex bg-white rounded-lg border border-gray-100 divide-x divide-gray-100 overflow-hidden text-sm shadow-sm">
                                    <div className="flex-1 py-3">
                                        <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider">Ahead</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">
                                            {alreadyServed ? "—" : isMyTurn ? "0" : peopleAhead}
                                        </p>
                                    </div>
                                    <div className="flex-1 py-3">
                                        <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider">Status</p>
                                        <p className={`text-sm font-bold mt-1 ${isMyTurn ? "text-emerald-600" : isSkipped ? "text-amber-500" : alreadyServed ? "text-gray-400" : (!isNext ? "text-amber-600" : "")}`} style={isNext ? { color: brandColor } : {}}>
                                            {isMyTurn ? "YOUR TURN" : isSkipped ? "Skipped" : alreadyServed ? "Served" : isNext ? "NEXT" : "Waiting"}
                                        </p>
                                    </div>
                                    <div className="flex-1 py-3">
                                        <p className="text-gray-400 font-semibold text-[10px] uppercase tracking-wider">Serving</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">{prefix}{serving}</p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-center text-xs text-gray-400 leading-relaxed">
                                This page updates automatically. No need to refresh.
                            </p>

                            {wsStatus === "reconnecting" && (
                                <div role="status" className="text-center text-xs text-amber-600 flex items-center justify-center gap-1.5 py-2">
                                    <span className="w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" aria-hidden="true" />
                                    Reconnecting to live updates...
                                </div>
                            )}

                            {/* Cancel / Leave Queue */}
                            <div className="pt-4 border-t border-gray-100 flex flex-col gap-3 sm:flex-row justify-center sm:items-center">
                                <button
                                    onClick={handleShare}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <Share2 className="w-3.5 h-3.5" />
                                    Share Tracking Link
                                </button>
                                
                                {!alreadyServed && (
                                    <button
                                        onClick={handleCancelRequest}
                                        disabled={isCancelling}
                                        className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        {isCancelling ? "Cancelling..." : "Leave Queue / Cancel Ticket"}
                                    </button>
                                )}
                            </div>
                        </div>
                    
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={showCancelConfirm}
                title="Leave Queue?"
                message="Are you sure you want to leave the queue? Your ticket will be cancelled and you will lose your position."
                confirmLabel="Yes, Leave Queue"
                confirmVariant="danger"
                onConfirm={handleConfirmCancel}
                onCancel={() => setShowCancelConfirm(false)}
                isLoading={isCancelling}
            />
        </main>
    );
}
