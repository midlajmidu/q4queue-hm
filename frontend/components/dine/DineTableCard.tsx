"use client";

import React from "react";
import {
  EnhancedTableConfig,
  TableLifecycleStatus,
  SmartSeatingMatch,
  resolveTableStatus,
  TABLE_STATUS_METADATA,
} from "@/types/dine";
import { ServingToken } from "@/types/api";
import {
  Clock,
  Check,
  Utensils,
  Sparkles,
  Link2,
  Users,
  CreditCard,
  UserPlus,
  RefreshCw,
  Edit2,
  Lock,
  ClipboardList,
  Receipt,
  LogOut,
  Unlock,
  X,
} from "lucide-react";

export interface DineTableCardProps {
  table: EnhancedTableConfig;
  tokens?: ServingToken[];
  prefix?: string;
  match?: SmartSeatingMatch;
  elapsedMins?: number;
  isLoading?: boolean;
  isReadOnly?: boolean;
  onSeatMatch?: (tableId: number, waitingTokenId: string) => void;
  onSeatWalkIn?: (tableId: number) => void;
  onSeatParty?: (tableId: number) => void;
  onAssignParty?: (tableId: number) => void;
  onAdvanceStatus?: (tableId: number, nextStatus: TableLifecycleStatus) => void;
  onFreeTable?: (tableId: number, tableName: string) => void;
  onJoinTable?: (token: ServingToken, tableId: number, tableName: string) => void;
  onOpenCapacityEdit?: (table: EnhancedTableConfig, e: React.MouseEvent, focusField?: "name" | "capacity" | "section") => void;
  onUpdatePaymentStatus?: (tokenId: string, nextStatus: "pending" | "unpaid" | "paid") => void | Promise<void>;
}

