"use client";

import { use, useState, useCallback, useRef, useEffect } from "react";
import React from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useQueueSocket } from "@/hooks/useQueueSocket";
import { getToken, getCurrentUser } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import ConnectionBadge from "@/components/ConnectionBadge";
import ConfirmModal from "@/components/ConfirmModal";
import QueueQRCode from "@/components/QueueQRCode";
import TokenDetailModal from "@/components/TokenDetailModal";
import type { TokenDetailData } from "@/components/TokenDetailModal";
import type { RecentToken, WaitingToken, QueueResponse, TokenHistoryItem } from "@/types/api";

// ─── Design Tokens (mirrors global dashboard) ─────────────────────
const C = {
  pageBg:      "#f7f8fa",
  cardBg:      "#ffffff",
  border:      "#e8eaef",
  borderHov:   "#c4ccd8",
  borderLight: "#f1f2f5",
  text:        "#0f1729",
  textSub:     "#475569",
  textMuted:   "#8b95a9",
  brand:       "#4f46e5",
  brandDark:   "#4338ca",
  brandLight:  "#eef2ff",
  brandBorder: "#c7d2fe",
  brandGlow:   "rgba(79,70,229,.10)",
  green:  "#10b981", greenBg:  "#ecfdf5", greenBorder: "#a7f3d0",
  amber:  "#f59e0b", amberBg:  "#fffbeb", amberBorder: "#fde68a",
  red:    "#ef4444", redBg:    "#fef2f2", redBorder:   "#fecaca",
  blue:   "#3b82f6", blueBg:   "#eff6ff", blueBorder:  "#bfdbfe",
  violet: "#7c3aed", violetBg: "#f5f3ff",
  cyan:   "#0891b2", cyanBg:   "#ecfeff",
};

