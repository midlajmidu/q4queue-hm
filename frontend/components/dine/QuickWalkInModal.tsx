"use client";

import React, { useState, useEffect, useMemo } from "react";
import { EnhancedTableConfig, QuickWalkInPayload, resolveTableStatus } from "@/types/dine";
import ModalPortal from "@/components/ui/ModalPortal";
import {
  X,
  UserPlus,
  Phone,
  User,
  Check,
  ClipboardList,
  AlertCircle,
  Utensils,
} from "lucide-react";

export interface QuickWalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: EnhancedTableConfig[];
  initialTableId?: number | null;
  onSubmit: (payload: QuickWalkInPayload) => void | Promise<void>;
  isSubmitting?: boolean;
}

const PAX_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function QuickWalkInModal({
  isOpen,
  onClose,
  tables,
  initialTableId = null,
  onSubmit,
  isSubmitting = false,
}: QuickWalkInModalProps) {
  const [pax, setPax] = useState<number>(2);
  const [customPax, setCustomPax] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(initialTableId);

  // Available vacant tables
  const vacantTables = useMemo(() => {
    return tables.filter((t) => resolveTableStatus(t) === "available");
  }, [tables]);

  // Fitting tables for the selected PAX
  const effectivePax = customPax ? Math.max(1, parseInt(customPax, 10) || 1) : pax;

  const fittingTables = useMemo(() => {
    return vacantTables
      .filter((t) => t.capacity >= effectivePax)
      .sort((a, b) => a.capacity - b.capacity);
  }, [vacantTables, effectivePax]);

  // Sync initialTableId when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialTableId) {
        setSelectedTableId(initialTableId);
        const tbl = tables.find((t) => t.id === initialTableId);
        if (tbl) setPax(Math.min(4, tbl.capacity));
      } else {
        // Auto-select best fitting table if available
        if (fittingTables.length > 0) {
          setSelectedTableId(fittingTables[0].id);
        } else {
          setSelectedTableId(null);
        }
      }
    }
  }, [isOpen, initialTableId, tables, fittingTables]);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePaxSelect = (num: number) => {
    setPax(num);
    setCustomPax("");
    // Re-check fitting tables
    const fits = vacantTables.filter((t) => t.capacity >= num).sort((a, b) => a.capacity - b.capacity);
    if (fits.length > 0 && (!selectedTableId || !fits.some((f) => f.id === selectedTableId))) {
      setSelectedTableId(fits[0].id);
    }
  };

  const handleInstantSeatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableId) return;

    await onSubmit({
      pax: effectivePax,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      immediateTableId: selectedTableId,
    });
  };

  const handleAddToWaitlistSubmit = async () => {
    await onSubmit({
      pax: effectivePax,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      immediateTableId: null,
    });
  };

  const selectedTableObj = tables.find((t) => t.id === selectedTableId);

  const content = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 dark:bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* 1. MODAL HEADER                                                           */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Quick Walk-in Host Entry
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {fittingTables.length > 0
                  ? `${fittingTables.length} ready table${fittingTables.length === 1 ? "" : "s"} fit this party`
                  : "No vacant table fits this party right now"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. FORM BODY (Scrollable on small screens)                                 */}
        {/* ========================================================================= */}
        <form onSubmit={handleInstantSeatSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Party Size (PAX) Keypad */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Party Size (Guests)</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">
                {effectivePax} {effectivePax === 1 ? "Guest" : "Guests"}
              </span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {PAX_OPTIONS.map((num) => {
                const isSelected = !customPax && pax === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePaxSelect(num)}
                    className={`min-h-[48px] rounded-2xl font-black text-sm transition-all shadow-2xs active:scale-[0.96] cursor-pointer flex flex-col items-center justify-center border ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{num}</span>
                    <span className="text-[9px] font-normal opacity-75">pax</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Pax input for 9+ parties */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">Or custom size:</span>
              <input
                type="number"
                min="1"
                max="50"
                value={customPax}
                onChange={(e) => setCustomPax(e.target.value)}
                placeholder="e.g. 10 or 14"
                className="w-24 px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          {/* Guest Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Guest Name (Optional)
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. David Miller"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Phone Number (For SMS Paging)
              </label>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Target Table Selector (If seating immediately) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Utensils size={13} className="text-indigo-600" />
                <span>Assign to Table:</span>
              </span>
              <span className="text-[11px] text-slate-400">
                {fittingTables.length} fitting table{fittingTables.length === 1 ? "" : "s"} ready
              </span>
            </div>

            {fittingTables.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {fittingTables.map((tbl) => {
                  const isSelected = selectedTableId === tbl.id;
                  return (
                    <button
                      key={tbl.id}
                      type="button"
                      onClick={() => setSelectedTableId(tbl.id)}
                      className={`min-h-[44px] p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 ring-2 ring-emerald-500/20"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                        <span>{tbl.name || `T${tbl.id}`}</span>
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold">
                          {tbl.capacity}p
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {tbl.section || "Main Dining"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium py-1">
                <AlertCircle size={14} className="shrink-0" />
                <span>All fitting tables are currently occupied. Place party on waitlist below.</span>
              </div>
            )}
          </div>
        </form>

        {/* ========================================================================= */}
        {/* 3. MODAL ACTION FOOTER (Two distinct clear choices)                       */}
        {/* ========================================================================= */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center gap-2.5">
          {/* Action 1: Instant Seating */}
          {selectedTableId && (
            <button
              type="button"
              onClick={handleInstantSeatSubmit}
              disabled={isSubmitting}
              className="w-full sm:flex-1 min-h-[46px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Check size={16} strokeWidth={2.5} />
              <span>
                Seat at {selectedTableObj?.name || `Table ${selectedTableId}`} ({selectedTableObj?.capacity}p)
              </span>
            </button>
          )}

          {/* Action 2: Add to Waitlist */}
          <button
            type="button"
            onClick={handleAddToWaitlistSubmit}
            disabled={isSubmitting}
            className={`w-full sm:flex-1 min-h-[46px] py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedTableId
                ? "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            }`}
          >
            <ClipboardList size={15} />
            <span>Add to Waitlist Register</span>
          </button>
        </div>
      </div>
    </div>
  );

  return <ModalPortal>{content}</ModalPortal>;
}
