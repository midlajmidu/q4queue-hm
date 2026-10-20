"use client";

import { useMemo } from "react";
import { ServingToken, WaitingToken, TableConfig } from "@/types/api";

export interface TableOccupancy {
  tokens: ServingToken[];
  seatedPax: number;
  spareSeats: number;
  isVacant: boolean;
  isFull: boolean;
  isPartiallyOccupied: boolean;
  isShared: boolean;
  isMerged: boolean;
  primaryToken: ServingToken | null;
  elapsedMins: number;
  isLingering: boolean;
  isExtended: boolean;
  tokenTables: number[];
  paymentStatus?: "pending" | "unpaid" | "paid";
}

function getElapsedMinutes(isoString?: string | null): number {
  if (!isoString) return 0;
  const diffMs = Date.now() - new Date(isoString).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

export function getTokenPax(token: WaitingToken | ServingToken): number {
  if (token.pax_count && token.pax_count > 0) return token.pax_count;
  const cd = (token as any).custom_data;
  if (cd && typeof cd === "object") {
    const val = cd.pax ?? cd.pax_count ?? cd.no_of_pax ?? cd.number_of_pax;
    if (val !== undefined && val !== null) {
      const parsed = parseInt(String(val), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 1;
}

export function use3DTableState(
  tables: TableConfig[],
  allServingTokens: ServingToken[]
) {
  // Build tableTokensMap (same logic as DineTableGrid)
  const tableTokensMap = useMemo(() => {
    const map = new Map<number, ServingToken[]>();
    for (const t of allServingTokens) {
      const completed = t.completed_lines ?? [];
      if (
        t.assigned_line !== null &&
        t.assigned_line !== undefined &&
        !completed.includes(t.assigned_line)
      ) {
        const list = map.get(t.assigned_line) || [];
        list.push(t);
        map.set(t.assigned_line, list);
      }
      for (const sl of t.shared_lines ?? []) {
        if (!completed.includes(sl)) {
          const list = map.get(sl) || [];
          if (!list.some((x) => x.token_number === t.token_number)) {
            list.push(t);
          }
          map.set(sl, list);
        }
      }
    }
    return map;
  }, [allServingTokens]);

  // Compute occupancy for a single table
  const getOccupancy = (tableId: number, capacity: number): TableOccupancy => {
    const tokens = tableTokensMap.get(tableId) || [];
    const primaryToken = tokens[0] ?? null;
    const seatedPax = tokens.reduce((sum, t) => sum + (t.pax_count || 1), 0);
    const spareSeats = Math.max(0, capacity - seatedPax);
    const isVacant = tokens.length === 0;
    const isFull = seatedPax >= capacity;
    const isPartiallyOccupied = seatedPax > 0 && spareSeats > 0;
    const isShared = tokens.length > 1;
    const elapsedMins = primaryToken
      ? getElapsedMinutes(primaryToken.served_at)
      : 0;
    const isLingering = !isVacant && elapsedMins >= 60;
    const isExtended = !isVacant && elapsedMins >= 45 && elapsedMins < 60;

    // Token's active tables (assigned + shared minus completed)
    const tokenTables: number[] = (() => {
      if (!primaryToken) return [tableId];
      const completed = primaryToken.completed_lines ?? [];
      const list: number[] = [];
      if (
        primaryToken.assigned_line !== null &&
        primaryToken.assigned_line !== undefined &&
        !completed.includes(primaryToken.assigned_line)
      ) {
        list.push(primaryToken.assigned_line);
      }
      for (const sl of primaryToken.shared_lines ?? []) {
        if (!completed.includes(sl) && !list.includes(sl)) {
          list.push(sl);
        }
      }
      return list;
    })();

    const isMerged = tokenTables.length > 1;

    return {
      tokens,
      seatedPax,
      spareSeats,
      isVacant,
      isFull,
      isPartiallyOccupied,
      isShared,
      isMerged,
      primaryToken,
      elapsedMins,
      isLingering,
      isExtended,
      tokenTables,
      paymentStatus: primaryToken?.payment_status ?? "pending",
    };
  };

  const vacantTables = useMemo(
    () => tables.filter((t) => (tableTokensMap.get(t.id)?.length ?? 0) === 0),
    [tables, tableTokensMap]
  );

  const availableTables = useMemo(
    () =>
      tables.filter((t) => {
        const occ = getOccupancy(t.id, t.capacity);
        return occ.isVacant || occ.spareSeats > 0;
      }),
    [tables, tableTokensMap]
  );

  return {
    tableTokensMap,
    getOccupancy,
    vacantTables,
    availableTables,
  };
}
