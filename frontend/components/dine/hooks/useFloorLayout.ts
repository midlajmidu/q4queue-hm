"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { TableConfig } from "@/types/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WallSegment {
  from: [number, number];
  to: [number, number];
  door?: { at: number; width: number };
  style?: "solid" | "glass" | "half_wall" | "doorway";
}

export interface DecorationItem {
  type:
    | "snake_plant"
    | "sofa_lounge"
    | "counter"
    | "railing"
    | "potted_palm"
    | "flower_pot"
    | "window";
  x: number;
  z: number;
  rotation?: number;
  from?: [number, number];
  to?: [number, number];
}

export interface FloorTable extends TableConfig {
  x: number;
  z: number;
  rotation: number;
  shape: "square" | "round" | "booth" | "banquet";
}

export type FloorTheme = "city_daylight" | "dark_modern" | "warm_bistro" | "outdoor_patio";

export interface FloorLayout {
  id: string;
  name: string;
  theme: FloorTheme;
  room_width: number;
  room_depth: number;
  walls: WallSegment[];
  decorations: DecorationItem[];
  tables: FloorTable[];
  hasEntranceCounter?: boolean;
}

export interface RestaurantLayout {
  floors: FloorLayout[];
  viewMode?: "single_block" | "avenue";
}

// ─── Proportional Square Auto-Layout Helper ─────────────────────────────────

export function computeAutoLayout(tables: TableConfig[]) {
  const count = tables.length;
  // Calculate pleasant column count based on square aspect ratio
  const sideCount = Math.max(3, Math.ceil(Math.sqrt(count || 1)));
  const cols = sideCount;
  const rows = Math.ceil((count || 1) / cols);

  // Generous square sizing so the room is always a well-proportioned spacious square plot
  const squareSize = Math.max(28, Math.ceil(sideCount * 5.4 + 6.0));
  const roomWidth = squareSize;
  const roomDepth = squareSize;

  const usableW = roomWidth - 7.0; // 3.5m margins left & right
  const usableD = roomDepth - 9.5; // 3.5m back margin, 6.0m front entrance lobby
  const stepX = cols > 1 ? usableW / (cols - 1) : 0;
  const stepZ = rows > 1 ? usableD / (rows - 1) : 0;

  const laidOutTables: FloorTable[] = tables.map((t, i) => {
    const colIdx = i % cols;
    const rowIdx = Math.floor(i / cols);
    const x = cols > 1 ? Math.round((3.5 + colIdx * stepX) * 2) / 2 : roomWidth / 2;
    const z = rows > 1 ? Math.round((3.5 + rowIdx * stepZ) * 2) / 2 : roomDepth / 2 - 1.0;
    return {
      ...t,
      x,
      z,
      rotation: t.rotation ?? 0,
      shape:
        t.shape ??
        (t.capacity >= 8
          ? "banquet"
          : t.capacity >= 6
            ? "booth"
            : t.capacity <= 2
              ? "round"
              : "square"),
      width: t.width,
      depth: t.depth,
    };
  });

  return { cols, rows, roomWidth, roomDepth, laidOutTables };
}

// ─── Parse raw table_config JSONB into RestaurantLayout ───────────────────────

