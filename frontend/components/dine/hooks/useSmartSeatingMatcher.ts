"use client";

import { useMemo, useCallback } from "react";
import { WaitingToken, ServingToken } from "@/types/api";
import {
  EnhancedTableConfig,
  SmartSeatingMatch,
  resolveTableStatus,
} from "@/types/dine";

/**
 * Extracts the party size (PAX) from a waiting token
 */
export function getWaitingTokenPax(token: WaitingToken): number {
  if (token.pax_count && token.pax_count > 0) return token.pax_count;
  const cd = token.custom_data;
  if (cd && typeof cd === "object") {
    const val = cd.pax ?? cd.pax_count ?? cd.no_of_pax ?? cd.number_of_pax;
    if (val !== undefined && val !== null) {
      const parsed = parseInt(String(val), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 1;
}

/**
 * Calculates elapsed wait time in minutes
 */
export function getElapsedWaitMinutes(createdAt?: string | null): number {
  if (!createdAt) return 0;
  const diffMs = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

export interface UseSmartSeatingMatcherResult {
  matches: Map<number, SmartSeatingMatch>;
  getMatchForTable: (tableId: number) => SmartSeatingMatch | undefined;
  hasHighWasteWarning: (tableId: number, partySize: number) => boolean;
  getHighWasteDetails: (
    tableId: number,
    partySize: number
  ) => { isHighWaste: boolean; reason?: string; largerWaitingParties: number };
  getCompatibleTablesForParty: (pax: number) => EnhancedTableConfig[];
  availableTablesCount: number;
}

/**
 * Hook to match waiting parties to available dining tables.
 * Prioritizes capacity efficiency and customer wait times.
 */
export function useSmartSeatingMatcher(
  tables: EnhancedTableConfig[],
  waitingTokens: WaitingToken[] = [],
  tableTokensMap?: Map<number, ServingToken[]>
): UseSmartSeatingMatcherResult {
  // 1. Identify which tables are available/ready to seat
  const availableTables = useMemo(() => {
    return tables.filter((tbl) => {
      const tokens = tableTokensMap?.get(tbl.id) || [];
      const status = resolveTableStatus(tbl, tokens);
      return status === "available";
    });
  }, [tables, tableTokensMap]);

  // 2. Pre-process waiting tokens with parsed PAX and wait times
  const processedTokens = useMemo(() => {
    return waitingTokens.map((token) => ({
      token,
      pax: getWaitingTokenPax(token),
      waitTimeMins: getElapsedWaitMinutes(token.created_at),
    }));
  }, [waitingTokens]);

  // 3. Compute best match for each available table
  const matches = useMemo(() => {
    const matchMap = new Map<number, SmartSeatingMatch>();
    if (availableTables.length === 0 || processedTokens.length === 0) {
      return matchMap;
    }

    // Keep track of assigned tokens to avoid assigning the same token to multiple tables
    const assignedTokenIds = new Set<string>();

    // Sort available tables by capacity ascending so smaller tables claim smaller parties first
    const sortedTables = [...availableTables].sort((a, b) => a.capacity - b.capacity);

    for (const table of sortedTables) {
      // Find candidate parties that can fit at this table
      const candidates = processedTokens.filter(
        (item) => item.pax <= table.capacity && !assignedTokenIds.has(item.token.id)
      );

      if (candidates.length === 0) continue;

      // Score candidates:
      // Tier 1: Exact fit (pax === capacity), sorted by longest wait time
      // Tier 2: Near fit (pax === capacity - 1), sorted by longest wait time
      // Tier 3: Other fits, sorted by minimum seat waste, then longest wait time
      candidates.sort((a, b) => {
        const aExact = a.pax === table.capacity ? 1 : 0;
        const bExact = b.pax === table.capacity ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;

        const aNear = a.pax === table.capacity - 1 ? 1 : 0;
        const bNear = b.pax === table.capacity - 1 ? 1 : 0;
        if (aNear !== bNear) return bNear - aNear;

        const aWaste = table.capacity - a.pax;
        const bWaste = table.capacity - b.pax;
        if (aWaste !== bWaste) return aWaste - bWaste; // Less waste first

        return b.waitTimeMins - a.waitTimeMins; // Longest wait time first
      });

      const best = candidates[0];
      assignedTokenIds.add(best.token.id);

      matchMap.set(table.id, {
        tableId: table.id,
        waitingTokenId: best.token.id,
        tokenNumber: best.token.token_number,
        customerName: best.token.customer_name || "Guest",
        pax: best.pax,
        waitTimeMins: best.waitTimeMins,
        isExactCapacityMatch: best.pax === table.capacity,
        seatWasteCount: Math.max(0, table.capacity - best.pax),
      });
    }

    return matchMap;
  }, [availableTables, processedTokens]);

  // 4. Helper to get match for a specific table
  const getMatchForTable = useCallback(
    (tableId: number): SmartSeatingMatch | undefined => {
      return matches.get(tableId);
    },
    [matches]
  );

  // 5. High-waste capacity protection helper
  const getHighWasteDetails = useCallback(
    (tableId: number, partySize: number) => {
      const table = tables.find((t) => t.id === tableId);
      if (!table) {
        return { isHighWaste: false, largerWaitingParties: 0 };
      }

      const wastedSeats = table.capacity - partySize;
      // High waste condition:
      // Either table is 6+ capacity and party is <= 2 (wasting 4+ seats),
      // OR wasting 3+ seats on any table >= 5 capacity
      const isSignificantWaste =
        (table.capacity >= 6 && partySize <= 2) ||
        (table.capacity >= 5 && wastedSeats >= 3);

      if (!isSignificantWaste) {
        return { isHighWaste: false, largerWaitingParties: 0 };
      }

      // Check if there are larger parties currently waiting in line
      const largerParties = processedTokens.filter(
        (item) => item.pax > partySize && item.pax <= table.capacity
      );

      if (largerParties.length > 0) {
        return {
          isHighWaste: true,
          reason: `Seating ${partySize} guests at Table ${table.name || table.id} (${table.capacity}p) wastes ${wastedSeats} seats while ${largerParties.length} larger party is waiting.`,
          largerWaitingParties: largerParties.length,
        };
      }

      return { isHighWaste: false, largerWaitingParties: 0 };
    },
    [tables, processedTokens]
  );

  const hasHighWasteWarning = useCallback(
    (tableId: number, partySize: number): boolean => {
      return getHighWasteDetails(tableId, partySize).isHighWaste;
    },
    [getHighWasteDetails]
  );

  // 6. Helper to find available tables compatible with a specific party size
  const getCompatibleTablesForParty = useCallback(
    (pax: number): EnhancedTableConfig[] => {
      return availableTables.filter((t) => t.capacity >= pax);
    },
    [availableTables]
  );

  return {
    matches,
    getMatchForTable,
    hasHighWasteWarning,
    getHighWasteDetails,
    getCompatibleTablesForParty,
    availableTablesCount: availableTables.length,
  };
}
