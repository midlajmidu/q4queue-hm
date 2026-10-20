"use client";

import React, { useState, useMemo, useEffect } from "react";
import { EnhancedTableConfig, resolveTableStatus } from "@/types/dine";
import { ServingToken } from "@/types/api";
import ModalPortal from "@/components/ui/ModalPortal";
import {
  Layers,
  Plus,
  X,
} from "lucide-react";

export interface ServerRotationBarProps {
  tables: EnhancedTableConfig[];
  tableTokensMap?: Map<number, ServingToken[]>;
  availableSections: string[];
  selectedSection: string;
  onSelectSection: (section: string) => void;
  onAddSection?: (name: string) => void;
  onDeleteSection?: (name: string) => void;
  servers?: any[];
  onUpdateServers?: (servers: any[]) => void;
  isReadOnly?: boolean;
}

export default function ServerRotationBar({
  tables,
  tableTokensMap,
  availableSections = [],
  selectedSection = "all",
  onSelectSection,
  onAddSection,
  onDeleteSection,
  isReadOnly = false,
}: ServerRotationBarProps) {
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!showAddSectionModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAddSectionModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddSectionModal]);

  // 1. Calculate section counts (total tables and available tables)
  const sectionStats = useMemo(() => {
    const stats: Record<string, { total: number; available: number; occupied: number }> = {
      all: { total: tables.length, available: 0, occupied: 0 },
    };

    for (const sec of availableSections) {
      stats[sec] = { total: 0, available: 0, occupied: 0 };
    }

    for (const t of tables) {
      const tokens = tableTokensMap?.get(t.id) || [];
      const isVacant = resolveTableStatus(t, tokens) === "available";

      if (isVacant) stats.all.available++;
      else stats.all.occupied++;

      const secName = t.section ? t.section.trim() : "Main Dining";
      if (!stats[secName]) {
        stats[secName] = { total: 0, available: 0, occupied: 0 };
      }
      stats[secName].total++;
      if (isVacant) stats[secName].available++;
      else stats[secName].occupied++;
    }

    return stats;
  }, [tables, availableSections, tableTokensMap]);

  const handleCreateSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    onAddSection?.(newSectionName.trim());
    setNewSectionName("");
    setShowAddSectionModal(false);
  };

  return (
    <div className="flex flex-col gap-2.5 mb-4">
      {/* ========================================================================= */}
      {/* 1. SECTION TABS                                                           */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {/* All Sections */}
          <button
            type="button"
            onClick={() => onSelectSection("all")}
            className={`h-8 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border select-none ${
              selectedSection === "all"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/25"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/90 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <span>All Sections</span>
            <span
              className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                selectedSection === "all"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
            >
              {sectionStats.all?.total || tables.length}
            </span>
          </button>

          {/* Individual Section Buttons */}
          {availableSections.map((sec) => {
            const isSelected = selectedSection.toLowerCase() === sec.toLowerCase();
            const count = sectionStats[sec]?.total || tables.filter((t) => t.section === sec).length;
            const avail = sectionStats[sec]?.available ?? 0;

            return (
              <div key={sec} className="relative group/zone shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectSection(sec)}
                  className={`h-8 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border select-none ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/25"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/90 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <span>{sec}</span>
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                  {avail > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isSelected ? "bg-emerald-300" : "bg-emerald-500"
                      }`}
                      title={`${avail} available`}
                    />
                  )}
                </button>
                {onDeleteSection && !isReadOnly && sec !== "Main Dining" && count === 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSection(sec);
                    }}
                    title={`Remove empty zone "${sec}"`}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-rose-500 hover:text-white text-slate-600 dark:text-slate-300 text-[11px] font-black flex items-center justify-center opacity-0 group-hover/zone:opacity-100 transition-opacity shadow-xs cursor-pointer z-10"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          {/* + Add Section Button */}
          {onAddSection && !isReadOnly && (
            <button
              type="button"
              onClick={() => setShowAddSectionModal(true)}
              className="h-8 px-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs select-none"
            >
              <Plus size={13} strokeWidth={2.2} />
              <span>Add Zone</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ADD SECTION MODAL POPUP (Global ModalPortal with Full Viewport Blur)    */}
      {/* ========================================================================= */}
      {showAddSectionModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 dark:bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-200"
            onClick={() => setShowAddSectionModal(false)}
          >
            <div
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] p-6 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Add Dining Zone / Section
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleCreateSection} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Section Name
                  </label>
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="e.g. Patio, Rooftop, Bar Area"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSectionModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newSectionName.trim()}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-xs transition-all cursor-pointer"
                  >
                    Add Zone
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
