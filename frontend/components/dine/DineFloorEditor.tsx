"use client";

import React, { useState, useEffect } from "react";
import { FloorLayout, FloorTable, DecorationItem, WallSegment } from "./hooks/useFloorLayout";
import { TableConfig } from "@/types/api";
import { getTableDimensions } from "./DineFloorScene";
import {
  Plus,
  Trash2,
  RotateCw,
  Move,
  Square,
  Circle,
  Minus,
  DoorOpen,
  Split,
  Layers,
  Sparkles,
  Info,
  Sliders,
  X,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  floor: FloorLayout;
  allFloors?: FloorLayout[];
  activeFloorId?: string;
  onSwitchFloor?: (floorId: string) => void;
  allTables: TableConfig[];
  onUpdateTable: (tableId: number, updates: Partial<FloorTable>) => void;
  onDeleteTable?: (tableId: number) => void;
  onAddTable?: (floorId: string, custom?: Partial<FloorTable>) => FloorTable | void | undefined | null;
  onMoveTableToFloor?: (tableId: number, toFloorId: string) => void;
  onSplitTables?: (fromFloorId: string, toFloorId: string, count: number) => void;
  onAddFloor?: (name?: string) => void;
  onRemoveFloor?: (floorId: string) => void;
  onAddDecoration: (item: DecorationItem) => void;
  onRemoveDecoration: (index: number) => void;
  onUpdateDecoration: (index: number, updates: Partial<DecorationItem>) => void;
  onAddWall: (wall: WallSegment) => void;
  onRemoveWall: (index: number) => void;
  onUpdateWall: (index: number, updates: Partial<WallSegment>) => void;
  onUpdateFloorMeta: (updates: Partial<Pick<FloorLayout, "name" | "theme" | "room_width" | "room_depth" | "hasEntranceCounter">>) => void;
  onMakeSquarePlot?: (size?: number) => void;
  onPackTablesInside?: () => void;
  viewMode?: "single_block" | "avenue";
  onToggleViewMode?: () => void;
  onAutoFitRoom?: () => void;
  onAutoOrganizeFloor?: () => void;
  isReadOnly: boolean;
  selectedTableId?: number | null;
  onSelectTable?: (tableId: number | null) => void;
}

const DECORATION_OPTIONS: Array<{
  type: DecorationItem["type"];
  label: string;
  emoji: string;
}> = [
  { type: "snake_plant", label: "Snake Plant", emoji: "🪴" },
  { type: "potted_palm", label: "Palm Tree", emoji: "🌴" },
  { type: "sofa_lounge", label: "Lounge Sofa", emoji: "🛋️" },
  { type: "counter", label: "Bar Counter", emoji: "🍸" },
  { type: "flower_pot", label: "Flower Pot", emoji: "🌸" },
];

const TABLE_SHAPES: Array<{
  shape: FloorTable["shape"];
  label: string;
  icon: React.ReactNode;
}> = [
  { shape: "square", label: "Square", icon: <Square size={12} /> },
  { shape: "round", label: "Round", icon: <Circle size={12} /> },
  { shape: "booth", label: "Booth", icon: <Minus size={12} /> },
  { shape: "banquet", label: "Banquet", icon: <Move size={12} /> },
];

const THEME_OPTIONS = [
  { value: "city_daylight", label: "🏙️ City Daylight (Architectural Model)" },
  { value: "dark_modern", label: "🏢 Studio Daylight (White & Sand)" },
  { value: "warm_bistro", label: "☀️ Warm Bistro (Oak Wood)" },
  { value: "outdoor_patio", label: "🌿 Outdoor Terrace (Garden)" },
] as const;

