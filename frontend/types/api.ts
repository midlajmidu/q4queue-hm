/**
 * types/api.ts
 * All API request/response types — strictly typed, no `any`.
 * These mirror the backend Pydantic schemas and WS payloads exactly.
 */

// ── Auth ─────────────────────────────────────────────────────────
export interface LoginRequest {
    email: string;
    password: string;
    organization_slug?: string;
    login_type?: "staff" | "org_admin";
}

export interface TrialSignupRequest {
    business_name: string;
    branch_name: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    timezone: string;
    accepted_terms: boolean;
}

export interface TrialSignupVerifyRequest extends TrialSignupRequest {
    otp: string;
}

export interface EntitlementItem {
    key: string;
    limit: number | null;
    used: number | null;
    remaining: number | null;
    scope: string;
}

export interface SubscriptionSummary {
    mode: "legacy" | "subscription";
    status: "legacy" | "trialing" | "active" | "expired" | "suspended" | string;
    plan_code?: string | null;
    plan_name?: string | null;
    trial_started_at?: string | null;
    trial_ends_at?: string | null;
    days_remaining?: number | null;
    is_operational: boolean;
    calling_allowed?: boolean;
    whatsapp_allowed?: boolean;
    entitlements: Record<string, EntitlementItem>;
}

export interface TrialSignupResponse extends TokenResponse {
    organization_slug: string;
    subscription: SubscriptionSummary;
}

export interface AdminSubscriptionItem {
    id: string;
    parent_organization_id: string;
    organization_name: string;
    organization_slug: string;
    plan_code: string;
    plan_name: string;
    status: string;
    source: string;
    branch_count: number;
    trial_started_at?: string | null;
    trial_ends_at?: string | null;
    days_remaining?: number | null;
}

export interface ManagedCustomerLimits {
    branches: number;
    queues_per_branch: number;
    staff_per_branch: number;
    sessions: number;
    tokens_per_session: number;
}

export interface AdminCustomerCreate {
    business_name: string;
    branch_name: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    phone?: string;
    timezone: string;
    account_type: "trial" | "active";
    trial_days: number;
    limits: ManagedCustomerLimits;
}

export interface ManagedCustomerListItem {
    parent_organization_id: string;
    name: string;
    slug: string;
    contact_email?: string;
    is_active: boolean;
    commercial_status: string;
    plan_code?: string;
    plan_name?: string;
    source: string;
    branch_count: number;
    user_count: number;
    owner_email?: string;
    trial_ends_at?: string;
    days_remaining?: number;
    created_at: string;
}

export interface SalesRequestItem {
    id: string;
    contact_name: string;
    contact_email: string;
    contact_phone?: string;
    message?: string;
    source: string;
    status: "pending" | "contacted" | "approved" | "rejected" | string;
    review_note?: string;
    created_at: string;
    reviewed_at?: string;
    notification_status: "pending" | "sent" | "partial" | "failed" | "not_configured" | string;
    notification_attempted_at?: string;
    notification_error?: string;
}

export interface AdminSalesRequestItem extends SalesRequestItem {
    parent_organization_id: string;
    organization_name: string;
    organization_slug: string;
    commercial_status: string;
}

export interface AdminSalesRequestPage {
    items: AdminSalesRequestItem[];
    total: number;
    status_counts: Record<string, number>;
}

export interface SalesRecipientItem {
    id: string;
    email: string;
    name?: string;
    is_active: boolean;
    created_at: string;
}

export interface ManagedCustomerPage {
    items: ManagedCustomerListItem[];
    total: number;
    status_counts: Record<string, number>;
}

export interface ManagedCustomerDetail {
    parent_organization_id: string;
    name: string;
    slug: string;
    contact_email?: string;
    contact_phone?: string;
    timezone: string;
    is_active: boolean;
    created_at: string;
    subscription: SubscriptionSummary;
    source: string;
    branches: Array<{
        id: string;
        name: string;
        slug: string;
        is_active: boolean;
        queues: number;
        staff: number;
    }>;
    users: Array<{
        id: string;
        email: string;
        first_name?: string;
        last_name?: string;
        role: string;
        branch_name?: string;
        is_active: boolean;
    }>;
    audit_events: Array<{
        id: string;
        event_type: string;
        created_at: string;
        details?: Record<string, unknown>;
    }>;
}

export interface AvailableBranchItem {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    admin_email?: string;
}

export interface SubscriptionAdminUpdate {
    action: "extend_trial" | "activate" | "suspend" | "reactivate" | "cancel" | "archive" | "restore";
    extension_days?: number;
    reason: string;
}

export interface ManagedCustomerUpdate {
    name: string;
    contact_email?: string;
    contact_phone?: string;
    timezone: string;
    reason: string;
}

