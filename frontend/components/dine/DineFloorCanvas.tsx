"use client";

import React, { Suspense, useState, useMemo, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { MapControls } from "@react-three/drei";
import DineFloorScene from "./DineFloorScene";
import { FloorLayout, FloorTable } from "./hooks/useFloorLayout";
import { TableOccupancy } from "./hooks/use3DTableState";

interface Props {
  floors?: FloorLayout[];
  activeFloorId?: string;
  onSwitchFloor?: (id: string) => void;
  viewMode?: "single_block" | "avenue";
  cameraPreset?: "isometric" | "top_down" | "front";
  cameraResetKey?: number;
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
}

function CameraController({
  target,
  camPos,
  activeFloorId,
  viewMode,
  roomWidth,
  roomDepth,
  cameraPreset,
  cameraResetKey,
}: {
  target: [number, number, number];
  camPos: [number, number, number];
  activeFloorId: string;
  viewMode?: string;
  roomWidth: number;
  roomDepth: number;
  cameraPreset?: string;
  cameraResetKey?: number;
}) {
  const { camera, size, controls } = useThree();
  const prevRef = useRef({
    floorId: activeFloorId,
    viewMode,
    roomWidth,
    roomDepth,
    preset: cameraPreset,
    resetKey: cameraResetKey,
    width: size.width,
    height: size.height,
  });

  useEffect(() => {
    const sizeChanged =
      Math.abs(prevRef.current.width - size.width) > 60 ||
      Math.abs(prevRef.current.height - size.height) > 60;

    if (
      prevRef.current.floorId !== activeFloorId ||
      prevRef.current.viewMode !== viewMode ||
      prevRef.current.roomWidth !== roomWidth ||
      prevRef.current.roomDepth !== roomDepth ||
      prevRef.current.preset !== cameraPreset ||
      prevRef.current.resetKey !== cameraResetKey ||
      sizeChanged
    ) {
      prevRef.current = {
        floorId: activeFloorId,
        viewMode,
        roomWidth,
        roomDepth,
        preset: cameraPreset,
        resetKey: cameraResetKey,
        width: size.width,
        height: size.height,
      };

      // Aspect ratio compensation for mobile/tablet screens
      const aspect = size.width / Math.max(1, size.height);
      const responsiveScale =
        aspect < 1.25 ? Math.min(1.75, 1.25 / Math.max(0.65, aspect)) : 1.0;

      const relX = (camPos[0] - target[0]) * responsiveScale;
      const relY = (camPos[1] - target[1]) * responsiveScale;
      const relZ = (camPos[2] - target[2]) * responsiveScale;

      camera.position.set(target[0] + relX, target[1] + relY, target[2] + relZ);
      camera.lookAt(target[0], target[1], target[2]);

      if (controls && (controls as any).target) {
        (controls as any).target.set(target[0], target[1], target[2]);
        (controls as any).update?.();
      }
    }
  }, [
    activeFloorId,
    viewMode,
    roomWidth,
    roomDepth,
    cameraPreset,
    cameraResetKey,
    camPos,
    target,
    camera,
    controls,
    size.width,
    size.height,
  ]);

  return null;
}

export default function DineFloorCanvas({
  floors = [],
  activeFloorId,
  onSwitchFloor,
  viewMode = "single_block",
  cameraPreset = "isometric",
  cameraResetKey = 0,
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
}: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const allFloors = floors.length > 0 ? floors : [floor];
  const curActiveFloorId = activeFloorId || floor.id;
  const activeFloor = allFloors.find((f) => f.id === curActiveFloorId) || allFloors[0] || floor;
  const isAvenue = viewMode === "avenue" && allFloors.length > 1;

  // Horizontal floor offsets if viewing side-by-side along the avenue
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

  // Center camera comfortably based on active floor's square plot
  const maxDim = Math.max(activeFloor.room_width, activeFloor.room_depth);
  const targetX = activeOffsetX + activeFloor.room_width * 0.5;
  const targetZ = activeFloor.room_depth * 0.5;

  // Hero framing: frames the restaurant occupying ~75-85% of viewport
  let camX = targetX + maxDim * 0.36;
  let camY = Math.max(9.5, maxDim * 0.62);
  let camZ = targetZ + maxDim * 0.68;

  if (cameraPreset === "top_down") {
    camX = targetX;
    camY = Math.max(14, maxDim * 1.15);
    camZ = targetZ + 0.001;
  } else if (cameraPreset === "front") {
    camX = targetX;
    camY = Math.max(6, maxDim * 0.36);
    camZ = targetZ + maxDim * 0.86;
  }

  return (
    <Canvas
      camera={{
        position: [camX, camY, camZ],
        fov: 34,
        near: 0.2,
        far: 500,
      }}
      shadows="basic"
      dpr={[1, Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 1.25)]}
      frameloop={isDragging ? "always" : "demand"}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      style={{
        width: "100%",
        height: "100%",
        background: "radial-gradient(ellipse at 50% 30%, #172236 0%, #0c1220 70%, #060911 100%)",
        touchAction: "none",
        cursor: isDragging ? "grabbing" : isEditorMode ? "crosshair" : "default",
      }}
    >
      <Suspense fallback={null}>
        <CameraController
          target={[targetX, 0, targetZ]}
          camPos={[camX, camY, camZ]}
          activeFloorId={curActiveFloorId}
          viewMode={viewMode}
          roomWidth={activeFloor.room_width}
          roomDepth={activeFloor.room_depth}
          cameraPreset={cameraPreset}
          cameraResetKey={cameraResetKey}
        />
        <DineFloorScene
          floors={allFloors}
          activeFloorId={curActiveFloorId}
          onSwitchFloor={onSwitchFloor}
          viewMode={viewMode}
          floor={activeFloor}
          getOccupancy={getOccupancy}
          prefix={prefix}
          hoveredTableId={hoveredTableId}
          selectedTableId={selectedTableId}
          isEditorMode={isEditorMode}
          onTableClick={onTableClick}
          onTableHover={onTableHover}
          onTableDrag={onTableDrag}
          onDecorDrag={onDecorDrag}
          onWallDrag={onWallDrag}
          onWallRotate={onWallRotate}
          onDeleteWall={onDeleteWall}
          onUpdateTable={onUpdateTable}
          onDeleteTable={onDeleteTable}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />
        <MapControls
          makeDefault
          enabled={!isDragging}
          target={[targetX, 0, targetZ]}
          minPolarAngle={Math.PI / 16}
          maxPolarAngle={Math.PI / 2.15}
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={70}
        />
      </Suspense>
    </Canvas>
  );
}
