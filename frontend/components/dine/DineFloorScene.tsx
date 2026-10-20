"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { FloorLayout, FloorTable, DecorationItem, WallSegment } from "./hooks/useFloorLayout";
import { ServingToken } from "@/types/api";
import { TableOccupancy } from "./hooks/use3DTableState";

// ─── Theme palettes ───────────────────────────────────────────────────────────

const THEMES = {
  city_daylight: {
    floor: "#f5f2eb",
    floorLine: "#dfd8cc",
    wall: "#dfd7c6",
    wallCap: "#c5bcab",
    wallBase: "#beb5a2",
    ambient: 0.95,
    directional: 1.45,
    sky: "#dbe3ed",
    fog: "#dbe3ed",
    ground: "#cbd5e1",
    road: "#475569",
  },
  dark_modern: {
    // Upgraded daylight architectural palette so existing floors are bright & readable
    floor: "#f5f2eb",
    floorLine: "#dfd8cc",
    wall: "#dfd7c6",
    wallCap: "#c5bcab",
    wallBase: "#beb5a2",
    ambient: 0.95,
    directional: 1.45,
    sky: "#dbe3ed",
    fog: "#dbe3ed",
    ground: "#cbd5e1",
    road: "#475569",
  },
  warm_bistro: {
    floor: "#f0e6d6",
    floorLine: "#dccdb7",
    wall: "#d9cbba",
    wallCap: "#bfae9c",
    wallBase: "#b4a18e",
    ambient: 1.0,
    directional: 1.5,
    sky: "#e8dfd5",
    fog: "#e8dfd5",
    ground: "#cfc5b8",
    road: "#524d47",
  },
  outdoor_patio: {
    floor: "#e8eee2",
    floorLine: "#cfdac8",
    wall: "#d4decb",
    wallCap: "#b7c4ad",
    wallBase: "#a9b89e",
    ambient: 1.1,
    directional: 1.6,
    sky: "#dce8f5",
    fog: "#dce8f5",
    ground: "#b8c9b2",
    road: "#475569",
  },
};

interface SceneProps {
  floors?: FloorLayout[];
  activeFloorId?: string;
  onSwitchFloor?: (id: string) => void;
  viewMode?: "single_block" | "avenue";
  floor: FloorLayout;
  getOccupancy: (tableId: number, capacity: number) => TableOccupancy;
  prefix: string;
  hoveredTableId: number | null;
  selectedTableId: number | null;
  isEditorMode: boolean;
  onTableClick: (id: number, screenX: number, screenY: number) => void;
  onTableHover: (id: number | null, screenX?: number, screenY?: number) => void;
  onTableDrag?: (id: number, x: number, z: number) => void;
  onDecorDrag?: (index: number, x: number, z: number) => void;
  onWallDrag?: (index: number, newFrom: [number, number], newTo: [number, number]) => void;
  onWallRotate?: (index: number) => void;
  onDeleteWall?: (index: number) => void;
  onUpdateTable?: (tableId: number, updates: Partial<FloorTable>) => void;
  onDeleteTable?: (tableId: number) => void;
  isDragging: boolean;
  setIsDragging: (d: boolean) => void;
}

// ─── Dynamic Table Dimensions based on Pax / Capacity & Custom Sizing ───────

export function getTableDimensions(
  capacity: number,
  shape: FloorTable["shape"],
  customWidth?: number,
  customDepth?: number
): { tableW: number; tableD: number; isRound: boolean } {
  const isRound = shape === "round";

  if (customWidth && customDepth) {
    return {
      tableW: customWidth,
      tableD: isRound ? customWidth : customDepth,
      isRound,
    };
  } else if (customWidth) {
    return {
      tableW: customWidth,
      tableD: isRound ? customWidth : Math.max(1.0, customWidth * 0.72),
      isRound,
    };
  } else if (customDepth) {
    return {
      tableW: isRound ? customDepth : Math.max(1.4, customDepth * 1.4),
      tableD: customDepth,
      isRound,
    };
  }

  if (isRound) {
    if (capacity <= 2) return { tableW: 1.35, tableD: 1.35, isRound: true };
    if (capacity <= 4) return { tableW: 1.85, tableD: 1.85, isRound: true };
    if (capacity <= 6) return { tableW: 2.35, tableD: 2.35, isRound: true };
    if (capacity <= 8) return { tableW: 2.85, tableD: 2.85, isRound: true };
    const diameter = Math.max(2.85, 1.4 + Math.sqrt(capacity) * 0.55);
    return { tableW: diameter, tableD: diameter, isRound: true };
  }

  // Rectangular / Square / Banquet / Booth
  if (shape === "square" && capacity <= 2) {
    return { tableW: 1.35, tableD: 1.35, isRound: false };
  }

  if (capacity <= 2) {
    return { tableW: 1.45, tableD: 1.2, isRound: false };
  } else if (capacity <= 4) {
    return { tableW: 2.0, tableD: 1.35, isRound: false };
  } else if (capacity <= 6) {
    return { tableW: 2.75, tableD: 1.45, isRound: false };
  } else if (capacity <= 8) {
    return { tableW: 3.55, tableD: 1.5, isRound: false };
  } else if (capacity <= 10) {
    return { tableW: 4.3, tableD: 1.55, isRound: false };
  } else {
    // Large banquet / VIP long table
    const sideChairs = Math.ceil(capacity / 2);
    const length = Math.max(4.0, 1.0 + sideChairs * 0.75);
    return { tableW: length, tableD: 1.55, isRound: false };
  }
}

// ─── Precise Chair Slot Distribution ─────────────────────────────────────────

interface ChairSlot {
  position: [number, number, number];
  rotation: number;
}

export function getChairSlots(
  capacity: number,
  shape: FloorTable["shape"],
  tableW: number,
  tableD: number
): ChairSlot[] {
  if (shape === "round") {
    const r = tableW / 2 + 0.52;
    return Array.from({ length: capacity }).map((_, i) => {
      const angle = (i / Math.max(capacity, 1)) * Math.PI * 2;
      return {
        position: [Math.sin(angle) * r, 0, Math.cos(angle) * r],
        rotation: -angle,
      };
    });
  }

  const slots: ChairSlot[] = [];
  const sideOffset = tableD / 2 + 0.46;
  const endOffset = tableW / 2 + 0.46;

  if (capacity <= 2) {
    slots.push({ position: [0, 0, sideOffset], rotation: Math.PI });
    slots.push({ position: [0, 0, -sideOffset], rotation: 0 });
    return slots;
  }

  // Allocate side chairs evenly
  const perSide = Math.floor(capacity / 2);
  const spacingX = tableW / (perSide + 1);

  // Side 1 (+Z)
  for (let i = 0; i < perSide; i++) {
    const x = -tableW / 2 + spacingX * (i + 1);
    slots.push({ position: [x, 0, sideOffset], rotation: Math.PI });
  }

  // Side 2 (-Z)
  for (let i = 0; i < perSide; i++) {
    const x = -tableW / 2 + spacingX * (i + 1);
    slots.push({ position: [x, 0, -sideOffset], rotation: 0 });
  }

  // Remaining chairs on table ends (head and foot)
  const remaining = capacity - slots.length;
  if (remaining >= 1) {
    slots.push({ position: [endOffset, 0, 0], rotation: -Math.PI / 2 });
  }
  if (remaining >= 2) {
    slots.push({ position: [-endOffset, 0, 0], rotation: Math.PI / 2 });
  }

  return slots;
}

// ─── Chair sub-component ────────────────────────────────────────────────────

function Chair({
  position,
  rotation,
  isSeated,
  color,
}: {
  position: [number, number, number];
  rotation: number;
  isSeated: boolean;
  color: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat cushion */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.38, 0.05, 0.38]} />
        <meshStandardMaterial color={isSeated ? color : "#303445"} roughness={0.7} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.72, -0.17]}>
        <boxGeometry args={[0.38, 0.5, 0.04]} />
        <meshStandardMaterial color={isSeated ? color : "#303445"} roughness={0.7} />
      </mesh>
      {/* Sleek central post */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.44, 8]} />
        <meshStandardMaterial color="#1a1c24" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Floor glide disc */}
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.03, 10]} />
        <meshStandardMaterial color="#14161c" metalness={0.3} />
      </mesh>
    </group>
  );
}

// ─── Stylized 3D Avatar (Distinct colorful shirts & natural skin tones) ───────

const AVATAR_COLORS = [
  "#16a34a", // Vibrant Emerald Green (like in demo screenshot)
  "#2563eb", // Royal Blue
  "#ea580c", // Burnt Terracotta Orange
  "#9333ea", // Vivid Purple
  "#0891b2", // Cyan / Teal
  "#d97706", // Amber Gold
  "#dc2626", // Crimson Red
  "#4f46e5", // Indigo
];

const AVATAR_SKIN_TONES = ["#f2be9b", "#e0ac69", "#c68642", "#8d5524"];

function DineAvatar3D({
  position,
  rotation,
  colorIndex,
}: {
  position: [number, number, number];
  rotation: number;
  colorIndex: number;
}) {
  const shirtColor = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length];
  const skinColor = AVATAR_SKIN_TONES[colorIndex % AVATAR_SKIN_TONES.length];
  const hairColor = colorIndex % 2 === 0 ? "#1c1917" : "#451a03";

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seated Legs (slate dark trousers) */}
      <mesh position={[-0.06, 0.38, 0.1]} castShadow>
        <boxGeometry args={[0.09, 0.09, 0.26]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      <mesh position={[0.06, 0.38, 0.1]} castShadow>
        <boxGeometry args={[0.09, 0.09, 0.26]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* Lower legs / shins */}
      <mesh position={[-0.06, 0.2, 0.21]} castShadow>
        <boxGeometry args={[0.08, 0.28, 0.08]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      <mesh position={[0.06, 0.2, 0.21]} castShadow>
        <boxGeometry args={[0.08, 0.28, 0.08]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>

      {/* Torso / Vibrant Shirt */}
      <mesh position={[0, 0.58, 0]} castShadow>
        <boxGeometry args={[0.26, 0.32, 0.18]} />
        <meshStandardMaterial color={shirtColor} roughness={0.6} />
      </mesh>

      {/* Arms resting forward */}
      <mesh position={[-0.15, 0.52, 0.06]} castShadow>
        <boxGeometry args={[0.06, 0.24, 0.16]} />
        <meshStandardMaterial color={shirtColor} roughness={0.6} />
      </mesh>
      <mesh position={[0.15, 0.52, 0.06]} castShadow>
        <boxGeometry args={[0.06, 0.24, 0.16]} />
        <meshStandardMaterial color={shirtColor} roughness={0.6} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.76, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.08, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.88, 0]} castShadow>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>

      {/* Stylized hair */}
      <mesh position={[0, 0.94, -0.02]} castShadow>
        <sphereGeometry args={[0.125, 8, 8]} />
        <meshStandardMaterial color={hairColor} roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Decoration sub-components ──────────────────────────────────────────────

function SnakePlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pot in matte off-white ceramic */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.16, 0.4, 12]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.39, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.02, 12]} />
        <meshStandardMaterial color="#3d2817" roughness={0.9} />
      </mesh>
      {/* Leaves */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const lean = 0.12;
        return (
          <mesh
            key={i}
            position={[Math.sin(rad) * lean, 0.76, Math.cos(rad) * lean]}
            rotation={[Math.sin(rad) * 0.3, (rad + Math.PI / 6) * -0.5, Math.cos(rad) * 0.3]}
          >
            <boxGeometry args={[0.04, 0.75, 0.14]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#16a34a" : "#15803d"} roughness={0.85} />
          </mesh>
        );
      })}
    </group>
  );
}

