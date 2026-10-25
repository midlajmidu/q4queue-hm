"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/lib/api";
import { useDashBase } from "@/hooks/useDashBase";
import type { QueueResponse } from "@/types/api";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { useBranch } from "@/context/BranchContext";
import { fmtTime, nowInTz } from "@/lib/tzformat";
import ConfirmModal from "@/components/ConfirmModal";
import EditQueueModal from "@/components/EditQueueModal";
import QueueQRCode from "@/components/QueueQRCode";
import QueueCardWatermark from "@/components/QueueCardWatermark";
import ModalPortal from "@/components/ui/ModalPortal";
import { motion, AnimatePresence } from "framer-motion";
import { 
    UserCheck, 
    Trash2, 
    Pencil, 
    Users, 
    Stethoscope, 
    Layers, 
    Building2, 
    QrCode, 
    MoreVertical, 
    ArrowRight, 
    X,
    ExternalLink,
    Clock
} from "lucide-react";

interface Props {
    queue: QueueResponse;
    onToggled: () => void;
    branchType?: "standard" | "dine";
}

/**
 * Hotel & Dining Queue Icon
 * Renders the user-provided icon (/hotel/dine-icon.jpg)
 * seamlessly adapted for dark & light themes with transparent background.
 */
function HotelDineIcon({ className = "h-6 w-auto" }: { className?: string }) {
    return (
        <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
            {/* Light Mode: crisp brand indigo stroke on transparent background */}
            <Image 
                src="/hotel/dine-icon-indigo.png" 
                alt="Hotel & Dining" 
                width={13}
                height={26}
                className="h-full w-auto object-contain block dark:hidden select-none pointer-events-none" 
                unoptimized
            />
            {/* Dark Mode: crisp pure white stroke on transparent background */}
            <Image 
                src="/hotel/dine-icon-light.png" 
                alt="Hotel & Dining" 
                width={13}
                height={26}
                className="h-full w-auto object-contain hidden dark:block select-none pointer-events-none" 
                unoptimized
            />
        </span>
    );
}