export interface ManagedParentAdminCreate {
    first_name: string;
    last_name: string;
    email: string;
    temporary_password: string;
    reason: string;
}

export interface PermanentCustomerDelete {
    confirmation_name: string;
    confirmation_phrase: string;
    reason: string;
}

// ── Analytics ────────────────────────────────────────────────────
export interface AnalyticsOverview {
    status_counts: {
        total: number;
        served: number;
        cancelled: number;
        waiting: number;
        serving?: number;
        skipped?: number;
        deleted?: number;
        withdrawn?: number;
        staff_removed?: number;
        session_closed?: number;
        other_skipped?: number;
        invited: number;
    };
    timings: {
        avg_waiting_time: string;
        max_waiting_time: string;
        avg_served_time: string;
        max_served_time: string;
    };
    charts: {
        hourly: { hour: string; visits: number }[];
        monthly: { month: string; visits: number }[];
    };
    daily_timings?: {
        date: string;
        avg_wait: number;
        avg_serve: number;
    }[];
    staff_performance?: {
        staff_id: string;
        name: string;
        total_served: number;
        avg_serve: number;
    }[];
    recent_activity: {
        prefix: string;
        number: number;
        status: string;
        queue: string;
        session_name?: string | null;
        customer_name?: string;
        time: string;
        served_at?: string | null;
        completed_at?: string | null;
        skipped_at?: string | null;
        recalled_at?: string | null;
    }[];
    queue_summary?: {
        queue_id: string;
        queue: string;
        total: number;
        waiting: number;
        serving: number;
        served: number;
        skipped: number;
        removed: number;
    }[];
    longest_waiting_queue?: string | null;
    longest_waiting_session?: string | null;
}


// ── JWT Payload (decoded client-side) ────────────────────────────
export interface JwtPayload {
    sub: string;       // user_id
    org_id: string | null;
    org_slug: string | null;
    org_name: string | null;
    org_logo_url: string | null;
    role: string;
    is_first_login?: boolean;
    exp: number;       // UNIX timestamp
    email: string;
    first_name: string | null;
    last_name: string | null;
}

// ── Queue ────────────────────────────────────────────────────────
// ── Session ──────────────────────────────────────────────────────
export interface SystemMonitoringResponse {
    status: string;
    services: {
        database: string;
        redis: string;
        storage: string;
    };
    version: string;
    environment: string;
}

// ── Parent Organizations ──────────────────────────────────────────
export interface ParentOrganization {
    id: string;
    name: string;
    enable_shared_tokens?: boolean;
    slug: string;
    contact_email?: string;
    contact_phone?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    branch_count: number;
    admin_count: number;
    max_branches?: number | null;
}

export interface ParentOrganizationPage {
    items: ParentOrganization[];
    total: number;
}

export interface ParentOrganizationCreate {
    name: string;
    slug: string;
    contact_email?: string;
    contact_phone?: string;
    is_active?: boolean;
    max_branches?: number | null;
    enable_shared_tokens?: boolean;
}

export interface ParentOrganizationUpdate {
    name?: string;
    enable_shared_tokens?: boolean;
    slug?: string;
    contact_email?: string;
    contact_phone?: string;
    is_active?: boolean;
    max_branches?: number | null;
}

export interface AssignBranchesRequest {
    branch_ids: string[];
}

export interface OrgAdminCreate {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
}

export interface BranchStatItem {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    created_at: string;
}

export interface OrgAdminDashboardResponse {
    organization_name: string;
    branch_count: number;
    active_branches: number;
    inactive_branches: number;
    admin_count: number;
    staff_count: number;
    branches: BranchStatItem[];
    max_branches?: number | null;
}

export interface QueueMonitorItem {
    id: string;
    branch: string;
    branch_id: string;
    branch_slug: string;
    queue_name: string;
    prefix?: string | null;
    session_name?: string | null;
    active_session_id?: string | null;
    current_token: string;
    waiting: number;
    serving: number;
    served_today: number;
    avg_wait_time: string;
    status: string;
    load_status?: "Normal" | "Heavy" | "Critical" | string;
    load_percentage: number;
    is_active: boolean;
}

export interface BranchCreateRequest {
    name: string;
    slug: string;
    address?: string | null;
    phone_number?: string | null;
    brand_color?: string | null;
    timezone?: string;
    admin_first_name?: string | null;
    admin_last_name?: string | null;
    admin_email?: string | null;
    admin_password?: string | null;
}

export interface BranchUpdateRequest {
    name?: string | null;
    address?: string | null;
    phone_number?: string | null;
    brand_color?: string | null;
}

export interface BranchStatusUpdate {
    is_active: boolean;
}

export interface BranchAdminCreateRequest {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
}

export interface BranchAdminResetPasswordRequest {
    new_password: string;
}

export interface BranchAdminItem {
    user_id: string;
    name: string;
    email: string;
    last_login: string;
    status: string;
    role: string;
}

