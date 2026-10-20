"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, LayoutGrid, UserPlus } from "lucide-react";
import ModalPortal from "@/components/ui/ModalPortal";
import { WaitingToken } from "@/types/api";

export type SnapCorner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

export interface DineFloatingViewToggleProps {
  // View switcher props
  activeFloorSubView?: "3d" | "plain";
  onToggle?: () => void;
  showViewToggle?: boolean;
  onToggleView?: () => void;

  // Walk-in action props
  onToggleWalkIn?: () => void;
  isWalkInOpen?: boolean;

  // Next party rapid paging
  nextParty?: WaitingToken | null;
  onPageNextParty?: () => void | Promise<void>;
  prefix?: string;

  isReadOnly?: boolean;
}

export default function DineFloatingViewToggle({
  activeFloorSubView = "plain",
  onToggle,
  showViewToggle,
  onToggleView,
  onToggleWalkIn,
  isWalkInOpen = false,
  nextParty,
  onPageNextParty,
  prefix = "",
  isReadOnly = false,
}: DineFloatingViewToggleProps) {
  const [corner, setCorner] = useState<SnapCorner>("bottom-right");
  const [hoveredBtn, setHoveredBtn] = useState<"walkin" | "view" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDragActionRef = useRef(false);

  // Resolved handlers & visibility
  const handleToggleViewAction = onToggleView || onToggle;
  const isViewToggleVisible = showViewToggle ?? Boolean(handleToggleViewAction);
  const isWalkInVisible = Boolean(onToggleWalkIn);

  // Initialize corner from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("q4q_dine_fab_corner") as SnapCorner | null;
        if (
          saved &&
          (saved === "bottom-right" ||
            saved === "bottom-left" ||
            saved === "top-right" ||
            saved === "top-left")
        ) {
          setCorner(saved);
        }
      } catch {}
    }
  }, []);

  // Global keyboard shortcuts (W: Walk-in, V: 2D/3D View)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      if (e.key === "w" || e.key === "W") {
        if (!e.ctrlKey && !e.metaKey && !e.altKey && !isReadOnly && onToggleWalkIn) {
          e.preventDefault();
          onToggleWalkIn();
        }
      } else if (e.key === "v" || e.key === "V") {
        if (!e.ctrlKey && !e.metaKey && !e.altKey && isViewToggleVisible && handleToggleViewAction) {
          e.preventDefault();
          handleToggleViewAction();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleWalkIn, isViewToggleVisible, handleToggleViewAction, isReadOnly]);

  const isRightSide = corner.endsWith("-right");

  // Dynamic positioning classes based on current snapped corner
  const getCornerClasses = (c: SnapCorner) => {
    switch (c) {
      case "top-left":
        return "top-20 left-5 md:left-[260px]";
      case "top-right":
        return "top-20 right-5 md:right-8";
      case "bottom-left":
        return "bottom-6 left-5 md:left-[260px]";
      case "bottom-right":
      default:
        return "bottom-6 right-5 md:right-8";
    }
  };

  // If neither Walk-in nor View Toggle is available, render nothing
  if (!isWalkInVisible && !isViewToggleVisible && !nextParty) {
    return null;
  }

  return (
    <ModalPortal lockScroll={false}>
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 450, damping: 30 }}
        drag
        dragMomentum={false}
        dragElastic={0.25}
        dragSnapToOrigin={true}
        onDragStart={() => {
          setIsDragging(true);
          isDragActionRef.current = true;
        }}
        onDragEnd={(_e, info) => {
          const dragDist = Math.hypot(info.offset.x, info.offset.y);
          if (dragDist > 10) {
            isDragActionRef.current = true;
            // Determine quadrant of viewport
            const isRight = info.point.x > window.innerWidth / 2;
            const isBottom = info.point.y > window.innerHeight / 2;
            const nextCorner: SnapCorner = `${isBottom ? "bottom" : "top"}-${
              isRight ? "right" : "left"
            }`;

            setCorner(nextCorner);
            try {
              localStorage.setItem("q4q_dine_fab_corner", nextCorner);
            } catch {}
          } else {
            isDragActionRef.current = false;
          }

          setTimeout(() => {
            setIsDragging(false);
            isDragActionRef.current = false;
          }, 120);
        }}
        className={`fixed z-50 select-none flex flex-col items-center gap-2.5 ${getCornerClasses(corner)}`}
      >

        {/* ===================================================================== */}
        {/* 1. 2D / 3D Spatial View Switcher FAB                                  */}
        {/* ===================================================================== */}
        {isViewToggleVisible && handleToggleViewAction && (
          <div className="relative flex items-center">
            <button
              type="button"
              id="dine-floating-corner-toggle"
              onClick={(e) => {
                if (isDragActionRef.current || isDragging) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                handleToggleViewAction();
              }}
              onMouseEnter={() => setHoveredBtn("view")}
              onMouseLeave={() => setHoveredBtn(null)}
              className={`w-11 h-11 rounded-full flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-white/20 dark:border-slate-800 shadow-2xl shadow-slate-950/40 dark:shadow-black/60 transition-transform active:scale-95 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                isDragging ? "cursor-grabbing scale-105" : "hover:scale-105"
              }`}
              aria-label={
                activeFloorSubView === "3d" ? "Switch to 2D Table Cards" : "Switch to 3D Spatial View"
              }
              title={
                activeFloorSubView === "3d"
                  ? "Switch to 2D Cards (V) - Drag to move"
                  : "Switch to 3D View (V) - Drag to move"
              }
            >
              {activeFloorSubView === "3d" ? (
                <LayoutGrid size={19} strokeWidth={2.2} className="shrink-0 transition-transform hover:scale-110" />
              ) : (
                <Building2 size={19} strokeWidth={2.2} className="shrink-0 transition-transform hover:scale-110" />
              )}
            </button>

            {/* Directional Tooltip for View Switcher */}
            <AnimatePresence>
              {hoveredBtn === "view" && !isDragging && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: isRightSide ? 6 : -6 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute top-1/2 -translate-y-1/2 ${
                    isRightSide ? "right-full mr-2.5" : "left-full ml-2.5"
                  } pointer-events-none z-50 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-slate-800 text-white text-xs font-semibold shadow-xl border border-white/10 backdrop-blur-md whitespace-nowrap`}
                >
                  <span>{activeFloorSubView === "3d" ? "Switch to 2D Cards" : "Switch to 3D View"}</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/15 dark:bg-slate-700/80 rounded text-slate-200">
                    V
                  </kbd>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ===================================================================== */}
        {/* 2. Quick Walk-In Floating FAB (Primary Host Action)                  */}
        {/* ===================================================================== */}
        {isWalkInVisible && onToggleWalkIn && (
          <div className="relative flex items-center">
            <button
              type="button"
              id="dine-floating-walkin-btn"
              onClick={(e) => {
                if (isDragActionRef.current || isDragging || isReadOnly) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                onToggleWalkIn();
              }}
              onMouseEnter={() => setHoveredBtn("walkin")}
              onMouseLeave={() => setHoveredBtn(null)}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                isWalkInOpen
                  ? "bg-gradient-to-b from-indigo-600 to-indigo-700 text-white ring-2 ring-indigo-400/80 shadow-[0_4px_14px_0_rgba(79,70,229,0.35),0_1px_3px_0_rgba(15,23,42,0.12),inset_0_1px_0_0_rgba(255,255,255,0.2)] scale-105"
                  : "bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white border border-white/25 shadow-[0_4px_12px_0_rgba(79,70,229,0.3),0_1px_3px_0_rgba(15,23,42,0.1),inset_0_1px_0_0_rgba(255,255,255,0.3)] hover:shadow-[0_6px_18px_0_rgba(79,70,229,0.42),0_2px_4px_0_rgba(15,23,42,0.12),inset_0_1px_0_0_rgba(255,255,255,0.35)] hover:scale-105 active:scale-95 active:shadow-[0_2px_6px_0_rgba(79,70,229,0.25)]"
              } ${isDragging ? "cursor-grabbing scale-105" : ""}`}
              aria-label="Seat Walk-in guest"
              title="Seat Walk-in (W) - Drag to move"
            >
              <UserPlus size={19} strokeWidth={2.4} className="shrink-0 transition-transform hover:scale-110" />
            </button>

            {/* Directional Tooltip for Walk-in */}
            <AnimatePresence>
              {hoveredBtn === "walkin" && !isDragging && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: isRightSide ? 6 : -6 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute top-1/2 -translate-y-1/2 ${
                    isRightSide ? "right-full mr-2.5" : "left-full ml-2.5"
                  } pointer-events-none z-50 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-slate-800 text-white text-xs font-semibold shadow-xl border border-white/10 backdrop-blur-md whitespace-nowrap`}
                >
                  <span>Seat Walk-in</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/15 dark:bg-slate-700/80 rounded text-slate-200">
                    W
                  </kbd>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </ModalPortal>
  );
}