const QueueCard = memo(function QueueCard({ queue, onToggled, branchType: propBranchType }: Props) {
    const { user } = useAuth();
    const router = useRouter();
    const dashBase = useDashBase();
    const tz = useBranchTimezone();
    const { branchType: ctxBranchType, settings } = useBranch();
    const isStaff = user?.role === "staff";
    const isGlobalOrOrgAdmin = user?.role === "super_admin" || user?.role === "organization_admin";

    const handleCardClick = () => {
        // If user highlighted text, don't trigger card navigation
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;

        router.push(`${dashBase}/queues/${queue.id}`);
    };

    // ── Branch Domain Module Detection ──
    // The branch's industry template governs all queues in this branch
    const effectiveBranchType = propBranchType || ctxBranchType;
    const isBranchDine = Boolean(
        effectiveBranchType === "dine" ||
        settings?.branch_type === "dine" ||
        queue.industry_template === "dining" ||
        queue.industry_template === "hotel" ||
        (Array.isArray(queue.table_config) && queue.table_config.length > 0)
    );

    const isBranchClinic = Boolean(
        !isBranchDine && (
            queue.industry_template === "clinic" ||
            queue.industry_template === "hospital"
        )
    );

    const domainType: "dine" | "clinic" | "service_lines" | "zone" | "standard" =
        isBranchDine
            ? "dine"
            : isBranchClinic
                ? "clinic"
                : queue.queue_type === "service_lines" || (queue.service_lines && queue.service_lines > 1)
                    ? "service_lines"
                    : queue.queue_type === "zone" || (queue.max_capacity && queue.max_capacity > 0)
                        ? "zone"
                        : "standard";

    // Component State
    const [isActive, setIsActive] = useState(queue.is_active);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [originDelta, setOriginDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [showMenu, setShowMenu] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Calculate click coordinates relative to viewport center so modal expands outward from button
    const handleOpenQrModal = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        if (typeof window !== "undefined") {
            const rect = e.currentTarget.getBoundingClientRect();
            const btnCenterX = rect.left + rect.width / 2;
            const btnCenterY = rect.top + rect.height / 2;
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;
            setOriginDelta({
                x: Math.round(btnCenterX - screenCenterX),
                y: Math.round(btnCenterY - screenCenterY),
            });
        }
        setShowQrModal(true);
    };

    // Close QR modal on Escape key
    useEffect(() => {
        if (!showQrModal) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setShowQrModal(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showQrModal]);

    // Sync local active state
    useEffect(() => {
        setIsActive(queue.is_active);
    }, [queue.is_active]);

    // Close menu on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        }
        if (showMenu) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [showMenu]);

    // Minute ticker for live active time
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => setTick(t => t + 1), 60_000);
        return () => clearInterval(interval);
    }, [isActive]);

    const handleDelete = async () => {
        setDeleting(true);
        setErr(null);
        try {
            await api.deleteQueue(queue.id);
            onToggled();
        } catch (e: unknown) {
            if (e instanceof ApiError) setErr(e.detail);
            else setErr("Failed to delete queue");
            setShowDeleteConfirm(false);
        } finally {
            setDeleting(false);
        }
    };

    // Clean, single-line telemetry
    const formatTime = (iso: string) => fmtTime(iso, tz);

    const renderTelemetry = () => {
        if (!isActive) {
            return (
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Closed · {formatTime(queue.created_at)}</span>
                </div>
            );
        }

        if (queue.open_time && queue.close_time) {
            return (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{queue.open_time} – {queue.close_time}</span>
                </div>
            );
        }

        const diffMs = nowInTz(tz).getTime() - new Date(queue.created_at).getTime();
        const mins = Math.max(0, Math.floor(diffMs / 60_000));
        const days = Math.floor(mins / (60 * 24));
        const hrs = Math.floor((mins % (60 * 24)) / 60);

        if (days >= 1) {
            return (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">Active session · Online</span>
                </div>
            );
        }
        if (hrs > 0) {
            return (
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{hrs}h active session</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{mins}m active session</span>
            </div>
        );
    };

    // Subtitle based on branch domain
    const getSubtitle = () => {
        if (isBranchDine) {
            const tableCount = queue.table_config?.length || 0;
            return tableCount > 0 ? `Dine-in · ${tableCount} Tables` : "Dine-in · Service Area";
        }
        if (isBranchClinic) {
            return "Consultation Room";
        }
        if (domainType === "service_lines") {
            return `Service Lanes · ${queue.service_lines || 1} Lanes`;
        }
        if (domainType === "zone") {
            return `Zone Arena · Max ${queue.max_capacity || 0}`;
        }
        return "Customer Service";
    };

    // Domain Icon Tile: Clean, minimal, solid-styled per branch domain
    const renderDomainIcon = () => {
        if (domainType === "dine") {
            return (
                <div 
                    className="w-10 h-10 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-100/90 dark:border-indigo-800/60 shadow-2xs transition-colors"
                    title="Hotel & Dining Queue"
                >
                    <HotelDineIcon className="h-6 w-auto" />
                </div>
            );
        }
        if (domainType === "clinic") {
            return (
                <div 
                    className="w-10 h-10 rounded-xl bg-emerald-500/[0.09] dark:bg-emerald-400/[0.12] text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/20 dark:border-emerald-400/25 shadow-2xs"
                    title="Clinic & Consultation Queue"
                >
                    <Stethoscope className="w-5 h-5" strokeWidth={1.85} />
                </div>
            );
        }
        if (domainType === "service_lines") {
            return (
                <div 
                    className="w-10 h-10 rounded-xl bg-blue-500/[0.09] dark:bg-blue-400/[0.12] text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 border border-blue-500/20 dark:border-blue-400/25 shadow-2xs"
                    title="Service Lanes Queue"
                >
                    <Layers className="w-5 h-5" strokeWidth={1.85} />
                </div>
            );
        }
        if (domainType === "zone") {
            return (
                <div 
                    className="w-10 h-10 rounded-xl bg-purple-500/[0.09] dark:bg-purple-400/[0.12] text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/20 dark:border-purple-400/25 shadow-2xs"
                    title="Zone Arena Queue"
                >
                    <Users className="w-5 h-5" strokeWidth={1.85} />
                </div>
            );
        }
        return (
            <div 
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
                title="Service Counter Queue"
            >
                <Building2 className="w-5 h-5" strokeWidth={1.85} />
            </div>
        );
    };

    return (
        <div 
            onClick={handleCardClick}
            className={`bg-white dark:bg-slate-900 rounded-2xl border ${
                isActive 
                    ? "border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700/80 hover:shadow-md" 
                    : "border-slate-200/60 dark:border-slate-800/60 opacity-80 hover:border-slate-300 dark:hover:border-slate-700"
            } p-5 relative overflow-hidden flex flex-col justify-between min-h-[268px] cursor-pointer transition-all duration-200`}
        >

            {/* ── Background Sticker / Watermark with Low Opacity ── */}
            <QueueCardWatermark
                domain={domainType}
                className="absolute -bottom-4 -right-4 w-44 h-44 text-slate-900 dark:text-white opacity-[0.035] dark:opacity-[0.03] -rotate-6 pointer-events-none select-none z-0"
            />

            {/* ── Card Content ── */}
            <div className="relative z-10 flex flex-col flex-1">
                {/* ── Top Header Row ── */}
                <div className="flex items-start justify-between gap-2.5 mb-1.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {renderDomainIcon()}
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate tracking-tight capitalize" title={queue.name}>
                                {queue.name}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {getSubtitle()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Status Badge: only show when paused */}
                        {queue.is_paused && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium tracking-tight bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>Paused</span>
                            </span>
                        )}

                        {/* Kebab More Options Dropdown */}
                        {!isGlobalOrOrgAdmin && (
                            <div className="relative" ref={menuRef}>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMenu(prev => !prev);
                                    }}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="Queue Options"
                                    aria-label="Queue Options"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>

                                {showMenu && (
                                    <div 
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg py-1"
                                    >
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowEdit(true); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                                        >
                                            <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Edit Settings</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                handleOpenQrModal(e);
                                                setShowMenu(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                                        >
                                            <QrCode className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Check-in QR Code</span>
                                        </button>

                                        {!isStaff && (
                                            <>
                                                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDeleteConfirm(true); }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    <span>Delete Queue</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Center Section: Unified Precision Gauge Dial ── */}
                <div className="flex-1 flex items-center justify-center py-2.5 select-none">
                    <div className="relative">
                        {/* Unified Circular Disc Surface */}
                        <div className={`relative w-32 h-32 rounded-full flex flex-col items-center justify-center ${
                            isActive
                                ? "bg-white dark:bg-slate-900 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] dark:shadow-none"
                                : "bg-slate-50 dark:bg-slate-900 opacity-80"
                        }`}>
                            {/* SVG Gauge Track & Arc (128x128 viewBox, radius 54, perfect perimeter fit) */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 128 128">
                                {/* Complete 360° hairline track framing the circular disc */}
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="54"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    className="text-slate-100 dark:text-slate-800"
                                />

                                {/* Active Solid Brand Indigo Symmetrical Arc (260° arc, radius 54, perimeter ~339.3, length ~245) */}
                                {isActive && !queue.is_paused && (
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="54"
                                        fill="none"
                                        stroke="#4f46e5"
                                        strokeWidth="3.5"
                                        strokeDasharray="245 339.3"
                                        strokeLinecap="round"
                                        transform="rotate(140 64 64)"
                                        className="transition-all duration-500"
                                    />
                                )}

                                {/* Solid Amber Arc when Paused */}
                                {queue.is_paused && (
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="54"
                                        fill="none"
                                        stroke="#f59e0b"
                                        strokeWidth="3.5"
                                        strokeDasharray="245 339.3"
                                        strokeLinecap="round"
                                        transform="rotate(140 64 64)"
                                    />
                                )}
                            </svg>

                            {/* Token Prefix Chip at Apex */}
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                                <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold tracking-wider ring-2 ring-white dark:ring-slate-900 shadow-2xs">
                                    {queue.prefix}
                                </span>
                            </div>

                            {/* Hero Metric */}
                            <div className="flex flex-col items-center justify-center pt-0.5">
                                <span className="text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight leading-none">
                                    {queue.total_served}
                                </span>
                                <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[10px] font-semibold tracking-wide uppercase">
                                    <UserCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                    <span>Served</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {err && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{err}</p>}
            </div>

            {/* ── Bottom Operational Footer ── */}
            <div className="relative z-10 mt-1 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2.5">
                {/* Single-line clean telemetry */}
                <div className="min-w-0 flex-1">
                    {renderTelemetry()}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Quick QR Modal Trigger */}
                    <button
                        type="button"
                        onClick={handleOpenQrModal}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        title="Customer Check-in QR Code"
                        aria-label="QR Code"
                    >
                        <QrCode className="w-4 h-4" />
                    </button>

                    {/* Primary Manage Queue CTA: Solid Brand Color (No Gradients) */}
                    <Link
                        href={`${dashBase}/queues/${queue.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className={`h-8 px-3.5 text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                            isActive 
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                        }`}
                    >
                        <span>{isGlobalOrOrgAdmin ? "View" : "Manage"}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>

            {/* ── Modals ── */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                title="Delete Queue"
                message={`Are you sure you want to permanently delete the queue "${queue.name}"? All associated tokens and data will be lost forever.`}
                confirmLabel="Delete"
                confirmVariant="danger"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                isLoading={deleting}
            />

            <EditQueueModal
                isOpen={showEdit}
                onClose={() => setShowEdit(false)}
                queue={queue}
                onUpdated={onToggled}
            />

            {/* ── Quick QR Popup Modal (Animated Origin Scale Outward from Button) ── */}
            <AnimatePresence>
                {showQrModal && (
                    <ModalPortal>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowQrModal(false);
                            }}
                        >
                            <motion.div 
                                initial={{
                                    scale: 0.05,
                                    x: originDelta.x,
                                    y: originDelta.y,
                                    opacity: 0,
                                }}
                                animate={{
                                    scale: 1,
                                    x: 0,
                                    y: 0,
                                    opacity: 1,
                                }}
                                exit={{
                                    scale: 0.05,
                                    x: originDelta.x,
                                    y: originDelta.y,
                                    opacity: 0,
                                }}
                                transition={{
                                    type: "spring",
                                    stiffness: 380,
                                    damping: 28,
                                    mass: 0.8,
                                }}
                                className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowQrModal(false);
                                    }}
                                    className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                <div className="text-center mb-3">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                                        Token #{queue.prefix}
                                    </span>
                                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-1.5 truncate">
                                        {queue.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Scan to take a token & join the live queue
                                    </p>
                                </div>

                                <div className="flex items-center justify-center py-2">
                                    <QueueQRCode 
                                        queueId={queue.id} 
                                        queueName={queue.name} 
                                        isSessionActive={Boolean(isActive && !queue.is_paused && queue.token_session_id)}
                                        isCollapsible={false} 
                                    />
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <Link
                                        href={`/qr/${queue.id}`}
                                        target="_blank"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
                                    >
                                        <span>Full Screen</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowQrModal(false);
                                        }}
                                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                    >
                                        Done
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    </ModalPortal>
                )}
            </AnimatePresence>
        </div>
    );
});

export default QueueCard;