export default function DineFloorEditor({
  floor,
  allFloors,
  activeFloorId,
  onSwitchFloor,
  allTables,
  onUpdateTable,
  onDeleteTable,
  onAddTable,
  onMoveTableToFloor,
  onSplitTables,
  onAddFloor,
  onRemoveFloor,
  onAddDecoration,
  onRemoveDecoration,
  onUpdateDecoration,
  onAddWall,
  onRemoveWall,
  onUpdateWall,
  onUpdateFloorMeta,
  onMakeSquarePlot,
  onPackTablesInside,
  viewMode,
  onToggleViewMode,
  onAutoFitRoom,
  onAutoOrganizeFloor,
  isReadOnly,
  selectedTableId: externalSelectedTableId,
  onSelectTable,
}: Props) {
  const [internalSelectedTableId, setInternalSelectedTableId] = useState<number | null>(null);
  const selectedTableId = externalSelectedTableId !== undefined ? externalSelectedTableId : internalSelectedTableId;
  const setSelectedTableId = (id: number | null) => {
    setInternalSelectedTableId(id);
    onSelectTable?.(id);
  };

  const [selectedWallIndex, setSelectedWallIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"tables" | "walls" | "decor" | "room">("tables");
  const [isMinimized, setIsMinimized] = useState(false);

  // Multi-floor management in editor
  const [isEditorAddingFloor, setIsEditorAddingFloor] = useState(false);
  const [editorNewFloorName, setEditorNewFloorName] = useState("");
  const otherFloors = (allFloors || []).filter((f) => f.id !== floor.id);
  const [splitTargetFloorId, setSplitTargetFloorId] = useState<string>(otherFloors[0]?.id || "");

  // Sync splitTargetFloorId if other floors change
  useEffect(() => {
    if (otherFloors.length > 0 && !otherFloors.some((f) => f.id === splitTargetFloorId)) {
      setSplitTargetFloorId(otherFloors[0].id);
    }
  }, [allFloors, floor.id]);

  // New Table adder state
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableShape, setNewTableShape] = useState<FloorTable["shape"]>("square");
  const [newTableFloorId, setNewTableFloorId] = useState(floor.id);

  // Delete confirmation state
  const [confirmDeleteTableId, setConfirmDeleteTableId] = useState<number | null>(null);

  if (isReadOnly) return null;

  const selectedTable = selectedTableId
    ? floor.tables.find((t) => t.id === selectedTableId)
    : null;

  const selectedWall = selectedWallIndex !== null
    ? floor.walls[selectedWallIndex]
    : null;

  // Handlers for tables
  const handleRotateTable = (tableId: number, current: number) => {
    const next = (current + 45) % 360;
    onUpdateTable(tableId, { rotation: next });
  };

  const handleShapeChange = (tableId: number, shape: FloorTable["shape"]) => {
    onUpdateTable(tableId, { shape });
  };

  const handleCapacityChange = (tableId: number, currentCap: number, delta: number) => {
    const nextCap = Math.max(1, Math.min(24, currentCap + delta));
    onUpdateTable(tableId, { capacity: nextCap });
  };

  // Direct dimension setter (from input or slider)
  const handleSetDimension = (
    tableId: number,
    axis: "width" | "depth",
    val: number
  ) => {
    const minVal = 0.6;
    const maxVal = axis === "width" ? 10.0 : 8.0;
    const clamped = Math.round(Math.max(minVal, Math.min(maxVal, val)) * 10) / 10;
    onUpdateTable(tableId, { [axis]: clamped });
  };

  // Stepper increment/decrement
  const handleDimensionChange = (
    tableId: number,
    axis: "width" | "depth",
    delta: number
  ) => {
    const tbl = floor.tables.find((t) => t.id === tableId);
    if (!tbl) return;
    const baseDims = getTableDimensions(tbl.capacity, tbl.shape);
    const curVal =
      axis === "width"
        ? (tbl.width ?? baseDims.tableW)
        : (tbl.depth ?? baseDims.tableD);
    const minVal = 0.6;
    const maxVal = axis === "width" ? 10.0 : 8.0;
    const nextVal = Math.round(Math.max(minVal, Math.min(maxVal, curVal + delta)) * 10) / 10;
    onUpdateTable(tableId, { [axis]: nextVal });
  };

  const handleApplyPresetDimensions = (tableId: number, width: number, depth: number) => {
    onUpdateTable(tableId, { width, depth });
    toast.success(`Set dimensions to ${width}m × ${depth}m`);
  };

  const handleResetDimensions = (tableId: number) => {
    onUpdateTable(tableId, { width: undefined, depth: undefined });
    toast.success("Table dimensions reset to default");
  };

  const handleDeleteTable = (tableId: number, tableName: string) => {
    if (confirmDeleteTableId === tableId) {
      onDeleteTable?.(tableId);
      if (selectedTableId === tableId) {
        setSelectedTableId(null);
      }
      setConfirmDeleteTableId(null);
      toast.success(`Table "${tableName}" deleted`);
    } else {
      setConfirmDeleteTableId(tableId);
      toast.warning(`Click delete again to confirm deleting "${tableName}"`);
      setTimeout(() => {
        setConfirmDeleteTableId((prev) => (prev === tableId ? null : prev));
      }, 4000);
    }
  };

  const handleMoveToFloor = (tableId: number, targetFloorId: string) => {
    if (targetFloorId === floor.id) return;
    onMoveTableToFloor?.(tableId, targetFloorId);
    const targetFloor = allFloors?.find((f) => f.id === targetFloorId);
    toast.success(`Moved table to ${targetFloor?.name || targetFloorId}`);
    onSwitchFloor?.(targetFloorId);
  };

  const handleAddNewTable = () => {
    const created = onAddTable?.(newTableFloorId, {
      name: newTableName.trim() || undefined,
      capacity: newTableCapacity,
      shape: newTableShape,
    });
    if (created) {
      if (newTableFloorId !== floor.id) {
        onSwitchFloor?.(newTableFloorId);
      }
      setSelectedTableId(created.id);
      toast.success(`Added ${created.name} (${created.capacity} Pax) to layout!`);
    } else {
      toast.success(`Added table to layout!`);
    }
    setIsAddingTable(false);
    setNewTableName("");
  };

  const handleMoveTable = (tableId: number, dir: "left" | "right" | "up" | "down") => {
    const tbl = floor.tables.find((t) => t.id === tableId);
    if (!tbl) return;
    const step = 0.5;
    const updates: Partial<FloorTable> = {};
    if (dir === "left") updates.x = Math.max(1.2, tbl.x - step);
    if (dir === "right") updates.x = Math.min(floor.room_width - 1.2, tbl.x + step);
    if (dir === "up") updates.z = Math.max(1.2, tbl.z - step);
    if (dir === "down") updates.z = Math.min(floor.room_depth - 1.2, tbl.z + step);
    onUpdateTable(tableId, updates);
  };

  // Handlers for walls
  const handleAddWallPreset = (style: "solid" | "doorway" | "glass" | "half_wall") => {
    const cx = Math.round(floor.room_width / 2);
    const cz = Math.round(floor.room_depth / 2);
    const defaultLength = 5.0;

    const newWall: WallSegment = {
      from: [cx - defaultLength / 2, cz],
      to: [cx + defaultLength / 2, cz],
      style: style === "doorway" ? "solid" : style,
      door: style === "doorway" ? { at: 1.5, width: 2.0 } : undefined,
    };

    onAddWall(newWall);
    setSelectedWallIndex(floor.walls.length);
    toast.success(`Added ${style.replace("_", " ")} to floor`);
  };

  const handleRotateWall = (index: number) => {
    const w = floor.walls[index];
    if (!w) return;
    const dx = w.to[0] - w.from[0];
    const dz = w.to[1] - w.from[1];
    const len = Math.sqrt(dx * dx + dz * dz);
    const cx = (w.from[0] + w.to[0]) / 2;
    const cz = (w.from[1] + w.to[1]) / 2;

    // Toggle between horizontal and vertical
    const isHorizontal = Math.abs(dx) >= Math.abs(dz);
    let newFrom: [number, number];
    let newTo: [number, number];

    if (isHorizontal) {
      newFrom = [cx, Math.max(0, cz - len / 2)];
      newTo = [cx, Math.min(floor.room_depth, cz + len / 2)];
    } else {
      newFrom = [Math.max(0, cx - len / 2), cz];
      newTo = [Math.min(floor.room_width, cx + len / 2), cz];
    }

    onUpdateWall(index, { from: newFrom, to: newTo });
  };

  const handleMoveWall = (index: number, dir: "left" | "right" | "up" | "down") => {
    const w = floor.walls[index];
    if (!w) return;
    const step = 0.5;
    let dx = 0;
    let dz = 0;
    if (dir === "left") dx = -step;
    if (dir === "right") dx = step;
    if (dir === "up") dz = -step;
    if (dir === "down") dz = step;

    onUpdateWall(index, {
      from: [w.from[0] + dx, w.from[1] + dz],
      to: [w.to[0] + dx, w.to[1] + dz],
    });
  };

  // Handlers for decor
  const handleAddDecor = (type: DecorationItem["type"]) => {
    onAddDecoration({
      type,
      x: Math.round((2.0 + Math.random() * (floor.room_width - 4)) * 2) / 2,
      z: Math.round((2.0 + Math.random() * (floor.room_depth - 4)) * 2) / 2,
      rotation: 0,
    });
    toast.success(`Added ${type.replace("_", " ")} to layout`);
  };

  if (isMinimized) {
    return (
      <div className="absolute right-3 bottom-10 z-30 animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-2xl border border-amber-300 cursor-pointer"
        >
          <Sparkles size={13} />
          <span>Editor ({floor.name})</span>
          <ChevronUp size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-9 sm:top-10 bottom-0 w-full sm:w-72 md:w-80 max-w-[92vw] sm:max-w-none z-30 bg-slate-950/95 backdrop-blur-xl border-l border-white/10 flex flex-col overflow-hidden shadow-2xl transition-all">
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="text-[11px] sm:text-[12px] font-black text-amber-400 tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles size={13} />
            <span>Layout Builder</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              0.5m Snap
            </span>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Minimize panel to inspect 3D floor"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5 truncate">{floor.name}</div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-black/20">
        {(["tables", "walls", "decor", "room"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer text-center ${
              activeTab === tab
                ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab === "walls" ? "Walls & Doors" : tab}
          </button>
        ))}
      </div>

      {/* Drag & Drop Hint Banner */}
      <div className="px-3 py-1.5 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center gap-1.5 text-[10px] text-indigo-300">
        <Info size={11} className="shrink-0 text-indigo-400" />
        <span>Direct 3D Drag & Drop active. Click & drag tables on the floor!</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* ── TABLES TAB ─────────────────────────────────────── */}
        {activeTab === "tables" && (
          <div className="p-3 flex flex-col gap-3">
            {/* Add Table to Floor Button & Inline Creator */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsAddingTable((v) => !v)}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 border border-amber-500/30 text-amber-300 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                {isAddingTable ? (
                  <>
                    <X size={13} className="text-amber-400" />
                    <span>Cancel Add Table</span>
                  </>
                ) : (
                  <>
                    <Plus size={13} className="text-amber-400" />
                    <span>+ Add Table to Floor</span>
                  </>
                )}
              </button>

              {isAddingTable && (
                <div className="bg-black/50 border border-amber-500/30 rounded-2xl p-3 flex flex-col gap-2.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={12} />
                      <span>New Table Setup</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingTable(false)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  {/* Floor / Section selector */}
                  {allFloors && allFloors.length > 1 && (
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                        Floor / Section
                      </label>
                      <select
                        value={newTableFloorId}
                        onChange={(e) => setNewTableFloorId(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        {allFloors.map((fl) => (
                          <option key={fl.id} value={fl.id}>
                            {fl.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Table Name */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Table Name
                    </label>
                    <input
                      type="text"
                      placeholder={`e.g. T-${floor.tables.length + 1}`}
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Pax Capacity */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Capacity (Pax)
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[2, 4, 6, 8, 10].map((cap) => (
                        <button
                          key={cap}
                          type="button"
                          onClick={() => setNewTableCapacity(cap)}
                          className={`flex-1 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                            newTableCapacity === cap
                              ? "bg-amber-500 text-slate-950 font-black shadow"
                              : "bg-white/10 hover:bg-white/15 text-slate-300"
                          }`}
                        >
                          {cap}p
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shape */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                      Table Shape
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      {TABLE_SHAPES.map(({ shape, label, icon }) => (
                        <button
                          key={shape}
                          type="button"
                          onClick={() => setNewTableShape(shape)}
                          className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            newTableShape === shape
                              ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                              : "bg-white/10 hover:bg-white/15 text-slate-300"
                          }`}
                        >
                          {icon}
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddNewTable}
                    className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg mt-1 transition-colors"
                  >
                    <Plus size={14} />
                    <span>Place Table on Floor</span>
                  </button>
                </div>
              )}
            </div>

            {/* ── Multi-Floor Split & Table Transfers ── */}
            {allFloors && allFloors.length > 1 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Split size={12} className="text-amber-400" />
                    <span>Split Tables Between Floors</span>
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold truncate max-w-[120px]">
                    {allFloors.map((f) => `${f.name.replace(/\s*\(.*\)/, "")}: ${f.tables.length}`).join(" · ")}
                  </span>
                </div>

                {otherFloors.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 shrink-0">Target:</span>
                    <select
                      value={splitTargetFloorId}
                      onChange={(e) => setSplitTargetFloorId(e.target.value)}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      {otherFloors.map((of) => (
                        <option key={of.id} value={of.id}>
                          {of.name} ({of.tables.length} tables)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSplitTables && splitTargetFloorId) {
                        onSplitTables(floor.id, splitTargetFloorId, 1);
                        const tgtName = otherFloors.find((f) => f.id === splitTargetFloorId)?.name || "Target Floor";
                        toast.success(`Moved 1 table to ${tgtName}`);
                      }
                    }}
                    disabled={floor.tables.length === 0}
                    className="py-1 px-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-[10px] font-bold text-center transition-all cursor-pointer disabled:opacity-40"
                  >
                    Move 1 Table →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSplitTables && splitTargetFloorId) {
                        const count = Math.min(4, floor.tables.length);
                        onSplitTables(floor.id, splitTargetFloorId, count);
                        const tgtName = otherFloors.find((f) => f.id === splitTargetFloorId)?.name || "Target Floor";
                        toast.success(`Moved ${count} tables to ${tgtName}`);
                      }
                    }}
                    disabled={floor.tables.length === 0}
                    className="py-1 px-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-[10px] font-bold text-center transition-all cursor-pointer disabled:opacity-40"
                  >
                    Move 4 Tables →
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSplitTables && splitTargetFloorId) {
                        const total = floor.tables.length + (otherFloors.find((f) => f.id === splitTargetFloorId)?.tables.length || 0);
                        if (total === 20) {
                          const diff = floor.tables.length - 8;
                          if (diff > 0) {
                            onSplitTables(floor.id, splitTargetFloorId, diff);
                          } else if (diff < 0) {
                            onSplitTables(splitTargetFloorId, floor.id, -diff);
                          }
                          toast.success("Enforced 8 Down / 12 Up table split!");
                        } else {
                          const half = Math.floor(floor.tables.length / 2);
                          if (half > 0) {
                            onSplitTables(floor.id, splitTargetFloorId, half);
                            toast.success(`Split ${half} tables to ${otherFloors.find((f) => f.id === splitTargetFloorId)?.name}`);
                          }
                        }
                      }
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[10px] font-bold text-center transition-all cursor-pointer"
                  >
                    ⚡ 8 Down / 12 Up Split
                  </button>
                </div>
              </div>
            )}

            {/* Table selection list */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Tables on floor ({floor.tables.length})
                </span>
                {onAutoFitRoom && (
                  <button
                    type="button"
                    onClick={() => {
                      onAutoFitRoom();
                      toast.success("Room fitted tightly to placed tables!");
                    }}
                    className="text-[9px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={10} />
                    <span>Auto-Fit Room</span>
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-1">
                {floor.tables.map((tbl) => {
                  const dims = getTableDimensions(tbl.capacity, tbl.shape, tbl.width, tbl.depth);
                  const isSel = selectedTableId === tbl.id;
                  const isCustom = tbl.width !== undefined || tbl.depth !== undefined;
                  const isPendingDelete = confirmDeleteTableId === tbl.id;
                  return (
                    <div
                      key={tbl.id}
                      onClick={() => setSelectedTableId(isSel ? null : tbl.id)}
                      className={`p-2 rounded-xl border cursor-pointer transition-all ${
                        isSel
                          ? "bg-amber-500/15 border-amber-500/40 text-white shadow-sm"
                          : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-[11px] font-bold flex items-center gap-1.5">
                            <span className="truncate">{tbl.name}</span>
                            <span className="text-[9px] px-1 rounded bg-white/10 text-slate-300 font-semibold shrink-0">
                              {tbl.capacity} Pax
                            </span>
                            {isCustom && (
                              <span className="text-[8px] px-1 rounded bg-amber-500/20 text-amber-300 font-bold shrink-0">
                                Extended
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-slate-500 truncate">
                            {dims.tableW.toFixed(1)}m × {dims.tableD.toFixed(1)}m · {tbl.shape}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {allFloors && allFloors.length > 1 && (
                            <select
                              value={floor.id}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleMoveToFloor(tbl.id, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[9px] bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-slate-300 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                              title="Assign table to floor"
                            >
                              {allFloors.map((fl) => (
                                <option key={fl.id} value={fl.id}>
                                  {fl.name}
                                </option>
                              ))}
                            </select>
                          )}
                          <span className="text-[10px] font-mono text-amber-300/80">
                            ({tbl.x.toFixed(1)}, {tbl.z.toFixed(1)})
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTable(tbl.id, tbl.name);
                            }}
                            title={`Delete ${tbl.name}`}
                            className={`p-1 rounded-md text-slate-400 hover:text-red-300 hover:bg-red-500/20 cursor-pointer transition-colors ${
                              isPendingDelete ? "bg-red-500/30 text-red-300 animate-pulse" : ""
                            }`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected table deep controls */}
            {selectedTable && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-black text-amber-400">
                    ✏️ {selectedTable.name} Settings
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Pos: ({selectedTable.x.toFixed(1)}m, {selectedTable.z.toFixed(1)}m)
                  </span>
                </div>

                {/* Table Name (Editable) */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Table Name
                  </div>
                  <input
                    type="text"
                    value={selectedTable.name}
                    onChange={(e) => onUpdateTable(selectedTable.id, { name: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Move to Floor / Section */}
                {allFloors && allFloors.length > 1 && (
                  <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                        <Layers size={11} className="text-amber-400" />
                        <span>Move to Floor / Section</span>
                      </span>
                    </div>
                    <select
                      value={floor.id}
                      onChange={(e) => handleMoveToFloor(selectedTable.id, e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      {allFloors.map((fl) => (
                        <option key={fl.id} value={fl.id}>
                          {fl.name} {fl.id === floor.id ? "(Current Floor)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Pax Capacity Changer */}
                <div className="bg-black/30 rounded-xl p-2.5 border border-white/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      Pax Capacity
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">
                      {selectedTable.capacity} Guests
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCapacityChange(selectedTable.id, selectedTable.capacity, -1)}
                      className="w-8 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-black text-xs flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <div className="flex-1 text-center font-black text-[14px] text-white">
                      {selectedTable.capacity} Guests
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCapacityChange(selectedTable.id, selectedTable.capacity, 1)}
                      className="w-8 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white font-black text-xs flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* ── Extend Table Sides & Dimensions Controls ── */}
                {(() => {
                  const baseDims = getTableDimensions(selectedTable.capacity, selectedTable.shape);
                  const currentW = Math.round((selectedTable.width ?? baseDims.tableW) * 10) / 10;
                  const currentD = Math.round((selectedTable.depth ?? baseDims.tableD) * 10) / 10;
                  const isCustomDims = selectedTable.width !== undefined || selectedTable.depth !== undefined;

                  return (
                    <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                          <Sliders size={12} />
                          <span>Extend Table Sides</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">
                            {currentW.toFixed(1)}m × {currentD.toFixed(1)}m
                          </span>
                          {isCustomDims && (
                            <button
                              type="button"
                              onClick={() => handleResetDimensions(selectedTable.id)}
                              className="text-[9px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Length / Width (X-axis) Side Controls */}
                      <div className="bg-white/5 p-2 rounded-lg flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-300 font-bold">Length (X-axis / Width)</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0.6"
                              max="10.0"
                              value={currentW}
                              onChange={(e) =>
                                handleSetDimension(
                                  selectedTable.id,
                                  "width",
                                  parseFloat(e.target.value) || baseDims.tableW
                                )
                              }
                              className="w-14 bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-[10px] font-mono text-white text-right focus:outline-none focus:border-amber-400"
                            />
                            <span className="text-slate-400 text-[10px]">m</span>
                          </div>
                        </div>
                        {/* Range Slider */}
                        <input
                          type="range"
                          min="0.8"
                          max="7.0"
                          step="0.1"
                          value={currentW}
                          onChange={(e) =>
                            handleSetDimension(selectedTable.id, "width", parseFloat(e.target.value))
                          }
                          className="w-full accent-amber-400 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                        />
                        {/* Stepper buttons */}
                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleDimensionChange(selectedTable.id, "width", -0.5)}
                            className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] cursor-pointer"
                            title="Shrink length by 0.5m"
                          >
                            -0.5m
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDimensionChange(selectedTable.id, "width", -0.1)}
                            className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] cursor-pointer"
                            title="Fine shrink by 0.1m"
                          >
                            -0.1m
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDimensionChange(selectedTable.id, "width", 0.1)}
                            className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] cursor-pointer"
                            title="Fine extend by 0.1m"
                          >
                            +0.1m
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDimensionChange(selectedTable.id, "width", 0.5)}
                            className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] cursor-pointer"
                            title="Extend length by 0.5m"
                          >
                            +0.5m
                          </button>
                        </div>
                      </div>

                      {/* Depth / Breadth (Z-axis) Side Controls */}
                      {selectedTable.shape !== "round" && (
                        <div className="bg-white/5 p-2 rounded-lg flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-300 font-bold">Depth (Z-axis / Breadth)</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0.6"
                                max="8.0"
                                value={currentD}
                                onChange={(e) =>
                                  handleSetDimension(
                                    selectedTable.id,
                                    "depth",
                                    parseFloat(e.target.value) || baseDims.tableD
                                  )
                                }
                                className="w-14 bg-slate-900 border border-white/10 rounded px-1.5 py-0.5 text-[10px] font-mono text-white text-right focus:outline-none focus:border-amber-400"
                              />
                              <span className="text-slate-400 text-[10px]">m</span>
                            </div>
                          </div>
                          {/* Range Slider */}
                          <input
                            type="range"
                            min="0.8"
                            max="5.0"
                            step="0.1"
                            value={currentD}
                            onChange={(e) =>
                              handleSetDimension(selectedTable.id, "depth", parseFloat(e.target.value))
                            }
                            className="w-full accent-amber-400 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                          />
                          {/* Stepper buttons */}
                          <div className="flex items-center justify-between gap-1 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleDimensionChange(selectedTable.id, "depth", -0.5)}
                              className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] cursor-pointer"
                              title="Shrink depth by 0.5m"
                            >
                              -0.5m
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDimensionChange(selectedTable.id, "depth", -0.1)}
                              className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] cursor-pointer"
                              title="Fine shrink by 0.1m"
                            >
                              -0.1m
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDimensionChange(selectedTable.id, "depth", 0.1)}
                              className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] cursor-pointer"
                              title="Fine extend by 0.1m"
                            >
                              +0.1m
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDimensionChange(selectedTable.id, "depth", 0.5)}
                              className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] cursor-pointer"
                              title="Extend depth by 0.5m"
                            >
                              +0.5m
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Quick Dimension Presets */}
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Quick Sizing Presets
                        </span>
                        <div className="grid grid-cols-2 gap-1 text-[9px]">
                          <button
                            type="button"
                            onClick={() => handleApplyPresetDimensions(selectedTable.id, 1.4, 1.1)}
                            className="py-1 px-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-semibold cursor-pointer text-center"
                          >
                            Compact (1.4×1.1m)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPresetDimensions(selectedTable.id, 2.0, 1.35)}
                            className="py-1 px-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-semibold cursor-pointer text-center"
                          >
                            Standard (2.0×1.35m)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPresetDimensions(selectedTable.id, 2.8, 1.45)}
                            className="py-1 px-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-semibold cursor-pointer text-center"
                          >
                            Family (2.8×1.45m)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPresetDimensions(selectedTable.id, 4.0, 1.55)}
                            className="py-1 px-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-semibold cursor-pointer text-center"
                          >
                            Banquet (4.0×1.55m)
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Shape Selector */}
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold mb-1">Table Shape</div>
                  <div className="grid grid-cols-2 gap-1">
                    {TABLE_SHAPES.map(({ shape, label, icon }) => (
                      <button
                        key={shape}
                        type="button"
                        onClick={() => handleShapeChange(selectedTable.id, shape)}
                        className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          selectedTable.shape === shape
                            ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                            : "bg-white/10 hover:bg-white/15 text-slate-300"
                        }`}
                      >
                        {icon}
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Keypad Move Controls */}
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold mb-1">Grid Nudge (0.5m)</div>
                  <div className="grid grid-cols-3 gap-1">
                    <div />
                    <button
                      type="button"
                      onClick={() => handleMoveTable(selectedTable.id, "up")}
                      className="py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-[10px] font-bold text-center cursor-pointer"
                    >
                      ▲
                    </button>
                    <div />
                    <button
                      type="button"
                      onClick={() => handleMoveTable(selectedTable.id, "left")}
                      className="py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-[10px] font-bold text-center cursor-pointer"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotateTable(selectedTable.id, selectedTable.rotation)}
                      className="py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[9px] font-bold text-center cursor-pointer flex items-center justify-center gap-1"
                    >
                      <RotateCw size={10} />
                      {selectedTable.rotation}°
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveTable(selectedTable.id, "right")}
                      className="py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-[10px] font-bold text-center cursor-pointer"
                    >
                      ▶
                    </button>
                    <div />
                    <button
                      type="button"
                      onClick={() => handleMoveTable(selectedTable.id, "down")}
                      className="py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-[10px] font-bold text-center cursor-pointer"
                    >
                      ▼
                    </button>
                    <div />
                  </div>
                </div>

                {/* ── Delete Table Button ── */}
                <div className="pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => handleDeleteTable(selectedTable.id, selectedTable.name)}
                    className={`w-full py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      confirmDeleteTableId === selectedTable.id
                        ? "bg-red-600 border-red-500 text-white animate-pulse"
                        : "bg-red-500/15 hover:bg-red-500/25 border-red-500/30 text-red-300"
                    }`}
                  >
                    <Trash2 size={13} />
                    <span>
                      {confirmDeleteTableId === selectedTable.id
                        ? "⚠️ Click again to confirm delete"
                        : `Delete Table ${selectedTable.name}`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── WALLS & DOORS TAB ──────────────────────────────── */}
        {activeTab === "walls" && (
          <div className="p-3 flex flex-col gap-3">
            {/* Wall Presets */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Add Architecture / Partitions
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddWallPreset("solid")}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-[10px] font-bold transition-all cursor-pointer"
                >
                  <span className="text-base">🧱</span>
                  <span>Solid Wall</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddWallPreset("doorway")}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-[10px] font-bold transition-all cursor-pointer"
                >
                  <DoorOpen size={16} className="text-amber-400" />
                  <span>Doorway Wall</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddWallPreset("glass")}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-[10px] font-bold transition-all cursor-pointer"
                >
                  <span className="text-base">🪟</span>
                  <span>Glass Partition</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddWallPreset("half_wall")}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-[10px] font-bold transition-all cursor-pointer"
                >
                  <Split size={16} className="text-emerald-400" />
                  <span>Half Divider</span>
                </button>
              </div>
            </div>

            {/* Custom Placed Walls List */}
            {floor.walls.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Placed Walls ({floor.walls.length})
                </div>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {floor.walls.map((w, i) => {
                    const dx = w.to[0] - w.from[0];
                    const dz = w.to[1] - w.from[1];
                    const len = Math.sqrt(dx * dx + dz * dz).toFixed(1);
                    const isSel = selectedWallIndex === i;

                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedWallIndex(isSel ? null : i)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSel
                            ? "bg-amber-500/15 border-amber-500/40 text-white shadow-sm"
                            : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-[11px] font-bold flex items-center gap-1.5">
                              <span>Wall #{i + 1}</span>
                              <span className="text-[9px] px-1 rounded bg-white/10 text-slate-400 capitalize">
                                {w.style || "solid"}
                              </span>
                            </div>
                            <div className="text-[9px] text-slate-500">
                              Length: {len}m {w.door ? `· Door (${w.door.width}m)` : ""}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveWall(i);
                              if (selectedWallIndex === i) setSelectedWallIndex(null);
                            }}
                            className="text-slate-600 hover:text-red-400 transition-colors p-1 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Wall Controls */}
            {selectedWall && selectedWallIndex !== null && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-amber-400">
                    Wall #{selectedWallIndex + 1} Controls
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRotateWall(selectedWallIndex)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold cursor-pointer"
                  >
                    <RotateCw size={10} />
                    <span>Flip 90°</span>
                  </button>
                </div>

                {/* Move Wall Nudge */}
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold mb-1">Position (0.5m)</div>
                  <div className="grid grid-cols-3 gap-1">
                    <div />
                    <button
                      type="button"
                      onClick={() => handleMoveWall(selectedWallIndex, "up")}
                      className="py-1 rounded bg-white/10 hover:bg-white/15 text-slate-300 text-[10px] font-bold text-center cursor-pointer"
                    >
                      ▲
                    </button>
                    <div />
                    <button
                      type="button"
                      onClick={() => handleMoveWall(selectedWallIndex, "left")}
                      className="py-1 rounded bg-white/10 hover:bg-white/15 text-slate-300 text-[10px] font-bold text-center cursor-pointer"
                    >
                      ◀
                    </button>
                    <div className="text-center text-[9px] text-slate-500 flex items-center justify-center">
                      Wall
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMoveWall(selectedWallIndex, "right")}
                      className="py-1 rounded bg-white/10 hover:bg-white/15 text-slate-300 text-[10px] font-bold text-center cursor-pointer"
                    >
                      ▶
                    </button>
                    <div />
                    <button
                      type="button"
                      onClick={() => handleMoveWall(selectedWallIndex, "down")}
                      className="py-1 rounded bg-white/10 hover:bg-white/15 text-slate-300 text-[10px] font-bold text-center cursor-pointer"
                    >
                      ▼
                    </button>
                    <div />
                  </div>
                </div>

                {/* Doorway Cutout Settings */}
                <div className="border-t border-white/5 pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-300">Door Cutout</span>
                    <button
                      type="button"
                      onClick={() => {
                        const hasDoor = !!selectedWall.door;
                        onUpdateWall(selectedWallIndex, {
                          door: hasDoor ? undefined : { at: 1.5, width: 2.0 },
                        });
                      }}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                        selectedWall.door
                          ? "bg-amber-500 text-black font-black"
                          : "bg-white/10 text-slate-400"
                      }`}
                    >
                      {selectedWall.door ? "Door Enabled" : "+ Add Door"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DECOR TAB ──────────────────────────────────────── */}
        {activeTab === "decor" && (
          <div className="p-3 flex flex-col gap-3">
            <div className="text-[10px] text-slate-400">
              Add plants, lounge seating, or bar counters to complete your restaurant layout.
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Add Decorations
              </div>
              {DECORATION_OPTIONS.map(({ type, label, emoji }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleAddDecor(type)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 text-[11px] font-semibold transition-all cursor-pointer"
                >
                  <span className="text-base">{emoji}</span>
                  <span>{label}</span>
                  <Plus size={12} className="ml-auto text-slate-500" />
                </button>
              ))}
            </div>

            {floor.decorations.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Placed Items ({floor.decorations.length})
                </div>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                  {floor.decorations.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5"
                    >
                      <span className="text-[10px] text-slate-400 capitalize">
                        {d.type.replace("_", " ")} ({d.x.toFixed(1)}, {d.z.toFixed(1)})
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveDecoration(i)}
                        className="text-slate-600 hover:text-red-400 transition-colors cursor-pointer p-1"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ROOM TAB ───────────────────────────────────────── */}
        {activeTab === "room" && (
          <div className="p-3 flex flex-col gap-3">
            {/* ── Building Floors & Areas Management ── */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-amber-400" />
                  <span>Building Floors & Areas ({(allFloors || [floor]).length})</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  {(allFloors || [floor]).reduce((a, b) => a + b.tables.length, 0)} Tables Total
                </span>
              </div>

              {/* Floors List with table counts and switch */}
              <div className="flex flex-col gap-1.5">
                {(allFloors || [floor]).map((fl) => {
                  const isCurrent = fl.id === floor.id;
                  return (
                    <div
                      key={fl.id}
                      onClick={() => !isCurrent && onSwitchFloor?.(fl.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-200 shadow-sm"
                          : "bg-white/5 border-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${isCurrent ? "bg-amber-400 shadow-xs" : "bg-slate-500"}`} />
                        <span className="text-xs font-bold truncate">{fl.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono">
                          {fl.tables.length} tables
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {isCurrent ? (
                          <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider px-1">
                            Editing
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSwitchFloor?.(fl.id);
                            }}
                            className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold cursor-pointer"
                          >
                            Switch
                          </button>
                        )}
                        {allFloors && allFloors.length > 1 && onRemoveFloor && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Remove floor "${fl.name}"? Tables will move to remaining floor.`)) {
                                onRemoveFloor(fl.id);
                                toast.info(`Removed floor "${fl.name}"`);
                              }
                            }}
                            className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                            title="Remove Floor"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Floor Inline Bar */}
              {onAddFloor && (
                <div>
                  {isEditorAddingFloor ? (
                    <div className="flex items-center gap-1.5 p-1.5 bg-black/40 border border-amber-500/30 rounded-xl">
                      <input
                        type="text"
                        placeholder="e.g. First Floor (Up), Terrace"
                        value={editorNewFloorName}
                        onChange={(e) => setEditorNewFloorName(e.target.value)}
                        className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            onAddFloor(editorNewFloorName.trim() || undefined);
                            toast.success(`Created new floor "${editorNewFloorName || 'Floor'}"!`);
                            setEditorNewFloorName("");
                            setIsEditorAddingFloor(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onAddFloor(editorNewFloorName.trim() || undefined);
                          toast.success(`Created new floor "${editorNewFloorName || 'Floor'}"!`);
                          setEditorNewFloorName("");
                          setIsEditorAddingFloor(false);
                        }}
                        className="px-2 py-1 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditorAddingFloor(false);
                          setEditorNewFloorName("");
                        }}
                        className="text-slate-400 hover:text-white p-1 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditorAddingFloor(true)}
                      className="w-full py-1.5 px-3 rounded-xl border border-dashed border-amber-400/40 text-amber-300 hover:bg-amber-500/10 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Plus size={12} />
                      <span>+ Add New Floor / Area</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Theme / Atmosphere
              </label>
              <div className="flex flex-col gap-1">
                {THEME_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onUpdateFloorMeta({ theme: value as any })}
                    className={`px-3 py-2 rounded-xl text-[11px] font-semibold text-left transition-all cursor-pointer ${
                      floor.theme === value
                        ? "bg-amber-500/20 border border-amber-500/30 text-amber-300 shadow-sm"
                        : "bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Square Plot Builder (1:1 Ratio) ──────────────── */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex flex-col gap-2">
              <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Move size={12} className="text-amber-400" />
                  <span>Square Plot Builder</span>
                </div>
                <span className="font-mono text-amber-400 text-[10px]">
                  {floor.room_width === floor.room_depth ? "✓ Square (1:1)" : `${floor.room_width}m × ${floor.room_depth}m`}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 leading-relaxed">
                Build a clean architectural square plot and organize tables neatly inside.
              </div>

              {/* Square Presets */}
              <div className="grid grid-cols-4 gap-1 pt-1">
                {[24, 28, 32, 36].map((size) => {
                  const isCurrent = floor.room_width === size && floor.room_depth === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        if (onMakeSquarePlot) {
                          onMakeSquarePlot(size);
                        } else {
                          onUpdateFloorMeta({ room_width: size, room_depth: size });
                        }
                        toast.success(`Square plot resized to ${size}m × ${size}m`);
                      }}
                      className={`py-1.5 px-1 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                          : "bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white"
                      }`}
                    >
                      {size}m²
                    </button>
                  );
                })}
              </div>

              {/* Symmetrical Square Plot Action */}
              <button
                type="button"
                onClick={() => {
                  if (onMakeSquarePlot) {
                    onMakeSquarePlot();
                  } else {
                    const side = Math.max(28, Math.max(floor.room_width, floor.room_depth));
                    onUpdateFloorMeta({ room_width: side, room_depth: side });
                  }
                  toast.success("Enforced spacious 1:1 symmetrical square plot with all tables contained!");
                }}
                className="w-full py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-1"
              >
                <Sparkles size={12} className="text-amber-400" />
                <span>Format as Symmetrical Square Plot</span>
              </button>

              {/* Pack & Center All Tables Inside Square */}
              {onPackTablesInside && (
                <button
                  type="button"
                  onClick={() => {
                    onPackTablesInside();
                    toast.success("All tables centered neatly inside square plot!");
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-1"
                >
                  <Sparkles size={12} className="text-amber-400" />
                  <span>Pack & Center All Tables Inside Square</span>
                </button>
              )}
            </div>

            {/* ── Multi-Floor Campus View Mode ─────────────────────── */}
            {allFloors && allFloors.length > 1 && onToggleViewMode && (
              <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-3 flex flex-col gap-2">
                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Multi-Floor Campus View</span>
                  <span className="font-mono text-indigo-400 text-[10px]">
                    {viewMode === "single_block" ? "🏢 Center Block" : "🏘️ Side-by-Side"}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 leading-relaxed">
                  Choose how multi-floor buildings are visualized.
                </div>
                <button
                  type="button"
                  onClick={onToggleViewMode}
                  className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Switch to {viewMode === "single_block" ? "Side-by-Side Avenue View" : "Single Center Block View"}</span>
                </button>
              </div>
            )}

            {/* ── Entrance & Host / Billing Counter Setup ─────────── */}
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3 flex flex-col gap-2">
              <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-indigo-400" />
                  <span>Entrance & Billing Setup</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  floor.hasEntranceCounter !== false
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-slate-700/50 text-slate-400"
                }`}>
                  {floor.hasEntranceCounter !== false ? "Active" : "Hidden"}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 leading-relaxed">
                Includes welcoming double glass doors, welcome mat, canopy, and an L-shaped reception / host counter with POS billing terminal.
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !(floor.hasEntranceCounter !== false);
                  onUpdateFloorMeta({ hasEntranceCounter: nextVal });
                  toast.success(nextVal ? "Entrance & Host Counter enabled!" : "Entrance & Counter hidden!");
                }}
                className={`py-2 px-3 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  floor.hasEntranceCounter !== false
                    ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                    : "bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10"
                }`}
              >
                <span>{floor.hasEntranceCounter !== false ? "✓ Entrance & Counter Active" : "+ Add Entrance & Counter"}</span>
              </button>
            </div>

            {/* Auto-Fit Room & Organization */}
            <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-3 flex flex-col gap-2">
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-400" />
                <span>Smart Auto-Arrange</span>
              </div>
              <div className="text-[10px] text-slate-400 leading-relaxed">
                Automatically organize tables in clean columns and fit space.
              </div>
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {onAutoFitRoom && (
                  <button
                    type="button"
                    onClick={() => {
                      onAutoFitRoom();
                      toast.success("Room fitted tightly to placed tables!");
                    }}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-[10px] transition-all cursor-pointer"
                  >
                    <Sparkles size={12} />
                    <span>Auto-Fit Room to Tables</span>
                  </button>
                )}
                {onAutoOrganizeFloor && (
                  <button
                    type="button"
                    onClick={() => {
                      onAutoOrganizeFloor();
                      toast.success("Tables auto-arranged in clean columns!");
                    }}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-[10px] transition-all cursor-pointer"
                  >
                    <Layers size={12} />
                    <span>Auto-Arrange Grid & Resize Floor</span>
                  </button>
                )}
              </div>
            </div>

            {/* Room Dimensions with Steppers */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Room Dimensions (Scale)
                </label>
                <span className="text-[10px] font-mono text-amber-400 font-bold">
                  {floor.room_width}m × {floor.room_depth}m
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 border border-white/5 rounded-xl p-2">
                  <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                    <span>Width (X)</span>
                    <span className="font-mono text-white font-bold">{floor.room_width}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onUpdateFloorMeta({ room_width: Math.max(10, floor.room_width - 2) })}
                      className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={10}
                      max={80}
                      value={floor.room_width}
                      onChange={(e) =>
                        onUpdateFloorMeta({ room_width: Math.max(8, Number(e.target.value)) })
                      }
                      className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[11px] text-center text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateFloorMeta({ room_width: Math.min(80, floor.room_width + 2) })}
                      className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl p-2">
                  <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                    <span>Depth (Z)</span>
                    <span className="font-mono text-white font-bold">{floor.room_depth}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onUpdateFloorMeta({ room_depth: Math.max(10, floor.room_depth - 2) })}
                      className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={10}
                      max={80}
                      value={floor.room_depth}
                      onChange={(e) =>
                        onUpdateFloorMeta({ room_depth: Math.max(8, Number(e.target.value)) })
                      }
                      className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded px-1.5 py-1 text-[11px] text-center text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateFloorMeta({ room_depth: Math.min(80, floor.room_depth + 2) })}
                      className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Section Name
              </label>
              <input
                type="text"
                value={floor.name}
                onChange={(e) => onUpdateFloorMeta({ name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-amber-500/50"
                placeholder="e.g. Ground Floor, Rooftop"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
