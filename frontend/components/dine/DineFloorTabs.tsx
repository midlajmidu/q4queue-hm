"use client";

import React from "react";
import {
  Building2,
  Plus,
  Settings2,
  Save,
  Sun,
  Moon,
  TreePine,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { FloorLayout, FloorTheme } from "./hooks/useFloorLayout";

interface Props {
  floors: FloorLayout[];
  activeFloorId: string;
  onSwitch: (id: string) => void;
  viewMode?: "single_block" | "avenue";
  onToggleViewMode?: () => void;
  isReadOnly: boolean;
  isEditorMode: boolean;
  onToggleEditor: () => void;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onAddFloor: (name: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const THEME_ICONS: Record<FloorTheme, React.ReactNode> = {
  city_daylight: <Building2 size={11} />,
  dark_modern: <Building2 size={11} />,
  warm_bistro: <Sun size={11} />,
  outdoor_patio: <TreePine size={11} />,
};

const THEME_LABELS: Record<FloorTheme, string> = {
  city_daylight: "City Daylight",
  dark_modern: "City Daylight",
  warm_bistro: "Warm Bistro",
  outdoor_patio: "Outdoor",
};

export default function DineFloorTabs({
  floors,
  activeFloorId,
  onSwitch,
  viewMode = "single_block",
  onToggleViewMode,
  isReadOnly,
  isEditorMode,
  onToggleEditor,
  isDirty,
  isSaving,
  onSave,
  onAddFloor,
  isFullscreen,
  onToggleFullscreen,
}: Props) {
  const handleAddFloor = () => {
    const name = prompt("Enter floor/section name (e.g. Rooftop, 1st Floor, Outdoor):");
    if (name?.trim()) onAddFloor(name.trim());
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-black/60 backdrop-blur-md border-b border-white/10 select-none">
      {/* Floor icon (hidden on small mobile screens to maximize tabs room) */}
      <Building2 size={14} className="text-slate-400 shrink-0 hidden sm:block" />

      {/* Floor tabs with smooth touch horizontal scrolling */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-none touch-pan-x py-0.5">
        {floors.map((floor) => {
          const isActive = floor.id === activeFloorId;
          return (
            <button
              key={floor.id}
              type="button"
              onClick={() => onSwitch(floor.id)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 font-bold"
                  : "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
              }`}
            >
              <span className="opacity-70">{THEME_ICONS[floor.theme]}</span>
              <span className="truncate max-w-[90px] sm:max-w-none">{floor.name}</span>
              <span className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-white/10 text-slate-400"
              }`}>
                {floor.tables.length}t
              </span>
            </button>
          );
        })}

        {/* Add floor button */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleAddFloor}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0 cursor-pointer"
            title="Add new floor / section"
          >
            <Plus size={11} />
            <span className="hidden sm:inline">Add Section</span>
            <span className="sm:hidden text-[10px]">Add</span>
          </button>
        )}
      </div>

      {/* Multi-Floor View Mode Toggle */}
      {floors.length > 1 && onToggleViewMode && (
        <button
          type="button"
          onClick={onToggleViewMode}
          title={viewMode === "single_block" ? "Switch to Side-by-Side Avenue view" : "Switch to Single Center Block view"}
          className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-all shrink-0 cursor-pointer"
        >
          <span>{viewMode === "single_block" ? "🏢 Focus" : "🏘️ Ave"}</span>
        </button>
      )}

      {/* Right Controls: Fullscreen + Save + Edit */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (Esc or F)" : "Full Screen 3D View (F)"}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer ${
              isFullscreen
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/30 font-bold"
                : "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
            }`}
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span className="hidden md:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>
        )}

        {!isReadOnly && isDirty && (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-emerald-500 hover:bg-emerald-400 text-white transition-all shadow-md shadow-emerald-500/30 disabled:opacity-60 cursor-pointer"
          >
            <Save size={11} />
            <span className="hidden sm:inline">{isSaving ? "Saving…" : "Save Layout"}</span>
            <span className="sm:hidden">{isSaving ? "…" : "Save"}</span>
          </button>
        )}

        {!isReadOnly && (
          <button
            type="button"
            onClick={onToggleEditor}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer ${
              isEditorMode
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/30 font-bold"
                : "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
            }`}
          >
            <Settings2 size={11} />
            <span className="hidden sm:inline">{isEditorMode ? "Exit Edit" : "Edit Layout"}</span>
            <span className="sm:hidden">{isEditorMode ? "Done" : "Edit"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
