/**
 * Super-Admin branch dashboard — read-only view.
 * The auth token (with is_read_only=true) is set before this page loads,
 * so OverviewPage reads branch data via getCurrentUser().org_slug from the JWT.
 * The URL stays under /super-admin/{parentOrgSlug}/{branchSlug}/dashboard.
 */
export { default } from "@/app/[orgSlug]/dashboard/page";