const SOFA_FABRIC_COLORS = ["#5e4270", "#2e6475", "#374151", "#854d0e"];

function SofaLounge({
  position,
  rotation,
  colorIndex = 0,
}: {
  position: [number, number, number];
  rotation: number;
  colorIndex?: number;
}) {
  const fabricColor = SOFA_FABRIC_COLORS[colorIndex % SOFA_FABRIC_COLORS.length];
  const trimColor = colorIndex % 2 === 0 ? "#4a3359" : "#234d5c";

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Wooden legs */}
      {[
        [-0.82, -0.32],
        [0.82, -0.32],
        [-0.82, 0.32],
        [0.82, 0.32],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.08, lz]} castShadow>
          <cylinderGeometry args={[0.03, 0.02, 0.16, 8]} />
          <meshStandardMaterial color="#5c3818" roughness={0.7} />
        </mesh>
      ))}

      {/* Base frame */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[1.85, 0.14, 0.88]} />
        <meshStandardMaterial color={trimColor} roughness={0.8} />
      </mesh>

      {/* Seat cushion */}
      <mesh position={[0, 0.33, 0.02]} castShadow>
        <boxGeometry args={[1.75, 0.18, 0.82]} />
        <meshStandardMaterial color={fabricColor} roughness={0.75} />
      </mesh>

      {/* Backrest */}
      <mesh position={[0, 0.62, -0.36]} castShadow>
        <boxGeometry args={[1.85, 0.52, 0.18]} />
        <meshStandardMaterial color={fabricColor} roughness={0.75} />
      </mesh>

      {/* Armrests */}
      {[-0.86, 0.86].map((x, i) => (
        <mesh key={i} position={[x, 0.5, 0]} castShadow>
          <boxGeometry args={[0.16, 0.42, 0.88]} />
          <meshStandardMaterial color={trimColor} roughness={0.75} />
        </mesh>
      ))}

      {/* Seated avatar on sofa */}
      <DineAvatar3D
        position={[0.2, 0.05, -0.05]}
        rotation={0}
        colorIndex={colorIndex + 1}
      />
    </group>
  );
}

