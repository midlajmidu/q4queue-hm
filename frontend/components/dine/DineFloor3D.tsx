"use client";

import React, { useState, useCallback, Suspense, useEffect, useRef } from "react";
import { ServingToken, WaitingToken, TableConfig } from "@/types/api";
import { use3DTableState, TableOccupancy } from "./hooks/use3DTableState";
import { useFloorLayout, FloorTable } from "./hooks/useFloorLayout";
import DineFloorTabs from "./DineFloorTabs";
import DineTableHUD from "./DineTableHUD";
import DineFloorEditor from "./DineFloorEditor";
import { Users, Utensils, AlertTriangle, Eye, RefreshCw } from "lucide-react";

// Lazy-load the 3D Canvas container only in browser (avoids SSR issues)
import dynamic from "next/dynamic";
const DineFloorCanvas = dynamic(() => import("./DineFloorCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span className="text-slate-400 text-sm font-medium">Loading 3D Floor…</span>
      </div>
    </div>
  ),
});

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  queueId: string;
  tables: TableConfig[];
  allServingTokens: ServingToken[];
  prefix: string;
  onUpdate: () => void;
  isPaused: boolean;
  isReadOnly: boolean;
  waitingTokens: WaitingToken[];
  // All action handlers from DineTableGrid (reuse existing logic)
  onFreeTable: (tableId: number, tableName: string) => void;
  onFreeSingleParty: (token: ServingToken, tableId: number, tableName: string) => void;
  onSkipTable: (tableId: number) => void;
  onSeatNext: (tableId: number, capacity: number) => void;
  onOpenAssignModal: (token: WaitingToken) => void;
  onJoinTable: (
    token: ServingToken,
    currentTableId: number,
    currentTableName: string
  ) => void;
  onOpenCapacityEdit: (tbl: TableConfig, e: React.MouseEvent) => void;
}

// ─── WebGL support check ─────────────────────────────────────────────────────

function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

// ─── Stats bar ───────────────────────────────────────────────────────────────

