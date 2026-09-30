/**
 * lib/api.ts
 * Compatibility Facade for Q4Queue API client.
 * Re-exports the unified api client, ApiError, and standalone functions.
 */

export { api, ApiError } from "./api/index";

export {
    requestExport,
    getExports,
    downloadExport,
    getDistinctQueues,
    getQueueQrConfig,
    getSystemTime,
} from "./api/index";

export type { OrganizationAnnouncement } from "./api/index";