function Counter({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Lower base cabinet in graphite slate */}
      <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.92, 0.76]} />
        <meshStandardMaterial color="#1e293b" roughness={0.65} metalness={0.1} />
      </mesh>
      {/* Polished white quartz/marble countertop */}
      <mesh position={[0, 0.94, 0]} castShadow>
        <boxGeometry args={[2.46, 0.06, 0.82]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.15} />
      </mesh>
      {/* Cabinet drawer handles in silver aluminium */}
      {[-0.6, 0, 0.6].map((hx, i) => (
        <mesh key={i} position={[hx, 0.72, 0.39]}>
          <boxGeometry args={[0.22, 0.03, 0.02]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {/* Wall cabinet / splash back */}
      <mesh position={[0, 1.45, -0.32]}>
        <boxGeometry args={[1.8, 0.95, 0.06]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>
      {/* Stainless steel range hood */}
      <mesh position={[0, 1.85, -0.15]} castShadow>
        <boxGeometry args={[0.9, 0.22, 0.4]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function PottedPalm({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.2, 0.44, 12]} />
        <meshStandardMaterial color="#9c6d48" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 0.7, 8]} />
        <meshStandardMaterial color="#55402c" roughness={0.9} />
      </mesh>
      {[0, 72, 144, 216, 288].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <mesh
            key={i}
            position={[Math.sin(rad) * 0.45, 1.15, Math.cos(rad) * 0.45]}
            rotation={[Math.sin(rad) * 0.6, -rad, Math.cos(rad) * 0.6]}
          >
            <boxGeometry args={[0.12, 0.02, 0.8]} />
            <meshStandardMaterial color="#237021" roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Single 3D Table with Dynamic Pax Sizing & Drag Feedback ─────────────────

const DineTable3D = React.memo(function DineTable3D({
  table,
  occupancy,
  prefix,
  isHovered,
  isSelected,
  isDraggingThis,
  isEditorMode,
  onTableClick,
  onTableHover,
  onStartDrag,
  onUpdateTable,
  onDeleteTable,
}: {
  table: FloorTable;
  occupancy: TableOccupancy;
  prefix: string;
  isHovered: boolean;
  isSelected: boolean;
  isDraggingThis: boolean;
  isEditorMode: boolean;
  onTableClick: (id: number, screenX: number, screenY: number) => void;
  onTableHover: (id: number | null, screenX?: number, screenY?: number) => void;
  onStartDrag: (id: number) => void;
  onUpdateTable?: (tableId: number, updates: Partial<FloorTable>) => void;
  onDeleteTable?: (tableId: number) => void;
}) {
  const {
    tokens,
    seatedPax,
    spareSeats,
    isVacant,
    isShared,
    primaryToken,
    elapsedMins,
    isLingering,
    isExtended,
    isPartiallyOccupied,
  } = occupancy;

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    const cx = e.nativeEvent?.clientX ?? e.clientX ?? 0;
    const cy = e.nativeEvent?.clientY ?? e.clientY ?? 0;
    onTableClick(table.id, cx, cy);
    if (isEditorMode) {
      onStartDrag(table.id);
    }
  }, [table.id, isEditorMode, onTableClick, onStartDrag]);

  const handlePointerOver = useCallback((e: any) => {
    e.stopPropagation();
    const cx = e.nativeEvent?.clientX ?? e.clientX ?? 0;
    const cy = e.nativeEvent?.clientY ?? e.clientY ?? 0;
    onTableHover(table.id, cx, cy);
  }, [table.id, onTableHover]);

  const handlePointerOut = useCallback(() => {
    onTableHover(null);
  }, [onTableHover]);

  // Status glow color
  const glowColor = isVacant
    ? "#22c55e"
    : isLingering
      ? "#ef4444"
      : isExtended
        ? "#f59e0b"
        : isShared
          ? "#14b8a6"
          : isPartiallyOccupied
            ? "#06b6d4"
            : "#6366f1";

  const glowIntensity = isHovered
    ? 2.5
    : isLingering
      ? 1.5
      : isVacant
        ? 0.3
        : 0.9;

  // Dynamic table dimensions based on capacity, shape, and custom extensions
  const { tableW, tableD, isRound } = getTableDimensions(
    table.capacity,
    table.shape,
    table.width,
    table.depth
  );
  const tableH = 0.08;
  const tableY = 0.76;
  const tableColor = "#b88654";

  // Chair slots distributed around the dynamic table
  const chairSlots = getChairSlots(table.capacity, table.shape, tableW, tableD);

  // Elevation lifted when actively dragging
  const elevatedY = isDraggingThis ? 0.28 : 0;

  // Performance: only render heavy 2D/3D DOM Html billboard when occupied or actively hovered/selected/dragged
  const showBillboard = !isVacant || isHovered || isSelected || isDraggingThis;

  return (
    <group
      position={[table.x, elevatedY, table.z]}
      rotation={[0, (table.rotation * Math.PI) / 180, 0]}
    >
      {/* Floor glow ring / drag beacon */}
      <mesh position={[0, isDraggingThis ? -elevatedY + 0.01 : 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry
          args={[
            Math.max(tableW, tableD) / 2 + 0.25,
            Math.max(tableW, tableD) / 2 + (isDraggingThis ? 0.75 : 0.5),
            28,
          ]}
        />
        <meshStandardMaterial
          color={isDraggingThis ? "#f59e0b" : glowColor}
          emissive={isDraggingThis ? "#f59e0b" : glowColor}
          emissiveIntensity={isDraggingThis ? 2.5 : glowIntensity}
          transparent
          opacity={isDraggingThis ? 0.9 : isHovered ? 0.85 : isVacant ? 0.25 : 0.55}
        />
      </mesh>

      {/* Table surface */}
      <mesh position={[0, tableY, 0]} castShadow receiveShadow>
        {isRound ? (
          <cylinderGeometry args={[tableW / 2, tableW / 2, tableH, 28]} />
        ) : (
          <boxGeometry args={[tableW, tableH, tableD]} />
        )}
        <meshStandardMaterial color={tableColor} roughness={0.65} metalness={0.05} />
      </mesh>

      {/* Table legs: 1 pedestal for small, 2 pedestal legs for long banquet tables */}
      {tableW <= 1.6 || isRound ? (
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.07, 0.09, 0.76, 10]} />
          <meshStandardMaterial color="#4f3724" roughness={0.7} />
        </mesh>
      ) : (
        <>
          <mesh position={[-tableW * 0.28, 0.38, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.76, 10]} />
            <meshStandardMaterial color="#4f3724" roughness={0.7} />
          </mesh>
          <mesh position={[tableW * 0.28, 0.38, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.76, 10]} />
            <meshStandardMaterial color="#4f3724" roughness={0.7} />
          </mesh>
          {/* Connecting stretcher bar between legs */}
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[tableW * 0.56, 0.05, 0.05]} />
            <meshStandardMaterial color="#3e2b1c" />
          </mesh>
        </>
      )}

      {/* Booth upholstered backrests if booth shape */}
      {table.shape === "booth" && (
        <>
          {[-tableD / 2 - 0.35, tableD / 2 + 0.35].map((bz, i) => (
            <group key={i} position={[0, 0, bz]} rotation={[0, i === 0 ? 0 : Math.PI, 0]}>
              <mesh position={[0, 0.3, 0]}>
                <boxGeometry args={[tableW, 0.35, 0.35]} />
                <meshStandardMaterial color="#3d3752" roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.65, -0.15]}>
                <boxGeometry args={[tableW, 0.6, 0.1]} />
                <meshStandardMaterial color="#302b42" roughness={0.85} />
              </mesh>
            </group>
          ))}
        </>
      )}

      {/* Chairs positioned realistically based on capacity */}
      {table.shape !== "booth" &&
        chairSlots.map((slot, i) => {
          const chairColor = i < seatedPax ? glowColor : "#303445";
          return (
            <Chair
              key={i}
              position={slot.position}
              rotation={slot.rotation}
              isSeated={i < seatedPax}
              color={chairColor}
            />
          );
        })}

      {/* Seated avatars positioned in matching chair slots */}
      {tokens.flatMap((token, ti) =>
        Array.from({ length: Math.min(token.pax_count || 1, table.capacity) }).map((_, pi) => {
          const globalIdx =
            tokens.slice(0, ti).reduce((s, t) => s + Math.min(t.pax_count || 1, 4), 0) + pi;
          const slot = chairSlots[globalIdx % Math.max(chairSlots.length, 1)];
          if (!slot) return null;
          return (
            <DineAvatar3D
              key={`${token.id}-${pi}`}
              position={slot.position}
              rotation={slot.rotation + Math.PI}
              colorIndex={ti}
            />
          );
        })
      )}

      {/* Overhead 3D Billboard / In-scene editor controls */}
      <Html
        key={`table-hud-${table.id}`}
        position={[0, isEditorMode && isSelected ? 2.3 : 2.4, 0]}
        center
        distanceFactor={isEditorMode && isSelected ? 14 : 16}
        style={{
          pointerEvents: isEditorMode && isSelected ? "auto" : "none",
          display: (isEditorMode && isSelected) || showBillboard ? "block" : "none",
        }}
      >
        {isEditorMode && isSelected ? (
          <div
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-slate-950/95 border border-indigo-500/50 shadow-2xl backdrop-blur-md select-none text-white min-w-[210px]"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full border-b border-white/10 pb-1 text-[11px] font-bold">
              <span className="text-indigo-400">✏️ {table.name}</span>
              <span className="text-emerald-400 font-mono text-[10px]">
                {tableW.toFixed(1)}m × {tableD.toFixed(1)}m
              </span>
            </div>

            {/* Quick side extension stepper in 3D */}
            <div className="flex items-center justify-between w-full text-[10px] gap-2">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[9px] font-semibold">Length:</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateTable?.(table.id, {
                      width: Math.max(0.6, Math.round((tableW - 0.2) * 10) / 10),
                    });
                  }}
                  className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer text-xs"
                  title="Shrink length 0.2m"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateTable?.(table.id, {
                      width: Math.min(8.0, Math.round((tableW + 0.2) * 10) / 10),
                    });
                  }}
                  className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer text-xs"
                  title="Extend length 0.2m"
                >
                  +
                </button>
              </div>

              {table.shape !== "round" && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[9px] font-semibold">Depth:</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateTable?.(table.id, {
                        depth: Math.max(0.6, Math.round((tableD - 0.2) * 10) / 10),
                      });
                    }}
                    className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer text-xs"
                    title="Shrink depth 0.2m"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateTable?.(table.id, {
                        depth: Math.min(6.0, Math.round((tableD + 0.2) * 10) / 10),
                      });
                    }}
                    className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center cursor-pointer text-xs"
                    title="Extend depth 0.2m"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* In-3D Delete button */}
            <div className="w-full flex items-center justify-between border-t border-white/10 pt-1">
              <span className="text-[9px] text-slate-500 font-mono">
                ({table.x.toFixed(1)}, {table.z.toFixed(1)})
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTable?.(table.id);
                }}
                className="px-2 py-0.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[9px] font-bold cursor-pointer transition-colors"
                title="Delete table"
              >
                🗑 Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center select-none pointer-events-none">
            {/* Active drag coordinate badge */}
            {isDraggingThis ? (
              <div className="px-3 py-1 rounded-full bg-indigo-600 text-white font-bold text-[11px] shadow-xl flex items-center gap-1.5 animate-bounce">
                <span>📍 {table.name} ({table.x.toFixed(1)}m, {table.z.toFixed(1)}m)</span>
                <span className="text-[9px] font-bold text-white/70">(Snap 0.5m)</span>
              </div>
            ) : (
              <>
                <div
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold
                    bg-slate-950/92 border shadow-xl whitespace-nowrap
                    ${isVacant
                      ? "border-emerald-500/50 text-emerald-300"
                      : isLingering
                        ? "border-red-500/60 text-red-300 animate-pulse"
                        : isShared
                          ? "border-teal-500/50 text-teal-200"
                          : isExtended
                            ? "border-amber-500/50 text-amber-200"
                            : "border-indigo-500/50 text-white"
                    }
                  `}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${isVacant
                      ? "bg-emerald-400"
                      : isLingering
                        ? "bg-red-400 animate-ping"
                        : isShared
                          ? "bg-teal-400"
                          : isExtended
                            ? "bg-amber-400"
                            : "bg-indigo-400"
                      }`}
                  />
                  {isVacant ? (
                    <span>{table.name} • {table.capacity}p</span>
                  ) : isShared ? (
                    <span>{table.name} • {tokens.length} Parties • {seatedPax}p</span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span>
                        #{prefix}{primaryToken!.token_number} • {primaryToken!.customer_name || "Guest"} • {seatedPax}p • {elapsedMins}m
                      </span>
                      {primaryToken?.payment_status === "unpaid" && (
                        <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider">
                          Unpaid
                        </span>
                      )}
                      {primaryToken?.payment_status === "paid" && (
                        <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-black bg-emerald-500 text-slate-950 uppercase tracking-wider">
                          Paid ✓
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {isPartiallyOccupied && !isShared && (
                  <div className="mt-0.5">
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-teal-950/92 border border-teal-500/50 text-teal-300 shadow">
                      +{spareSeats} seat{spareSeats > 1 ? "s" : ""} free
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Html>

      {/* Raycast hitbox scaled to table dimensions */}
      <mesh
        position={[0, 1.0, 0]}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        visible={true}
      >
        <boxGeometry args={[Math.max(tableW, tableD) + 1.2, 2.5, Math.max(tableW, tableD) + 1.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Editor mode: selection highlight box */}
      {isEditorMode && (isHovered || isSelected || isDraggingThis) && (
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[tableW + 0.8, 2.4, tableD + 0.8]} />
          <meshBasicMaterial color="#f59e0b" wireframe transparent opacity={0.65} />
        </mesh>
      )}
    </group>
  );
});

// ─── Wall segment with Doorways, Glass, Coping Caps, and Baseboards ──────────

function WallMesh({
  from,
  to,
  door,
  style = "solid",
  color,
  capColor = "#c5bcab",
  baseColor = "#beb5a2",
  height,
}: {
  from: [number, number];
  to: [number, number];
  door?: { at: number; width: number };
  style?: "solid" | "glass" | "half_wall" | "doorway";
  color: string;
  capColor?: string;
  baseColor?: string;
  height?: number;
}) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length <= 0.1) return null;

  const angle = Math.atan2(dz, dx);
  const cx = (from[0] + to[0]) / 2;
  const cz = (from[1] + to[1]) / 2;

  const isGlass = style === "glass";
  const isHalfWall = style === "half_wall";
  const wallH = height ?? (isHalfWall ? 1.15 : isGlass ? 2.4 : 2.4);
  const wallThick = isGlass ? 0.08 : 0.28;
  const capThick = wallThick + 0.04;
  const capH = 0.06;
  const baseH = 0.08;
  const doorH = 2.1;

  // Glass partition with sleek metal framing
  if (isGlass) {
    return (
      <group position={[cx, wallH / 2, cz]} rotation={[0, -angle, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[length, wallH - 0.1, wallThick]} />
          <meshStandardMaterial
            color="#9ac3db"
            roughness={0.08}
            metalness={0.25}
            transparent
            opacity={0.38}
          />
        </mesh>
        {/* Metal framing rails top and bottom */}
        <mesh position={[0, wallH / 2 - 0.03, 0]}>
          <boxGeometry args={[length, 0.05, 0.1]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0, -wallH / 2 + 0.04, 0]}>
          <boxGeometry args={[length, 0.07, 0.1]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Metal framing posts at ends */}
        {[-length / 2, length / 2].map((px, i) => (
          <mesh key={i} position={[px, 0, 0]}>
            <boxGeometry args={[0.08, wallH, 0.1]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.25} />
          </mesh>
        ))}
      </group>
    );
  }

  // Solid wall without doorway
  if (!door || length <= (door.width || 2.0)) {
    return (
      <group position={[cx, 0, cz]} rotation={[0, -angle, 0]}>
        {/* Main drywall body */}
        <mesh position={[0, wallH / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[length, wallH, wallThick]} />
          <meshStandardMaterial color={color} roughness={0.88} />
        </mesh>
        {/* Baseboard trim */}
        <mesh position={[0, baseH / 2, 0]}>
          <boxGeometry args={[length + 0.01, baseH, wallThick + 0.02]} />
          <meshStandardMaterial color={baseColor} roughness={0.7} />
        </mesh>
        {/* Top coping cap */}
        <mesh position={[0, wallH + capH / 2, 0]} castShadow>
          <boxGeometry args={[length + 0.02, capH, capThick]} />
          <meshStandardMaterial color={capColor} roughness={0.75} />
        </mesh>
      </group>
    );
  }

  // Wall with doorway opening: Left segment, Right segment, and Header lintel
  const doorStart = Math.max(0, door.at);
  const doorEnd = Math.min(length, door.at + door.width);
  const seg1Len = doorStart;
  const seg2Len = Math.max(0, length - doorEnd);
  const doorWidth = doorEnd - doorStart;
  const lintelH = Math.max(0.3, wallH - doorH);

  return (
    <group>
      {/* Left wall segment */}
      {seg1Len > 0.05 && (
        <group
          position={[
            from[0] + (Math.cos(angle) * seg1Len) / 2,
            0,
            from[1] + (Math.sin(angle) * seg1Len) / 2,
          ]}
          rotation={[0, -angle, 0]}
        >
          <mesh position={[0, wallH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[seg1Len, wallH, wallThick]} />
            <meshStandardMaterial color={color} roughness={0.88} />
          </mesh>
          <mesh position={[0, baseH / 2, 0]}>
            <boxGeometry args={[seg1Len, baseH, wallThick + 0.02]} />
            <meshStandardMaterial color={baseColor} roughness={0.7} />
          </mesh>
          <mesh position={[0, wallH + capH / 2, 0]} castShadow>
            <boxGeometry args={[seg1Len, capH, capThick]} />
            <meshStandardMaterial color={capColor} roughness={0.75} />
          </mesh>
        </group>
      )}

      {/* Right wall segment */}
      {seg2Len > 0.05 && (
        <group
          position={[
            from[0] + Math.cos(angle) * (doorEnd + seg2Len / 2),
            0,
            from[1] + Math.sin(angle) * (doorEnd + seg2Len / 2),
          ]}
          rotation={[0, -angle, 0]}
        >
          <mesh position={[0, wallH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[seg2Len, wallH, wallThick]} />
            <meshStandardMaterial color={color} roughness={0.88} />
          </mesh>
          <mesh position={[0, baseH / 2, 0]}>
            <boxGeometry args={[seg2Len, baseH, wallThick + 0.02]} />
            <meshStandardMaterial color={baseColor} roughness={0.7} />
          </mesh>
          <mesh position={[0, wallH + capH / 2, 0]} castShadow>
            <boxGeometry args={[seg2Len, capH, capThick]} />
            <meshStandardMaterial color={capColor} roughness={0.75} />
          </mesh>
        </group>
      )}

      {/* Overhead lintel above door */}
      {doorWidth > 0 && lintelH > 0 && (
        <group
          position={[
            from[0] + Math.cos(angle) * (doorStart + doorWidth / 2),
            0,
            from[1] + Math.sin(angle) * (doorStart + doorWidth / 2),
          ]}
          rotation={[0, -angle, 0]}
        >
          <mesh position={[0, doorH + lintelH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[doorWidth, lintelH, wallThick]} />
            <meshStandardMaterial color={color} roughness={0.88} />
          </mesh>
          <mesh position={[0, wallH + capH / 2, 0]} castShadow>
            <boxGeometry args={[doorWidth, capH, capThick]} />
            <meshStandardMaterial color={capColor} roughness={0.75} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ─── Permanent Perimeter Walls (Frames room with front cutaway entrance) ─────

function PerimeterWalls({
  width,
  depth,
  wallColor,
  capColor,
  baseColor,
}: {
  width: number;
  depth: number;
  wallColor: string;
  capColor: string;
  baseColor: string;
}) {
  const wallH = 2.4;
  const cutawayH = 1.25;
  const doorWidth = Math.min(3.6, width * 0.35);
  const doorStart = (width - doorWidth) / 2;

  return (
    <group>
      {/* North / Back wall: solid full-height wall */}
      <WallMesh
        from={[0, 0]}
        to={[width, 0]}
        color={wallColor}
        capColor={capColor}
        baseColor={baseColor}
        height={wallH}
      />

      {/* West / Left wall: full-height wall */}
      <WallMesh
        from={[0, 0]}
        to={[0, depth]}
        color={wallColor}
        capColor={capColor}
        baseColor={baseColor}
        height={wallH}
      />

      {/* East / Right wall: full-height wall */}
      <WallMesh
        from={[width, 0]}
        to={[width, depth]}
        color={wallColor}
        capColor={capColor}
        baseColor={baseColor}
        height={wallH}
      />

      {/* South / Front wall: Lowered architectural cutaway with wide entrance */}
      {doorStart > 0.4 && (
        <WallMesh
          from={[0, depth]}
          to={[doorStart, depth]}
          color={wallColor}
          capColor={capColor}
          baseColor={baseColor}
          height={cutawayH}
        />
      )}
      {width - (doorStart + doorWidth) > 0.4 && (
        <WallMesh
          from={[doorStart + doorWidth, depth]}
          to={[width, depth]}
          color={wallColor}
          capColor={capColor}
          baseColor={baseColor}
          height={cutawayH}
        />
      )}

      {/* ─── Seamless Corner & Doorway Pier Columns (Eliminates any wall break/seam) ─── */}
      {/* North-West Corner Pier */}
      <mesh position={[0, wallH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.34, wallH, 0.34]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      <mesh position={[0, wallH + 0.03, 0]} castShadow>
        <boxGeometry args={[0.38, 0.06, 0.38]} />
        <meshStandardMaterial color={capColor} roughness={0.75} />
      </mesh>

      {/* North-East Corner Pier */}
      <mesh position={[width, wallH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.34, wallH, 0.34]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      <mesh position={[width, wallH + 0.03, 0]} castShadow>
        <boxGeometry args={[0.38, 0.06, 0.38]} />
        <meshStandardMaterial color={capColor} roughness={0.75} />
      </mesh>

      {/* South-West Corner Pier */}
      <mesh position={[0, cutawayH / 2, depth]} castShadow receiveShadow>
        <boxGeometry args={[0.34, cutawayH, 0.34]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      <mesh position={[0, cutawayH + 0.03, depth]} castShadow>
        <boxGeometry args={[0.38, 0.06, 0.38]} />
        <meshStandardMaterial color={capColor} roughness={0.75} />
      </mesh>

      {/* South-East Corner Pier */}
      <mesh position={[width, cutawayH / 2, depth]} castShadow receiveShadow>
        <boxGeometry args={[0.34, cutawayH, 0.34]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
      <mesh position={[width, cutawayH + 0.03, depth]} castShadow>
        <boxGeometry args={[0.38, 0.06, 0.38]} />
        <meshStandardMaterial color={capColor} roughness={0.75} />
      </mesh>

      {/* Entrance Door Left Jamb Pier */}
      <mesh position={[doorStart, cutawayH / 2, depth]} castShadow receiveShadow>
        <boxGeometry args={[0.32, cutawayH, 0.32]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>

      {/* Entrance Door Right Jamb Pier */}
      <mesh position={[doorStart + doorWidth, cutawayH / 2, depth]} castShadow receiveShadow>
        <boxGeometry args={[0.32, cutawayH, 0.32]} />
        <meshStandardMaterial color={wallColor} roughness={0.88} />
      </mesh>
    </group>
  );
}

// ─── Front Entrance Portal (Welcome Mat, Glass Doors, Canopy) ────────────────

function EntrancePortal3D({
  doorStart,
  doorWidth,
  depth,
  wallColor,
}: {
  doorStart: number;
  doorWidth: number;
  depth: number;
  wallColor: string;
}) {
  const cx = doorStart + doorWidth / 2;

  return (
    <group position={[cx, 0, depth]}>
      {/* Welcome Entrance Mat */}
      <mesh position={[0, 0.015, 0.6]} receiveShadow>
        <boxGeometry args={[Math.min(doorWidth - 0.2, 2.6), 0.02, 1.4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </mesh>
      {/* Gold Welcome Mat Accent Border */}
      <mesh position={[0, 0.022, 0.6]}>
        <boxGeometry args={[Math.min(doorWidth - 0.3, 2.4), 0.005, 1.2]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.025, 0.6]}>
        <boxGeometry args={[Math.min(doorWidth - 0.5, 2.2), 0.005, 1.0]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>

      {/* Double Glass Doors */}
      {[-doorWidth * 0.25, doorWidth * 0.25].map((dx, i) => (
        <group key={i} position={[dx, 1.05, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[doorWidth * 0.46, 2.05, 0.05]} />
            <meshStandardMaterial
              color="#9ac3db"
              transparent
              opacity={0.35}
              roughness={0.1}
              metalness={0.2}
            />
          </mesh>
          {/* Vertical stainless steel door pull handle */}
          <mesh position={[i === 0 ? doorWidth * 0.18 : -doorWidth * 0.18, 0, 0.05]}>
            <cylinderGeometry args={[0.015, 0.015, 0.7, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Architectural Entrance Overhead Canopy */}
      <mesh position={[0, 2.2, 0.65]} castShadow>
        <boxGeometry args={[doorWidth + 0.6, 0.08, 1.3]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Slim canopy support struts */}
      {[-doorWidth / 2 - 0.2, doorWidth / 2 + 0.2].map((sx, i) => (
        <mesh key={i} position={[sx, 2.1, 0.65]}>
          <cylinderGeometry args={[0.025, 0.025, 0.2, 8]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>
      ))}

      {/* Illuminated "ENTRANCE" badge */}
      <Html key="entrance-badge" position={[0, 2.5, 0.7]} center distanceFactor={14} style={{ pointerEvents: "none" }}>
        <div className="px-2 py-0.5 rounded-full bg-slate-950/90 border border-emerald-500/50 text-emerald-300 text-[9px] font-black tracking-wider uppercase shadow-lg select-none whitespace-nowrap flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Entrance</span>
        </div>
      </Html>
    </group>
  );
}

// ─── Front Host / Reception & Billing Counter Setup ─────────────────────────

function HostBillingCounter3D({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Main Front Counter Body (dark walnut / slate graphite) */}
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.96, 0.75]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      {/* Return Wing L-shape */}
      <mesh position={[0.85, 0.48, -0.65]} castShadow receiveShadow>
        <boxGeometry args={[0.65, 0.96, 1.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>

      {/* Polished White Quartz Marble Countertop */}
      <mesh position={[0, 0.98, 0]} castShadow>
        <boxGeometry args={[2.28, 0.06, 0.82]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.15} />
      </mesh>
      <mesh position={[0.85, 0.98, -0.65]} castShadow>
        <boxGeometry args={[0.72, 0.06, 1.25]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.15} />
      </mesh>

      {/* Natural Oak Wood Accent Trim Panel on Front */}
      <mesh position={[0, 0.45, 0.39]}>
        <boxGeometry args={[1.9, 0.6, 0.03]} />
        <meshStandardMaterial color="#b88654" roughness={0.65} />
      </mesh>

      {/* Touchscreen POS Billing Terminal on Counter */}
      <group position={[-0.45, 1.05, 0.05]}>
        {/* Terminal Stand */}
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.06, 0.16, 8]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Screen */}
        <mesh position={[0, 0.18, 0]} rotation={[-0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.3, 0.22, 0.03]} />
          <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={0.6} />
        </mesh>
        {/* Receipt Printer */}
        <mesh position={[0.3, 0.06, 0]} castShadow>
          <boxGeometry args={[0.16, 0.12, 0.18]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
      </group>

      {/* Guest Check-In Tablet / Menu Stand */}
      <group position={[0.45, 1.05, 0.05]}>
        <mesh position={[0, 0.12, 0]} rotation={[-0.4, 0, 0]}>
          <boxGeometry args={[0.22, 0.16, 0.02]} />
          <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Host Staff Avatar standing behind counter */}
      <group position={[0.1, 0, -0.55]} rotation={[0, Math.PI, 0]}>
        {/* Legs standing */}
        <mesh position={[-0.07, 0.45, 0]} castShadow>
          <boxGeometry args={[0.1, 0.9, 0.1]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0.07, 0.45, 0]} castShadow>
          <boxGeometry args={[0.1, 0.9, 0.1]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Torso / Uniform shirt */}
        <mesh position={[0, 1.15, 0]} castShadow>
          <boxGeometry args={[0.32, 0.5, 0.2]} />
          <meshStandardMaterial color="#0d9488" roughness={0.6} />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1.55, 0]} castShadow>
          <sphereGeometry args={[0.13, 10, 10]} />
          <meshStandardMaterial color="#e0ac69" roughness={0.6} />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 1.62, -0.02]}>
          <sphereGeometry args={[0.135, 8, 8]} />
          <meshStandardMaterial color="#1c1917" />
        </mesh>
      </group>

      {/* Overhead Badge */}
      <Html key="host-billing-badge" position={[0, 2.15, 0]} center distanceFactor={14} style={{ pointerEvents: "none" }}>
        <div className="px-2 py-0.5 rounded-full bg-slate-950/90 border border-indigo-500/50 text-indigo-200 text-[9px] font-bold shadow-lg select-none whitespace-nowrap flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>Host & Billing Counter</span>
        </div>
      </Html>
    </group>
  );
}

// ─── Low-Poly City Vehicles (Cars on 4-sided roads matching reference image) ─

const LowPolyCar = React.memo(function LowPolyCar({
  position,
  rotation = [0, 0, 0],
  color = "#ea580c",
  type = "sedan",
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  type?: "sedan" | "coupe" | "truck";
}) {
  const isTruck = type === "truck";
  const chassisL = isTruck ? 2.8 : 2.2;
  const chassisW = isTruck ? 1.05 : 0.95;
  const chassisH = isTruck ? 0.42 : 0.32;

  return (
    <group position={position} rotation={rotation}>
      {/* Lower Chassis / Body */}
      <mesh position={[0, chassisH / 2 + 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[chassisL, chassisH, chassisW]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Cabin / Windshield */}
      {!isTruck ? (
        <mesh position={[-0.1, chassisH + 0.28, 0]} castShadow>
          <boxGeometry args={[chassisL * 0.52, 0.32, chassisW * 0.88]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.5} />
        </mesh>
      ) : (
        <>
          {/* Truck Front Cabin */}
          <mesh position={[0.45, chassisH + 0.35, 0]} castShadow>
            <boxGeometry args={[chassisL * 0.45, 0.48, chassisW * 0.92]} />
            <meshStandardMaterial color={color} roughness={0.4} />
          </mesh>
          {/* Truck Front Windshield Glass */}
          <mesh position={[0.62, chassisH + 0.4, 0]}>
            <boxGeometry args={[0.15, 0.32, chassisW * 0.86]} />
            <meshStandardMaterial color="#0f172a" roughness={0.1} />
          </mesh>
          {/* Truck Open Cargo Bed */}
          <mesh position={[-0.55, chassisH + 0.16, 0]} castShadow>
            <boxGeometry args={[chassisL * 0.5, 0.22, chassisW * 0.88]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
        </>
      )}

      {/* 4 Wheels */}
      {[
        [-chassisL * 0.32, chassisW * 0.52],
        [-chassisL * 0.32, -chassisW * 0.52],
        [chassisL * 0.32, chassisW * 0.52],
        [chassisL * 0.32, -chassisW * 0.52],
      ].map(([wx, wz], wi) => (
        <group key={wi} position={[wx, 0.18, wz]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.12, 12]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
          {/* Rim Cap */}
          <mesh position={[0, wz > 0 ? 0.065 : -0.065, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.02, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Headlights (Warm white) */}
      {[chassisW * 0.3, -chassisW * 0.3].map((hz, hi) => (
        <mesh key={hi} position={[chassisL * 0.51, chassisH * 0.7 + 0.1, hz]}>
          <boxGeometry args={[0.04, 0.1, 0.14]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={1.2} />
        </mesh>
      ))}

      {/* Tail lights (Red) */}
      {[chassisW * 0.3, -chassisW * 0.3].map((tz, ti) => (
        <mesh key={ti} position={[-chassisL * 0.51, chassisH * 0.7 + 0.1, tz]}>
          <boxGeometry args={[0.04, 0.1, 0.14]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
});

// ─── 4-Sided Roads & Surrounding City Environment ────────────────────────────

const CityRoadsEnvironment3D = React.memo(function CityRoadsEnvironment3D({
  curX,
  curW,
  curD,
}: {
  curX: number;
  curW: number;
  curD: number;
}) {
  const sw = 3.2; // Sidewalk width
  const rw = 5.2; // Road width
  const halfRw = rw / 2;

  // Road center coordinates
  const southRoadZ = curD + sw + halfRw;
  const northRoadZ = -(sw + halfRw);
  const westRoadX = curX - (sw + halfRw);
  const eastRoadX = curX + curW + sw + halfRw;

  const roadSpanX = curW + (sw + rw) * 2 + 60;
  const roadSpanZ = curD + (sw + rw) * 2 + 60;

  return (
    <group>
      {/* Vast daylight ground plane (horizontal below roads) */}
      <mesh position={[curX + curW / 2, -0.08, curD / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[450, 450]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.96} />
      </mesh>

      {/* Central Sidewalk Plinth (City block framing the building) */}
      <mesh position={[curX + curW / 2, -0.03, curD / 2]} receiveShadow>
        <boxGeometry args={[curW + sw * 2, 0.05, curD + sw * 2]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.9} />
      </mesh>

      {/* Sidewalk curb trim */}
      <mesh position={[curX + curW / 2, -0.005, curD / 2]}>
        <boxGeometry args={[curW + sw * 2 + 0.1, 0.03, curD + sw * 2 + 0.1]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.8} />
      </mesh>

      {/* ─── 4 SIDES OF ROADS (Seamlessly enclosed circuit) ──────── */}
      {/* 4 Corner Road Intersections */}
      {[
        [westRoadX, southRoadZ],
        [eastRoadX, southRoadZ],
        [westRoadX, northRoadZ],
        [eastRoadX, northRoadZ],
      ].map(([ix, iz], idx) => (
        <mesh key={idx} position={[ix, -0.038, iz]} receiveShadow>
          <boxGeometry args={[rw + 0.05, 0.042, rw + 0.05]} />
          <meshStandardMaterial color="#334155" roughness={0.92} />
        </mesh>
      ))}

      {/* South / Front Road */}
      <mesh position={[curX + curW / 2, -0.04, southRoadZ]} receiveShadow>
        <boxGeometry args={[roadSpanX, 0.04, rw]} />
        <meshStandardMaterial color="#334155" roughness={0.92} />
      </mesh>
      {/* South road yellow dashed divider */}
      {Array.from({ length: Math.floor(roadSpanX / 3.0) }).map((_, i) => {
        const dx = curX + curW / 2 - roadSpanX / 2 + i * 3.0 + 1.5;
        return (
          <mesh key={i} position={[dx, -0.015, southRoadZ]}>
            <boxGeometry args={[1.5, 0.005, 0.14]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.6} />
          </mesh>
        );
      })}

      {/* North / Back Road */}
      <mesh position={[curX + curW / 2, -0.04, northRoadZ]} receiveShadow>
        <boxGeometry args={[roadSpanX, 0.04, rw]} />
        <meshStandardMaterial color="#334155" roughness={0.92} />
      </mesh>
      {/* North road yellow dashed divider */}
      {Array.from({ length: Math.floor(roadSpanX / 3.0) }).map((_, i) => {
        const dx = curX + curW / 2 - roadSpanX / 2 + i * 3.0 + 1.5;
        return (
          <mesh key={i} position={[dx, -0.015, northRoadZ]}>
            <boxGeometry args={[1.5, 0.005, 0.14]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.6} />
          </mesh>
        );
      })}

      {/* West / Left Road */}
      <mesh position={[westRoadX, -0.04, curD / 2]} receiveShadow>
        <boxGeometry args={[rw, 0.04, roadSpanZ]} />
        <meshStandardMaterial color="#334155" roughness={0.92} />
      </mesh>
      {/* West road yellow dashed divider */}
      {Array.from({ length: Math.floor(roadSpanZ / 3.0) }).map((_, i) => {
        const dz = curD / 2 - roadSpanZ / 2 + i * 3.0 + 1.5;
        return (
          <mesh key={i} position={[westRoadX, -0.015, dz]}>
            <boxGeometry args={[0.14, 0.005, 1.5]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.6} />
          </mesh>
        );
      })}

      {/* East / Right Road */}
      <mesh position={[eastRoadX, -0.04, curD / 2]} receiveShadow>
        <boxGeometry args={[rw, 0.04, roadSpanZ]} />
        <meshStandardMaterial color="#334155" roughness={0.92} />
      </mesh>
      {/* East road yellow dashed divider */}
      {Array.from({ length: Math.floor(roadSpanZ / 3.0) }).map((_, i) => {
        const dz = curD / 2 - roadSpanZ / 2 + i * 3.0 + 1.5;
        return (
          <mesh key={i} position={[eastRoadX, -0.015, dz]}>
            <boxGeometry args={[0.14, 0.005, 1.5]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.6} />
          </mesh>
        );
      })}

      {/* ─── CARS ON THE ROADS (Matching reference image!) ───────── */}
      {/* Orange Sedan on South/Front road (driving East) */}
      <LowPolyCar
        position={[curX + curW * 0.45, 0, southRoadZ + 0.9]}
        rotation={[0, -Math.PI / 2, 0]}
        color="#ea580c"
        type="sedan"
      />

      {/* Red Coupe on North/Back road (driving West) */}
      <LowPolyCar
        position={[curX + curW * 0.75, 0, northRoadZ - 0.9]}
        rotation={[0, Math.PI / 2, 0]}
        color="#ef4444"
        type="coupe"
      />

      {/* Blue Pickup Truck on North/Back road (driving East) */}
      <LowPolyCar
        position={[curX + curW * 0.2, 0, northRoadZ + 0.9]}
        rotation={[0, -Math.PI / 2, 0]}
        color="#1d4ed8"
        type="truck"
      />

      {/* White Compact Sedan on West road (driving North) */}
      <LowPolyCar
        position={[westRoadX + 0.9, 0, curD * 0.35]}
        rotation={[0, 0, 0]}
        color="#f8fafc"
        type="sedan"
      />

      {/* ─── BUILDINGS ACROSS ROADS (Matching reference image!) ──── */}
      {/* Iconic Terracotta 3-Story Commercial Building (North across top road) */}
      <group position={[curX + curW * 0.38, 0, northRoadZ - 11.5]}>
        {/* Main Body */}
        <mesh position={[0, 5.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[8.2, 11.0, 5.0]} />
          <meshStandardMaterial color="#d97706" roughness={0.8} />
        </mesh>
        {/* Roof Parapet White Trim */}
        <mesh position={[0, 11.1, 0]}>
          <boxGeometry args={[8.4, 0.3, 5.2]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        {/* Horizontal Window Panels on 2nd and 3rd floors */}
        {[4.5, 8.0].map((wy, wi) => (
          <group key={wi} position={[0, wy, 2.52]}>
            <mesh>
              <boxGeometry args={[7.2, 1.4, 0.06]} />
              <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.6} />
            </mesh>
            {/* White window mullion frame */}
            <mesh position={[0, 0, 0.04]}>
              <boxGeometry args={[7.4, 1.5, 0.02]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
        {/* Ground Floor Commercial Storefront Entrance */}
        <mesh position={[0, 1.3, 2.52]}>
          <boxGeometry args={[5.5, 2.4, 0.06]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} />
        </mesh>
        {/* Base Props from screenshot: Green Dumpster & Wooden Pallet Boxes */}
        <group position={[-2.3, 0, 3.8]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[1.5, 0.9, 0.85]} />
            <meshStandardMaterial color="#15803d" roughness={0.7} />
          </mesh>
          {/* Dumpster lids */}
          <mesh position={[0, 0.92, 0]}>
            <boxGeometry args={[1.54, 0.08, 0.88]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
        </group>
        {/* Wooden crates */}
        <mesh position={[0.6, 0.25, 3.8]} castShadow>
          <boxGeometry args={[0.9, 0.5, 0.7]} />
          <meshStandardMaterial color="#b45309" roughness={0.9} />
        </mesh>
      </group>

      {/* Tall Daylight Skyscraper (North-East corner in distance) */}
      <group position={[curX + curW + 20, 0, northRoadZ - 15]}>
        <mesh position={[0, 16, 0]} castShadow receiveShadow>
          <boxGeometry args={[14, 32, 14]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
        </mesh>
        {/* Roof Mechanical Parapet */}
        <mesh position={[0, 32.5, 0]}>
          <boxGeometry args={[10, 1.2, 10]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.7} />
        </mesh>
      </group>

      {/* Commercial Low-Rise Blocks (West across left road) */}
      <group position={[westRoadX - 11, 0, curD * 0.4]}>
        {/* Block A */}
        <mesh position={[0, 3.8, -3.2]} castShadow receiveShadow>
          <boxGeometry args={[6.5, 7.6, 6.0]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.85} />
        </mesh>
        {/* Block B */}
        <mesh position={[0, 2.9, 3.2]} castShadow receiveShadow>
          <boxGeometry args={[6.2, 5.8, 5.8]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
        </mesh>
      </group>

      {/* ─── STREET TREES & GREENERY ────────────────────────────── */}
      {[
        [curX - sw + 0.8, 1.2],
        [curX - sw + 0.8, curD - 1.2],
        [curX + curW + sw - 0.8, 1.2],
        [curX + curW + sw - 0.8, curD - 1.2],
        [westRoadX - 4.5, -4.0],
        [eastRoadX + 4.5, southRoadZ + 4.0],
      ].map(([tx, tz], i) => (
        <group key={i} position={[tx, 0, tz]}>
          {/* Tree trunk */}
          <mesh position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.11, 1.3, 8]} />
            <meshStandardMaterial color="#5c4033" roughness={0.9} />
          </mesh>
          {/* Leafy crown sphere */}
          <mesh position={[0, 1.7, 0]} castShadow>
            <sphereGeometry args={[0.9, 8, 8]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#22c55e" : "#16a34a"} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
});

// ─── Back Wall Branding Sign ─────────────────────────────────────────────────

function BackWallBranding3D({
  width,
  prefix,
  floorName,
}: {
  width: number;
  prefix: string;
  floorName: string;
}) {
  const brandTitle = floorName ? floorName.toUpperCase() : (prefix ? `${prefix.toUpperCase()} DINING` : "DINING FLOOR");

  return (
    <group position={[width / 2, 2.05, 0.08]}>
      {/* HTML crisp typography on wall */}
      <Html key={`branding-badge-${floorName || prefix}`} position={[0, 0, 0.06]} center distanceFactor={14} style={{ pointerEvents: "none" }}>
        <div className="flex items-center gap-2 select-none whitespace-nowrap">
          <span className="font-extrabold text-[13px] tracking-widest text-slate-700/80 uppercase font-sans">
            {brandTitle}
          </span>
        </div>
      </Html>
    </group>
  );
}

// ─── Merge beam between joined tables ───────────────────────────────────────

function MergeBeam({
  fromPos,
  toPos,
}: {
  fromPos: [number, number, number];
  toPos: [number, number, number];
}) {
  const dx = toPos[0] - fromPos[0];
  const dz = toPos[2] - fromPos[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);
  const cx = (fromPos[0] + toPos[0]) / 2;
  const cz = (fromPos[2] + toPos[2]) / 2;

  return (
    <mesh position={[cx, 0.3, cz]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[length, 0.06, 0.06]} />
      <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={1.5} transparent opacity={0.7} />
    </mesh>
  );
}

// ─── Main scene component (exported) ─────────────────────────────────────────

export default function DineFloorScene({
  floors = [],
  activeFloorId,
  onSwitchFloor,
  viewMode = "single_block",
  floor,
  getOccupancy,
  prefix,
  hoveredTableId,
  selectedTableId,
  isEditorMode,
  onTableClick,
  onTableHover,
  onTableDrag,
  onDecorDrag,
  onWallDrag,
  onWallRotate,
  onDeleteWall,
  onUpdateTable,
  onDeleteTable,
  isDragging,
  setIsDragging,
}: SceneProps) {
  // Ensure we have a valid floors list
  const allFloors = floors.length > 0 ? floors : [floor];
  const curActiveFloorId = activeFloorId || floor.id;
  const activeFloor = allFloors.find((f) => f.id === curActiveFloorId) || allFloors[0] || floor;
  const theme = THEMES[activeFloor.theme as keyof typeof THEMES] || THEMES.city_daylight;

  const isAvenue = viewMode === "avenue" && allFloors.length > 1;
  const displayFloors = isAvenue ? allFloors : [activeFloor];

  // Active drag state for tables, decorations, and interior walls
  const [draggingTableId, setDraggingTableId] = useState<number | null>(null);
  const [draggingDecorIndex, setDraggingDecorIndex] = useState<number | null>(null);
  const [draggingWallIndex, setDraggingWallIndex] = useState<number | null>(null);
  const [selectedWallIndex, setSelectedWallIndex] = useState<number | null>(null);
  const [hoveredWallIndex, setHoveredWallIndex] = useState<number | null>(null);
  const wallDragOffsetRef = useRef<{ dx: number; dz: number }>({ dx: 0, dz: 0 });

  // Auto-cleanup selected wall if wall deleted or floor switched
  useEffect(() => {
    if (selectedWallIndex !== null && selectedWallIndex >= (activeFloor.walls?.length || 0)) {
      setSelectedWallIndex(null);
    }
  }, [activeFloor.walls?.length, selectedWallIndex]);

  // Compute horizontal offsets so floors sit side-by-side if in avenue mode
  const floorOffsets = useMemo(() => {
    if (!isAvenue) return [0];
    const offsets: number[] = [];
    let curX = 0;
    for (let i = 0; i < allFloors.length; i++) {
      offsets.push(curX);
      curX += (allFloors[i]?.room_width || 18) + 12.0;
    }
    return offsets;
  }, [allFloors, isAvenue]);

  const activeIndex = isAvenue
    ? Math.max(0, allFloors.findIndex((f) => f.id === curActiveFloorId))
    : 0;
  const activeOffsetX = floorOffsets[activeIndex] ?? 0;
  const totalWidth = isAvenue
    ? floorOffsets[allFloors.length - 1] + (allFloors[allFloors.length - 1]?.room_width || 18)
    : activeFloor.room_width;
  const maxDepth = isAvenue
    ? Math.max(...allFloors.map((f) => f.room_depth || 18))
    : activeFloor.room_depth;

  const { camera, raycaster, gl } = useThree();
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const planeHit = useMemo(() => new THREE.Vector3(), []);

  type PendingDragUpdate =
    | { type: "table"; id: number; x: number; z: number }
    | { type: "decor"; id: number; x: number; z: number }
    | { type: "wall"; id: number; from: [number, number]; to: [number, number] };

  const lastDragPosRef = useRef<{ id: number | null; x: number; z: number; type?: string }>({
    id: null,
    x: -999,
    z: -999,
  });
  const rafIdRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<PendingDragUpdate | null>(null);

  // Smooth mathematical ray-plane drag-and-drop listeners with RAF batching
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!gl?.domElement) return;
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      if (raycaster.ray.intersectPlane(groundPlane, planeHit)) {
        if (draggingWallIndex !== null) {
          const w = activeFloor.walls?.[draggingWallIndex];
          if (!w) return;

          // Wall geometry: center and half-lengths
          const halfDx = (w.to[0] - w.from[0]) / 2;
          const halfDz = (w.to[1] - w.from[1]) / 2;

          // Target center = mouse local position + initial grab offset
          const localMouseX = planeHit.x - activeOffsetX;
          const localMouseZ = planeHit.z;
          const targetCx = localMouseX + wallDragOffsetRef.current.dx;
          const targetCz = localMouseZ + wallDragOffsetRef.current.dz;

          // Safe interior boundary clamping: prevent walls from being dragged outside the room
          const minSafe = 1.0;
          const maxSafeX = Math.max(minSafe + 1.0, activeFloor.room_width - 1.0);
          const maxSafeZ = Math.max(minSafe + 1.0, activeFloor.room_depth - 1.0);

          const absHalfDx = Math.abs(halfDx);
          const absHalfDz = Math.abs(halfDz);

          const clampedCx = Math.max(minSafe + absHalfDx, Math.min(maxSafeX - absHalfDx, targetCx));
          const clampedCz = Math.max(minSafe + absHalfDz, Math.min(maxSafeZ - absHalfDz, targetCz));

          // Snap center to 0.5m grid
          const snappedCx = Math.round(clampedCx * 2) / 2;
          const snappedCz = Math.round(clampedCz * 2) / 2;

          const newFrom: [number, number] = [
            Math.round((snappedCx - halfDx) * 2) / 2,
            Math.round((snappedCz - halfDz) * 2) / 2,
          ];
          const newTo: [number, number] = [
            Math.round((snappedCx + halfDx) * 2) / 2,
            Math.round((snappedCz + halfDz) * 2) / 2,
          ];

          if (
            lastDragPosRef.current.type === "wall" &&
            lastDragPosRef.current.id === draggingWallIndex &&
            lastDragPosRef.current.x === snappedCx &&
            lastDragPosRef.current.z === snappedCz
          ) {
            return;
          }

          lastDragPosRef.current = {
            id: draggingWallIndex,
            x: snappedCx,
            z: snappedCz,
            type: "wall",
          };
          pendingUpdateRef.current = {
            type: "wall",
            id: draggingWallIndex,
            from: newFrom,
            to: newTo,
          };
        } else {
          // Table or Decoration snap to 0.5m grid relative to active floor's offset
          const localX = planeHit.x - activeOffsetX;
          const snappedX = Math.round(localX * 2) / 2;
          const snappedZ = Math.round(planeHit.z * 2) / 2;
          const clampedX = Math.max(1.0, Math.min(activeFloor.room_width - 1.0, snappedX));
          const clampedZ = Math.max(1.0, Math.min(activeFloor.room_depth - 1.0, snappedZ));

          const activeId = draggingTableId !== null ? draggingTableId : draggingDecorIndex;
          if (activeId === null) return;

          const isDecor = draggingDecorIndex !== null;
          const dragType = isDecor ? "decor" : "table";

          // Skip if grid coordinate hasn't actually changed
          if (
            lastDragPosRef.current.type === dragType &&
            lastDragPosRef.current.id === activeId &&
            lastDragPosRef.current.x === clampedX &&
            lastDragPosRef.current.z === clampedZ
          ) {
            return;
          }

          lastDragPosRef.current = { id: activeId, x: clampedX, z: clampedZ, type: dragType };
          pendingUpdateRef.current = {
            type: dragType,
            id: activeId,
            x: clampedX,
            z: clampedZ,
          };
        }

        // RAF batching: throttle updates to at most once per display frame
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;
            if (pendingUpdateRef.current) {
              const pending = pendingUpdateRef.current;
              if (pending.type === "wall") {
                onWallDrag?.(pending.id, pending.from, pending.to);
              } else if (pending.type === "decor") {
                onDecorDrag?.(pending.id, pending.x, pending.z);
              } else {
                onTableDrag?.(pending.id, pending.x, pending.z);
              }
            }
          });
        }
      }
    };

    const handlePointerUp = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (pendingUpdateRef.current) {
        const pending = pendingUpdateRef.current;
        if (pending.type === "wall") {
          onWallDrag?.(pending.id, pending.from, pending.to);
        } else if (pending.type === "decor") {
          onDecorDrag?.(pending.id, pending.x, pending.z);
        } else {
          onTableDrag?.(pending.id, pending.x, pending.z);
        }
        pendingUpdateRef.current = null;
      }
      setIsDragging(false);
      setDraggingTableId(null);
      setDraggingDecorIndex(null);
      setDraggingWallIndex(null);
      lastDragPosRef.current = { id: null, x: -999, z: -999 };
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    isDragging,
    camera,
    raycaster,
    gl,
    groundPlane,
    planeHit,
    activeOffsetX,
    activeFloor.room_width,
    activeFloor.room_depth,
    activeFloor.walls,
    draggingTableId,
    draggingDecorIndex,
    draggingWallIndex,
    onTableDrag,
    onDecorDrag,
    onWallDrag,
    setIsDragging,
  ]);

  // Identify merged table pairs to draw connecting beams on active floor
  const mergedPairs: Array<[FloorTable, FloorTable]> = [];
  const seenTokens = new Set<string>();
  for (const tbl of activeFloor.tables) {
    const occ = getOccupancy(tbl.id, tbl.capacity);
    if (occ.isMerged && occ.primaryToken) {
      const key = `${occ.primaryToken.token_number}`;
      if (!seenTokens.has(key)) {
        seenTokens.add(key);
        const linkedTables = occ.tokenTables
          .map((id) => activeFloor.tables.find((t) => t.id === id))
          .filter(Boolean) as FloorTable[];
        for (let i = 0; i < linkedTables.length - 1; i++) {
          mergedPairs.push([linkedTables[i], linkedTables[i + 1]]);
        }
      }
    }
  }

  const handleStartDrag = useCallback(
    (id: number) => {
      setSelectedWallIndex(null);
      setIsDragging(true);
      setDraggingTableId(id);
    },
    [setIsDragging]
  );

  return (
    <>
      {/* Daylight Sky & Atmospheric Fog */}
      <color attach="background" args={[theme.sky]} />
      <fogExp2 attach="fog" args={[theme.fog || theme.sky, 0.005]} />

      {/* Balanced Daylight Illumination */}
      <ambientLight intensity={theme.ambient * 0.8} color="#ffffff" />
      <hemisphereLight
        args={["#ffffff", theme.ground || "#cbd5e1", 0.65]}
        position={[0, 40, 0]}
      />
      <directionalLight
        position={[activeOffsetX + activeFloor.room_width * 0.6, 36, activeFloor.room_depth * 0.8]}
        intensity={theme.directional}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-camera-near={0.5}
        shadow-camera-far={140}
        shadow-camera-left={-65}
        shadow-camera-right={65}
        shadow-camera-top={65}
        shadow-camera-bottom={-65}
      />

      {/* 4-Sided Roads & Surrounding City Environment (Matching reference image) */}
      <CityRoadsEnvironment3D
        curX={isAvenue ? 0 : 0}
        curW={isAvenue ? totalWidth : activeFloor.room_width}
        curD={maxDepth}
      />

      {/* Render each Floor Square Plot (active floor in center, or adjacent floors if in avenue mode) */}
      {displayFloors.map((floorItem, fIdx) => {
        const isActive = floorItem.id === curActiveFloorId;
        const offsetX = floorOffsets[fIdx] ?? 0;
        const W = floorItem.room_width;
        const D = floorItem.room_depth;
        const doorWidth = Math.min(3.6, W * 0.35);
        const doorStart = (W - doorWidth) / 2;

        return (
          <group key={floorItem.id} position={[offsetX, 0, 0]}>
            {/* Connecting Garden Walkway to next floor (if in avenue mode and another floor follows) */}
            {isAvenue && fIdx < displayFloors.length - 1 && (
              <group position={[W, 0, D * 0.5]}>
                {/* Paved flagstone walkway between the two square buildings */}
                <mesh position={[6.0, 0.02, 0]} receiveShadow>
                  <boxGeometry args={[12.0, 0.04, 3.4]} />
                  <meshStandardMaterial color="#dfd8cc" roughness={0.8} />
                </mesh>
                {/* Stepping flagstone dividers */}
                {[2, 4, 6, 8, 10].map((px) => (
                  <mesh key={px} position={[px, 0.045, 0]}>
                    <boxGeometry args={[0.08, 0.01, 3.4]} />
                    <meshStandardMaterial color="#c5bcab" roughness={0.7} />
                  </mesh>
                ))}
                {/* Garden planter box along the walkway */}
                <mesh position={[6.0, 0.25, 2.1]} castShadow>
                  <boxGeometry args={[10.0, 0.45, 0.6]} />
                  <meshStandardMaterial color="#334155" roughness={0.8} />
                </mesh>
                <mesh position={[6.0, 0.52, 2.1]}>
                  <boxGeometry args={[9.8, 0.15, 0.5]} />
                  <meshStandardMaterial color="#16a34a" roughness={0.9} />
                </mesh>
              </group>
            )}

            {/* Inactive floor click-catcher to switch floor (when in avenue mode) */}
            {!isActive && (
              <mesh
                position={[W / 2, 0.5, D / 2]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSwitchFloor?.(floorItem.id);
                }}
              >
                <boxGeometry args={[W + 2, 2, D + 2]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            )}

            {/* Floor Headline Badge */}
            {isAvenue && (
              <Html
                key={`floor-badge-${floorItem.id}`}
                position={[W / 2, 3.2, D / 2]}
                center
                distanceFactor={18}
                style={{ pointerEvents: isActive ? "none" : "auto" }}
              >
                {isActive ? (
                  <div className="px-3 py-1 rounded-full bg-slate-950/90 border border-indigo-500/60 text-indigo-200 font-bold text-[10px] shadow-2xl backdrop-blur-md select-none flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    <span>📍 {floorItem.name} (Active Floor)</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSwitchFloor?.(floorItem.id)}
                    className="px-3 py-1 rounded-full bg-slate-900/95 border border-indigo-500/50 hover:border-indigo-400 text-white font-bold text-[10px] shadow-2xl backdrop-blur-md cursor-pointer transition-all hover:scale-105 flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>🏢 {floorItem.name} • {floorItem.tables.length} Tables (Click to Switch)</span>
                  </button>
                )}
              </Html>
            )}

            {/* Square Floor Limestone Plane */}
            <mesh
              position={[W / 2, 0, D / 2]}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
              onPointerDown={(e) => {
                if (isActive && isEditorMode) {
                  setSelectedWallIndex(null);
                }
              }}
            >
              <planeGeometry args={[W, D, 16, 16]} />
              <meshStandardMaterial
                color={theme.floor}
                roughness={0.9}
                opacity={isActive ? 1.0 : 0.85}
              />
            </mesh>

            {/* Floor tile grid seam markings */}
            <gridHelper
              args={[Math.max(W, D), Math.max(W, D), theme.floorLine, theme.floorLine]}
              position={[W / 2, 0.005, D / 2]}
            />

            {/* Architectural Outer Perimeter Walls (North wall high, South wall cutaway entrance) */}
            <PerimeterWalls
              width={W}
              depth={D}
              wallColor={theme.wall}
              capColor={theme.wallCap || "#c5bcab"}
              baseColor={theme.wallBase || "#beb5a2"}
            />

            {/* Back Wall Branding Sign */}
            <BackWallBranding3D
              width={W}
              prefix={prefix}
              floorName={floorItem.name}
            />

            {/* Front Entrance Portal (Welcome Mat, Glass Doors, Canopy) */}
            <EntrancePortal3D
              doorStart={doorStart}
              doorWidth={doorWidth}
              depth={D}
              wallColor={theme.wall}
            />

            {/* Front Reception & Billing Counter Setup (if enabled) */}
            {floorItem.hasEntranceCounter !== false && (
              <HostBillingCounter3D
                position={[Math.max(2.4, doorStart - 2.8), 0, D - 2.0]}
                rotation={0}
              />
            )}

            {/* Custom interior walls / partitions / glass meeting rooms (Draggable & Editable in 3D) */}
            {floorItem.walls.map((w, wi) => {
              const dx = w.to[0] - w.from[0];
              const dz = w.to[1] - w.from[1];
              const length = Math.sqrt(dx * dx + dz * dz);
              if (length <= 0.1) return null;

              const angle = Math.atan2(dz, dx);
              const cx = (w.from[0] + w.to[0]) / 2;
              const cz = (w.from[1] + w.to[1]) / 2;

              const isDraggingThisWall = isActive && isDragging && draggingWallIndex === wi;
              const isSelected = isActive && isEditorMode && selectedWallIndex === wi;
              const isHovered = isActive && isEditorMode && hoveredWallIndex === wi;
              const wallElevatedY = isDraggingThisWall ? 0.25 : 0;

              const isGlass = w.style === "glass";
              const isHalfWall = w.style === "half_wall";
              const wallH = isHalfWall ? 1.15 : 2.4;
              const wallThick = isGlass ? 0.25 : 0.45;

              const handleWallPointerDown = (e: any) => {
                if (isActive && isEditorMode) {
                  e.stopPropagation();
                  setSelectedWallIndex(wi);
                  setIsDragging(true);
                  setDraggingWallIndex(wi);

                  if (raycaster.ray.intersectPlane(groundPlane, planeHit)) {
                    const localMouseX = planeHit.x - activeOffsetX;
                    const localMouseZ = planeHit.z;
                    wallDragOffsetRef.current = {
                      dx: cx - localMouseX,
                      dz: cz - localMouseZ,
                    };
                  } else {
                    wallDragOffsetRef.current = { dx: 0, dz: 0 };
                  }
                }
              };

              const handleWallPointerOver = (e: any) => {
                if (isActive && isEditorMode) {
                  e.stopPropagation();
                  setHoveredWallIndex(wi);
                }
              };

              const handleWallPointerOut = () => {
                if (isActive && isEditorMode) {
                  setHoveredWallIndex((curr) => (curr === wi ? null : curr));
                }
              };

              return (
                <group key={wi} position={[0, wallElevatedY, 0]}>
                  {/* 3D Wall geometry */}
                  <WallMesh
                    from={w.from}
                    to={w.to}
                    door={w.door}
                    style={w.style}
                    color={theme.wall}
                    capColor={theme.wallCap || "#c5bcab"}
                    baseColor={theme.wallBase || "#beb5a2"}
                  />

                  {/* Interactive editor overlay for interior partitions */}
                  {isActive && isEditorMode && (
                    <>
                      {/* Transparent Raycast Hitbox for seamless grabbing/clicking */}
                      <mesh
                        position={[cx, wallH / 2, cz]}
                        rotation={[0, -angle, 0]}
                        onPointerDown={handleWallPointerDown}
                        onPointerOver={handleWallPointerOver}
                        onPointerOut={handleWallPointerOut}
                      >
                        <boxGeometry args={[length + 0.3, wallH + 0.3, Math.max(wallThick, 0.6)]} />
                        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                      </mesh>

                      {/* Visual Selection / Hover / Drag Wireframe & Floor footprint */}
                      {(isSelected || isHovered || isDraggingThisWall) && (
                        <>
                          {/* Floor highlight footprint */}
                          <mesh position={[cx, 0.02, cz]} rotation={[-Math.PI / 2, 0, angle]}>
                            <planeGeometry args={[length + 0.4, 0.7]} />
                            <meshStandardMaterial
                              color={isDraggingThisWall ? "#f59e0b" : isSelected ? "#38bdf8" : "#fbbf24"}
                              transparent
                              opacity={isDraggingThisWall ? 0.45 : isSelected ? 0.35 : 0.2}
                            />
                          </mesh>

                          {/* Bounding wireframe */}
                          <mesh position={[cx, wallH / 2, cz]} rotation={[0, -angle, 0]}>
                            <boxGeometry args={[length + 0.15, wallH + 0.1, Math.max(wallThick, 0.5)]} />
                            <meshStandardMaterial
                              color={isDraggingThisWall ? "#f59e0b" : isSelected ? "#38bdf8" : "#fbbf24"}
                              wireframe
                              emissive={isDraggingThisWall ? "#f59e0b" : isSelected ? "#38bdf8" : "#fbbf24"}
                              emissiveIntensity={1.2}
                            />
                          </mesh>
                        </>
                      )}

                      {/* Dragging Position Pill */}
                      {isDraggingThisWall && (
                        <Html key={`wall-drag-${wi}`} position={[cx, wallH + 0.7, cz]} center distanceFactor={14}>
                          <div className="px-2.5 py-1 rounded-full bg-indigo-600 text-white font-bold text-[11px] shadow-2xl flex items-center gap-1.5 whitespace-nowrap select-none">
                            <span>🧱 Partition #{wi + 1}</span>
                            <span>({cx.toFixed(1)}m, {cz.toFixed(1)}m)</span>
                          </div>
                        </Html>
                      )}

                      {/* Floating In-Scene Editor Controls when Selected */}
                      {isSelected && !isDraggingThisWall && (
                        <Html
                          key={`wall-controls-${wi}`}
                          position={[cx, wallH + 0.75, cz]}
                          center
                          distanceFactor={14}
                          style={{ pointerEvents: "auto" }}
                        >
                          <div
                            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-slate-950/95 border border-sky-400/60 shadow-2xl backdrop-blur-md select-none text-white min-w-[200px]"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between w-full border-b border-white/10 pb-1 text-[11px] font-bold">
                              <span className="text-sky-300">
                                {w.style === "glass" ? "🪟 Glass Wall" : w.style === "half_wall" ? "🧱 Half Wall" : "🧱 Wall"} #{wi + 1}
                              </span>
                              <span className="text-emerald-400 font-mono text-[10px]">
                                {length.toFixed(1)}m
                              </span>
                            </div>

                            <div className="flex items-center justify-between w-full gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onWallRotate?.(wi);
                                }}
                                className="flex-1 px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/40 text-sky-200 border border-sky-500/40 font-semibold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                title="Rotate wall 90 degrees"
                              >
                                <span>🔄</span> Rotate
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteWall?.(wi);
                                  setSelectedWallIndex(null);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/40 font-semibold text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                title="Delete wall"
                              >
                                <span>🗑️</span>
                              </button>
                            </div>

                            <div className="text-[9px] text-slate-400 text-center w-full pt-0.5 border-t border-white/10">
                              <span className="text-indigo-400 font-medium">🖐️ Drag in 3D</span> to reposition
                            </div>
                          </div>
                        </Html>
                      )}
                    </>
                  )}
                </group>
              );
            })}

            {/* Decorations */}
            {floorItem.decorations.map((d, di) => {
              const isDraggingThisDecor = isActive && isDragging && draggingDecorIndex === di;
              const decorY = isDraggingThisDecor ? 0.25 : 0;

              const handleDecorPointerDown = (e: any) => {
                if (isActive && isEditorMode) {
                  e.stopPropagation();
                  setIsDragging(true);
                  setDraggingDecorIndex(di);
                }
              };

              let comp: React.ReactNode = null;
              switch (d.type) {
                case "snake_plant":
                case "flower_pot":
                  comp = <SnakePlant position={[0, 0, 0]} />;
                  break;
                case "potted_palm":
                  comp = <PottedPalm position={[0, 0, 0]} />;
                  break;
                case "sofa_lounge":
                  comp = (
                    <SofaLounge
                      position={[0, 0, 0]}
                      rotation={(d.rotation ?? 0) * (Math.PI / 180)}
                      colorIndex={di}
                    />
                  );
                  break;
                case "counter":
                  comp = <Counter position={[0, 0, 0]} rotation={(d.rotation ?? 0) * (Math.PI / 180)} />;
                  break;
                default:
                  comp = null;
              }

              if (!comp) return null;

              return (
                <group
                  key={di}
                  position={[d.x, decorY, d.z]}
                  onPointerDown={handleDecorPointerDown}
                >
                  {comp}
                  {isActive && isEditorMode && (
                    <mesh position={[0, 0.5, 0]}>
                      <boxGeometry args={[1.5, 1.2, 1.5]} />
                      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                  )}
                  {isDraggingThisDecor && (
                    <Html key={`decor-drag-${di}`} position={[0, 1.6, 0]} center>
                      <div className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold text-[10px] shadow">
                        📍 {d.x.toFixed(1)}m, {d.z.toFixed(1)}m
                      </div>
                    </Html>
                  )}
                </group>
              );
            })}

            {/* Merge beams for joined tables on active floor */}
            {isActive &&
              mergedPairs.map(([a, b], mi) => (
                <MergeBeam
                  key={mi}
                  fromPos={[a.x, 0, a.z]}
                  toPos={[b.x, 0, b.z]}
                />
              ))}

            {/* Tables */}
            {/* Tables (Strictly contained inside the building perimeter) */}
            {isActive
              ? floorItem.tables.map((tbl) => {
                const occ = getOccupancy(tbl.id, tbl.capacity);
                const isDraggingThisTable = isDragging && draggingTableId === tbl.id;

                // Defensive boundary clamp: ensure NO table is ever rendered outside the room boundaries!
                const safeX = Math.max(3.2, Math.min(W - 3.2, tbl.x));
                const safeZ = Math.max(3.2, Math.min(D - 5.0, tbl.z));
                const safeTable = tbl.x !== safeX || tbl.z !== safeZ ? { ...tbl, x: safeX, z: safeZ } : tbl;

                return (
                  <DineTable3D
                    key={tbl.id}
                    table={safeTable}
                    occupancy={occ}
                    prefix={prefix}
                    isHovered={hoveredTableId === tbl.id}
                    isSelected={selectedTableId === tbl.id}
                    isDraggingThis={isDraggingThisTable}
                    isEditorMode={isEditorMode}
                    onTableClick={onTableClick}
                    onTableHover={onTableHover}
                    onStartDrag={handleStartDrag}
                    onUpdateTable={onUpdateTable}
                    onDeleteTable={onDeleteTable}
                  />
                );
              })
              : floorItem.tables.map((tbl) => {
                const { tableW, tableD, isRound } = getTableDimensions(
                  tbl.capacity,
                  tbl.shape,
                  tbl.width,
                  tbl.depth
                );
                const safeX = Math.max(3.2, Math.min(W - 3.2, tbl.x));
                const safeZ = Math.max(3.2, Math.min(D - 5.0, tbl.z));
                return (
                  <group key={tbl.id} position={[safeX, 0, safeZ]}>
                    <mesh position={[0, 0.76, 0]} castShadow>
                      {isRound ? (
                        <cylinderGeometry args={[tableW / 2, tableW / 2, 0.08, 16]} />
                      ) : (
                        <boxGeometry args={[tableW, 0.08, tableD]} />
                      )}
                      <meshStandardMaterial color="#b88654" roughness={0.7} />
                    </mesh>
                    <mesh position={[0, 0.38, 0]}>
                      <cylinderGeometry args={[0.07, 0.09, 0.76, 8]} />
                      <meshStandardMaterial color="#334155" />
                    </mesh>
                  </group>
                );
              })}
          </group>
        );
      })}
    </>
  );
}