export interface BranchAdminResponse {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    created_at: string;
    is_active: boolean;
}

export interface BranchDetailResponse extends BranchStatItem {
    address?: string | null;
    phone_number?: string | null;
    brand_color?: string | null;
    logo_url?: string | null;
    admin_count: number;
    staff_count: number;
    queue_count: number;
    session_count: number;
    admins: BranchAdminResponse[];
}

export interface SessionResponse {
    id: string;
    org_id: string;
    queue_id: string;
    session_date: string;
    title: string;
    is_active?: boolean;
    is_paused?: boolean;
    created_at: string;
    total_served: number;
    total_issued: number;
}

export interface PaginatedSessionResponse {
    items: SessionResponse[];
    total: number;
    limit: number;
    offset: number;
}

export interface SessionCreate {
    session_date: string;
    title?: string;
}

// ── Queue ────────────────────────────────────────────────────────
export interface CustomField {
    id: string;
    key: string;
    label: string;
    type: "text" | "number" | "phone" | "email" | "date" | "select" | "textarea";
    required: boolean;
    order: number;
    options?: string[];
}

export interface QueueCreate {
    name: string;
    prefix?: string;
    starting_sequence?: number;
    open_time?: string;
    close_time?: string;
    service_lines?: number;
    custom_fields?: CustomField[] | null;
    appointment_enabled?: boolean;
    slot_duration?: number;
    slot_capacity?: number;
    advance_booking_days?: number;
    min_lead_time_mins?: number;
    approval_mode?: "instant" | "requires_approval" | string;
    schedule_config?: Record<string, any> | null;
    blackout_dates?: string[] | null;
    checkin_window_before?: number;
    checkin_window_after?: number;
    auto_noshow_mins?: number;
    industry_template?: string;
}

export interface QueueResponse {
    id: string;
    org_id: string;
    name: string;
    prefix: string;
    announcement: string | null;
    starting_sequence: number;
    current_token_number: number;
    total_served: number;
    is_active: boolean;
    is_paused: boolean;
    is_deleted?: boolean;
    deleted_at?: string | null;
    service_lines: number;          // 0 = single counter, >0 = multi-lane
    open_time?: string;
    close_time?: string;
    created_at: string;
    custom_fields?: CustomField[] | null;
    appointment_enabled?: boolean;
    slot_duration?: number;
    slot_capacity?: number;
    advance_booking_days?: number;
    min_lead_time_mins?: number;
    approval_mode?: "instant" | "requires_approval";
    schedule_config?: Record<string, any> | null;
    blackout_dates?: string[] | null;
    checkin_window_before?: number;
    checkin_window_after?: number;
    auto_noshow_mins?: number;
    industry_template?: string;
    token_session_id?: string | null;
}

export interface PaginatedQueueResponse {
    items: QueueResponse[];
    total: number;
    limit: number;
    offset: number;
}



// ── Token ────────────────────────────────────────────────────────
export type TokenStatus = "waiting" | "serving" | "done" | "skipped" | "deleted";

export interface TokenDetail {
    id: string;
    org_id: string;
    queue_id: string;
    session_id: string | null;
    token_number: number;
    status: TokenStatus;
    created_at: string;
    served_at: string | null;
    completed_at: string | null;
    customer_name: string;
    customer_age: number | null;
    customer_phone: string;
    pax_count: number;
    called_via_invite?: boolean;
    entry_type?: "manual" | "qr" | "auto" | "appointment" | null;
}

// ── Public Queue Status (used by join page on mount, no auth) ────
export interface QueuePublicStatus {
    queue_id: string;
    queue_name: string;
    is_active: boolean;
    is_paused: boolean;
    session_date: string | null;
    is_past_session: boolean;
    has_session: boolean;
    within_operating_hours?: boolean;
    is_current_session?: boolean;
}

// ── Join ─────────────────────────────────────────────────────────
export interface JoinRequest {
    name: string;
    age?: number;
    phone: string;
    pax_count: number;
    send_whatsapp?: boolean;
    entry_type?: string;
    qr_token?: string;
    session_id?: string;
    custom_data?: Record<string, any> | null;
}

export interface JoinResponse {
    id: string;          // Token's UUID
    token_number: number;
    position: number;
    current_serving: number;
    queue_prefix: string;
    session_id: string;  // session the token was created in
    is_existing?: boolean; // True if this was an already-active token (duplicate phone)
    tracking_id?: string;
    removed_by?: string | null;

}

export interface TokenRestoreResponse {
    token_number: number;
    status: TokenStatus;
    queue_id: string;
    session_id: string;
    queue_prefix: string;
    customer_name?: string;
    customer_age?: number | null;
    customer_phone?: string;
    pax_count: number;
    tracking_id: string;
    created_at: string;
    served_at: string | null;
    completed_at: string | null;
    custom_data?: Record<string, any> | null;
}

