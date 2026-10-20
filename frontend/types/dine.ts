import { TableConfig, ServingToken, WaitingToken } from "./api";

/**
 * 6-Stage Restaurant Table Lifecycle
 */
export type TableLifecycleStatus =
  | "available"     // Clean, reset, ready to seat guests
  | "held"          // Paged party, 5m hold timer active
  | "seated"        // Actively dining
  | "check_dropped" // Bill presented or payment in progress, departing shortly
  | "blocked";      // Out of order, maintenance, or reserved for event

/**
 * Extended Table Configuration with lifecycle and server state
 */
export interface EnhancedTableConfig extends TableConfig {
  status?: TableLifecycleStatus;
  statusChangedAt?: string;
  serverId?: string;
  serverName?: string;
  heldUntil?: string;            // ISO timestamp for hold/grace expiration
  heldForTokenId?: string;       // Waiting token ID this table is held for
  mergedWithTableIds?: number[]; // Tables joined to this primary table
  shape?: "square" | "round" | "booth" | "banquet";
}

/**
 * Waitstaff Server Assignment & Cover Balancing
 */
export interface ServerAssignment {
  id: string;
  name: string;
  color: string;
  activeCovers: number;
  tableIds: number[];
}

/**
 * Matchmaking recommendation between an available table and a waiting party
 */
export interface SmartSeatingMatch {
  tableId: number;
  waitingTokenId: string;
  tokenNumber: number;
  customerName: string;
  pax: number;
  waitTimeMins: number;
  isExactCapacityMatch: boolean;
  seatWasteCount: number;
}

/**
 * Quick Walk-in Form Payload
 */
export interface QuickWalkInPayload {
  pax: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  preferences?: string[];
  immediateTableId?: number | null;
}

/**
 * Human-readable metadata and design tokens for TableLifecycleStatus
 */
export interface TableStatusMeta {
  label: string;
  shortLabel: string;
  dotColor: string;
  badgeBgLight: string;
  badgeTextLight: string;
  badgeBorderLight: string;
  badgeBgDark: string;
  badgeTextDark: string;
  badgeBorderDark: string;
  cardBorderLight: string;
  cardBorderDark: string;
  cardBgLight: string;
  cardBgDark: string;
}

export const TABLE_STATUS_METADATA: Record<TableLifecycleStatus, TableStatusMeta> = {
  available: {
    label: "Clean & Ready",
    shortLabel: "Ready",
    dotColor: "bg-emerald-500",
    badgeBgLight: "bg-emerald-50",
    badgeTextLight: "text-emerald-700",
    badgeBorderLight: "border-emerald-200",
    badgeBgDark: "bg-emerald-950/60",
    badgeTextDark: "text-emerald-300",
    badgeBorderDark: "border-emerald-800/60",
    cardBorderLight: "border-emerald-200/90",
    cardBorderDark: "dark:border-emerald-800/50",
    cardBgLight: "bg-white",
    cardBgDark: "dark:bg-slate-900",
  },
  held: {
    label: "Held / Paged",
    shortLabel: "Held",
    dotColor: "bg-amber-500 animate-pulse",
    badgeBgLight: "bg-amber-50",
    badgeTextLight: "text-amber-800",
    badgeBorderLight: "border-amber-300",
    badgeBgDark: "bg-amber-950/60",
    badgeTextDark: "text-amber-300",
    badgeBorderDark: "border-amber-800/60",
    cardBorderLight: "border-amber-300",
    cardBorderDark: "dark:border-amber-800/60",
    cardBgLight: "bg-amber-50/30",
    cardBgDark: "dark:bg-amber-950/20",
  },
  seated: {
    label: "Actively Dining",
    shortLabel: "Dining",
    dotColor: "bg-blue-500",
    badgeBgLight: "bg-blue-50",
    badgeTextLight: "text-blue-700",
    badgeBorderLight: "border-blue-200",
    badgeBgDark: "bg-blue-950/60",
    badgeTextDark: "text-blue-300",
    badgeBorderDark: "border-blue-800/60",
    cardBorderLight: "border-slate-200",
    cardBorderDark: "dark:border-slate-800",
    cardBgLight: "bg-white",
    cardBgDark: "dark:bg-slate-900",
  },
  check_dropped: {
    label: "Bill Given",
    shortLabel: "Settling",
    dotColor: "bg-purple-500",
    badgeBgLight: "bg-purple-50",
    badgeTextLight: "text-purple-700",
    badgeBorderLight: "border-purple-200",
    badgeBgDark: "bg-purple-950/60",
    badgeTextDark: "text-purple-300",
    badgeBorderDark: "border-purple-800/60",
    cardBorderLight: "border-purple-300",
    cardBorderDark: "dark:border-purple-800/60",
    cardBgLight: "bg-purple-50/30",
    cardBgDark: "dark:bg-purple-950/20",
  },
  blocked: {
    label: "Out of Service",
    shortLabel: "Blocked",
    dotColor: "bg-slate-400",
    badgeBgLight: "bg-slate-100",
    badgeTextLight: "text-slate-600",
    badgeBorderLight: "border-slate-300",
    badgeBgDark: "bg-slate-800",
    badgeTextDark: "text-slate-400",
    badgeBorderDark: "border-slate-700",
    cardBorderLight: "border-slate-300",
    cardBorderDark: "dark:border-slate-800",
    cardBgLight: "bg-slate-100/50",
    cardBgDark: "dark:bg-slate-900/60",
  },
};

/**
 * Resolves the effective TableLifecycleStatus for a table with 100% backwards compatibility:
 * - If one or more active serving tokens are seated at this table, returns "seated"
 *   (or "check_dropped" if flag is explicitly marked).
 * - If held timer is active and not expired, returns "held".
 * - If explicitly "blocked", preserves it.
 * - Defaults to "available" if no tokens and no status set.
 */
export function resolveTableStatus(
  table: EnhancedTableConfig | TableConfig,
  activeTokensAtTable: ServingToken[] = []
): TableLifecycleStatus {
  const enhanced = table as EnhancedTableConfig;

  // 1. If actively serving guests
  if (activeTokensAtTable.length > 0) {
    if (
      enhanced.status === "check_dropped" ||
      activeTokensAtTable.some((t) => t.payment_status === "unpaid" || t.payment_status === "paid")
    ) {
      return "check_dropped";
    }
    return "seated";
  }

  // 2. If table was held, verify if hold time is still active
  if (enhanced.status === "held") {
    if (enhanced.heldUntil) {
      const isStillHeld = new Date(enhanced.heldUntil).getTime() > Date.now();
      if (!isStillHeld) {
        return "available"; // Grace hold has elapsed
      }
    }
    return "held";
  }

  // 3. If explicitly marked blocked without active token
  if (enhanced.status === "blocked") {
    return "blocked";
  }

  // 4. Default vacant state (stale check_dropped or seated resets to available)
  return "available";
}

/**
 * Check if a table can immediately seat guests
 */
export function isTableReadyToSeat(status: TableLifecycleStatus): boolean {
  return status === "available";
}