function StatsBar({
  tables,
  occupied,
  vacant,
  waiting,
  lingering,
}: {
  tables: number;
  occupied: number;
  vacant: number;
  waiting: number;
  lingering: number;
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-2.5 sm:gap-4 px-2.5 sm:px-4 py-1 sm:py-2 bg-black/60 backdrop-blur-md border-t border-white/5 text-[10px] sm:text-[11px] overflow-x-auto scrollbar-none touch-pan-x whitespace-nowrap">
      <div className="flex items-center gap-1 sm:gap-1.5 text-slate-400 shrink-0">
        <Utensils size={11} />
        <span>
          <strong className="text-white">{tables}</strong> tables
        </span>
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5 text-slate-400 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        <span>
          <strong className="text-white">{occupied}</strong> occupied
        </span>
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5 text-slate-400 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>
          <strong className="text-white">{vacant}</strong> available
        </span>
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5 text-slate-400 shrink-0">
        <Users size={11} />
        <span>
          <strong className="text-white">{waiting}</strong> waiting
        </span>
      </div>
      {lingering > 0 && (
        <div className="flex items-center gap-1 sm:gap-1.5 text-red-400 animate-pulse shrink-0">
          <AlertTriangle size={11} />
          <span>
            <strong className="text-red-300">{lingering}</strong> lingering
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function DineFloor3D({
  queueId,
  tables,
  allServingTokens,
  prefix,
  onUpdate,
  isPaused,
  isReadOnly,
  waitingTokens,
  onFreeTable,
  onFreeSingleParty,
  onSkipTable,
  onSeatNext,
  onOpenAssignModal,
  onJoinTable,
  onOpenCapacityEdit,
}: Props) {
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [hoveredTableId, setHoveredTableId] = useState<number | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [hudPos, setHudPos] = useState<{ x: number; y: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check WebGL on mount
  useEffect(() => {
    setWebGLSupported(hasWebGL());
  }, []);

  // Toggle fullscreen handler supporting native requestFullscreen and fallback fixed viewport
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen((prev) => !prev);
        });
      } else {
        setIsFullscreen((prev) => !prev);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "f" || e.key === "F") &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen]);

  // Floor layout state
  const {
    layout,
    activeFloorId,
    setActiveFloorId,
    isEditorMode,
    setEditorMode,
    isSaving,
    isDirty,
    saveLayout,
    updateTable,
    addTable,
    deleteTable,
    addFloor,
    removeFloor,
    splitTables,
    addDecoration,
    removeDecoration,
    updateDecoration,
    addWall,
    removeWall,
    updateWall,
    updateFloorMeta,
    makeSquarePlot,
    packTablesInside,
    autoFitRoom,
    autoOrganizeFloor,
    moveTableToFloor,
    viewMode,
    setViewMode,
  } = useFloorLayout(queueId, tables);

  // Table occupancy state (re-uses same logic as DineTableGrid)
  const { tableTokensMap, getOccupancy, vacantTables } = use3DTableState(
    tables,
    allServingTokens
  );

  const activeFloor =
    layout.floors.find((f) => f.id === activeFloorId) ?? layout.floors[0];

  // Compute stats
  const floorTables = activeFloor?.tables ?? [];
  const occupiedCount = floorTables.filter(
    (t) => (tableTokensMap.get(t.id)?.length ?? 0) > 0
  ).length;
  const vacantCount = floorTables.length - occupiedCount;
  const lingeringCount = floorTables.filter((t) => {
    const occ = getOccupancy(t.id, t.capacity);
    return occ.isLingering;
  }).length;

  // Handlers
  const handleTableClick = useCallback(
    (id: number, screenX: number, screenY: number) => {
      setSelectedTableId(id);
      setHoveredTableId(id);
      setHudPos({ x: screenX, y: screenY });
    },
    []
  );

  const handleTableHover = useCallback((id: number | null) => {
    setHoveredTableId(id);
    if (id === null) {
      // Only clear HUD if not selected
      setHudPos(null);
    }
  }, []);

  const handleHudClose = useCallback(() => {
    setSelectedTableId(null);
    setHoveredTableId(null);
    setHudPos(null);
  }, []);

  const handleSave = useCallback(async () => {
    await saveLayout(layout);
    onUpdate?.();
  }, [layout, saveLayout, onUpdate]);

  // If WebGL not supported, show fallback message
  if (!webGLSupported) {
    return (
      <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 flex flex-col items-center justify-center gap-3 p-10 text-center">
        <Eye size={32} className="text-slate-600" />
        <div className="text-slate-400 text-sm font-medium">
          3D Floor View requires WebGL support.
        </div>
        <div className="text-slate-600 text-xs">
          Please use a modern browser or switch to Paper View above.
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-[100] w-screen h-screen rounded-none border-none bg-slate-950 shadow-none"
          : "rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl h-[460px] sm:h-[540px] md:h-[620px] lg:h-[680px]"
      }`}
      style={
        isFullscreen
          ? { height: "100vh", width: "100vw", minHeight: "100vh" }
          : undefined
      }
    >
      {/* ── Floor Tabs ─────────────────────────────────────────── */}
      <DineFloorTabs
        floors={layout.floors}
        activeFloorId={activeFloorId}
        onSwitch={setActiveFloorId}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(viewMode === "single_block" ? "avenue" : "single_block")}
        isReadOnly={isReadOnly}
        isEditorMode={isEditorMode}
        onToggleEditor={() => setEditorMode((e) => !e)}
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onAddFloor={addFloor}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* ── 3D Canvas ──────────────────────────────────────────── */}
      <div className="absolute inset-0 top-9 sm:top-10 bottom-8 sm:bottom-9 overflow-hidden">
        {activeFloor && (
          <DineFloorCanvas
            floors={layout.floors}
            activeFloorId={activeFloorId}
            onSwitchFloor={setActiveFloorId}
            viewMode={viewMode}
            floor={activeFloor}
            getOccupancy={getOccupancy}
            prefix={prefix}
            hoveredTableId={hoveredTableId}
            selectedTableId={selectedTableId}
            isEditorMode={isEditorMode}
            onTableClick={handleTableClick}
            onTableHover={(id, cx, cy) => {
              setHoveredTableId(id);
              if (id !== null && cx !== undefined && cy !== undefined && selectedTableId === null) {
                setHudPos({ x: cx, y: cy });
              }
            }}
            onTableDrag={(tblId, nx, nz) =>
              updateTable(activeFloorId, tblId, { x: nx, z: nz })
            }
            onDecorDrag={(idx, nx, nz) =>
              updateDecoration(activeFloorId, idx, { x: nx, z: nz })
            }
            onWallDrag={(idx, newFrom, newTo) =>
              updateWall(activeFloorId, idx, { from: newFrom, to: newTo })
            }
            onWallRotate={(idx) => {
              const w = activeFloor?.walls?.[idx];
              if (!w) return;
              const dx = w.to[0] - w.from[0];
              const dz = w.to[1] - w.from[1];
              const len = Math.sqrt(dx * dx + dz * dz);
              const cx = (w.from[0] + w.to[0]) / 2;
              const cz = (w.from[1] + w.to[1]) / 2;
              const isHorizontal = Math.abs(dx) > Math.abs(dz);
              const newFrom: [number, number] = isHorizontal
                ? [Math.round(cx * 2) / 2, Math.round((cz - len / 2) * 2) / 2]
                : [Math.round((cx - len / 2) * 2) / 2, Math.round(cz * 2) / 2];
              const newTo: [number, number] = isHorizontal
                ? [Math.round(cx * 2) / 2, Math.round((cz + len / 2) * 2) / 2]
                : [Math.round((cx + len / 2) * 2) / 2, Math.round(cz * 2) / 2];
              updateWall(activeFloorId, idx, { from: newFrom, to: newTo });
            }}
            onDeleteWall={(idx) => removeWall(activeFloorId, idx)}
            onUpdateTable={(tblId, updates) =>
              updateTable(activeFloorId, tblId, updates)
            }
            onDeleteTable={(tblId) => deleteTable(activeFloorId, tblId)}
          />
        )}
      </div>

      {/* ── HUD Overlay (Guest seating & ops - active outside editor mode) ── */}
      {!isEditorMode && selectedTableId !== null && hudPos && activeFloor && (
        <DineTableHUD
          tableId={selectedTableId}
          tables={activeFloor.tables}
          tableTokensMap={tableTokensMap}
          getOccupancy={getOccupancy}
          waitingTokens={waitingTokens}
          prefix={prefix}
          anchorPos={hudPos}
          isReadOnly={isReadOnly}
          isPaused={isPaused}
          onFreeTable={onFreeTable}
          onFreeSingleParty={onFreeSingleParty}
          onSkipTable={onSkipTable}
          onSeatNext={onSeatNext}
          onOpenAssignModal={onOpenAssignModal}
          onJoinTable={onJoinTable}
          onOpenCapacityEdit={onOpenCapacityEdit}
          vacantTables={vacantTables}
          onClose={handleHudClose}
        />
      )}

      {/* ── Editor Side Panel ──────────────────────────────────── */}
      {isEditorMode && activeFloor && (
        <DineFloorEditor
          floor={activeFloor}
          allFloors={layout.floors}
          activeFloorId={activeFloorId}
          onSwitchFloor={setActiveFloorId}
          allTables={tables}
          selectedTableId={selectedTableId}
          onSelectTable={setSelectedTableId}
          onUpdateTable={(tableId, updates) =>
            updateTable(activeFloorId, tableId, updates)
          }
          onDeleteTable={(tableId) => deleteTable(activeFloorId, tableId)}
          onAddTable={(floorId, custom) => addTable(floorId, custom)}
          onMoveTableToFloor={(tableId, toFloorId) =>
            moveTableToFloor(tableId, activeFloorId, toFloorId)
          }
          onAddDecoration={(item) => addDecoration(activeFloorId, item)}
          onRemoveDecoration={(i) => removeDecoration(activeFloorId, i)}
          onUpdateDecoration={(i, updates) => updateDecoration(activeFloorId, i, updates)}
          onAddWall={(wall) => addWall(activeFloorId, wall)}
          onRemoveWall={(i) => removeWall(activeFloorId, i)}
          onUpdateWall={(i, updates) => updateWall(activeFloorId, i, updates)}
          onUpdateFloorMeta={(updates) => updateFloorMeta(activeFloorId, updates)}
          onMakeSquarePlot={(size) => makeSquarePlot(activeFloorId, size)}
          onPackTablesInside={() => packTablesInside(activeFloorId)}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode(viewMode === "single_block" ? "avenue" : "single_block")}
          onAutoFitRoom={() => autoFitRoom(activeFloorId)}
          onAutoOrganizeFloor={() => autoOrganizeFloor(activeFloorId)}
          onSplitTables={splitTables}
          onAddFloor={addFloor}
          onRemoveFloor={removeFloor}
          isReadOnly={isReadOnly}
        />
      )}

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <StatsBar
        tables={floorTables.length}
        occupied={occupiedCount}
        vacant={vacantCount}
        waiting={waitingTokens.length}
        lingering={lingeringCount}
      />

      {/* ── Camera hint (hidden on mobile to keep 3D view and editor buttons clean) ── */}
      <div className="hidden sm:block absolute bottom-10 right-3 z-10 text-[9px] text-slate-500/80 pointer-events-none select-none">
        Drag to rotate · Scroll to zoom · Click table for details
      </div>
    </div>
  );
}