function parseLayout(
  rawTableConfig: any,
  plainTables: TableConfig[]
): RestaurantLayout {
  let floorsToProcess: FloorLayout[] = [];

  const tableArr = Array.isArray(rawTableConfig) && rawTableConfig.length > 0
    ? rawTableConfig
    : plainTables;

  if (
    rawTableConfig &&
    typeof rawTableConfig === "object" &&
    Array.isArray(rawTableConfig.floors) &&
    rawTableConfig.floors.length > 0
  ) {
    floorsToProcess = rawTableConfig.floors;
  } else {
    // Partition tables into distinct floors if section is defined
    const sectionGroups = new Map<string, TableConfig[]>();
    for (const t of tableArr) {
      const secKey = (t.section && t.section.trim()) || "ground";
      if (!sectionGroups.has(secKey)) {
        sectionGroups.set(secKey, []);
      }
      sectionGroups.get(secKey)!.push(t);
    }

    if (sectionGroups.size > 1) {
      floorsToProcess = Array.from(sectionGroups.entries()).map(([secKey, secTables], idx) => {
        const { roomWidth, roomDepth, laidOutTables } = computeAutoLayout(secTables);
        const isGround = idx === 0 || secKey === "ground" || secKey.toLowerCase().includes("ground") || secKey.toLowerCase().includes("down");
        const defaultName = isGround
          ? "Ground Floor (Down)"
          : idx === 1
          ? "First Floor (Up)"
          : `Floor ${idx + 1}`;
        const cleanName =
          secKey === "ground" || secKey === "floor_1"
            ? "Ground Floor (Down)"
            : secKey === "floor_2" || secKey === "first_floor"
            ? "First Floor (Up)"
            : secKey;

        return {
          id: secKey,
          name: cleanName || defaultName,
          theme: (idx === 0 ? "city_daylight" : idx === 1 ? "warm_bistro" : "outdoor_patio") as FloorTheme,
          room_width: roomWidth,
          room_depth: roomDepth,
          hasEntranceCounter: isGround,
          walls: [],
          decorations: [
            { type: "snake_plant", x: 2.2, z: 2.2, rotation: 0 },
            { type: "potted_palm", x: roomWidth - 2.2, z: 2.2, rotation: 0 },
            { type: "sofa_lounge", x: 5.0, z: 2.0, rotation: 0 },
            { type: "snake_plant", x: roomWidth - 2.2, z: roomDepth - 2.5, rotation: 0 },
          ],
          tables: laidOutTables,
        };
      });
    } else {
      const { roomWidth, roomDepth, laidOutTables } = computeAutoLayout(tableArr);
      floorsToProcess = [
        {
          id: "ground",
          name: "Ground Floor",
          theme: "city_daylight",
          room_width: roomWidth,
          room_depth: roomDepth,
          hasEntranceCounter: true,
          walls: [],
          decorations: [
            { type: "snake_plant", x: 2.2, z: 2.2, rotation: 0 },
            { type: "potted_palm", x: roomWidth - 2.2, z: 2.2, rotation: 0 },
            { type: "sofa_lounge", x: 5.0, z: 2.0, rotation: 0 },
            { type: "snake_plant", x: roomWidth - 2.2, z: roomDepth - 2.5, rotation: 0 },
          ],
          tables: laidOutTables,
        },
      ];
    }
  }

  // Set of all table IDs already assigned to any floor
  const allAssignedTableIds = new Set<number>();
  floorsToProcess.forEach((f) => {
    (f.tables || []).forEach((t) => allAssignedTableIds.add(t.id));
  });

  const processedFloors = floorsToProcess.map((f, fi) => {
    // Only attach unassigned tables from plainTables to their designated section or first floor
    const existingTableMap = new Map((f.tables || []).map((t) => [t.id, t]));
    for (const pt of plainTables) {
      const isAssignedElsewhere = allAssignedTableIds.has(pt.id) && !existingTableMap.has(pt.id);
      if (isAssignedElsewhere) continue;

      const matchesThisFloor =
        pt.section === f.id ||
        pt.section === f.name ||
        (!pt.section && fi === 0 && !allAssignedTableIds.has(pt.id));

      if (!existingTableMap.has(pt.id) && matchesThisFloor) {
        allAssignedTableIds.add(pt.id);
        existingTableMap.set(pt.id, {
          ...pt,
          section: f.id,
          x: pt.x ?? 4.0,
          z: pt.z ?? 4.0,
          rotation: pt.rotation ?? 0,
          shape: pt.shape ?? (pt.capacity <= 2 ? "round" : pt.capacity >= 8 ? "banquet" : "square"),
        });
      }
    }
    const allTables = Array.from(existingTableMap.values());
    const count = allTables.length;

    // Generous square sizing so there is plenty of room for all tables and aisles
    const sideCount = Math.max(3, Math.ceil(Math.sqrt(count || 1)));
    const idealSquare = Math.max(28, Math.ceil(sideCount * 5.4 + 6.0));

    // Force strict 1:1 square aspect ratio
    const isDistorted =
      f.room_width !== f.room_depth ||
      f.room_width > idealSquare + 6 ||
      f.room_width < idealSquare - 4 ||
      f.room_depth < idealSquare - 4;
    const squareSize = isDistorted ? idealSquare : Math.max(idealSquare, f.room_width);

    const W = squareSize;
    const D = squareSize;

    // Detect if tables are outside square bounds or have negative Z
    const hasOutOfBoundsTables = allTables.some(
      (t) =>
        t.z < 3.0 ||
        t.z > D - 4.5 ||
        t.x < 3.0 ||
        t.x > W - 3.0 ||
        typeof t.x !== "number" ||
        typeof t.z !== "number" ||
        isNaN(t.x) ||
        isNaN(t.z)
    );

    let laidOutTables: FloorTable[] = [];

    if (hasOutOfBoundsTables || isDistorted) {
      // Re-grid ALL tables cleanly inside the square with comfortable spacing
      const cols = sideCount;
      const rows = Math.ceil((count || 1) / cols);
      const usableW = W - 7.0; // 3.5m left/right margins
      const usableD = D - 9.5; // 3.5m back margin, 6.0m front entrance/counter lobby
      const stepX = cols > 1 ? usableW / (cols - 1) : 0;
      const stepZ = rows > 1 ? usableD / (rows - 1) : 0;

      laidOutTables = allTables.map((t, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const x = cols > 1 ? Math.round((3.5 + c * stepX) * 2) / 2 : W / 2;
        const z = rows > 1 ? Math.round((3.5 + r * stepZ) * 2) / 2 : D / 2 - 1.0;
        return {
          ...t,
          x,
          z,
          rotation: t.rotation ?? 0,
          shape: t.shape ?? (t.capacity <= 2 ? "round" : t.capacity >= 8 ? "banquet" : "square"),
        };
      });
    } else {
      laidOutTables = allTables.map((t) => ({
        ...t,
        x: Math.min(W - 3.0, Math.max(3.0, t.x)),
        z: Math.min(D - 4.5, Math.max(3.0, t.z)),
      }));
    }

    // Filter out any broken/stray custom walls that extend outside or clash with perimeter
    const cleanWalls = isDistorted
      ? []
      : (f.walls || []).filter(
          (w) =>
            w.from &&
            w.to &&
            w.from[0] >= 2.0 &&
            w.from[0] <= W - 2.0 &&
            w.from[1] >= 2.0 &&
            w.from[1] <= D - 2.0 &&
            w.to[0] >= 2.0 &&
            w.to[0] <= W - 2.0 &&
            w.to[1] >= 2.0 &&
            w.to[1] <= D - 2.0
        );

    const decorations: DecorationItem[] = [
      { type: "snake_plant", x: 2.2, z: 2.2, rotation: 0 },
      { type: "potted_palm", x: W - 2.2, z: 2.2, rotation: 0 },
      { type: "sofa_lounge", x: 5.0, z: 2.0, rotation: 0 },
      { type: "snake_plant", x: W - 2.2, z: D - 2.5, rotation: 0 },
    ];

    return {
      ...f,
      room_width: W,
      room_depth: D,
      hasEntranceCounter: f.hasEntranceCounter ?? true,
      walls: cleanWalls,
      decorations: f.decorations?.length && !isDistorted ? f.decorations : decorations,
      tables: laidOutTables,
    };
  });

  return {
    viewMode: rawTableConfig?.viewMode || "single_block",
    floors: processedFloors,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFloorLayout(queueId: string, plainTables: TableConfig[]) {
  const [layout, setLayout] = useState<RestaurantLayout>(() =>
    parseLayout(null, plainTables)
  );
  const [activeFloorId, setActiveFloorId] = useState<string>("ground");
  const [isEditorMode, setEditorMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const deletedTableIdsRef = useRef<Set<number>>(new Set());

  // Re-parse when plain tables change or if current layout has distorted boundaries
  useEffect(() => {
    setLayout((prev) => {
      const isAnyFloorDistorted = prev.floors.some(
        (f) =>
          f.room_width !== f.room_depth ||
          f.tables.some(
            (t) =>
              t.x < 3.0 ||
              t.x > f.room_width - 3.0 ||
              t.z < 3.0 ||
              t.z > f.room_depth - 4.5 ||
              typeof t.x !== "number" ||
              typeof t.z !== "number" ||
              isNaN(t.x) ||
              isNaN(t.z)
          )
      );

      // Merge any new/removed tables into existing floors
      const allFloorTableIds = new Set(
        prev.floors.flatMap((f) => f.tables.map((t) => t.id))
      );
      const newTables = plainTables.filter(
        (t) => !allFloorTableIds.has(t.id) && !deletedTableIdsRef.current.has(t.id)
      );
      const removedIds = new Set(plainTables.map((t) => t.id));

      if (
        !isAnyFloorDistorted &&
        newTables.length === 0 &&
        prev.floors.every((f) =>
          f.tables.every(
            (t) => removedIds.has(t.id) || !deletedTableIdsRef.current.has(t.id)
          )
        )
      ) {
        return prev; // genuinely clean and nothing changed
      }

      if (isAnyFloorDistorted) {
        return parseLayout(prev, plainTables);
      }

      const { laidOutTables } = computeAutoLayout(newTables);
      return {
        ...prev,
        floors: prev.floors.map((f, fi) => ({
          ...f,
          tables: [
            ...f.tables
              .filter(
                (t) =>
                  removedIds.has(t.id) && !deletedTableIdsRef.current.has(t.id)
              )
              .map((t) => {
                const fresh = plainTables.find((p) => p.id === t.id);
                return fresh
                  ? {
                      ...t,
                      name: fresh.name,
                      capacity: fresh.capacity,
                      section: fresh.section,
                    }
                  : t;
              }),
            ...(fi === 0 ? laidOutTables : []), // new tables go to first floor
          ],
        })),
      };
    });
  }, [plainTables]);

  // Save layout back to backend (uses existing api.updateQueue)
  const saveLayout = useCallback(
    async (nextLayout: RestaurantLayout) => {
      setIsSaving(true);
      try {
        // Build a flat table_config array for backward compat with backend
        const flatTables: TableConfig[] = nextLayout.floors.flatMap((f) =>
          f.tables.map((t) => ({
            id: t.id,
            name: t.name,
            capacity: t.capacity,
            section: f.id, // use floor id as section
            // Extra 3D coords embedded — Postgres JSONB stores them transparently
            ...(t as any),
          }))
        );

        // Also embed the full floors structure so we can restore it later
        const tableConfigPayload = {
          floors: nextLayout.floors,
        } as any;

        await api.updateQueue(queueId, {
          table_config: flatTables,
          // We store the rich layout in a custom field; backend ignores unknown fields in JSONB
        } as any);

        // Store floors structure in localStorage for recovery
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              `floor_layout_${queueId}`,
              JSON.stringify(nextLayout)
            );
          } catch {}
        }

        setLayout(nextLayout);
        deletedTableIdsRef.current.clear();
        setIsDirty(false);
      } finally {
        setIsSaving(false);
      }
    },
    [queueId]
  );

  // Load persisted layout from localStorage on first mount (sanitized to valid square plot)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(`floor_layout_${queueId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as RestaurantLayout;
        if (parsed?.floors?.length) {
          const sanitized = parseLayout(parsed, plainTables);
          setLayout(sanitized);
          setActiveFloorId(sanitized.floors[0].id);
          try {
            localStorage.setItem(`floor_layout_${queueId}`, JSON.stringify(sanitized));
          } catch {}
        }
      }
    } catch {}
  }, [queueId, plainTables]);

  const updateTable = useCallback(
    (floorId: string, tableId: number, updates: Partial<FloorTable>) => {
      setLayout((prev) => ({
        ...prev,
        floors: prev.floors.map((f) =>
          f.id !== floorId
            ? f
            : {
                ...f,
                tables: f.tables.map((t) =>
                  t.id !== tableId ? t : { ...t, ...updates }
                ),
              }
        ),
      }));
      setIsDirty(true);
    },
    []
  );

  const addFloor = useCallback((name?: string) => {
    const id = `floor_${Date.now()}`;
    setLayout((prev) => {
      const defaultName = name?.trim() || `Floor ${prev.floors.length + 1}`;
      return {
        ...prev,
        floors: [
          ...prev.floors,
          {
            id,
            name: defaultName,
            theme: "warm_bistro",
            room_width: 28,
            room_depth: 28,
            hasEntranceCounter: false,
            walls: [],
          decorations: [
            { type: "snake_plant", x: 2.2, z: 2.2, rotation: 0 },
            { type: "potted_palm", x: 25.8, z: 2.2, rotation: 0 },
            { type: "sofa_lounge", x: 5.0, z: 2.0, rotation: 0 },
            { type: "snake_plant", x: 25.8, z: 25.5, rotation: 0 },
          ],
          tables: [],
        },
      ],
    };
  });
  setActiveFloorId(id);
  setIsDirty(true);
}, []);

  const splitTables = useCallback(
    (fromFloorId: string, toFloorId: string, count: number) => {
      if (fromFloorId === toFloorId || count <= 0) return;
      setLayout((prev) => {
        const fromFloor = prev.floors.find((f) => f.id === fromFloorId);
        const toFloor = prev.floors.find((f) => f.id === toFloorId);
        if (!fromFloor || !toFloor || fromFloor.tables.length === 0) return prev;

        const countToMove = Math.min(count, fromFloor.tables.length);
        const tablesToMove = fromFloor.tables.slice(-countToMove);
        const remainingTables = fromFloor.tables.slice(0, fromFloor.tables.length - countToMove);

        const roomW = toFloor.room_width || 28;
        const roomD = toFloor.room_depth || 28;

        const transferred = tablesToMove.map((t) => ({
          ...t,
          section: toFloorId,
          x: Math.max(3.0, Math.min(roomW - 3.0, t.x)),
          z: Math.max(3.0, Math.min(roomD - 4.5, t.z)),
        }));

        return {
          ...prev,
          floors: prev.floors.map((f) => {
            if (f.id === fromFloorId) return { ...f, tables: remainingTables };
            if (f.id === toFloorId) return { ...f, tables: [...f.tables, ...transferred] };
            return f;
          }),
        };
      });
      setIsDirty(true);
    },
    []
  );

  const removeFloor = useCallback((floorId: string) => {
    setLayout((prev) => {
      const remaining = prev.floors.filter((f) => f.id !== floorId);
      return { ...prev, floors: remaining.length ? remaining : prev.floors };
    });
    setIsDirty(true);
  }, []);

  const addDecoration = useCallback(
    (floorId: string, item: DecorationItem) => {
      setLayout((prev) => ({
        ...prev,
        floors: prev.floors.map((f) =>
          f.id !== floorId
            ? f
            : { ...f, decorations: [...f.decorations, item] }
        ),
      }));
      setIsDirty(true);
    },
    []
  );

  const removeDecoration = useCallback((floorId: string, index: number) => {
    setLayout((prev) => ({
      ...prev,
      floors: prev.floors.map((f) =>
        f.id !== floorId
          ? f
          : {
              ...f,
              decorations: f.decorations.filter((_, i) => i !== index),
            }
      ),
    }));
    setIsDirty(true);
  }, []);

  const addWall = useCallback((floorId: string, wall: WallSegment) => {
    setLayout((prev) => ({
      ...prev,
      floors: prev.floors.map((f) =>
        f.id !== floorId ? f : { ...f, walls: [...f.walls, wall] }
      ),
    }));
    setIsDirty(true);
  }, []);

  const removeWall = useCallback((floorId: string, index: number) => {
    setLayout((prev) => ({
      ...prev,
      floors: prev.floors.map((f) =>
        f.id !== floorId
          ? f
          : { ...f, walls: f.walls.filter((_, i) => i !== index) }
      ),
    }));
    setIsDirty(true);
  }, []);

  const updateWall = useCallback(
    (floorId: string, index: number, updates: Partial<WallSegment>) => {
      setLayout((prev) => ({
        ...prev,
        floors: prev.floors.map((f) =>
          f.id !== floorId
            ? f
            : {
                ...f,
                walls: f.walls.map((w, i) =>
                  i !== index ? w : { ...w, ...updates }
                ),
              }
        ),
      }));
      setIsDirty(true);
    },
    []
  );

  const updateDecoration = useCallback(
    (floorId: string, index: number, updates: Partial<DecorationItem>) => {
      setLayout((prev) => ({
        ...prev,
        floors: prev.floors.map((f) =>
          f.id !== floorId
            ? f
            : {
                ...f,
                decorations: f.decorations.map((d, i) =>
                  i !== index ? d : { ...d, ...updates }
                ),
              }
        ),
      }));
      setIsDirty(true);
    },
    []
  );

  const updateFloorMeta = useCallback(
    (
      floorId: string,
      updates: Partial<Pick<FloorLayout, "name" | "theme" | "room_width" | "room_depth" | "hasEntranceCounter">>
    ) => {
      setLayout((prev) => ({
        ...prev,
        floors: prev.floors.map((f) =>
          f.id !== floorId ? f : { ...f, ...updates }
        ),
      }));
      setIsDirty(true);
    },
    []
  );

  const makeSquarePlot = useCallback((floorId: string, customSize?: number) => {
    setLayout((prev) => ({
      ...prev,
      floors: prev.floors.map((f) => {
        if (f.id !== floorId) return f;
        const count = f.tables.length;
        const sideCount = Math.max(3, Math.ceil(Math.sqrt(count || 1)));
        const idealSquare = Math.max(28, Math.ceil(sideCount * 5.4 + 6.0));
        const targetSide = customSize || idealSquare;

        const cols = sideCount;
        const rows = Math.ceil((count || 1) / cols);
        const usableW = targetSide - 7.0;
        const usableD = targetSide - 9.5;
        const stepX = cols > 1 ? usableW / (cols - 1) : 0;
        const stepZ = rows > 1 ? usableD / (rows - 1) : 0;

        const regriddedTables = f.tables.map((t, idx) => {
          const c = idx % cols;
          const r = Math.floor(idx / cols);
          return {
            ...t,
            x: cols > 1 ? Math.round((3.5 + c * stepX) * 2) / 2 : targetSide / 2,
            z: rows > 1 ? Math.round((3.5 + r * stepZ) * 2) / 2 : targetSide / 2 - 1.0,
          };
        });

        return {
          ...f,
          room_width: targetSide,
          room_depth: targetSide,
          walls: [],
          decorations: [
            { type: "snake_plant", x: 2.2, z: 2.2, rotation: 0 },
            { type: "potted_palm", x: targetSide - 2.2, z: 2.2, rotation: 0 },
            { type: "sofa_lounge", x: 5.0, z: 2.0, rotation: 0 },
            { type: "snake_plant", x: targetSide - 2.2, z: targetSide - 2.5, rotation: 0 },
          ],
          tables: regriddedTables,
        };
      }),
    }));
    setIsDirty(true);
  }, []);

  const deleteTable = useCallback((floorId: string, tableId: number) => {
    deletedTableIdsRef.current.add(tableId);
    setLayout((prev) => ({
      ...prev,
      floors: prev.floors.map((f) =>
        f.id !== floorId
          ? f
          : {
              ...f,
              tables: f.tables.filter((t) => t.id !== tableId),
            }
      ),
    }));
    setIsDirty(true);
  }, []);

  const addTable = useCallback(
    (floorId: string, custom?: Partial<FloorTable>): FloorTable | undefined => {
      let createdTable: FloorTable | undefined = undefined;
      setLayout((prev) => {
        const targetFloor = prev.floors.find((f) => f.id === floorId) ?? prev.floors[0];
        if (!targetFloor) return prev;

        const allIds = prev.floors.flatMap((f) => f.tables.map((t) => t.id));
        const nextId = allIds.length > 0 ? Math.max(...allIds) + 1 : 1;

        // Find clear position on floor
        const occupiedKeys = new Set(
          targetFloor.tables.map((t) => `${Math.round(t.x / 3.0)},${Math.round(t.z / 3.0)}`)
        );

        let candidateX = 4.0;
        let candidateZ = 4.0;
        let foundSpot = false;

        for (let rz = 3.0; rz <= targetFloor.room_depth - 3.0; rz += 3.5) {
          for (let rx = 3.0; rx <= targetFloor.room_width - 3.0; rx += 4.0) {
            const key = `${Math.round(rx / 3.0)},${Math.round(rz / 3.0)}`;
            if (!occupiedKeys.has(key)) {
              candidateX = rx;
              candidateZ = rz;
              foundSpot = true;
              break;
            }
          }
          if (foundSpot) break;
        }

        if (!foundSpot) {
          candidateX = Math.round(targetFloor.room_width / 2);
          candidateZ = Math.round(targetFloor.room_depth / 2);
        }

        const capacity = custom?.capacity ?? 4;
        const shape =
          custom?.shape ??
          (capacity <= 2 ? "round" : capacity >= 8 ? "banquet" : "square");
        const name = custom?.name?.trim() || `T-${nextId}`;

        const newTable: FloorTable = {
          id: nextId,
          name,
          capacity,
          shape,
          section: targetFloor.id,
          x: custom?.x ?? candidateX,
          z: custom?.z ?? candidateZ,
          rotation: custom?.rotation ?? 0,
          width: custom?.width,
          depth: custom?.depth,
          ...custom,
        };

        createdTable = newTable;

        return {
          ...prev,
          floors: prev.floors.map((f) =>
            f.id === targetFloor.id
              ? { ...f, tables: [...f.tables, newTable] }
              : f
          ),
        };
      });
      setIsDirty(true);
      return createdTable;
    },
    []
  );

  const moveTableToFloor = useCallback(
    (tableId: number, fromFloorId: string, toFloorId: string) => {
      if (fromFloorId === toFloorId) return;
      setLayout((prev) => {
        let movedTable: FloorTable | undefined;
        const updated = prev.floors.map((f) => {
          if (f.id === fromFloorId) {
            movedTable = f.tables.find((t) => t.id === tableId);
            return { ...f, tables: f.tables.filter((t) => t.id !== tableId) };
          }
          return f;
        });
        if (!movedTable) return prev;

        const targetFloor = prev.floors.find((f) => f.id === toFloorId);
        const roomW = targetFloor?.room_width ?? 24;
        const roomD = targetFloor?.room_depth ?? 18;

        const transferred: FloorTable = {
          ...movedTable,
          section: toFloorId,
          x: Math.max(2.0, Math.min(roomW - 2.0, movedTable.x)),
          z: Math.max(2.0, Math.min(roomD - 2.0, movedTable.z)),
        };

        return {
          ...prev,
          floors: updated.map((f) =>
            f.id === toFloorId
              ? { ...f, tables: [...f.tables, transferred] }
              : f
          ),
        };
      });
      setIsDirty(true);
    },
    []
  );

  const autoFitRoom = useCallback((floorId: string) => {
    setLayout((prev) => ({
      ...prev,
      floors: prev.floors.map((f) => {
        if (f.id !== floorId || f.tables.length === 0) return f;
        const maxX = Math.max(...f.tables.map((t) => t.x + (t.width ?? 2.0) / 2));
        const maxZ = Math.max(...f.tables.map((t) => t.z + (t.depth ?? 1.5) / 2));
        const fitSide = Math.max(28, Math.max(Math.ceil(maxX + 3.5), Math.ceil(maxZ + 5.5)));
        return {
          ...f,
          room_width: fitSide,
          room_depth: fitSide,
        };
      }),
    }));
    setIsDirty(true);
  }, []);

  const autoOrganizeFloor = useCallback((floorId: string) => {
    setLayout((prev) => ({
      ...prev,
      floors: prev.floors.map((f) => {
        if (f.id !== floorId || f.tables.length === 0) return f;
        const { roomWidth, roomDepth, laidOutTables } = computeAutoLayout(f.tables);
        return {
          ...f,
          room_width: roomWidth,
          room_depth: roomDepth,
          walls: [],
          tables: laidOutTables,
        };
      }),
    }));
    setIsDirty(true);
  }, []);

  const packTablesInside = useCallback((floorId: string) => {
    setLayout((prev) => ({
      ...prev,
      floors: prev.floors.map((f) => {
        if (f.id !== floorId || f.tables.length === 0) return f;
        const squareSide = Math.max(f.room_width, f.room_depth);
        const W = squareSide;
        const D = squareSide;
        const count = f.tables.length;
        const sideCount = Math.max(3, Math.ceil(Math.sqrt(count)));
        const cols = sideCount;
        const rows = Math.ceil(count / cols);

        const usableW = W - 7.0;
        const usableD = D - 9.5;

        const stepX = cols > 1 ? usableW / (cols - 1) : 0;
        const stepZ = rows > 1 ? usableD / (rows - 1) : 0;

        const packedTables: FloorTable[] = f.tables.map((t, idx) => {
          const c = idx % cols;
          const r = Math.floor(idx / cols);
          const x = cols === 1 ? W / 2 : 3.5 + c * stepX;
          const z = rows === 1 ? D / 2 - 1.0 : 3.5 + r * stepZ;
          return {
            ...t,
            x: Math.round(x * 2) / 2,
            z: Math.round(z * 2) / 2,
          };
        });

        return {
          ...f,
          room_width: squareSide,
          room_depth: squareSide,
          tables: packedTables,
        };
      }),
    }));
    setIsDirty(true);
  }, []);

  const [viewMode, setViewModeState] = useState<"single_block" | "avenue">(
    () => layout.viewMode || "single_block"
  );

  const setViewMode = useCallback((mode: "single_block" | "avenue") => {
    setViewModeState(mode);
    setLayout((prev) => ({ ...prev, viewMode: mode }));
    setIsDirty(true);
  }, []);

  return {
    layout,
    setLayout,
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
    splitTables,
    viewMode,
    setViewMode,
  };
}
