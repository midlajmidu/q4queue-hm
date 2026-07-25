"use client";

import React, { createContext, useContext } from "react";

/**
 * BranchTimezoneContext — stores the currently logged-in branch's IANA timezone string.
 *
 * Set once in `app/[orgSlug]/dashboard/layout.tsx` after fetching org settings.
 * Consumed in every page, component, and modal that displays a timestamp.
 *
 * Default value: "Asia/Kolkata" (safe fallback if layout hasn't loaded yet)
 */
export const BranchTimezoneContext = createContext<string>("Asia/Kolkata");

/**
 * Hook to read the branch timezone from context.
 *
 * Usage:
 *   const tz = useBranchTimezone();
 *   fmtTime(token.created_at, tz)
 */
export function useBranchTimezone(): string {
  return useContext(BranchTimezoneContext);
}
