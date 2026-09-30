/**
 * lib/api/index.ts
 * Unified aggregation entry point for all modular domain APIs.
 */

import { callingApi } from "./calling";
import { subscriptionApi } from "./subscriptions";
import { authApi } from "./auth";
import { queueApi } from "./queues";
import { tokenApi } from "./tokens";
import { staffApi } from "./staff";
import { branchOperationsApi } from "./branch-operations";
import { parentOrgApi } from "./parent-orgs";
import { orgAdminApi } from "./org-admin";
import { whatsappApi } from "./whatsapp";
import { appointmentApi } from "./appointments";
import { backupApi } from "./backups";
import { superAdminApi } from "./super-admin";
import { systemApi } from "./system";

export { ApiError } from "./client";
export {
    requestExport,
    getExports,
    downloadExport,
    getDistinctQueues,
} from "./exports";
export { getQueueQrConfig } from "./queues";
export { getSystemTime } from "./system";
export type { OrganizationAnnouncement } from "./org-admin";

export const api = {
    ...callingApi,
    ...subscriptionApi,
    ...authApi,
    ...queueApi,
    ...tokenApi,
    ...staffApi,
    ...branchOperationsApi,
    ...parentOrgApi,
    ...orgAdminApi,
    ...whatsappApi,
    ...appointmentApi,
    ...backupApi,
    ...superAdminApi,
    ...systemApi,
};