export default function DineTableCard({
  table,
  tokens = [],
  prefix = "",
  match,
  elapsedMins = 0,
  isLoading = false,
  isReadOnly = false,
  onSeatMatch,
  onSeatWalkIn,
  onSeatParty,
  onAssignParty,
  onAdvanceStatus,
  onFreeTable,
  onJoinTable,
  onOpenCapacityEdit,
  onUpdatePaymentStatus,
}: DineTableCardProps) {
  // 1. Resolve Effective Table Lifecycle Status
  const status: TableLifecycleStatus = resolveTableStatus(table, tokens);
  const meta = TABLE_STATUS_METADATA[status] || TABLE_STATUS_METADATA.available;

  // 2. Occupancy & Seating Computations
  const isOccupied = tokens.length > 0;
  const primaryToken = tokens[0] || null;
  const seatedPax = tokens.reduce((sum, t) => sum + (t.pax_count || 1), 0);
  const spareSeats = Math.max(0, table.capacity - seatedPax);
  const isShared = tokens.length > 1;
  const isPartiallyOccupied = seatedPax > 0 && spareSeats > 0;

  // Joined/Merged Table info
  const mergedTables = table.mergedWithTableIds || [];
  const isMerged = mergedTables.length > 0;

  // 3. Dining Timer Thresholds
  const isLingering = isOccupied && elapsedMins >= 75;

  const tableName = table.name || `Table ${table.id}`;
  const isUnpaid = primaryToken?.payment_status === "unpaid" || tokens.some(t => t.payment_status === "unpaid");

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl p-4 transition-all duration-200 min-h-[225px] h-full border shadow-xs overflow-hidden ${status === "available"
          ? "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/60"
          : status === "seated"
            ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            : status === "check_dropped"
              ? isUnpaid
                ? "bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-800/80 shadow-[0_2px_12px_rgba(244,63,94,0.06)]"
                : "bg-white dark:bg-slate-900 border-purple-300 dark:border-purple-800/80 shadow-[0_2px_12px_rgba(168,85,247,0.06)]"
              : status === "held"
                ? "bg-amber-50/30 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/70"
                : "bg-slate-100/50 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700"
        }`}
    >
      {/* ========================================================================= */}
      {/* 1. CARD HEADER (Unified 2-row layout with strict baseline)                */}
      {/* ========================================================================= */}
      <div>
        {/* Row A: Table Name + Capacity Pill on left; Status on right */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Table Name (Interactive for rapid rename) */}
            <button
              type="button"
              onClick={(e) => onOpenCapacityEdit?.(table, e, "name")}
              disabled={isReadOnly}
              title={isReadOnly ? undefined : "Click to edit table name"}
              className="group/name inline-flex items-center gap-1 text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-left shrink min-w-0"
            >
              <span className="truncate">{tableName}</span>
              {!isReadOnly && (
                <Edit2
                  size={10.5}
                  className="opacity-40 group-hover/name:opacity-100 text-slate-400 group-hover/name:text-indigo-600 dark:group-hover/name:text-indigo-400 transition-all shrink-0"
                />
              )}
            </button>

            {/* Capacity Pill (Interactive for rapid edit) */}
            <button
              type="button"
              onClick={(e) => onOpenCapacityEdit?.(table, e, "capacity")}
              disabled={isReadOnly}
              title="Edit chair capacity"
              className="inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
            >
              <span>{table.capacity}p</span>
              {!isReadOnly && <Edit2 size={9.5} className="opacity-60" />}
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Status Indicator Pill */}
            {status === "available" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Ready</span>
              </span>
            )}


            {status === "check_dropped" && (
              isUnpaid ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  <CreditCard size={10.5} />
                  <span>Settling</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <CreditCard size={10.5} />
                  <span>Settling</span>
                </span>
              )
            )}

            {status === "held" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <Clock size={11} />
                <span>Held</span>
              </span>
            )}

            {status === "blocked" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <Lock size={10} />
                <span>Blocked</span>
              </span>
            )}
          </div>
        </div>

        {/* Row B: Section Tag + Optional Merged / Shared Badges (left) & Join Table Action (right) */}
        <div className="flex items-center justify-between gap-1.5 min-w-0 mt-1.5 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={(e) => onOpenCapacityEdit?.(table, e, "section")}
              disabled={isReadOnly}
              title="Click to edit table zone or chairs"
              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer truncate flex items-center gap-1"
            >
              <span>{table.section || "Main Dining"}</span>
              {!isReadOnly && <Edit2 size={8.5} className="opacity-50 shrink-0" />}
            </button>

            {isMerged && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                <Link2 size={10} /> +{mergedTables.join(", T")}
              </span>
            )}

            {isShared && (
              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shrink-0">
                <Users size={10} /> {seatedPax}/{table.capacity}p
              </span>
            )}
          </div>

          {/* Join/Merge Table action for seated table */}
          {status === "seated" && primaryToken && onJoinTable && (
            <button
              type="button"
              onClick={() => onJoinTable(primaryToken, table.id, tableName)}
              disabled={isLoading || isReadOnly}
              title="Join another vacant table to this party"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors border border-slate-200/60 dark:border-slate-700/60 cursor-pointer shrink-0"
            >
              <Link2 size={10.5} />
              <span>Join</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CARD BODY (Vertically Centered with flex-1 flex flex-col justify-center)*/}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col justify-center my-1.5">
        {/* State A: Available Table */}
        {status === "available" && (
          <div className="py-1">
            {match ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-emerald-100/90 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/70 flex items-center justify-center shrink-0 shadow-2xs">
                    <Users size={16} strokeWidth={2.2} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-400 shrink-0">
                        #{prefix}{match.tokenNumber}
                      </span>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate capitalize">
                        {match.customerName || "Guest"}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-tight">
                      {match.pax} Pax
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Next in line
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2 text-center">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-1">
                  <Utensils size={15} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Clean & Ready
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  Seats up to {table.capacity} guests
                </span>
              </div>
            )}
          </div>
        )}

        {/* State B: Seated Table */}
        {status === "seated" && primaryToken && (
          <div className="flex flex-col gap-1.5 py-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-indigo-100/90 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/70 flex items-center justify-center shrink-0 shadow-2xs">
                  <Users size={16} strokeWidth={2.2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
                      #{prefix}{primaryToken.token_number}
                    </span>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate capitalize">
                      {primaryToken.customer_name || "Guest"}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-tight">
                    {seatedPax} Pax
                  </span>
                </div>
              </div>

              {isPartiallyOccupied && !isShared && (
                <span className="text-teal-600 dark:text-teal-400 font-bold text-[10.5px] shrink-0">
                  +{spareSeats} left
                </span>
              )}
            </div>

            {table.serverName && (
              <div className="text-[10px] text-slate-400 dark:text-slate-500 pl-0.5">
                Server: {table.serverName}
              </div>
            )}

            {isLingering && (
              <div
                title={`Seated for ${elapsedMins}m (${Math.max(1, elapsedMins - 75)}m past the 75m target)`}
                className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 w-fit"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="text-[11px] font-bold tracking-tight">
                  {Math.max(1, elapsedMins - 75)}m past time limit
                </span>
              </div>
            )}
          </div>
        )}

        {/* State C: Check Dropped (Bill Presented) */}
        {status === "check_dropped" && (
          <div className="flex flex-col gap-1.5 py-1">
            {primaryToken ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${isUnpaid
                          ? "bg-rose-100/90 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/70"
                          : "bg-purple-100/90 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/70"
                        }`}
                    >
                      <Users size={16} strokeWidth={2.2} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`font-mono font-black text-xs shrink-0 ${isUnpaid
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-purple-600 dark:text-purple-400"
                            }`}
                        >
                          #{prefix}{primaryToken.token_number}
                        </span>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate capitalize">
                          {primaryToken.customer_name || "Guest"}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-tight">
                        {seatedPax} Pax
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {isUnpaid ? (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-rose-600 dark:text-rose-400">
                        <Receipt size={11.5} />
                        <span>Pending</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check size={11.5} strokeWidth={2.5} />
                        <span>Bill paid</span>
                      </span>
                    )}
                  </div>
                </div>

                {table.serverName && (
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 pl-0.5">
                    Server: {table.serverName}
                  </div>
                )}
              </>
            ) : (
              <div className="py-2 text-center text-xs text-slate-400 font-medium">
                Settling
              </div>
            )}
          </div>
        )}

        {/* State E: Held */}
        {status === "held" && (
          <div className="py-2.5 px-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-center">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
              Paged Party Hold
            </span>
            <span className="text-[10px] text-amber-700/90 dark:text-amber-400/90 font-medium">
              Held for arriving party (5m grace window)
            </span>
          </div>
        )}

        {/* State F: Blocked */}
        {status === "blocked" && (
          <div className="py-2.5 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
            Table blocked or reserved for private event
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. CARD FOOTER ACTIONS (Pinned to bottom, compact symmetric 40px baseline) */}
      {/* ========================================================================= */}
      <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 px-0.5">
        {/* Actions for Available Table */}
        {status === "available" && (
          <div className="flex items-center gap-1.5 w-full">
            {match ? (
              <>
                <button
                  type="button"
                  onClick={() => onSeatMatch?.(table.id, match.waitingTokenId)}
                  disabled={isLoading || isReadOnly}
                  className="flex-1 h-[40px] min-h-[40px] py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer truncate"
                >
                  <Check size={14} strokeWidth={2.5} className="shrink-0" />
                  <span className="truncate">
                    Seat #{prefix}{match.tokenNumber} ({match.pax}p)
                  </span>
                </button>

                {(onAssignParty || onSeatParty) && (
                  <button
                    type="button"
                    onClick={() => onAssignParty ? onAssignParty(table.id) : onSeatParty?.(table.id)}
                    disabled={isLoading || isReadOnly}
                    title="Browse waitlist to seat a different party"
                    className="shrink-0 w-[40px] h-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ClipboardList size={14} />
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onAssignParty ? onAssignParty(table.id) : onSeatParty ? onSeatParty(table.id) : onSeatWalkIn?.(table.id)}
                  disabled={isLoading || isReadOnly}
                  className="flex-1 h-[40px] min-h-[40px] py-1.5 px-3 rounded-xl bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 active:scale-[0.98] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer truncate"
                >
                  <Users size={14} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <span className="truncate">Assign Customer</span>
                </button>

                {onSeatWalkIn && (
                  <button
                    type="button"
                    onClick={() => onSeatWalkIn(table.id)}
                    disabled={isLoading || isReadOnly}
                    title="Seat Walk-in without Waitlist"
                    className="shrink-0 w-[40px] h-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <UserPlus size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Actions for Seated Table (Clean symmetric layout) */}
        {status === "seated" && (
          <div className="flex items-center gap-1.5 w-full">
            {primaryToken && primaryToken.payment_status === "unpaid" ? (
              <button
                type="button"
                onClick={() => onUpdatePaymentStatus?.(primaryToken.id, "paid")}
                disabled={isLoading || isReadOnly}
                title="Mark table payment as settled"
                className="flex-1 h-[40px] min-h-[40px] py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer truncate"
              >
                <CreditCard size={14} className="shrink-0" />
                <span className="truncate">Mark Paid</span>
              </button>
            ) : primaryToken && primaryToken.payment_status === "paid" ? (
              <button
                type="button"
                onClick={() => onUpdatePaymentStatus?.(primaryToken.id, "unpaid")}
                disabled={isLoading || isReadOnly}
                title="Payment settled — click to revert to Unpaid if needed"
                className="flex-1 h-[40px] min-h-[40px] py-1.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-[0.98] text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer truncate"
              >
                <Check size={14} strokeWidth={2.5} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">Paid</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onAdvanceStatus?.(table.id, "check_dropped")}
                disabled={isLoading || isReadOnly}
                title="Mark bill given / guest settling payment"
                className="flex-1 h-[40px] min-h-[40px] py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer truncate"
              >
                <Receipt size={14} className="shrink-0" />
                <span className="truncate">Give Bill</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onFreeTable?.(table.id, tableName)}
              disabled={isLoading || isReadOnly}
              title={isMerged ? "Clear joined tables and mark available" : "Clear table and mark available"}
              className="shrink-0 w-[40px] h-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}

        {/* Actions for Check Dropped Table */}
        {status === "check_dropped" && (
          <div className="flex items-center gap-1.5 w-full">
            {primaryToken && primaryToken.payment_status === "paid" ? (
              <button
                type="button"
                onClick={() => onFreeTable ? onFreeTable(table.id, tableName) : onAdvanceStatus?.(table.id, "available")}
                disabled={isLoading || isReadOnly}
                title="Guests departed — clear table and mark available"
                className="flex-1 h-[40px] min-h-[40px] py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer truncate"
              >
                <LogOut size={14} className="shrink-0" />
                <span className="truncate">{isMerged ? "Clear Joined" : "Clear Table"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onUpdatePaymentStatus?.(
                    primaryToken ? primaryToken.id : "",
                    "paid"
                  )
                }
                disabled={isLoading || isReadOnly || !primaryToken}
                title="Mark bill as paid"
                className="flex-1 h-[40px] min-h-[40px] py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer truncate"
              >
                <CreditCard size={14} className="shrink-0" />
                <span className="truncate">Mark Paid</span>
              </button>
            )}

            {primaryToken && primaryToken.payment_status === "paid" ? (
              <button
                type="button"
                onClick={() => onUpdatePaymentStatus?.(primaryToken.id, "unpaid")}
                disabled={isLoading || isReadOnly}
                title="Payment settled — click to revert to Unpaid if needed"
                className="shrink-0 w-[40px] h-[40px] rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center transition-all cursor-pointer"
              >
                <Check size={14} strokeWidth={2.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onFreeTable ? onFreeTable(table.id, tableName) : onAdvanceStatus?.(table.id, "available")}
                disabled={isLoading || isReadOnly}
                title="Clear table and mark available"
                className="shrink-0 w-[40px] h-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        )}

        {/* Actions for Held Table */}
        {status === "held" && (
          <div className="flex items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={() => onAdvanceStatus?.(table.id, "seated")}
              disabled={isLoading || isReadOnly}
              className="flex-1 h-[40px] min-h-[40px] py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer truncate"
            >
              <Check size={14} strokeWidth={2.5} className="shrink-0" />
              <span className="truncate">Confirm Arrival</span>
            </button>
            <button
              type="button"
              onClick={() => onAdvanceStatus?.(table.id, "available")}
              disabled={isLoading || isReadOnly}
              title="Release held table back to available"
              className="shrink-0 w-[40px] h-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Actions for Blocked Table */}
        {status === "blocked" && (
          <button
            type="button"
            onClick={() => onAdvanceStatus?.(table.id, "available")}
            disabled={isLoading || isReadOnly}
            className="w-full h-[40px] min-h-[40px] py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            <Unlock size={14} className="shrink-0" />
            <span>Unblock Table</span>
          </button>
        )}
      </div>
    </div>
  );
}
