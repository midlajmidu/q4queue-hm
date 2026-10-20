"use client";

import React, { useMemo } from "react";
import { EnhancedTableConfig, TableLifecycleStatus, resolveTableStatus } from "@/types/dine";
import { WaitingToken, ServingToken } from "@/types/api";
import {
  UserPlus,
  Bell,
  Users,
  ChevronDown,
  Clock,
  CreditCard,
  RefreshCw,
  AlertCircle,
  LayoutGrid,
} from "lucide-react";

export interface HostBottomBarProps {
  tables: EnhancedTableConfig[];
  tableTokensMap?: Map<number, ServingToken[]>;
  waitingTokens: WaitingToken[];
  prefix?: string;
  activeStatusFilter: TableLifecycleStatus | "all" | "unpaid";
  onFilterChange: (status: TableLifecycleStatus | "all" | "unpaid") => void;
  onOpenWalkIn: () => void;
  onPageNextParty?: () => void | Promise<void>;
  isWaitlistOpen: boolean;
  onToggleWaitlist: () => void;
  isReadOnly?: boolean;
  isLoading?: boolean;
}

export default function HostBottomBar({
  tables = [],
  tableTokensMap,
  waitingTokens = [],
  prefix = "",
  activeStatusFilter = "all",
  onFilterChange,
  onOpenWalkIn,
  onPageNextParty,
  isWaitlistOpen,
  onToggleWaitlist,
  isReadOnly = false,
  isLoading = false,
}: HostBottomBarProps) {
  // Compute table status counts dynamically
  const statusCounts = useMemo(() => {
    let available = 0;
    let seated = 0;
    let check_dropped = 0;
    let unpaid = 0;

    for (const t of tables) {
      const tokens = tableTokensMap?.get(t.id) || [];
      const st = resolveTableStatus(t, tokens);
      if (st === "available") available++;
      else if (st === "seated") seated++;
      else if (st === "check_dropped") check_dropped++;

      if (tokens.some((tok) => tok.payment_status === "unpaid")) {
        unpaid++;
      }
    }

    return {
      all: tables.length,
      available,
      seated,
      check_dropped,
      unpaid,
    };
  }, [tables, tableTokensMap]);

  // Highest priority waiting party
  const nextParty = waitingTokens[0] || null;
  const waitlistCount = waitingTokens.length;

  return (
    <nav 
      aria-label="Host Station Command Bar"
      className="w-full max-w-6xl mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-900/5 px-3 py-2 transition-all"
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap lg:flex-nowrap">
        
        {/* ========================================================================= */}
        {/* 1. HOST RAPID ACTIONS (Walk-in & Paging)                                  */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Walk-in Primary CTA */}
          <button
            type="button"
            id="host-quick-walkin-btn"
            onClick={onOpenWalkIn}
            disabled={isReadOnly || isLoading}
            className="h-9 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold text-xs sm:text-[13px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus size={15} strokeWidth={2.5} className="shrink-0" />
            <span>+ Walk-in</span>
          </button>

          {/* Page Next Waiting Party Button (Only shown when a party is in the waitlist) */}
          {nextParty && (
            <button
              type="button"
              id="host-page-next-btn"
              onClick={onPageNextParty}
              disabled={isReadOnly || isLoading}
              title={`Page next party: #${prefix}${nextParty.token_number} (${nextParty.customer_name || "Guest"})`}
              className="h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-semibold text-xs sm:text-[13px] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap animate-pulse"
            >
              <Bell size={14} className="shrink-0" />
              <span>
                Page #{prefix}{nextParty.token_number} ({nextParty.pax_count || 1}p)
              </span>
            </button>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="hidden lg:block h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

        {/* ========================================================================= */}
        {/* 2. UNIFIED SEGMENTED FLOOR FILTER BAR                                     */}
        {/* ========================================================================= */}
        <div className="order-3 lg:order-2 w-full lg:w-auto flex items-center bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl gap-1 overflow-x-auto scrollbar-none">
          {/* Segment: All */}
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className={`h-7 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeStatusFilter === "all"
                ? "bg-white dark:bg-slate-750 text-slate-900 dark:text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40"
            }`}
          >
            <LayoutGrid size={12} className="shrink-0 opacity-70" />
            <span>All</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeStatusFilter === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              {statusCounts.all}
            </span>
          </button>

          {/* Segment: Ready / Available */}
          <button
            type="button"
            onClick={() => onFilterChange("available")}
            className={`h-7 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeStatusFilter === "available"
                ? "bg-white dark:bg-slate-750 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Ready</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeStatusFilter === "available"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              {statusCounts.available}
            </span>
          </button>

          {/* Segment: Dining */}
          <button
            type="button"
            onClick={() => onFilterChange("seated")}
            className={`h-7 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeStatusFilter === "seated"
                ? "bg-white dark:bg-slate-750 text-blue-700 dark:text-blue-400 shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40"
            }`}
          >
            <Clock size={11} className="shrink-0 text-blue-500" />
            <span>Dining</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeStatusFilter === "seated"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              {statusCounts.seated}
            </span>
          </button>

          {/* Segment: Settling / Bill Given */}
          <button
            type="button"
            onClick={() => onFilterChange("check_dropped")}
            className={`h-7 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeStatusFilter === "check_dropped"
                ? "bg-white dark:bg-slate-750 text-purple-700 dark:text-purple-400 shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40"
            }`}
          >
            <CreditCard size={11} className="shrink-0 text-purple-500" />
            <span>Settling</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeStatusFilter === "check_dropped"
                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                  : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              {statusCounts.check_dropped}
            </span>
          </button>



          {/* Segment: Unpaid Alert */}
          {statusCounts.unpaid > 0 && (
            <button
              type="button"
              onClick={() => onFilterChange("unpaid")}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeStatusFilter === "unpaid"
                  ? "bg-white dark:bg-slate-750 text-amber-700 dark:text-amber-400 shadow-xs font-bold"
                  : "text-amber-800 dark:text-amber-300 hover:bg-amber-100/50"
              }`}
            >
              <AlertCircle size={11} className="shrink-0 text-amber-500 animate-pulse" />
              <span>Unpaid</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {statusCounts.unpaid}
              </span>
            </button>
          )}
        </div>

        {/* Vertical Divider */}
        <div className="hidden lg:block h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

        {/* ========================================================================= */}
        {/* 3. WAITLIST MANIFEST DRAWER TOGGLE                                        */}
        {/* ========================================================================= */}
        <div className="order-2 lg:order-3 flex items-center shrink-0">
          <button
            type="button"
            id="host-waitlist-toggle-btn"
            onClick={onToggleWaitlist}
            aria-expanded={isWaitlistOpen}
            aria-controls="waitlist-peek-drawer"
            className={`h-9 px-3 rounded-xl text-xs sm:text-[13px] font-semibold flex items-center gap-2 border transition-all cursor-pointer whitespace-nowrap ${
              isWaitlistOpen
                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 shadow-2xs"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
            }`}
          >
            <Users size={15} className={waitlistCount > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"} />
            <span>Waitlist</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold min-w-[20px] text-center ${
                waitlistCount > 0
                  ? "bg-indigo-600 text-white animate-pulse"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
              }`}
            >
              {waitlistCount}
            </span>
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 text-slate-400 ${isWaitlistOpen ? "rotate-180 text-indigo-600" : ""}`}
            />
          </button>
        </div>

      </div>
    </nav>
  );
}
