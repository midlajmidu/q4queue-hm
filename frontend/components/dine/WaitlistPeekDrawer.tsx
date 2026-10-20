"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { WaitingToken } from "@/types/api";
import { EnhancedTableConfig, resolveTableStatus } from "@/types/dine";
import { getWaitingTokenPax, getElapsedWaitMinutes } from "./hooks/useSmartSeatingMatcher";
import ModalPortal from "@/components/ui/ModalPortal";
import {
  Users,
  Clock,
  Phone,
  Check,
  UserX,
  X,
  Search,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Utensils,
  AlertCircle,
  Bell,
  Filter,
  Copy,
  Plus,
  CheckCheck,
  Zap,
  MapPin,
  Flame,
  Crown,
  Heart,
  Baby,
  Sun,
  Armchair,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

export interface WaitlistPeekDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  waitingTokens: WaitingToken[];
  tables: EnhancedTableConfig[];
  prefix?: string;
  onSeatParty: (token: WaitingToken, tableId?: number) => void | Promise<void>;
  onPageParty?: (token: WaitingToken) => void | Promise<void>;
  onNoShowParty?: (token: WaitingToken) => void | Promise<void>;
  onOpenWalkInModal?: () => void;
  isReadOnly?: boolean;
  isLoading?: boolean;
}

interface TagBadge {
  label: string;
  icon?: React.ReactNode;
  colorClass: string;
}

/**
 * Extracts rich contextual preference tags with distinct visual styles
 */
function extractTokenTags(token: WaitingToken): TagBadge[] {
  const tags: TagBadge[] = [];
  const pax = getWaitingTokenPax(token);
  if (pax >= 6) {
    tags.push({
      label: `${pax}p Large Party`,
      icon: <Users size={10} />,
      colorClass: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60",
    });
  }

  const cd = token.custom_data;
  if (cd && typeof cd === "object") {
    if (cd.vip) {
      tags.push({
        label: "VIP Guest",
        icon: <Crown size={10} />,
        colorClass: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      });
    }
    if (cd.birthday || cd.anniversary || cd.celebration) {
      tags.push({
        label: "Celebration",
        icon: <Heart size={10} />,
        colorClass: "bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800",
      });
    }
    if (cd.high_chair || cd.highchair) {
      tags.push({
        label: "High Chair",
        icon: <Baby size={10} />,
        colorClass: "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      });
    }
    if (cd.patio || cd.outdoor) {
      tags.push({
        label: "Patio Req",
        icon: <Sun size={10} />,
        colorClass: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
      });
    }
    if (cd.booth) {
      tags.push({
        label: "Booth Req",
        icon: <Armchair size={10} />,
        colorClass: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      });
    }
    if (cd.notes && typeof cd.notes === "string" && cd.notes.trim()) {
      tags.push({
        label: cd.notes.trim().slice(0, 24),
        colorClass: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
      });
    }
  }

  if (token.entry_type === "appointment") {
    tags.push({
      label: "Reservation",
      icon: <Calendar size={10} />,
      colorClass: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    });
  }

  return tags;
}

/**
 * Cleanly formats wait duration into human-digestible text
 */
function formatWaitDuration(createdAt?: string | null): { text: string; severity: "low" | "medium" | "high" } {
  if (!createdAt) return { text: "Just now", severity: "low" };
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));

  if (mins < 1) return { text: "Just now", severity: "low" };
  if (mins < 15) return { text: `${mins}m wait`, severity: "low" };
  if (mins < 30) return { text: `${mins}m wait`, severity: "medium" };
  if (mins < 60) return { text: `${mins}m wait`, severity: "high" };

  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs < 12) {
    return { text: `${hrs}h ${rem > 0 ? `${rem}m` : ""} wait`, severity: "high" };
  }
  return { text: "12h+ wait", severity: "high" };
}

/**
 * Standalone Badge / Trigger Button that can be placed in any header or toolbar
 */