export interface PublicTokenResponse {
    token_number: number;
    status: TokenStatus;
    customer_name: string;
    customer_age: number | null;
    customer_phone: string;
    pax_count: number;
    session_id: string;
}

// ── Admin Next ───────────────────────────────────────────────────
export interface NextResponse {
    serving: number;
    remaining: number;
}

export interface NoTokenResponse {
    message: string;
}

// ── WebSocket (matches backend build_queue_snapshot exactly) ──────
export interface RecentToken {
    token_number: number;
    status: TokenStatus;
    created_at: string | null;
    served_at: string | null;
    completed_at: string | null;
    customer_name: string;
    customer_age: number | null;
    customer_phone: string;
    pax_count: number;
    assigned_line?: number | null;
    called_via_invite?: boolean;
    entry_type?: "manual" | "qr" | "auto" | "appointment" | null;
    skipped_at?: string | null;
    deleted_at?: string | null;
    recalled_at?: string | null;
    custom_data?: Record<string, any> | null;
    appointment_time?: string | null;
    appointment_date?: string | null;
    appointment_booking_ref?: string | null;
}

export interface WaitingToken {
    id: string;
    token_number: number;
    status: TokenStatus;
    created_at: string | null;
    served_at: string | null;
    completed_at: string | null;
    customer_name: string;
    customer_age: number | null;
    customer_phone: string;
    pax_count: number;
    removed_by?: string | null;
    assigned_line?: number | null;
    called_via_invite?: boolean;
    entry_type?: "manual" | "qr" | "auto" | "appointment" | null;
    skipped_at?: string | null;
    deleted_at?: string | null;
    recalled_at?: string | null;
    custom_data?: Record<string, any> | null;
    appointment_time?: string | null;
    appointment_date?: string | null;
    appointment_booking_ref?: string | null;
}

export interface ServingToken {
    id: string;
    token_number: number;
    customer_name: string;
    customer_phone?: string;
    customer_age?: number | null;
    assigned_line: number | null;
    served_at: string | null;
    called_via_invite?: boolean;
    entry_type?: "manual" | "qr" | "auto" | "appointment" | null;
    shared_lines?: number[];
    completed_lines?: number[];
    appointment_time?: string | null;
    appointment_date?: string | null;
    appointment_booking_ref?: string | null;
}

export interface QueueSnapshot {
    type?: string;
    enable_shared_tokens?: boolean;
    queue_id: string;
    session_id: string;
    token_session_id?: string;
    queue_name: string;
    prefix: string;
    announcement: string | null;
    is_active: boolean;
    is_paused: boolean;
    session_date?: string | null;
    is_past_session?: boolean;
    is_current_session?: boolean;
    within_operating_hours?: boolean;
    service_lines: number;           // 0 = single counter, >0 = multi-lane
    open_time?: string;
    close_time?: string;
    current_serving: number;
    serving_details: {
        token_number: number;
        customer_name: string;
        customer_age: number | null;
        customer_phone: string;
        pax_count?: number;
        assigned_line?: number | null;
        called_via_invite?: boolean;
    } | null;
    all_serving_tokens: ServingToken[];  // all lanes currently serving
    waiting_count: number;
    done_count: number;
    skipped_count: number;
    last_called: number;
    total_issued: number;
    recent_tokens: RecentToken[];
    waiting_tokens?: WaitingToken[];
    skipped_tokens?: WaitingToken[];
    deleted_tokens?: WaitingToken[];
    waiting_tokens_truncated?: boolean;
    skipped_tokens_truncated?: boolean;
    deleted_tokens_truncated?: boolean;
    org_logo_url?: string | null;
    org_brand_color?: string | null;
    custom_fields?: CustomField[] | null;
}

export type QueueUpdate = QueueSnapshot;

// ── Health ───────────────────────────────────────────────────────
export interface HealthResponse {
    api: string;
    database: string;
    redis: string;
}

// ── Messages / Notifications ───────────────────────────────────────
export interface MessageResponse {
    id: string;
    org_id: string;
    sender_id: string;
    receiver_id: string | null;
    content: string;
    is_read: boolean;
    message_type: string;
    created_at: string;
}

export interface MessageUpdateResponse {
    message: string;
    updated_count: number;
}

// ── Errors ───────────────────────────────────────────────────────
export interface ApiErrorShape {
    detail: string;
}

export interface ApiErrorResponse {
    status: number;
    detail: string;
    retryAfter?: number;
}

// ── Staff Management ──────────────────────────────────────────────
export interface User {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    org_id: string;
    role: string;
    is_active: boolean;
    is_first_login: boolean;
    created_at: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    force_password_change: boolean;
}

export interface ChangeFirstPasswordRequest {
    new_password: string;
}