const QD_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  .qd-root {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: ${C.text};
    -webkit-font-smoothing: antialiased;
  }
  .qd-card {
    background: ${C.cardBg};
    border: 1px solid ${C.border};
    border-radius: 14px;
    box-shadow: 0 0 0 1px rgba(0,0,0,.02), 0 1px 2px rgba(0,0,0,.03), 0 2px 8px rgba(0,0,0,.025);
    transition: box-shadow .25s ease, border-color .25s ease;
  }
  .qd-card:hover {
    box-shadow: 0 0 0 1px rgba(0,0,0,.03), 0 4px 12px rgba(0,0,0,.06), 0 8px 28px rgba(0,0,0,.04);
    border-color: ${C.borderHov};
  }
  .qd-sidebar {
    background: linear-gradient(180deg,#ffffff 0%,#fafbfd 100%);
    border-right: 1px solid ${C.border};
    font-family: 'Inter', sans-serif;
  }
  .qd-nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 10px;
    font-size: 13px; font-weight: 500;
    cursor: pointer; border: none; width: 100%; text-align: left;
    transition: all .2s ease; background: transparent;
    color: ${C.textSub}; font-family: 'Inter', sans-serif;
  }
  .qd-nav-item:hover { background: ${C.brandLight}; color: ${C.brand}; }
  .qd-nav-item.active {
    background: linear-gradient(135deg, ${C.brand} 0%, ${C.brandDark} 100%);
    color: #fff; font-weight: 600;
    box-shadow: 0 4px 12px ${C.brandGlow}, 0 2px 4px rgba(79,70,229,.2);
  }
  .qd-btn-primary {
    background: linear-gradient(135deg, ${C.brand} 0%, ${C.brandDark} 100%);
    color: #fff; font-weight: 700; border: none; border-radius: 12px;
    padding: 14px 24px; font-size: 15px; cursor: pointer; font-family: 'Inter', sans-serif;
    box-shadow: 0 4px 12px ${C.brandGlow};
    transition: all .22s ease;
  }
  .qd-btn-primary:hover:not(:disabled) { box-shadow: 0 6px 20px ${C.brandGlow}; transform: translateY(-1px); }
  .qd-btn-primary:disabled { opacity: .4; cursor: not-allowed; transform: none; }
  .qd-btn-secondary {
    background: ${C.cardBg}; color: ${C.textSub};
    border: 1px solid ${C.border}; border-radius: 12px;
    padding: 14px 24px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif;
    box-shadow: 0 1px 3px rgba(0,0,0,.04); transition: all .22s ease;
  }
  .qd-btn-secondary:hover:not(:disabled) { border-color: ${C.borderHov}; background: #f8fafc; transform: translateY(-1px); }
  .qd-btn-secondary:disabled { opacity: .4; cursor: not-allowed; transform: none; }
  .qd-input {
    width: 100%; padding: 10px 14px; font-size: 13.5px; font-weight: 400;
    border: 1px solid ${C.border}; border-radius: 10px; font-family: 'Inter', sans-serif;
    color: ${C.text}; background: ${C.cardBg}; outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .qd-input:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(129,140,248,.18); }
  .qd-lbl { font-size: 10.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: ${C.textMuted}; font-family: 'Inter', sans-serif; }
  .qd-section-title { font-size: clamp(20px,2.5vw,26px); font-weight: 800; letter-spacing: -.02em; color: ${C.text}; margin: 0; font-family: 'Inter', sans-serif; }
  .qd-section-sub { font-size: 14px; color: ${C.textSub}; margin-top: 6px; font-weight: 400; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .fade-in { animation: qdfin .35s cubic-bezier(.16,1,.3,1) both; }
  @keyframes qdfin { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
  .serving-num { font-family: 'Inter', sans-serif; font-weight: 900; font-variant-numeric: tabular-nums; color: ${C.brand}; line-height: 1; }
`;

interface PageProps {
    params: Promise<{ queueId: string }>;
}

type ActiveSection = "queues" | "qrcode" | "announcement" | "history";

export default function QueueDetailPage({ params }: PageProps) {
    const { queueId } = use(params);
    const token = getToken();
    const user = getCurrentUser();
    const isStaff = user?.role === "staff";
    const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";
    const { toast } = useToast();

    const { state, status } = useQueueSocket(queueId, { token: token || undefined });

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [activeSection, setActiveSection] = useState<ActiveSection>("queues");
    const [selectedToken, setSelectedToken] = useState<TokenDetailData | null>(null);
    // Track token numbers added via admin "Add Customer" so we can label them Manual
    const [manuallyAddedTokens, setManuallyAddedTokens] = useState<Set<number>>(new Set());
    // History section for this queue
    const [queueHistory, setQueueHistory] = useState<TokenHistoryItem[]>([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyLoading, setHistoryLoading] = useState(false);
    const HISTORY_PAGE_SIZE = 15;
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [inviteNumber, setInviteNumber] = useState("");
    const [removeNumber, setRemoveNumber] = useState("");
    const [tokenToRemove, setTokenToRemove] = useState<{ id: string, number: number } | null>(null);
    const [announcementInput, setAnnouncementInput] = useState("");
    const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
    const [waitingSearch, setWaitingSearch] = useState("");
    const [recentSearch, setRecentSearch] = useState("");
    const [waitingPage, setWaitingPage] = useState(1);
    const [recentPage, setRecentPage] = useState(1);
    const PAGE_SIZE = 10;
    const router = useRouter();

    const filteredWaiting = React.useMemo(() => {
        if (!state?.waiting_tokens) return [];
        const filtered = waitingSearch
            ? state.waiting_tokens.filter(t =>
                String(t.token_number).includes(waitingSearch) ||
                t.customer_name?.toLowerCase().includes(waitingSearch.toLowerCase()) ||
                t.customer_phone?.includes(waitingSearch)
            )
            : state.waiting_tokens;
        return filtered;
    }, [state?.waiting_tokens, waitingSearch]);

    const paginatedWaiting = React.useMemo(() => {
        const start = (waitingPage - 1) * PAGE_SIZE;
        return filteredWaiting.slice(start, start + PAGE_SIZE);
    }, [filteredWaiting, waitingPage]);

    const filteredRecent = React.useMemo(() => {
        if (!state?.recent_tokens) return [];
        const filtered = recentSearch
            ? state.recent_tokens.filter(t =>
                String(t.token_number).includes(recentSearch) ||
                t.customer_name?.toLowerCase().includes(recentSearch.toLowerCase()) ||
                t.customer_phone?.includes(recentSearch)
            )
            : state.recent_tokens;
        return filtered;
    }, [state?.recent_tokens, recentSearch]);

    const paginatedRecent = React.useMemo(() => {
        const start = (recentPage - 1) * PAGE_SIZE;
        return filteredRecent.slice(start, start + PAGE_SIZE);
    }, [filteredRecent, recentPage]);

    React.useEffect(() => { setWaitingPage(1); }, [waitingSearch]);
    React.useEffect(() => { setRecentPage(1); }, [recentSearch]);

    const [initialQueue, setInitialQueue] = useState<QueueResponse | null>(null);

    // Debounce ref to prevent double-click spam
    const lastActionRef = useRef(0);
    const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial fetch for queue details (REST backup for WS)
    useEffect(() => {
        api.getQueue(queueId)
            .then(setInitialQueue)
            .catch(() => { /* ignore, WS snapshot is primary */ });
    }, [queueId]);

    const isDisabled = actionLoading !== null; // Don't block on socket status for manual entry

    // Auto-clear error after 5s
    const setErrorWithTimer = useCallback((msg: string) => {
        setActionError(msg);
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setActionError(null), 5000);
    }, []);

    const performAction = useCallback(async (
        actionName: string,
        fn: () => Promise<unknown>,
        successMsg?: string
    ) => {
        const now = Date.now();
        if (now - lastActionRef.current < 400) return;
        lastActionRef.current = now;

        setActionLoading(actionName);
        setActionError(null);
        try {
            await fn();
            if (successMsg) toast(successMsg, "success");
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setErrorWithTimer(err.detail);
                toast(err.detail, "error");
            } else {
                setErrorWithTimer("Action failed. Please try again.");
                toast("Action failed. Please try again.", "error");
            }
        } finally {
            setActionLoading(null);
        }
    }, [toast, setErrorWithTimer]);

    const handleNext = useCallback(async () => {
        const prefix = state?.prefix ?? "";
        await performAction("next", async () => {
            const res = await api.callNext(queueId, "done");
            if ("message" in res) {
                toast(res.message, "info");
            } else {
                toast(`${prefix}${res.serving} is now serving`, "success");
            }
        });
    }, [performAction, queueId, state?.prefix, toast]);

    const handleSkip = useCallback(() => setShowSkipConfirm(true), []);
    const handleConfirmSkip = useCallback(async () => {
        setShowSkipConfirm(false);
        const prefix = state?.prefix ?? "";
        await performAction("skip", async () => {
            const res = await api.callNext(queueId, "skipped");
            if ("message" in res) {
                toast(res.message, "info");
            } else {
                toast(`${prefix}${res.serving} is now serving`, "success");
            }
        });
    }, [performAction, queueId, state?.prefix, toast]);

    const handleReset = useCallback(async () => {
        setResetting(true);
        setActionError(null);
        try {
            await api.resetQueue(queueId);
            toast("Queue reset successfully", "success");
            setShowResetConfirm(false);
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to reset queue");
            setShowResetConfirm(false);
        } finally {
            setResetting(false);
        }
    }, [queueId, toast]);

    const handleDelete = useCallback(async () => {
        setDeleting(true);
        setActionError(null);
        try {
            await api.deleteQueue(queueId);
            toast("Queue deleted successfully", "success");
            router.push(`${dashBase}/queues`);
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to delete queue");
            setShowDeleteConfirm(false);
        } finally {
            setDeleting(false);
        }
    }, [queueId, router, dashBase, toast]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [addName, setAddName] = useState("");
    const [addPhone, setAddPhone] = useState("");
    const [addAge, setAddAge] = useState("");

    const handleAddCustomer = useCallback(async () => {
        const phoneDigits = addPhone.replace(/\D/g, "");
        if (!addName.trim() || phoneDigits.length !== 10) {
            toast("Please enter name and 10 digit phone number", "error");
            return;
        }
        setActionLoading("add");
        setActionError(null);
        try {
            const res = await api.adminJoin(queueId, {
                name: addName.trim(),
                phone: phoneDigits,
                age: addAge ? parseInt(addAge, 10) : undefined,
            });
            toast(`Token ${state?.prefix || ""}${res.token_number} created`, "success");
            // Mark as manually added so we can display correct entry type
            setManuallyAddedTokens(prev => new Set(prev).add(res.token_number));
            setShowAddForm(false);
            setAddName(""); setAddPhone(""); setAddAge("");
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to add customer");
        } finally {
            setActionLoading(null);
        }
    }, [queueId, addName, addPhone, addAge, state?.prefix, toast]);

    const handleInvite = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteNumber) return;
        const num = parseInt(inviteNumber, 10);
        if (isNaN(num)) return;

        setActionLoading("invite");
        setActionError(null);
        try {
            await api.serveSpecificToken(queueId, num);
            toast(`Token ${state?.prefix || ""}${num} is now serving`, "success");
            setInviteNumber("");
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to invite token: it might not be waiting or doesn't exist.");
        } finally {
            setActionLoading(null);
        }
    }, [queueId, inviteNumber, state?.prefix, toast]);

    const handleRemoveByNumber = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        setActionError(null);
        if (!removeNumber) return;
        const num = parseInt(removeNumber, 10);
        if (isNaN(num)) return;

        const token = state?.waiting_tokens?.find((t) => t.token_number === num);
        if (!token) {
            setActionError(`Token ${state?.prefix || ""}${num} is not currently waiting.`);
            return;
        }

        setTokenToRemove({ id: token.id, number: token.token_number });
        setRemoveNumber("");
    }, [removeNumber, state?.waiting_tokens, state?.prefix]);

    const handleConfirmRemove = useCallback(async () => {
        if (!tokenToRemove) return;
        setActionLoading("remove");
        setActionError(null);
        try {
            await api.removeToken(tokenToRemove.id);
            toast(`Token ${state?.prefix || ""}${tokenToRemove.number} removed`, "success");
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to remove token");
        } finally {
            setActionLoading(null);
            setTokenToRemove(null);
        }
    }, [tokenToRemove, state?.prefix, toast]);

    // ── Announcement ───────────────────────────────────────────────
    useEffect(() => {
        if (!isEditingAnnouncement) {
            setAnnouncementInput(state?.announcement ?? initialQueue?.announcement ?? "");
        }
    }, [state?.announcement, initialQueue?.announcement, isEditingAnnouncement]);

    const handleUpdateAnnouncement = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading("announcement");
        setActionError(null);
        try {
            await api.updateQueueAnnouncement(queueId, announcementInput.trim());
            toast("Announcement updated", "success");
            setIsEditingAnnouncement(false);
        } catch (err: unknown) {
            if (err instanceof ApiError) setActionError(err.detail);
            else setActionError("Failed to update announcement");
        } finally {
            setActionLoading(null);
        }
    }, [queueId, announcementInput, toast]);

    // ── Keyboard shortcuts ─────────────────────────────────────────
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
            if (showSkipConfirm) return;

            if (e.key === "Enter" && !isDisabled) {
                e.preventDefault();
                handleNext();
            }
            if ((e.key === "s" || e.key === "S") && !isDisabled) {
                e.preventDefault();
                handleSkip();
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isDisabled, handleNext, handleSkip, showSkipConfirm, state?.current_serving]);

    // ── Cleanup timers on unmount ──────────────────────────────────
    useEffect(() => {
        return () => {
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        };
    }, []);

    const queueName = state?.queue_name || initialQueue?.name || "Queue";

    // ── Inner sidebar nav items ───────────────────────────────────
    const navItems: { id: ActiveSection; label: string; icon: React.ReactNode }[] = [
        {
            id: "queues",
            label: "Dashboard / Queues",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
            ),
        },
        {
            id: "qrcode",
            label: "QR Code",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
            ),
        },
        {
            id: "announcement",
            label: "Public Announcement",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
            ),
        },
        {
            id: "history" as ActiveSection,
            label: "History",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
    ];

    if (!isMounted) {
        return (
            <div className="flex flex-col items-center justify-center w-full min-h-screen grow" style={{ background: "#f7f8fa" }}>
                <span className="w-8 h-8 mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
                <span className="text-sm font-medium text-gray-500">Loading Queue...</span>
            </div>
        );
    }

    return (
        <>
        <style>{QD_STYLES}</style>
        <div className="qd-root flex w-full h-full" style={{ background: C.pageBg }}>
            {/* ── Queue Inner Sidebar ─────────────────────────────── */}
            <aside className="qd-sidebar hidden md:flex w-60 flex-shrink-0 flex-col sticky top-0 h-full">
                {/* Back link */}
                <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${C.border}` }}>
                    <Link
                        href={`${dashBase}/sessions`}
                        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: C.textMuted, textDecoration: "none", transition: "color .18s" }}
                        onMouseEnter={e => (e.currentTarget.style.color = C.brand)}
                        onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                        Back to Sessions
                    </Link>
                </div>

                {/* Queue name badge */}
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
                    <p className="qd-lbl" style={{ marginBottom: 6 }}>Managing Queue</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{queueName}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: (state?.is_active ?? initialQueue?.is_active) ? C.green : C.red, display: "inline-block", boxShadow: (state?.is_active ?? initialQueue?.is_active) ? `0 0 6px ${C.green}60` : "none" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: (state?.is_active ?? initialQueue?.is_active) ? C.green : C.red }}>
                            {(state?.is_active ?? initialQueue?.is_active) ? "Active" : "Inactive"}
                        </span>
                    </div>
                </div>

                {/* Nav items */}
                <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
                    <p className="qd-lbl" style={{ padding: "0 8px", marginBottom: 10 }}>Queue Management</p>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`qd-nav-item${activeSection === item.id ? " active" : ""}`}
                            style={{ marginBottom: 2 }}
                        >
                            <span style={{ color: activeSection === item.id ? "rgba(255,255,255,.85)" : C.textMuted, flexShrink: 0 }}>{item.icon}</span>
                            <span style={{ flex: 1 }}>{item.label}</span>
                            {item.id === "announcement" && (state?.announcement || initialQueue?.announcement) && (
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: activeSection === item.id ? "rgba(255,255,255,.6)" : C.brand, display: "inline-block", flexShrink: 0 }} />
                            )}
                        </button>
                    ))}
                </nav>

                {/* Connection status */}
                <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
                    <ConnectionBadge status={status} />
                </div>
            </aside>

            {/* ── Main Content ───────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: "auto", background: C.pageBg }}>
                <div style={{ padding: "32px 32px 48px", maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

                    {/* ── SECTION: Dashboard / Queues ─────────────────── */}
                    {activeSection === "queues" && (
                        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                            {/* Header row */}
                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                                <div style={{ position: "relative", overflow: "hidden" }}>
                                    <h1 className="qd-section-title">{queueName}</h1>
                                    <p style={{ fontSize: 13.5, color: C.textSub, marginTop: 6, fontWeight: 400 }}>
                                        Prefix: <span className="mono" style={{ fontWeight: 700, color: C.brand }}>{state?.prefix || initialQueue?.prefix || "—"}</span>
                                    </p>
                                </div>

                                {!isStaff && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                        <button
                                            onClick={() => setShowResetConfirm(true)}
                                            disabled={isDisabled || resetting}
                                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, borderRadius: 9, border: `1px solid ${C.amberBorder}`, background: C.amberBg, color: C.amber, cursor: "pointer", transition: "all .2s" }}
                                            aria-label="Reset Queue"
                                        >
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            Reset
                                        </button>
                                        <a
                                            href={`/display/${queueId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, borderRadius: 9, border: `1px solid ${C.brandBorder}`, background: C.brandLight, color: C.brand, textDecoration: "none", transition: "all .2s" }}
                                            aria-label="Open Display View"
                                        >
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            Display
                                        </a>
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, borderRadius: 9, border: `1px solid ${C.redBorder}`, background: C.redBg, color: C.red, cursor: "pointer", transition: "all .2s" }}
                                            aria-label="Delete Queue"
                                        >
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>

                        {/* Main Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left column: Now Serving + Actions */}
                            <div className="lg:col-span-2 space-y-5">
                                {/* Big serving indicator */}
                                <div className="qd-card" style={{ padding: "40px 32px", textAlign: "center", minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                                    <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, background: `radial-gradient(circle, ${C.brandGlow} 0%, transparent 70%)`, pointerEvents: "none" }} />
                                    <p className="qd-lbl" style={{ marginBottom: 12, letterSpacing: ".12em" }}>Now Serving</p>
                                    <div className="serving-num" style={{ fontSize: "clamp(72px,12vw,120px)" }} aria-live="polite" aria-atomic="true">
                                        {state?.prefix || ""}{state?.current_serving || 0}
                                    </div>

                                    {state?.serving_details && (
                                        <div className="fade-in" style={{ marginTop: 8, textAlign: "center" }}>
                                            <p style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{state.serving_details.customer_name}</p>
                                            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "4px 12px", marginTop: 4, fontSize: 13.5, color: C.textMuted, fontWeight: 500 }}>
                                                {state.serving_details.customer_age != null && <span>Age {state.serving_details.customer_age}</span>}
                                                {state.serving_details.customer_age != null && <span>·</span>}
                                                <span>{state.serving_details.customer_phone}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 20, fontSize: 13.5, color: C.textMuted }}>
                                        <span>Waiting: <strong style={{ color: C.text, fontWeight: 700 }}>{state?.waiting_count ?? 0}</strong></span>
                                        <span style={{ color: C.borderLight }}>|</span>
                                        <span>Issued: <strong style={{ color: C.text, fontWeight: 700 }}>{state?.total_issued ?? 0}</strong></span>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }} role="toolbar" aria-label="Queue actions">
                                    <button
                                        onClick={handleNext}
                                        disabled={isDisabled}
                                        className="qd-btn-primary"
                                        style={{ gridColumn: "1", fontSize: 15 }}
                                        aria-label="Call next token"
                                    >
                                        {actionLoading === "next" ? (
                                            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                                <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,.3)", borderTopColor: "#fff", display: "inline-block", animation: "spin .8s linear infinite" }} />
                                                Calling...
                                            </span>
                                        ) : "Call Next"}
                                    </button>

                                    <button
                                        onClick={handleSkip}
                                        disabled={isDisabled}
                                        className="qd-btn-secondary"
                                        style={{ color: C.amber, borderColor: C.amberBorder }}
                                        aria-label="Skip current token"
                                    >
                                        {actionLoading === "skip" ? "Skipping..." : "Skip"}
                                    </button>

                                    <button
                                        onClick={() => performAction("done", async () => {
                                            const res = await api.callNext(queueId, "done");
                                            if ("message" in res) toast(res.message, "info");
                                            else toast(`${state?.prefix || ""}${res.serving} is now serving`, "success");
                                        })}
                                        disabled={isDisabled}
                                        className="qd-btn-secondary"
                                        style={{ color: C.green, borderColor: C.greenBorder }}
                                        aria-label="Mark done and call next"
                                    >
                                        {actionLoading === "done" ? "Completing..." : "Done & Next"}
                                    </button>
                                </div>
                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

                                {/* Extended Manual Controls */}
                                <div className="flex flex-col md:flex-row gap-6 border-t border-gray-100 pt-6">
                                    <div className="flex-1 space-y-2">
                                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Manual Entry</p>
                                        {!showAddForm ? (
                                            <button
                                                onClick={() => setShowAddForm(true)}
                                                disabled={isDisabled}
                                                className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                </svg>
                                                Add Customer
                                            </button>
                                        ) : (
                                            <div className="space-y-2">
                                                <input type="text" value={addName} onChange={e => setAddName(e.target.value)} placeholder="Full Name *" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                                <input type="tel" value={addPhone} onChange={e => setAddPhone(e.target.value)} placeholder="Phone *" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                                <input type="number" value={addAge} onChange={e => setAddAge(e.target.value)} placeholder="Age (optional)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                                <div className="flex gap-2">
                                                    <button onClick={handleAddCustomer} disabled={!addName.trim() || !addPhone.trim() || actionLoading === "add" || isDisabled} className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors">
                                                        {actionLoading === "add" ? "Adding..." : "Confirm"}
                                                    </button>
                                                    <button onClick={() => { setShowAddForm(false); setAddName(""); setAddPhone(""); setAddAge(""); }} className="flex-1 py-2 bg-gray-50 border border-gray-200 text-gray-600 font-semibold rounded-lg text-sm hover:bg-gray-100 transition-colors">
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Invite by Number</p>
                                        <form onSubmit={handleInvite} className="flex gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                value={inviteNumber}
                                                onChange={(e) => setInviteNumber(e.target.value)}
                                                placeholder="Token #"
                                                disabled={isDisabled || actionLoading === "invite"}
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!inviteNumber || isDisabled || actionLoading === "invite"}
                                                className="px-6 py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Call
                                            </button>
                                        </form>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Remove by Number</p>
                                        <form onSubmit={handleRemoveByNumber} className="flex gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                value={removeNumber}
                                                onChange={(e) => setRemoveNumber(e.target.value)}
                                                placeholder="Token #"
                                                disabled={isDisabled || actionLoading === "remove"}
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!removeNumber || isDisabled || actionLoading === "remove"}
                                                className="px-6 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Remove
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* Error / status banners */}
                                {actionError && (
                                    <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-200 text-sm font-medium">
                                        {actionError}
                                    </div>
                                )}
                                {status === "disconnected" && (
                                    <div role="alert" className="bg-amber-50 text-amber-800 px-4 py-3 rounded-lg border border-amber-200 text-sm">
                                        <strong>Connection lost.</strong> Retrying connection to live updates. Manual actions are still available.
                                    </div>
                                )}
                                {status === "reconnecting" && (
                                    <div role="status" className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg border border-blue-200 text-sm flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" aria-hidden="true" />
                                        Reconnecting to live updates...
                                    </div>
                                )}
                            </div>

                            {/* Right column: Waiting List & Recent Tokens */}
                            <div className="space-y-6">
                                {/* Waiting List */}
                                <aside className="qd-card overflow-hidden flex flex-col" aria-label="Waiting list">
                                    <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 10, background: "linear-gradient(180deg,#fafbfd,#fff)", borderRadius: "14px 14px 0 0" }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <h2 style={{ fontSize: 13.5, fontWeight: 700, color: C.text, margin: 0 }}>Waiting List</h2>
                                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: C.brandLight, color: C.brand }}>{state?.waiting_count ?? 0}</span>
                                        </div>
                                        <div style={{ position: "relative" }}>
                                            <span style={{ position: "absolute", inset: "0 auto 0 0", display: "flex", alignItems: "center", paddingLeft: 10, pointerEvents: "none" }}>
                                                <svg width="14" height="14" fill="none" stroke={C.textMuted} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                            </span>
                                            <input
                                                type="text"
                                                placeholder="Search token..."
                                                value={waitingSearch}
                                                onChange={(e) => setWaitingSearch(e.target.value)}
                                                className="qd-input"
                                                style={{ paddingLeft: 32, paddingTop: 8, paddingBottom: 8, fontSize: 13 }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto max-h-[320px] divide-y divide-gray-50">
                                        {paginatedWaiting.length > 0 ? (
                                            paginatedWaiting.map((t: WaitingToken) => (
                                                <div key={t.id} className="px-5 py-3 group hover:bg-gray-50 transition-colors">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-lg font-bold text-gray-900 tabular-nums w-14">
                                                                {state?.prefix || ""}{t.token_number}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                                                                Waiting
                                                            </span>
                                                            {manuallyAddedTokens.has(t.token_number) ? (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-violet-100 text-violet-700">
                                                                    Manual
                                                                </span>
                                                            ) : (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-700">
                                                                    Normal
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => setSelectedToken({
                                                                    token_number: t.token_number,
                                                                    prefix: state?.prefix || "",
                                                                    customer_name: t.customer_name,
                                                                    customer_age: t.customer_age,
                                                                    customer_phone: t.customer_phone,
                                                                    status: t.status,
                                                                    entry_type: manuallyAddedTokens.has(t.token_number) ? "manual" : "qr",
                                                                    queue_name: queueName,
                                                                })}
                                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                                                aria-label={`View details for token ${t.token_number}`}
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => setTokenToRemove({ id: t.id, number: t.token_number })}
                                                                className="opacity-0 group-hover:opacity-100 text-xs font-semibold px-2 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-all focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                                                aria-label={`Remove token ${t.token_number}`}
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {t.customer_name && (
                                                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 pl-[68px]">
                                                            <span className="font-medium text-gray-700">{t.customer_name}</span>
                                                            {t.customer_age != null && <span>Age: {t.customer_age}</span>}
                                                            <span>{t.customer_phone}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-5 py-10 text-center text-sm text-gray-400 flex flex-col items-center">
                                                <svg className="w-8 h-8 text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                {waitingSearch ? "No tokens match your search" : "No one is waiting"}
                                            </div>
                                        )}
                                    </div>
                                    {filteredWaiting.length > PAGE_SIZE && (
                                        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                                            <span>Showing {paginatedWaiting.length} of {filteredWaiting.length}</span>
                                            <div className="flex gap-1">
                                                <button onClick={() => setWaitingPage(p => Math.max(1, p - 1))} disabled={waitingPage === 1} className="px-2 py-1 rounded bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-100">Prev</button>
                                                <button onClick={() => setWaitingPage(p => p + 1)} disabled={waitingPage * PAGE_SIZE >= filteredWaiting.length} className="px-2 py-1 rounded bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-100">Next</button>
                                            </div>
                                        </div>
                                    )}
                                </aside>

                                {/* Recent Activity */}
                                <aside className="qd-card overflow-hidden flex flex-col" aria-label="Recent activity">
                                    <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 10, background: "linear-gradient(180deg,#fafbfd,#fff)", borderRadius: "14px 14px 0 0" }}>
                                        <h2 style={{ fontSize: 13.5, fontWeight: 700, color: C.text, margin: 0 }}>Recent Activity</h2>
                                        <div style={{ position: "relative" }}>
                                            <span style={{ position: "absolute", inset: "0 auto 0 0", display: "flex", alignItems: "center", paddingLeft: 10, pointerEvents: "none" }}>
                                                <svg width="14" height="14" fill="none" stroke={C.textMuted} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                            </span>
                                            <input
                                                type="text"
                                                placeholder="Search recent..."
                                                value={recentSearch}
                                                onChange={(e) => setRecentSearch(e.target.value)}
                                                className="qd-input"
                                                style={{ paddingLeft: 32, paddingTop: 8, paddingBottom: 8, fontSize: 13 }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto max-h-[250px] divide-y divide-gray-50">
                                        {paginatedRecent.length > 0 ? (
                                            paginatedRecent.map((t: RecentToken, i: number) => (
                                                <RecentTokenRow
                                                    key={`${t.token_number}-${i}`}
                                                    token={t}
                                                    prefix={state?.prefix || ""}
                                                    queueName={queueName}
                                                    isManual={manuallyAddedTokens.has(t.token_number)}
                                                    onView={setSelectedToken}
                                                />
                                            ))
                                        ) : (
                                            <div className="px-5 py-10 text-center text-sm text-gray-400 flex flex-col items-center">
                                                <svg className="w-8 h-8 text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                                {recentSearch ? "No tokens match your search" : "No recent activity"}
                                            </div>
                                        )}
                                    </div>
                                    {filteredRecent.length > PAGE_SIZE && (
                                        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                                            <span>Showing {paginatedRecent.length} of {filteredRecent.length}</span>
                                            <div className="flex gap-1">
                                                <button onClick={() => setRecentPage(p => Math.max(1, p - 1))} disabled={recentPage === 1} className="px-2 py-1 rounded bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-100">Prev</button>
                                                <button onClick={() => setRecentPage(p => p + 1)} disabled={recentPage * PAGE_SIZE >= filteredRecent.length} className="px-2 py-1 rounded bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-100">Next</button>
                                            </div>
                                        </div>
                                    )}
                                </aside>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SECTION: QR Code ─────────────────────────────── */}
                {activeSection === "qrcode" && (
                    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <div>
                            <h1 className="qd-section-title">QR Code</h1>
                            <p className="qd-section-sub">Share this QR code or link so customers can join the queue from their phones.</p>
                        </div>

                        <div className="max-w-md">
                            <QueueQRCode
                                queueId={queueId}
                                queueName={queueName}
                                isCollapsible={false}
                            />
                        </div>
                    </div>
                )}

                {/* ── SECTION: Public Announcement ─────────────────── */}
                {activeSection === "announcement" && (
                    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <div>
                            <h1 className="qd-section-title">Public Announcement</h1>
                            <p className="qd-section-sub">Set a message that will be displayed to all customers currently waiting in the queue.</p>
                        </div>

                        <div className="qd-card" style={{ padding: 28, maxWidth: 640 }}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-widest">Announcement</h3>
                                {(state?.announcement || initialQueue?.announcement) && !isEditingAnnouncement && (
                                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Active</span>
                                )}
                            </div>

                            {isEditingAnnouncement ? (
                                <form onSubmit={handleUpdateAnnouncement} className="space-y-3">
                                    <textarea
                                        value={announcementInput}
                                        onChange={(e) => setAnnouncementInput(e.target.value)}
                                        placeholder="Enter a message to display to all customers waiting..."
                                        disabled={isDisabled || actionLoading === "announcement"}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={isDisabled || actionLoading === "announcement"}
                                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading === "announcement" ? "Saving..." : "Save Announcement"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingAnnouncement(false)}
                                            disabled={isDisabled || actionLoading === "announcement"}
                                            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div>
                                    {(state?.announcement ?? initialQueue?.announcement) ? (
                                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-gray-800 text-sm whitespace-pre-wrap mb-4 leading-relaxed">
                                            {state?.announcement ?? initialQueue?.announcement}
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center mb-4">
                                            <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                            </svg>
                                            <p className="text-sm text-gray-400 italic">No active announcement. Set one below to inform waiting customers.</p>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setIsEditingAnnouncement(true)}
                                        disabled={isDisabled}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        {(state?.announcement ?? initialQueue?.announcement) ? "Edit Announcement" : "Set Announcement"}
                                    </button>
                                </div>
                            )}

                            {actionError && (
                                <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-200 text-sm font-medium">
                                    {actionError}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── SECTION: History ──────────────────────────────── */}
                {activeSection === "history" && (
                    <QueueHistory
                        queueId={queueId}
                        queueName={queueName}
                        prefix={state?.prefix || initialQueue?.prefix || ""}
                        queueHistory={queueHistory}
                        setQueueHistory={setQueueHistory}
                        historyTotal={historyTotal}
                        setHistoryTotal={setHistoryTotal}
                        historyPage={historyPage}
                        setHistoryPage={setHistoryPage}
                        historyLoading={historyLoading}
                        setHistoryLoading={setHistoryLoading}
                        historyPageSize={HISTORY_PAGE_SIZE}
                        manuallyAddedTokens={manuallyAddedTokens}
                        onViewToken={setSelectedToken}
                    />
                )}
                </div>
            </div>

            {/* ── Modals ─────────────────────────────────────────── */}
            <ConfirmModal
                isOpen={showSkipConfirm}
                title="Skip Current Token?"
                message={`This will skip token ${state?.prefix || ""}${state?.current_serving || 0} and move to the next waiting token.`}
                confirmLabel="Skip Token"
                confirmVariant="danger"
                onConfirm={handleConfirmSkip}
                onCancel={() => setShowSkipConfirm(false)}
                isLoading={actionLoading === "skip"}
            />
            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Queue"
                message={`Are you sure you want to permanently delete the queue "${state?.queue_name || "this queue"}"? All associated tokens and data will be lost forever.`}
                confirmLabel="Delete Queue"
                confirmVariant="danger"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                isLoading={deleting}
            />
            <ConfirmModal
                isOpen={showResetConfirm}
                title="Reset Queue"
                message={`Are you sure you want to reset the queue "${state?.queue_name || "this queue"}"? This will delete all tokens and reset the current serving number to 0. This cannot be undone.`}
                confirmLabel="Reset Queue"
                confirmVariant="danger"
                onConfirm={handleReset}
                onCancel={() => setShowResetConfirm(false)}
                isLoading={resetting}
            />
            <ConfirmModal
                isOpen={!!tokenToRemove}
                title="Remove Customer"
                message={`Are you sure you want to remove token ${state?.prefix || ""}${tokenToRemove?.number} from the waiting list? They will be permanently marked as deleted.`}
                confirmLabel="Remove Token"
                confirmVariant="danger"
                onConfirm={handleConfirmRemove}
                onCancel={() => setTokenToRemove(null)}
                isLoading={actionLoading === "remove"}
            />
            <TokenDetailModal token={selectedToken} onClose={() => setSelectedToken(null)} />
        </div>
        </>
    );
}

// ── Memoized row to prevent re-render storms on frequent updates ──
const RecentTokenRow = React.memo(function RecentTokenRow({
    token: t,
    prefix,
    queueName,
    isManual,
    onView,
}: {
    token: RecentToken;
    prefix: string;
    queueName?: string;
    isManual?: boolean;
    onView?: (data: TokenDetailData) => void;
}) {
    const statusStyles: Record<string, string> = {
        serving: "bg-blue-100 text-blue-700",
        done: "bg-emerald-100 text-emerald-700",
        skipped: "bg-gray-100 text-gray-400",
        deleted: "bg-red-100 text-red-700",
        waiting: "bg-amber-100 text-amber-700",
    };

    return (
        <div className="px-5 py-3 group hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900 tabular-nums w-14">
                        {prefix}{t.token_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusStyles[t.status] || "bg-gray-100 text-gray-500"}`}>
                        {t.status}
                    </span>
                    {isManual ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-violet-100 text-violet-700">
                            Manual
                        </span>
                    ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-700">
                            Normal
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {onView && (
                        <button
                            onClick={() => onView({
                                token_number: t.token_number,
                                prefix,
                                customer_name: t.customer_name,
                                customer_age: t.customer_age,
                                customer_phone: t.customer_phone,
                                status: t.status,
                                served_at: t.served_at,
                                entry_type: isManual ? "manual" : "qr",
                                queue_name: queueName,
                            })}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            aria-label={`View token ${t.token_number} details`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                    )}
                    <span className="text-xs text-gray-400 tabular-nums">
                        {t.served_at ? new Date(t.served_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                </div>
            </div>
            {t.customer_name && (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 pl-[68px]">
                    <span className="font-medium text-gray-700">{t.customer_name}</span>
                    {t.customer_age != null && <span>Age: {t.customer_age}</span>}
                    <span>{t.customer_phone}</span>
                </div>
            )}
        </div>
    );
});

// ── Queue History Sub-Component ────────────────────────────────
function QueueHistory({
    queueId,
    queueName,
    prefix,
    queueHistory,
    setQueueHistory,
    historyTotal,
    setHistoryTotal,
    historyPage,
    setHistoryPage,
    historyLoading,
    setHistoryLoading,
    historyPageSize,
    manuallyAddedTokens,
    onViewToken,
}: {
    queueId: string;
    queueName: string;
    prefix: string;
    queueHistory: TokenHistoryItem[];
    setQueueHistory: (data: TokenHistoryItem[]) => void;
    historyTotal: number;
    setHistoryTotal: (tot: number) => void;
    historyPage: number;
    setHistoryPage: (p: number | ((prev: number) => number)) => void;
    historyLoading: boolean;
    setHistoryLoading: (loading: boolean) => void;
    historyPageSize: number;
    manuallyAddedTokens: Set<number>;
    onViewToken: (token: TokenDetailData) => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Reset to page 1 on filter changes
    useEffect(() => {
        setHistoryPage(1);
    }, [debouncedSearch, statusFilter, setHistoryPage]);

    useEffect(() => {
        setHistoryLoading(true);
        api.getHistory({
            queueId,
            search: debouncedSearch || undefined,
            status: statusFilter || undefined,
            limit: historyPageSize,
            offset: (historyPage - 1) * historyPageSize
        })
            .then((res) => {
                setQueueHistory(res.items);
                setHistoryTotal(res.total);
            })
            .catch(console.error)
            .finally(() => {
                setHistoryLoading(false);
            });
    }, [queueId, historyPage, historyPageSize, statusFilter, debouncedSearch, setQueueHistory, setHistoryTotal, setHistoryLoading]);

    const calcWaitTime = (created: string | null, served: string | null) => {
        if (!served || !created) return "—";
        const mins = Math.floor((new Date(served).getTime() - new Date(created).getTime()) / 60000);
        return mins < 0 ? "—" : mins === 0 ? "< 1 min" : `${mins} min${mins !== 1 ? "s" : ""}`;
    };

    const totalPages = Math.ceil(historyTotal / historyPageSize) || 1;

    return (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
                <div>
                    <h1 className="qd-section-title">Queue History</h1>
                    <p className="qd-section-sub">View past tokens and patient records for this queue.</p>
                </div>
                <div style={{ fontSize: 12.5, color: C.textMuted, fontWeight: 500 }}>
                    {historyTotal > 0 ? <>{historyTotal} record{historyTotal !== 1 ? "s" : ""} found</> : null}
                </div>
            </div>

            {/* Filters Row */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px] space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Search Patients</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Name, token #, or phone…"
                                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Status</label>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="block w-36 rounded-xl border-gray-200 bg-gray-50 text-sm py-2 px-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all cursor-pointer"
                        >
                            <option value="">All</option>
                            <option value="done">Completed</option>
                            <option value="skipped">Skipped</option>
                            <option value="serving">Serving</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">Token</th>
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px]">Patient</th>
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">Status</th>
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">Type</th>
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">Wait Time</th>
                                <th className="px-5 py-3.5 font-black text-gray-400 uppercase tracking-widest text-[10px] whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {historyLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                                            <span>Loading records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : queueHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">No matching history found for this queue.</td>
                                </tr>
                            ) : (
                                queueHistory.map(item => {
                                    const isManual = manuallyAddedTokens.has(item.token_number);
                                    const styles: Record<string, string> = {
                                        done: "bg-emerald-100 text-emerald-700",
                                        serving: "bg-blue-100 text-blue-700",
                                        skipped: "bg-gray-100 text-gray-500",
                                        waiting: "bg-amber-100 text-amber-700",
                                        deleted: "bg-red-100 text-red-700",
                                    };
                                    const labels: Record<string, string> = {
                                        done: "Completed", serving: "Serving", skipped: "Skipped", waiting: "Waiting", deleted: "Removed",
                                    };

                                    return (
                                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-5 py-3.5 whitespace-nowrap font-black text-gray-900 tabular-nums">
                                                {item.queue_prefix}{item.token_number}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-gray-900 truncate max-w-[160px]">{item.customer_name || "—"}</span>
                                                    <span className="text-xs text-gray-400">{item.customer_phone || "—"}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${styles[item.status] || "bg-gray-100 text-gray-500"}`}>
                                                    {labels[item.status] || item.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${isManual ? "bg-violet-100 text-violet-700" : "bg-cyan-100 text-cyan-700"}`}>
                                                    {isManual ? "MANUAL" : "NORMAL"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-xs tabular-nums text-gray-500">
                                                {calcWaitTime(item.created_at, item.served_at)}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <button
                                                    onClick={() => onViewToken({
                                                        token_number: item.token_number,
                                                        prefix: item.queue_prefix,
                                                        customer_name: item.customer_name,
                                                        customer_age: item.customer_age,
                                                        customer_phone: item.customer_phone,
                                                        status: item.status,
                                                        created_at: item.created_at,
                                                        served_at: item.served_at,
                                                        completed_at: item.completed_at,
                                                        entry_type: isManual ? "manual" : "qr",
                                                        queue_name: queueName,
                                                    })}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {historyTotal > historyPageSize && (
                    <div className="bg-gray-50/70 px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-gray-500 font-medium">
                            Showing <span className="text-gray-900 font-bold">{(historyPage - 1) * historyPageSize + 1}</span>
                            {" "}–{" "}
                            <span className="text-gray-900 font-bold">{Math.min(historyPage * historyPageSize, historyTotal)}</span>
                            {" "}of{" "}
                            <span className="text-gray-900 font-bold">{historyTotal}</span> patients
                        </p>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => setHistoryPage(1)}
                                disabled={historyPage === 1}
                                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
                            >«</button>
                            <button
                                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                disabled={historyPage === 1}
                                className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
                            >Prev</button>

                            {/* Page numbers */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let p: number;
                                if (totalPages <= 5) p = i + 1;
                                else if (historyPage <= 3) p = i + 1;
                                else if (historyPage >= totalPages - 2) p = totalPages - 4 + i;
                                else p = historyPage - 2 + i;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setHistoryPage(p)}
                                        className={`px-2.5 py-1.5 text-xs font-bold border rounded-lg shadow-sm transition-colors ${p === historyPage
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white border-gray-200 hover:bg-gray-100 text-gray-700"
                                            }`}
                                    >{p}</button>
                                );
                            })}

                            <button
                                onClick={() => setHistoryPage(p => p + 1)}
                                disabled={historyPage >= totalPages}
                                className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
                            >Next</button>
                            <button
                                onClick={() => setHistoryPage(totalPages)}
                                disabled={historyPage >= totalPages}
                                className="px-2.5 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
                            >»</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