export function WaitlistBadgeButton({
  count,
  isOpen,
  onClick,
}: {
  count: number;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 inline-flex items-center gap-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none ${
        isOpen
          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/25"
          : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
      }`}
    >
      <Users
        size={14}
        className={
          isOpen
            ? "text-white shrink-0"
            : count > 0
            ? "text-indigo-600 dark:text-indigo-400 shrink-0"
            : "text-slate-400 shrink-0"
        }
      />
      <span>Waitlist</span>
      {count > 0 && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10.5px] font-black leading-none ${
            isOpen
              ? "bg-white/20 text-white"
              : "bg-indigo-600 text-white shadow-2xs"
          }`}
        >
          {count}
        </span>
      )}
      <ChevronDown
        size={12}
        className={`transition-transform duration-200 opacity-60 ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
  );
}

export default function WaitlistPeekDrawer({
  isOpen,
  onClose,
  waitingTokens = [],
  tables = [],
  prefix = "",
  onSeatParty,
  onPageParty,
  onNoShowParty,
  onOpenWalkInModal,
  isReadOnly = false,
  isLoading = false,
}: WaitlistPeekDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [paxFilter, setPaxFilter] = useState<"all" | "1-2" | "3-4" | "5-6" | "7+">("all");
  const [onlyReadyFilter, setOnlyReadyFilter] = useState(false);
  const [pagedCooldownMap, setPagedCooldownMap] = useState<Record<string, number>>({});
  const [confirmNoShowId, setConfirmNoShowId] = useState<string | null>(null);
  const [tablePickerTokenId, setTablePickerTokenId] = useState<string | null>(null);
  const [seatingTokenId, setSeatingTokenId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Available vacant tables that can seat guests immediately
  const vacantTables = useMemo(() => {
    return tables.filter((t) => resolveTableStatus(t) === "available");
  }, [tables]);

  const totalVacantSeats = useMemo(() => {
    return vacantTables.reduce((sum, t) => sum + (t.capacity || 0), 0);
  }, [vacantTables]);

  // Breakdown counts for quick filter badges
  const filterCounts = useMemo(() => {
    let p12 = 0;
    let p34 = 0;
    let p56 = 0;
    let p7p = 0;
    let readyCount = 0;

    waitingTokens.forEach((t) => {
      const p = getWaitingTokenPax(t);
      if (p <= 2) p12++;
      else if (p <= 4) p34++;
      else if (p <= 6) p56++;
      else p7p++;

      // Can this party be seated right now?
      const fits = vacantTables.some((tbl) => tbl.capacity >= p);
      if (fits) readyCount++;
    });

    return {
      all: waitingTokens.length,
      "1-2": p12,
      "3-4": p34,
      "5-6": p56,
      "7+": p7p,
      ready: readyCount,
    };
  }, [waitingTokens, vacantTables]);

  // Filtered and searched waiting parties
  const filteredTokens = useMemo(() => {
    return waitingTokens.filter((token) => {
      const pax = getWaitingTokenPax(token);

      // Only ready to seat filter
      if (onlyReadyFilter) {
        const canSeat = vacantTables.some((t) => t.capacity >= pax);
        if (!canSeat) return false;
      }

      // Pax Filter
      if (paxFilter === "1-2" && (pax < 1 || pax > 2)) return false;
      if (paxFilter === "3-4" && (pax < 3 || pax > 4)) return false;
      if (paxFilter === "5-6" && (pax < 5 || pax > 6)) return false;
      if (paxFilter === "7+" && pax < 7) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numStr = `${prefix}${token.token_number}`.toLowerCase();
        const nameStr = (token.customer_name || "").toLowerCase();
        const phoneStr = (token.customer_phone || "").toLowerCase();
        if (!numStr.includes(q) && !nameStr.includes(q) && !phoneStr.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [waitingTokens, paxFilter, onlyReadyFilter, searchQuery, prefix, vacantTables]);

  // Calculate clean, realistic average wait duration (excluding stale artifacts > 12h)
  const waitStats = useMemo(() => {
    const realisticMinutes = waitingTokens
      .map((t) => {
        if (!t.created_at) return 0;
        const diff = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 60000);
        return Math.max(0, diff);
      })
      .filter((m) => m < 720);

    const avgMins =
      realisticMinutes.length > 0
        ? Math.round(realisticMinutes.reduce((a, b) => a + b, 0) / realisticMinutes.length)
        : 0;

    const totalCovers = waitingTokens.reduce((sum, t) => sum + getWaitingTokenPax(t), 0);

    return { avgMins, totalCovers };
  }, [waitingTokens]);

  // Page SMS button handler with debounce & visual feedback
  const handlePageClick = async (token: WaitingToken) => {
    if (isReadOnly) return;
    const now = Date.now();
    setPagedCooldownMap((prev) => ({ ...prev, [token.id]: now }));
    if (onPageParty) {
      await onPageParty(token);
    }
  };

  const handleConfirmNoShow = async (token: WaitingToken) => {
    if (isReadOnly) return;
    setConfirmNoShowId(null);
    if (onNoShowParty) {
      await onNoShowParty(token);
    }
  };

  const handleSeatParty = async (token: WaitingToken, tableId?: number) => {
    if (isReadOnly || isLoading) return;
    setSeatingTokenId(token.id);
    try {
      await onSeatParty(token, tableId);
    } finally {
      setSeatingTokenId(null);
      setTablePickerTokenId(null);
    }
  };

  const copyPhoneNumber = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(phone);
      toast.success(`Copied ${phone} to clipboard`);
    } catch {
      toast.info(`Phone: ${phone}`);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (tablePickerTokenId) {
          setTablePickerTokenId(null);
        } else if (confirmNoShowId) {
          setConfirmNoShowId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, tablePickerTokenId, confirmNoShowId, onClose]);

  // Auto-focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    } else {
      setSearchQuery("");
      setPaxFilter("all");
      setOnlyReadyFilter(false);
      setTablePickerTokenId(null);
      setConfirmNoShowId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-[99999] pointer-events-none">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-950/60 dark:bg-black/75 backdrop-blur-sm pointer-events-auto transition-all animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Container */}
      <div className="fixed inset-y-0 right-0 pointer-events-auto flex w-full sm:w-[480px] md:w-[520px] flex-col bg-white dark:bg-slate-900 border-l border-slate-200/90 dark:border-slate-800 shadow-2xl transition-transform animate-in slide-in-from-right duration-250 ease-out">
        {/* ========================================================================= */}
        {/* 1. DRAWER HEADER                                                          */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/70 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs">
              <Users size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                  Guest Waitlist
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {waitingTokens.length} in line
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>
                  {vacantTables.length} table{vacantTables.length === 1 ? "" : "s"} ready ({totalVacantSeats} seats)
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenWalkInModal && (
              <button
                type="button"
                onClick={onOpenWalkInModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-2xs transition-all cursor-pointer"
                title="Add new walk-in guest"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Add Walk-In</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close waitlist"
              title="Close (Esc)"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SEARCH & QUICK FILTER PILLS                                           */}
        {/* ========================================================================= */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-col gap-2.5 bg-white dark:bg-slate-900 shrink-0">
          {/* Search bar */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token #, guest name, or phone..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
            {(["all", "1-2", "3-4", "5-6", "7+"] as const).map((filterKey) => {
              const count = filterCounts[filterKey];
              const isSelected = paxFilter === filterKey;
              return (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setPaxFilter(filterKey)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{filterKey === "all" ? "All Parties" : `${filterKey}p`}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isSelected
                        ? "bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900"
                        : "bg-slate-200/80 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Quick Filter: Ready To Seat */}
            {filterCounts.ready > 0 && (
              <button
                type="button"
                onClick={() => setOnlyReadyFilter((prev) => !prev)}
                className={`ml-auto px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  onlyReadyFilter
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                }`}
              >
                <Zap size={11} className={onlyReadyFilter ? "fill-white" : "fill-emerald-500 text-emerald-500"} />
                <span>Ready ({filterCounts.ready})</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. SCROLLABLE QUEUE LIST                                                 */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredTokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 dark:text-slate-500">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center mb-3.5 text-indigo-500 dark:text-indigo-400">
                <Utensils size={24} />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {waitingTokens.length === 0 ? "Waitlist is Currently Clear" : "No Matching Parties"}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-[260px] leading-relaxed">
                {waitingTokens.length === 0
                  ? "All arriving guests have been seated. Floor is ready for new walk-ins!"
                  : "Try clearing your search query or party size filter to see all waiting parties."}
              </p>
              {waitingTokens.length === 0 && onOpenWalkInModal && (
                <button
                  type="button"
                  onClick={onOpenWalkInModal}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add First Walk-In Party</span>
                </button>
              )}
            </div>
          ) : (
            filteredTokens.map((token, index) => {
              const pax = getWaitingTokenPax(token);
              const wait = formatWaitDuration(token.created_at);
              const tags = extractTokenTags(token);

              // Cooldown / paged state (prevents accidental double-paging)
              const lastPagedTimestamp = pagedCooldownMap[token.id];
              const isRecentlyPaged =
                Boolean(lastPagedTimestamp && Date.now() - lastPagedTimestamp < 60000) ||
                Boolean(token.called_via_invite);

              // Find compatible vacant tables sorted by capacity efficiency
              const fittingTables = vacantTables
                .filter((t) => t.capacity >= pax)
                .sort((a, b) => a.capacity - b.capacity);
              const bestTable = fittingTables[0] || null;

              const isSeatingThis = seatingTokenId === token.id;
              const isTablePickerOpen = tablePickerTokenId === token.id;
              const isConfirmingNoShow = confirmNoShowId === token.id;

              return (
                <div
                  key={token.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all relative overflow-hidden"
                >
                  {/* Card Header: Token Number, Name, Wait Time & Pos */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Monospace Token Badge */}
                      <div className="w-10 h-10 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center font-mono font-black text-xs text-indigo-700 dark:text-indigo-300 shadow-2xs shrink-0">
                        #{prefix}{token.token_number}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {token.customer_name || "Guest"}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                            <Users size={10.5} className="text-slate-400" />
                            <span>{pax} {pax === 1 ? "Guest" : "Guests"}</span>
                          </span>
                        </div>

                        {token.customer_phone ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <a
                              href={`tel:${token.customer_phone}`}
                              className="text-[11.5px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-mono flex items-center gap-1 transition-colors"
                            >
                              <Phone size={10} className="opacity-70" />
                              <span>{token.customer_phone}</span>
                            </a>
                            <button
                              type="button"
                              onClick={(e) => copyPhoneNumber(token.customer_phone!, e)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
                              title="Copy phone"
                            >
                              <Copy size={10} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic mt-0.5 block">No phone provided</span>
                        )}
                      </div>
                    </div>

                    {/* Wait Duration & Position Badge */}
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span
                        className={`inline-flex items-center gap-1 text-[10.5px] font-bold font-mono px-2 py-0.5 rounded-md border ${
                          wait.severity === "high"
                            ? "bg-rose-50/90 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/70"
                            : wait.severity === "medium"
                            ? "bg-amber-50/90 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/70"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700"
                        }`}
                      >
                        <Clock size={10.5} />
                        <span>{wait.text}</span>
                      </span>

                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400">
                        #{index + 1} in queue
                      </span>
                    </div>
                  </div>

                  {/* Preference Tags */}
                  {tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                      {tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${tag.colorClass}`}
                        >
                          {tag.icon}
                          <span>{tag.label}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Smart Seating Recommendation Banner (Clean cohesive chip) */}
                  <div className="mt-3 px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    {bestTable ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Check size={11} strokeWidth={2.8} />
                        </div>
                        <div className="flex items-center gap-1.5 truncate text-[11.5px]">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Table:</span>
                          <span className="font-extrabold text-slate-900 dark:text-white">{bestTable.name || `Table ${bestTable.id}`}</span>
                          <span className="text-slate-400 dark:text-slate-500 font-medium">({bestTable.capacity}p{bestTable.section ? ` · ${bestTable.section}` : ""})</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <AlertCircle size={11} strokeWidth={2.4} />
                        </div>
                        <span className="text-[11.5px] font-semibold text-amber-700 dark:text-amber-300 truncate">
                          No vacant table fits {pax} guests
                        </span>
                      </div>
                    )}

                    {vacantTables.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setTablePickerTokenId((prev) => (prev === token.id ? null : token.id))}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 pl-2 shrink-0 cursor-pointer transition-colors"
                      >
                        <span>{isTablePickerOpen ? "Hide" : "Change"}</span>
                        <ChevronDown size={11.5} className={`transition-transform duration-200 ${isTablePickerOpen ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>

                  {/* Inline Table Picker Dropdown */}
                  {isTablePickerOpen && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 px-1">
                        <span>Select Available Table:</span>
                        <span className="text-slate-400">{vacantTables.length} ready</span>
                      </div>

                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                        {vacantTables.map((t) => {
                          const isFit = t.capacity >= pax;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleSeatParty(token, t.id)}
                              disabled={isSeatingThis || isReadOnly}
                              className={`w-full p-2 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                                isFit
                                  ? "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-slate-800 dark:text-slate-200"
                                  : "bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 opacity-60 hover:opacity-100 text-slate-500"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {t.name || `Table ${t.id}`}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                                  {t.capacity} seats
                                </span>
                                {t.section && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                    <MapPin size={9} /> {t.section}
                                  </span>
                                )}
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  isFit
                                    ? t.capacity === pax || t.capacity === pax + 1
                                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                    : "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                                }`}
                              >
                                {isFit ? (t.capacity === pax ? "Exact Fit" : "Fits") : "Tight Fit"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions Bar (Strict 38px baseline matching cards) */}
                  <div className="mt-3 flex items-center gap-2">
                    {/* Primary Action: Seat Guest */}
                    {bestTable ? (
                      <button
                        type="button"
                        onClick={() => handleSeatParty(token, bestTable.id)}
                        disabled={isSeatingThis || isLoading || isReadOnly}
                        className="flex-1 h-[38px] min-h-[38px] py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Check size={14} strokeWidth={2.5} />
                        <span>Seat at {bestTable.name || `T${bestTable.id}`} ({bestTable.capacity}p)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTablePickerTokenId((prev) => (prev === token.id ? null : token.id))}
                        disabled={isSeatingThis || isLoading || isReadOnly}
                        className="flex-1 h-[38px] min-h-[38px] py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Choose Table to Seat</span>
                        <ChevronRight size={13} />
                      </button>
                    )}

                    {/* Page via SMS button (with debounce / cooldown feedback) */}
                    <button
                      type="button"
                      onClick={() => handlePageClick(token)}
                      disabled={isRecentlyPaged || isReadOnly}
                      title={isRecentlyPaged ? "SMS already sent to this party" : "Send SMS notification"}
                      className={`h-[38px] px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        isRecentlyPaged
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700"
                      }`}
                    >
                      {isRecentlyPaged ? (
                        <>
                          <CheckCheck size={13} className="text-amber-600 dark:text-amber-400" />
                          <span>Paged</span>
                        </>
                      ) : (
                        <>
                          <Bell size={13} />
                          <span>Page</span>
                        </>
                      )}
                    </button>

                    {/* No-show / Skip action trigger */}
                    <button
                      type="button"
                      onClick={() => setConfirmNoShowId((prev) => (prev === token.id ? null : token.id))}
                      disabled={isLoading || isReadOnly}
                      title="Mark party as no-show or cancel"
                      className="w-[38px] h-[38px] rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/80 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900 transition-colors cursor-pointer shrink-0"
                    >
                      <UserX size={14} />
                    </button>
                  </div>

                  {/* Inline Safe No-Show Confirmation Dialog */}
                  {isConfirmingNoShow && (
                    <div className="mt-3 p-2.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-2 animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5 text-xs text-rose-800 dark:text-rose-300 font-semibold min-w-0">
                        <AlertCircle size={14} className="text-rose-600 shrink-0" />
                        <span className="truncate">Mark #{prefix}{token.token_number} as No-Show?</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleConfirmNoShow(token)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmNoShowId(null)}
                          className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 text-xs font-medium cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================================= */}
        {/* 4. FOOTER TELEMETRY & ACTIONS                                             */}
        {/* ========================================================================= */}
        <div className="px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <Clock size={12.5} className="text-indigo-600 dark:text-indigo-400" />
              <span>
                Avg Wait: <strong className="text-slate-800 dark:text-slate-200 font-bold">~{waitStats.avgMins}m</strong>
              </span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <Users size={12.5} className="text-indigo-600 dark:text-indigo-400" />
              <span>
                <strong className="text-slate-800 dark:text-slate-200 font-bold">{waitStats.totalCovers}</strong> covers waiting
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            Close Dock
          </button>
        </div>
      </div>
    </div>
  );

  return <ModalPortal>{content}</ModalPortal>;
}