export interface StaffMember {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    org_id: string;
    role: "admin" | "staff";
    is_active: boolean;
    last_active_at?: string | null;
    created_at: string;
}

export interface StaffCreate {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
}

export interface StaffUpdate {
    email?: string;
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
    new_password?: string;
}

export interface PaginatedStaffResponse {
    items: StaffMember[];
    total: number;
    limit: number;
    offset: number;
}

export interface StaffListParams {
    search?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
    sort_order?: "asc" | "desc";
}

// ── Super Admin ──────────────────────────────────────────────────
type SortBy = "name" | "created_at" | "is_active";
type SortOrder = "asc" | "desc";

export interface SuperAdminLoginRequest {
    email: string;
    password: string;
}

export interface OrgDetail {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    created_at: string;
    max_sessions: number;
    max_queues_per_session: number;
    max_staff: number;
    admin_email?: string | null;
    admin_initial_password?: string | null;
    admin_password_changed_at?: string | null;
    logo_url?: string | null;
    parent_organization_id?: string | null;
    parent_slug?: string | null;
}

export interface OrgDetailExtended extends OrgDetail {
    total_users: number;
    total_admins: number;
}

export interface OrgUsageResponse {
    queue_entries_used: number;
    queue_entries_max: number;
    customers_served: number;
    active_queues: number;
    active_staff: number;
    messages_sent: number;
}

export interface OrgCreateRequest {
    org_name: string;
    org_slug: string;
    parent_organization_id: string;
    admin_email: string;
    admin_password: string;
    max_sessions: number;
    max_queues_per_session: number;
    max_staff?: number;
}

export interface OrgUpdateRequest {
    org_name: string;
    org_slug: string;
    is_active: boolean;
    max_sessions?: number;
    max_queues_per_session?: number;
    max_staff?: number;
    admin_email?: string;
}

export interface OrgCreateResponse {
    organization: OrgDetail;
    admin_email: string;
    message: string;
}

export interface PaginatedOrgsResponse {
    items: OrgDetail[];
    total: number;
    limit: number;
    offset: number;
}

export interface OrgAnalyticsDetail extends OrgDetail {
    queue_entries: number;
    customers_served: number;
    messages_sent: number;
    average_wait_time: string;
    peak_usage_time: string;
}

export interface OrgAnalyticsResponse {
    items: OrgAnalyticsDetail[];
}

export interface ErrorLogItem {
    id: string;
    timestamp: string;
    severity: string;
    component: string;
    message: string;
}

export interface SystemMonitoringResponse {
    api_health: string;
    database_health: string;
    redis_health: string;
    whatsapp_health: string;
    plivo_health: string;
    uptime_seconds: number;
    recent_errors: ErrorLogItem[];
}

export interface GlobalSettings {
    default_queue_limit: number;
    default_session_limit: number;
    default_whatsapp_limit: number;
    platform_name: string;
    primary_color: string;
    support_email: string;
    support_phone: string;
}

export interface OrgStats {
    total: number;
    active: number;
    inactive: number;
    total_parent_orgs: number;
}

export interface PlatformAnalytics {
    total_active_queues: number;
    total_waiting_customers: number;
    total_serving_customers: number;
    total_queue_entries_today: number;
    total_queue_entries_month: number;
    total_customers_served: number;
    total_staff_users: number;
    organization_growth: Array<{ month: string; count: number }>;
}

export interface AuditLogDetail {
    id: string;
    event_type: string;
    org_id: string | null;
    org_name: string | null;
    user_id: string | null;
    user_email: string | null;
    ip_address: string | null;
    resource_type: string | null;
    resource_id: string | null;
    details: Record<string, any> | null;
    created_at: string;
}

export interface TenantAnalyticsRow {
    branch_id: string;
    branch_name: string;
    branch_slug: string;
    parent_org_id: string | null;
    parent_org_name: string | null;
    branch_is_active: boolean;
    tokens_used: number;
    tokens_skipped_removed: number;
    avg_wait_seconds: number | null;
    avg_serve_seconds: number | null;
    peak_hour: number | null;
    active_queues: number;
    active_staff: number;
    messages_sent: number;
}

export interface TenantAnalyticsResponse {
    items: TenantAnalyticsRow[];
    total: number;
    start_date: string;
    end_date: string;
}

