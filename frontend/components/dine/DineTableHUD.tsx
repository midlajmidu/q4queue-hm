"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Check,
  FastForward,
  Link2,
  Users,
  Clock,
  AlertTriangle,
  X,
  ClipboardList,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { ServingToken, WaitingToken, TableConfig } from "@/types/api";
import { TableOccupancy, getTokenPax } from "./hooks/use3DTableState";

interface Props {
  tableId: number;
  tables: TableConfig[];
  tableTokensMap: Map<number, ServingToken[]>;
  getOccupancy: (tableId: number, capacity: number) => TableOccupancy;
  waitingTokens: WaitingToken[];
  prefix: string;
  anchorPos: { x: number; y: number };
  isReadOnly: boolean;
  isPaused: boolean;
  onFreeTable: (tableId: number, tableName: string) => void;
  onFreeSingleParty: (token: ServingToken, tableId: number, tableName: string) => void;
  onSkipTable: (tableId: number) => void;
  onSeatNext: (tableId: number, capacity: number) => void;
  onOpenAssignModal: (token: WaitingToken) => void;
  onJoinTable: (token: ServingToken, currentTableId: number, currentTableName: string) => void;
  onOpenCapacityEdit: (tbl: TableConfig, e: React.MouseEvent) => void;
  vacantTables: TableConfig[];
  onClose: () => void;
}

