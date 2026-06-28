"use client";

import React, { use, useState, useEffect, useCallback, useRef } from "react";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import { DisplayHeader } from "@/components/display/DisplayHeader";
import { NowServingHero } from "@/components/display/NowServingHero";
import { WaitingCountCard } from "@/components/display/WaitingCountCard";
import { RecentCallsCard } from "@/components/display/RecentCallsCard";
import { UpcomingQueueCard } from "@/components/display/UpcomingQueueCard";
import { FooterTicker } from "@/components/display/FooterTicker";

interface PageProps {
    params: Promise<{ queueId: string }>;
}

export default function DisplayQueuePage({ params }: PageProps) {
    const rawQueueId = use(params).queueId;
    const queueId = rawQueueId.length >= 36 ? rawQueueId.slice(-36) : rawQueueId;
    const { state, status } = useQueueSocket(queueId);

    // Audio State
    const [soundEnabled, setSoundEnabled] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const previousServingRef = useRef<number | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;
        const enabled = localStorage.getItem("display_sound_enabled") === "true";
        setSoundEnabled(enabled);

        const audio = new Audio("/sounds/ringtone-you-would-be-glad-to-know.mp3");
        audio.preload = "auto";
        audio.volume = 1.0;
        audioRef.current = audio;
    }, [isMounted]);

    const handleToggleSound = useCallback(() => {
        if (!soundEnabled) {
            // Test play to unlock audio context
            if (audioRef.current) {
                audioRef.current.play().then(() => {
                    if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current.currentTime = 0;
                    }
                }).catch(() => { /* ignore */ });
            }
        }
        const newState = !soundEnabled;
        localStorage.setItem("display_sound_enabled", String(newState));
        setSoundEnabled(newState);
    }, [soundEnabled]);

    // Play sound on token change
    useEffect(() => {
        if (!state) return;
        if (state.current_serving !== 0 && previousServingRef.current !== null && state.current_serving !== previousServingRef.current) {
            if (soundEnabled && audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => {/* ignore autoplay block */ });
            }
        }
        if (state.current_serving !== 0) {
            previousServingRef.current = state.current_serving;
        }
    }, [state, soundEnabled]);

    if (!isMounted) return null;

    const prefix = state?.prefix || "";
    const serving = state?.current_serving || 0;
    const queueName = state?.queue_name || "Loading…";
    const waiting = state?.waiting_count ?? 0;
    const recentTokens = state?.recent_tokens || [];
    const waitingTokens = state?.waiting_tokens || [];
    const serviceLines = state?.service_lines ?? 0;
    
    // Use the assigned line from serving details for single counter logic
    const assignedLine = state?.serving_details?.assigned_line;
    const customerName = state?.serving_details?.customer_name;

    return (
        <>
            <style>{`
                * { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
            `}</style>

            <main className="h-screen w-screen bg-slate-50 flex flex-col select-none overflow-hidden text-slate-900 font-sans">
                {/* 1. Header (80px height) */}
                <DisplayHeader 
                    logoUrl={state?.org_logo_url}
                    queueName={queueName}
                    status={status}
                    soundEnabled={soundEnabled}
                    onToggleSound={handleToggleSound}
                    isActive={state?.is_active ?? false}
                />

                {/* 2. Main Section (Split 70 / 30) */}
                <div className="flex-1 flex gap-8 p-8 overflow-hidden min-h-0">
                    
                    {/* Left: 70% Now Serving */}
                    <div className="w-[70%] flex flex-col min-h-0">
                        <NowServingHero 
                            serving={serving}
                            prefix={prefix}
                            assignedLine={assignedLine}
                            serviceLines={serviceLines}
                            customerName={customerName}
                        />
                    </div>

                    {/* Right: 30% Cards */}
                    <div className="w-[30%] flex flex-col gap-6 min-h-0">
                        <WaitingCountCard count={waiting} />
                        <RecentCallsCard recentTokens={recentTokens} prefix={prefix} />
                        <UpcomingQueueCard waitingTokens={waitingTokens} prefix={prefix} />
                    </div>

                </div>

                {/* 3. Footer Ticker */}
                <FooterTicker announcement={state?.announcement || null} />
            </main>
        </>
    );
}
