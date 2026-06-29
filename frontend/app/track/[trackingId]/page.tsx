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

    const { state: live, status: wsStatus, refresh } = useQueueSocket(queueId || '');

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
                        session_id: info.session_id,
                        tracking_id: info.tracking_id,
                        removed_by: info.removed_by
                    });
                    setTokenStatus(info.status as TokenStatus);
                    setIsLoading(false);
                }
            } catch (err: unknown) {
                if (mounted) {
                    if (err instanceof Error && 'status' in err && (err as any).status === 404) {
                        setError("This queue session has ended. Your token is no longer valid.");
                    } else {
                        setError("Tracking link is invalid or expired.");
                    }
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

            if (!newStatus && live?.all_serving_tokens) {
                const isServing = live.all_serving_tokens.some(
                    (t: { token_number: number }) => t.token_number === joinData.token_number
                );
                if (isServing) {
                    newStatus = "serving";
                }
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
            
            // Keep joinData to show the ticket card in "deleted" state
            setTokenStatus("deleted");
            setError(null);
            setShowCancelConfirm(false);
        } catch (err: unknown) {
            setError(err instanceof ApiError ? err.detail : "Failed to cancel token");
            setShowCancelConfirm(false);
        } finally {
            setIsCancelling(false);
        }
    }, [joinData, queueId, isCancelling, trackingId]);

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
    const activeServingTokens = live?.all_serving_tokens ?? [];

    const actualStatus = tokenStatus || "waiting";
    const isMyTurn = actualStatus === "serving";
    const isDone = actualStatus === "done";
    const isSkipped = actualStatus === "skipped";
    const isDeleted = actualStatus === "deleted";

    const alreadyServed = isDone || isSkipped || isDeleted || (myNumber !== null && myNumber < serving && actualStatus !== "waiting");
    
    // Accurate calculation using waiting_tokens list when available, falling back to math.
    const peopleAhead = myNumber !== null && actualStatus === "waiting"
        ? (live?.waiting_tokens 
            ? live.waiting_tokens.filter(t => t.token_number < myNumber).length
            : (myNumber > serving ? myNumber - serving - 1 : 0))
        : 0;

    const isNext = peopleAhead === 0 && actualStatus === "waiting" && myNumber !== null;

    const displayWaitingCount = live?.waiting_count !== undefined
        ? (actualStatus === "waiting" ? Math.max(0, live.waiting_count - 1) : live.waiting_count)
        : "—";

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
        if (isMyTurn) positionMessage = "It’s your turn! Please proceed.";
        else if (isDeleted) positionMessage = joinData?.removed_by === "session_end" ? "Queue session ended." : "Your token was removed.";
        else if (isSkipped) positionMessage = "Your token was skipped.";
        else if (alreadyServed) positionMessage = "Your token has been served.";
        else if (isNext) positionMessage = "You are next!";
        else if (peopleAhead === 1) positionMessage = "1 person ahead of you";
        else positionMessage = `${peopleAhead} people ahead of you`;
    }

    // Derive the assigned service line for this customer (multi-lane queues)
    const myAssignedLine = React.useMemo(() => {
        if (!myNumber || !isMyTurn) return null;
        const allServing = (live?.all_serving_tokens ?? []) as { token_number: number; assigned_line: number | null }[];
        const mine = allServing.find(t => t.token_number === myNumber);
        return mine?.assigned_line ?? null;
    }, [myNumber, isMyTurn, live?.all_serving_tokens]);

    const brandColor = live?.org_brand_color || '#2563eb';
    const logoUrl = live?.org_logo_url;
    const fullLogoUrl = logoUrl ? (logoUrl.startsWith('http') ? logoUrl : process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}${logoUrl}` : `http://localhost:8000${logoUrl}`) : null;

    const bgGradient = isMyTurn 
        ? "from-emerald-900 via-emerald-800 to-teal-900" 
        : isNext 
            ? "from-indigo-900 via-purple-900 to-slate-900"
            : "from-[#0f172a] via-[#1e1b4b] to-[#020617]";

    const cardGlass = "bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]";

    // Approximate progress ring calculation (max 100 people for full circle visual)
    const progressDashoffset = isMyTurn ? 0 : Math.max(0, 289 - (289 * (1 - Math.min(peopleAhead, 20) / 20)));

    return (
        <main className={`min-h-screen flex flex-col p-4 sm:p-6 transition-colors duration-700 bg-gradient-to-br ${bgGradient} text-white relative`}>
            {/* Absolute positioning for ConnectionBadge */}
            <div className="absolute top-4 right-4 z-50">
                <ConnectionBadge status={queueClosed ? "disconnected" : wsStatus} />
            </div>

            <div className="flex-1 w-full max-w-md mx-auto flex flex-col justify-center relative pb-24">
                
                {/* Header (Logo + Queue Name) */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    {fullLogoUrl && (
                        <div className="flex justify-center mb-4">
                            <img src={fullLogoUrl} alt="Logo" className="h-16 object-contain drop-shadow-2xl bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20" />
                        </div>
                    )}
                    <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">{queueName}</h1>
                    <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mt-1">
                        {queueClosed ? "Currently Closed" : "Live Token Tracking"}
                    </p>
                </div>

                {error && (
                    <div role="alert" className="mb-4 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-200 text-sm font-bold p-4 rounded-xl text-center">
                        {error}
                    </div>
                )}

                {/* Main Glassmorphism Ticket Card */}
                {joinData && (
                    <div className={`relative w-full rounded-[2rem] p-8 ${cardGlass} animate-in zoom-in-95 duration-500 overflow-hidden`}>
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 pointer-events-none" />
                        
                        <div className="text-center relative z-10">
                            <p className="text-white/60 font-bold text-xs uppercase tracking-widest mb-1">{isMyTurn ? "Your turn!" : isNext ? "You're up next!" : "Your Ticket"}</p>
                            
                            {/* Circular Progress Ring wrapping the token number */}
                            <div className="relative w-48 h-48 mx-auto mt-4 mb-6 flex items-center justify-center">
                                {/* SVG Ring */}
                                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                                    <circle 
                                        cx="50" cy="50" r="46" fill="none" 
                                        stroke={isMyTurn ? "#34d399" : isNext ? "#818cf8" : "#fff"} 
                                        strokeWidth="4" strokeLinecap="round"
                                        strokeDasharray="289"
                                        strokeDashoffset={progressDashoffset}
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                
                                <div className="flex flex-col items-center justify-center">
                                    <span className={`text-6xl font-black tabular-nums tracking-tighter ${isMyTurn ? "text-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" : "text-white"}`}>
                                        {prefix}{myNumber}
                                    </span>
                                    {myAssignedLine != null && isMyTurn && (
                                        <span className="mt-2 text-sm font-bold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                                            Line {myAssignedLine}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <p className={`text-lg font-bold ${isMyTurn ? "text-emerald-300" : "text-white/90"}`}>
                                {positionMessage}
                            </p>
                            
                            {/* Stats row inside the card */}
                            <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/10 text-left">
                                <div>
                                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Status</p>
                                    <p className={`text-sm font-bold mt-0.5 ${isMyTurn ? "text-emerald-400" : isSkipped ? "text-amber-400" : alreadyServed ? "text-gray-400" : "text-white"}`}>
                                        {isMyTurn ? "Proceed to counter" : isSkipped ? "Skipped" : alreadyServed ? "Served" : isNext ? "Next in line" : "Waiting"}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Ahead of you</p>
                                    <p className="text-sm font-bold mt-0.5 text-white tabular-nums">
                                        {alreadyServed || isMyTurn ? "—" : peopleAhead}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Queue Avatars Timeline */}
                {!isMyTurn && !alreadyServed && !isSkipped && !isDeleted && joinData && (
                    <div className="mt-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                        <p className="text-center text-white/50 text-[10px] font-bold uppercase tracking-widest mb-4">Live Queue Position</p>
                        <div className="flex justify-center items-center gap-4">
                            {/* Current Serving */}
                            {activeServingTokens.slice(0, 1).map(t => (
                                <div key={t.id} className="relative flex flex-col items-center transition-all">
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                        <span className="text-sm font-bold text-white tabular-nums">{prefix}{t.token_number}</span>
                                    </div>
                                    <span className="text-[9px] text-white/70 font-bold uppercase mt-1.5">Serving</span>
                                </div>
                            ))}
                            
                            {activeServingTokens.length > 0 && (
                                <div className="w-10 h-px bg-gradient-to-r from-white/30 to-white/10" />
                            )}
                            
                            {/* Customer Avatar */}
                            <div className="relative flex flex-col items-center">
                                <div className="w-14 h-14 rounded-full bg-indigo-500/40 backdrop-blur-md border-2 border-indigo-400 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] transform scale-110">
                                    <span className="text-base font-black text-white tabular-nums">{prefix}{myNumber}</span>
                                </div>
                                <span className="text-[10px] text-indigo-300 font-bold uppercase mt-2">You</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Alerts */}
                {live?.is_paused && (
                    <div className="mt-6 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-200 text-sm font-bold p-4 rounded-xl text-center flex flex-col items-center gap-2">
                        <span className="text-2xl">⏸️</span>
                        <span>Operator on a break. Service will resume shortly.</span>
                    </div>
                )}

                {live?.announcement && (
                    <div className="mt-6 bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30 text-indigo-100 text-sm p-4 rounded-xl text-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-300 mb-1">Announcement</p>
                        <p>{live.announcement}</p>
                    </div>
                )}

            </div>

            {/* Floating Action Bar */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm z-50 animate-in slide-in-from-bottom-8 duration-700">
                <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-full p-2 flex items-center justify-between">
                    <button 
                        onClick={handleToggleSound}
                        className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${soundEnabled ? "bg-white/20 text-white" : "text-white/50 hover:bg-white/10"}`}
                        title="Toggle Sounds"
                    >
                        <svg className="w-5 h-5" fill={soundEnabled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </button>
                    
                    <button 
                        onClick={refresh}
                        className="flex items-center justify-center w-12 h-12 rounded-full text-white/50 hover:bg-white/10 transition-colors"
                        title="Refresh"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>

                    <button 
                        onClick={handleShare}
                        className="flex items-center justify-center w-12 h-12 rounded-full text-white/50 hover:bg-white/10 transition-colors"
                        title="Share Ticket"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>

                    {!alreadyServed && (
                        <button 
                            onClick={handleCancelRequest}
                            disabled={isCancelling}
                            className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/40 transition-colors ml-auto mr-1 disabled:opacity-50"
                            title="Leave Queue"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
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