function ElapsedBadge({ mins, isLingering, isExtended }: { mins: number; isLingering: boolean; isExtended: boolean }) {
  if (mins === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
      isLingering
        ? "bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse"
        : isExtended
          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
          : "bg-white/10 text-slate-300 border border-white/10"
    }`}>
      <Clock size={9} />
      {mins}m
    </span>
  );
}

export default function DineTableHUD({
  tableId,
  tables,
  tableTokensMap,
  getOccupancy,
  waitingTokens,
  prefix,
  anchorPos,
  isReadOnly,
  isPaused,
  onFreeTable,
  onFreeSingleParty,
  onSkipTable,
  onSeatNext,
  onOpenAssignModal,
  onJoinTable,
  onOpenCapacityEdit,
  vacantTables,
  onClose,
}: Props) {
  const table = tables.find((t) => t.id === tableId);
  if (!table) return null;

  const occ = getOccupancy(tableId, table.capacity);
  const {
    tokens,
    seatedPax,
    spareSeats,
    isVacant,
    isShared,
    isMerged,
    primaryToken,
    elapsedMins,
    isLingering,
    isExtended,
    isPartiallyOccupied,
    tokenTables,
  } = occ;

  const tableName = table.name || `Table ${table.id}`;

  // Best match waiting token that fits
  const bestMatchToken = waitingTokens.find(
    (w) => getTokenPax(w) <= table.capacity
  );

  // Fit for spare seat share
  const shareMatchToken = isPartiallyOccupied && !isShared
    ? waitingTokens.find((w) => getTokenPax(w) <= spareSeats)
    : null;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== "undefined" && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Smart screen-edge clamping
  const LEFT_OFFSET = 16;
  const TOP_OFFSET = 16;
  const HUD_W = 310;
  const HUD_H = 380;
  const winW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const winH = typeof window !== "undefined" ? window.innerHeight : 800;

  const left = Math.max(16, Math.min(anchorPos.x + LEFT_OFFSET, winW - HUD_W - 16));
  const top = Math.max(50, Math.min(anchorPos.y - TOP_OFFSET, winH - HUD_H - 16));

  return (
    <div
      className={`fixed z-50 pointer-events-auto transition-all ${
        isMobile
          ? "inset-x-3 bottom-10 max-w-sm mx-auto animate-in slide-in-from-bottom-4 duration-200"
          : "animate-in fade-in zoom-in-95 duration-150"
      }`}
      style={isMobile ? undefined : { left, top, width: HUD_W }}
    >
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/40 max-h-[82vh] overflow-y-auto">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className={`px-4 pt-4 pb-3 border-b border-white/5 ${
          isLingering
            ? "bg-red-500/10"
            : isShared
              ? "bg-teal-500/10"
              : isVacant
                ? "bg-emerald-500/10"
                : "bg-indigo-500/10"
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-black text-white tracking-tight">
                  {tableName}
                </span>
                {isLingering && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-300 bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 rounded-full animate-pulse">
                    <AlertTriangle size={9} />
                    LINGERING
                  </span>
                )}
                {isShared && (
                  <span className="text-[10px] font-bold text-teal-300 bg-teal-500/20 border border-teal-500/30 px-1.5 py-0.5 rounded-full">
                    🤝 Shared
                  </span>
                )}
                {isMerged && (
                  <span className="text-[10px] font-bold text-slate-300 bg-white/10 border border-white/10 px-1.5 py-0.5 rounded-full">
                    🔗 {tokenTables.map((id) => `T${id}`).join("+")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`flex items-center gap-1 text-[11px] font-semibold ${
                  isVacant ? "text-emerald-400" : "text-slate-400"
                }`}>
                  <Users size={10} />
                  {isVacant ? `0 / ${table.capacity}p` : `${seatedPax} / ${table.capacity}p`}
                </span>
                {!isVacant && (
                  <ElapsedBadge mins={elapsedMins} isLingering={isLingering} isExtended={isExtended} />
                )}
                {isPartiallyOccupied && !isShared && (
                  <span className="text-[10px] font-bold text-teal-400">
                    +{spareSeats} seat free
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 -mr-1 -mt-1 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Close details"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="px-4 py-3 flex flex-col gap-3">
          {/* VACANT TABLE */}
          {isVacant && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[12px] font-bold">Available · Seats {table.capacity} guests</span>
              </div>

              {waitingTokens.length > 0 && !isReadOnly && (
                <div className="flex flex-col gap-1.5">
                  {bestMatchToken && (
                    <button
                      type="button"
                      onClick={() => { onSeatNext(tableId, table.capacity); onClose(); }}
                      disabled={isPaused}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={11} />
                        Seat #{prefix}{bestMatchToken.token_number} ({getTokenPax(bestMatchToken)}p)
                      </span>
                      <ChevronRight size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { if (bestMatchToken) onOpenAssignModal(bestMatchToken); onClose(); }}
                    disabled={isPaused || !bestMatchToken}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-[11px] font-semibold transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <ClipboardList size={11} />
                    Choose from Waitlist ({waitingTokens.length})
                  </button>
                </div>
              )}

              {waitingTokens.length === 0 && (
                <div className="text-[11px] text-slate-500 text-center py-2">
                  No parties waiting
                </div>
              )}
            </div>
          )}

          {/* SHARED TABLE — multiple parties */}
          {isShared && !isVacant && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-bold text-teal-400 mb-0.5">
                {tokens.length} Parties Seated
              </div>
              {tokens.map((t) => (
                <div
                  key={t.id || t.token_number}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12px] font-black text-white">
                        #{prefix}{t.token_number}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">
                        {t.customer_name || "Guest"}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-white/10 px-1 rounded">
                        {getTokenPax(t)}p
                      </span>
                    </div>
                  </div>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => { onFreeSingleParty(t, tableId, tableName); onClose(); }}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors shrink-0 cursor-pointer"
                    >
                      Free
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* SINGLE OCCUPIED TABLE */}
          {!isShared && !isVacant && primaryToken && (
            <div className="flex flex-col gap-2">
              {/* Token info */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[24px] font-black text-white leading-none mb-1">
                  <span className="text-slate-500 font-semibold text-base">{prefix}</span>
                  {primaryToken.token_number}
                </div>
                <div className="text-[12px] text-slate-300 font-medium">
                  {primaryToken.customer_name || "Guest"}
                </div>
                {primaryToken.customer_phone && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {primaryToken.customer_phone}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white/10 px-1.5 py-0.5 rounded">
                    <Users size={9} />
                    {seatedPax}p
                  </span>
                  <ElapsedBadge mins={elapsedMins} isLingering={isLingering} isExtended={isExtended} />
                  {isMerged && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-white/10 px-1.5 py-0.5 rounded">
                      <Link2 size={9} />
                      {tokenTables.map((id) => `T${id}`).join("+")}
                    </span>
                  )}
                </div>
              </div>

              {/* Spare seat share prompt */}
              {isPartiallyOccupied && shareMatchToken && !isReadOnly && (
                <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20">
                  <div className="text-[11px] font-bold text-teal-300 mb-1.5">
                    ⚡ {spareSeats} spare seat{spareSeats > 1 ? "s" : ""} — Share with next party?
                  </div>
                  <button
                    type="button"
                    onClick={() => { onOpenAssignModal(shareMatchToken); onClose(); }}
                    disabled={isPaused}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Share Table with #{prefix}{shareMatchToken.token_number} ({getTokenPax(shareMatchToken)}p)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Action Footer ─────────────────────────────────────── */}
        {!isVacant && !isReadOnly && (
          <div className="px-4 pb-4 flex flex-col gap-2">
            <div className="border-t border-white/5 pt-3 flex items-center gap-2">
              {/* Skip */}
              <button
                type="button"
                onClick={() => { onSkipTable(tableId); onClose(); }}
                disabled={isPaused}
                title={isPaused ? "Queue is paused" : "Skip current token"}
                className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-[11px] font-semibold transition-all disabled:opacity-40 cursor-pointer"
              >
                <FastForward size={11} />
                Skip
              </button>

              {/* Join extra table */}
              {vacantTables.length > 0 && !isShared && primaryToken && (
                <button
                  type="button"
                  onClick={() => {
                    onJoinTable(primaryToken, tableId, tableName);
                    onClose();
                  }}
                  disabled={isPaused}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 transition-all shrink-0 disabled:opacity-40 cursor-pointer"
                  title="Join another vacant table to this party"
                >
                  <Link2 size={12} />
                </button>
              )}

              {/* Free / Clear table */}
              <button
                type="button"
                onClick={() => { onFreeTable(tableId, tableName); onClose(); }}
                className="flex-[1.4] flex items-center justify-center gap-1.5 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <Check size={12} strokeWidth={2.5} />
                {isMerged ? "Free Joined" : "Free Table"}
              </button>
            </div>

            {/* Edit capacity */}
            <button
              type="button"
              onClick={(e) => { onOpenCapacityEdit(table, e); onClose(); }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
            >
              ✏️ Edit Capacity ({table.capacity}p)
            </button>
          </div>
        )}

        {isVacant && !isReadOnly && (
          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={(e) => { onOpenCapacityEdit(table, e); onClose(); }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
            >
              ✏️ Edit Capacity ({table.capacity}p)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