export interface SystemAnnouncementDetail {
    id: string;
    message: string;
    type: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PaginatedSystemAnnouncements {
    items: SystemAnnouncementDetail[];
    total: number;
    limit: number;
    offset: number;
}

export interface SystemAnnouncementCreate {
    message: string;
    type: string;
    is_active: boolean;
}

export interface SystemAnnouncementUpdate {
    message?: string;
    type?: string;
    is_active?: boolean;
}

export interface PaginatedAuditLogs {
    items: AuditLogDetail[];
    total: number;
    limit: number;
    offset: number;
}

export interface ListOrgsParams {
    search?: string;
    is_test?: boolean;
    parent_org_id?: string;
    limit?: number;
    offset?: number;
    sort_by?: SortBy;
    sort_order?: SortOrder;
}

// ── Organization Settings ───────────────────────────────────────
export interface ParentOrgSummary {
    id: string;
    name: string;
    slug: string;
    contact_email?: string | null;
    contact_phone?: string | null;
    address?: string | null;
    logo_url?: string | null;
}

export interface OrganizationSettingsResponse {
    name: string;
    slug: string;
    email: string;
    address: string | null;
    phone_number?: string;
    queue_templates: QueueTemplate[];
    auto_session_enabled: boolean;
    auto_session_time: string | null;
    timezone: string;
    parent_org?: ParentOrgSummary | null;
}

export interface OrganizationSettingsUpdate {
    name: string;
    address?: string;
    phone_number?: string;
    queue_templates?: QueueTemplate[];
    auto_session_enabled?: boolean;
    auto_session_time?: string | null;
    timezone?: string;
}

export interface QueueTemplate {
    id: string;
    name: string;
    description: string;
    defaultPrefix: string;
    startingNumber: number;
    serviceLines?: number;
    isActive?: boolean;
    openTime?: string;
    closeTime?: string;
}

export interface RequestOtpRequest {
    current_password: string;
}

export interface ChangePasswordRequest {
    otp: string;
    new_password: string;
}

export interface ResetPasswordRequest {
    new_password: string;
}

export interface SuccessResponse {
    message: string;
}

export interface TokenHistoryItem {
    id: string;
    token_number: number;
    queue_name: string;
    queue_prefix: string;
    status: string;
    customer_name: string;
    customer_phone: string;
    customer_age: number | null;
    pax_count: number;
    created_at: string;
    served_at: string | null;
    completed_at: string | null;
    called_via_invite?: boolean;
    entry_type?: "manual" | "qr" | "auto" | "appointment" | null;
    assigned_line?: number;
    served_by_staff_name?: string;
    completed_by_staff_name?: string;
    skipped_at?: string | null;
    deleted_at?: string | null;
    recalled_at?: string | null;
    removed_by?: string | null;
    custom_data?: Record<string, any> | null;
    field_schema?: Array<{ key: string; label: string; type?: string; options?: string[] }> | null;
    appointment_time?: string | null;
    appointment_date?: string | null;
    appointment_booking_ref?: string | null;
}

export interface PaginatedHistoryResponse {
    items: TokenHistoryItem[];
    total: number;
    limit: number;
    offset: number;
}
export interface GlobalQueueDetail { id: string; organization: string; queue_name: string; current_position: number; customers_waiting: number; average_wait_time: string; staff_handling: number; status: string; }
export interface GlobalQueueResponse {
    items: GlobalQueueDetail[];
    total: number;
    page: number;
    pages: number;
}

export interface GlobalUserDetail {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    role: string;
    is_active: boolean;
    org_id: string | null;
    org_name: string | null;
    org_slug: string | null;
    created_at: string;
}

export interface PaginatedGlobalUsers {
    items: GlobalUserDetail[];
    total: number;
    limit: number;
    offset: number;
}

export interface ResetPasswordResponse {
    message: string;
    temporary_password: string;
}

// ── WhatsApp Cloud API ────────────────────────────────────────────

export interface WhatsAppConfig {
    status: "connected" | "disconnected" | "error";
    is_enabled: boolean;
    payment_active: boolean;
    business_verified: boolean;
    webhook_active: boolean;
    access_token?: string;
    phone_number_id?: string;
    waba_id?: string;
    app_id?: string;
    app_secret?: string;
    business_id?: string;
    webhook_url?: string;
    webhook_verify_token?: string;
    api_version?: string;
    connected_at?: string | null;
}

export interface WhatsAppTemplate {
    id: string;
    template_name: string;
    category: string;
    language: string;
    description?: string;
    body_text: string;
    variables?: Record<string, string>;
    status: "draft" | "approved" | "pending" | "rejected";
    event_type?: string;
    created_at: string;
    updated_at: string;
}

export interface WhatsAppTemplateCreate {
    template_name: string;
    category?: string;
    language?: string;
    description?: string;
    body_text: string;
    variables?: Record<string, string>;
    event_type?: string;
    status?: string;
}

export interface WhatsAppTemplateUpdate {
    category?: string;
    language?: string;
    description?: string;
    body_text?: string;
    variables?: Record<string, string>;
    event_type?: string;
    status?: string;
}

export interface WhatsAppMessage {
    id: string;
    organization_id?: string;
    customer_phone: string;
    customer_name?: string;
    event_type?: string;
    template_name?: string;
    template_variables?: any;
    rendered_body?: string;
    status: "pending" | "sent" | "delivered" | "read" | "failed" | "skipped";
    meta_message_id?: string;
    sent_at?: string | null;
    delivered_at?: string | null;
    read_at?: string | null;
    failed_at?: string | null;
    error_code?: string | null;
    error_message?: string | null;
    created_at: string;
}

export interface PaginatedWhatsAppMessages {
    items: WhatsAppMessage[];
    total: number;
    limit: number;
    offset: number;
}

export interface WhatsAppGlobalStats {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    pending: number;
    success_rate: number;
}

export interface WhatsAppDailyChartItem {
    date: string;
    total: number;
    delivered: number;
    read: number;
    failed: number;
}

export interface WhatsAppBranchStats {
    organization_id: string;
    branch_name: string;
    slug: string;
    is_active?: boolean;
    total: number;
    delivered: number;
    read: number;
    failed: number;
    success_rate: number;
}

export interface WhatsAppOrgStats {
    id?: string;
    organization_id?: string;
    org_name?: string;
    name?: string;
    slug?: string;
    is_parent?: boolean;
    branch_count?: number;
    total: number;
    delivered: number;
    read: number;
    failed: number;
    success_rate: number;
    branches?: WhatsAppBranchStats[];
}

export interface WhatsAppOrgConfig {
    org_id?: string;
    is_enabled: boolean;
    notify_queue_joined: boolean;
    notify_position_5: boolean;
    notify_position_3: boolean;
    notify_called: boolean;
    notify_completed: boolean;
    notify_skipped: boolean;
    notify_recalled: boolean;
    notify_removed: boolean;
}

export interface WhatsAppAdminOrgConfig {
    org_id: string;
    name: string;
    slug: string;
    parent_org_name?: string | null;
    is_active: boolean;
    is_enabled: boolean;
    mode: "default" | "custom_phone" | "custom_full";
    delivery_mode?: "button_reply_only" | "always_send";
    phone_number_id?: string;
    waba_id?: string;
    access_token?: string;
    webhook_verify_token?: string;
    app_id?: string;
    app_secret?: string;
    effective_phone_number_id: string;
    effective_waba_id: string;
    has_custom_token?: boolean;
    global_phone_number_id: string;
    global_waba_id: string;
}

export interface WhatsAppEventStat {
    event_type: string;
    total: number;
    delivered: number;
    read: number;
    failed: number;
    success_rate: number;
}

export interface WhatsAppQueueStat {
    queue_id: string | null;
    queue_name: string;
    total: number;
    delivered: number;
    read: number;
    failed: number;
    success_rate: number;
}

export interface WhatsAppSessionStat {
    session_id: string | null;
    session_date: string;
    total: number;
    delivered: number;
    read: number;
    failed: number;
    success_rate: number;
}

export interface TrackingResponse {
    token_id: string;
    tracking_id: string;
    token_number: number;
    token_prefix: string;
    status: TokenStatus;
    position: number;
    queue_name: string;
    org_name: string;
    queue_id: string;
    session_id: string;
    queue_is_active: boolean;
    queue_is_paused: boolean;
    is_past_session?: boolean;
    session_date?: string | null;
    open_time?: string | null;
    close_time?: string | null;
    created_at: string;
    served_at?: string | null;
    completed_at?: string | null;
    removed_by?: string | null;
}

// ── Super Admin Branch User Management ──────────────────────────────────────────────────────────

export interface OrgUserCreate {
    email: string;
    first_name: string;
    last_name: string;
    role: "admin" | "staff";
    password: string;
}

export interface OrgUserUpdate {
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: "admin" | "staff";
    is_active?: boolean;
    new_password?: string;
}

export interface PaginatedOrgUsersResponse {
    items: User[];
    total: number;
    limit: number;
    offset: number;
}

// ── Call Logs & Analytics Types ──────────────────────────────────────────────────

export interface CallLogItem {
    id: string;
    organization_id: string;
    queue_id?: string | null;
    session_id?: string | null;
    token_id?: string | null;
    customer_name?: string | null;
    customer_phone: string;
    duration_seconds: number;
    billable_minutes: number;
    call_status?: string;
    ring_duration_seconds?: number;
    cost_amount?: number;
    called_by_id?: string | null;
    called_by_name?: string | null;
    queue_name?: string | null;
    appointment_id?: string | null;
    booking_reference?: string | null;
    created_at: string;
}

export interface StaffCallStat {
    staff_id?: string | null;
    staff_name: string;
    call_count: number;
    total_duration_seconds: number;
    total_billable_minutes: number;
    total_cost_amount?: number;
}

export interface CallLogsOverviewResponse {
    total_calls: number;
    total_duration_seconds: number;
    total_billable_minutes: number;
    avg_duration_seconds: number;
    connection_rate?: number;
    total_amount?: number;
    rate_per_minute?: number;
    currency?: string;
    staff_stats: StaffCallStat[];
}

export interface PaginatedCallLogsResponse {
    items: CallLogItem[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

export interface BranchCallingConfig {
    id: string;
    name: string;
    slug: string;
    call_rate_per_minute?: number | null;
    effective_rate: number;
    calling_currency: string;
    total_calls: number;
    total_duration_seconds: number;
    total_billable_minutes: number;
    total_amount: number;
}

export interface CallingConfigRead {
    global_rate_per_minute: number;
    currency: string;
    total_calls: number;
    total_duration_seconds: number;
    total_billable_minutes: number;
    total_amount: number;
    branches: BranchCallingConfig[];
}

export interface CallingConfigUpdate {
    global_rate_per_minute: number;
    currency?: string;
    branch_overrides?: Record<string, number | null>;
}

// ── Appointments & Early Bookings ────────────────────────────────
export type AppointmentStatus =
    | "pending_approval"
    | "confirmed"
    | "checked_in"
    | "serving"
    | "completed"
    | "cancelled"
    | "no_show";

export interface TimeSlot {
    start_time: string; // HH:MM
    end_time: string;   // HH:MM
    capacity: number;
    booked_count: number;
    available: boolean;
    is_next_day?: boolean;
}

export interface AvailableSlotsResponse {
    queue_id: string;
    date: string;
    slot_duration: number;
    slots: TimeSlot[];
}

export interface PublicQueueBookingInfo {
    queue_id: string;
    queue_name: string;
    prefix: string;
    org_id: string;
    org_name: string;
    org_slug: string;
    org_logo_url?: string | null;
    address?: string | null;
    phone_number?: string | null;
    timezone: string;
    today_date: string;
    open_time?: string | null;
    close_time?: string | null;
    slot_duration: number;
    slot_capacity: number;
    advance_booking_days: number;
    appointment_enabled: boolean;
    industry_template?: string;
    custom_fields?: CustomField[] | null;
}

export interface AppointmentCreateRequest {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    appointment_date: string;
    start_time: string;
    pax_count?: number;
    custom_data?: Record<string, any> | null;
    security_pin?: string;
}

export interface StaffAppointmentCreateRequest {
    queue_id: string;
    customer_name: string;
    customer_phone?: string;
    customer_email?: string;
    appointment_date: string;
    start_time: string;
    end_time?: string;
    pax_count?: number;
    custom_data?: Record<string, any> | null;
    notes?: string;
    status?: AppointmentStatus;
}

export interface AppointmentUpdateRequest {
    appointment_date?: string;
    start_time?: string;
    status?: AppointmentStatus;
    notes?: string;
    custom_data?: Record<string, any> | null;
}

export interface AppointmentResponse {
    id: string;
    org_id: string;
    queue_id: string;
    queue_name?: string;
    session_id?: string | null;
    token_id?: string | null;
    token_number?: number | null;
    token_prefix?: string | null;
    booking_reference: string;
    security_pin?: string | null;
    customer_name: string;
    customer_phone: string;
    customer_email?: string | null;
    pax_count: number;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: AppointmentStatus;
    custom_data?: Record<string, any> | null;
    field_schema?: any[] | null;
    notes?: string | null;
    booked_by: string;
    checked_in_at?: string | null;
    checked_in_by?: string | null;
    is_next_day?: boolean;
    total_call_duration_seconds?: number;
    call_count?: number;
    last_call_status?: string | null;
    last_called_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface AppointmentPublicPass {
    booking_reference: string;
    org_id: string;
    queue_id: string;
    queue_name: string;
    customer_name: string;
    customer_phone_masked: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: AppointmentStatus;
    pax_count: number;
    can_check_in: boolean;
    check_in_window_message?: string | null;
    is_next_day?: boolean;
    token_id?: string | null;
    token_number?: number | null;
    token_prefix?: string | null;
    tracking_id?: string | null;
    org_name?: string | null;
    org_slug?: string | null;
    parent_org_name?: string | null;
    branch_address?: string | null;
    branch_phone?: string | null;
    notes?: string | null;
}

export interface BranchDirectoryQueue {
    id: string;
    name: string;
    prefix: string;
    branch_id?: string;
    branch_name?: string | null;
    appointment_enabled: boolean;
    slot_duration: number;
    advance_booking_days?: number;
    industry_template: string;
    open_time?: string | null;
    close_time?: string | null;
    custom_fields?: CustomField[] | null;
}

export interface BranchDirectoryResponse {
    org_name: string;
    org_slug: string;
    parent_org_name?: string | null;
    branch_name?: string | null;
    address?: string | null;
    phone_number?: string | null;
    timezone: string;
    today_date?: string;
    queues: BranchDirectoryQueue[];
}


