/**
 * types/api.ts
 * All API request/response types — strictly typed, no `any`.
 * These mirror the backend Pydantic schemas and WS payloads exactly.
 */

// ── Auth ─────────────────────────────────────────────────────────
export interface LoginRequest {
    email: string;
    password: string;
    organization_slug: string;
}

// ── Analytics ────────────────────────────────────────────────────
export interface AnalyticsOverview {
    status_counts: {
        total: number;
        served: number;
        cancelled: number;
        waiting: number;
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
        number: number;
        status: string;
        queue: string;
        customer_name?: string;
        time: string;
    }[];
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
}

// ── Queue ────────────────────────────────────────────────────────
// ── Session ──────────────────────────────────────────────────────
export interface SessionResponse {
    id: string;
    org_id: string;
    session_date: string;
    title: string;
    created_at: string;
    queue_count: number;
    queue_names: string[];
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
export interface QueueCreate {
    name: string;
    prefix?: string;
    starting_sequence?: number;
    open_time?: string;
    close_time?: string;
}

export interface QueueResponse {
    id: string;
    org_id: string;
    session_id: string | null;
    token_session_id: string;
    name: string;
    prefix: string;
    announcement: string | null;
    starting_sequence: number;
    current_token_number: number;
    is_active: boolean;
    is_paused: boolean;
    open_time?: string;
    close_time?: string;
    created_at: string;
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
    session_id: string;
    token_number: number;
    status: TokenStatus;
    created_at: string;
    served_at: string | null;
    completed_at: string | null;
    customer_name: string;
    customer_age: number | null;
    customer_phone: string;
    companion_names: string[];
}

// ── Join ─────────────────────────────────────────────────────────
export interface JoinRequest {
    name: string;
    age?: number;
    phone: string;
    companion_names: string[];
    send_whatsapp?: boolean;
}

export interface JoinResponse {
    id: string;          // Token's UUID
    token_number: number;
    position: number;
    current_serving: number;
    queue_prefix: string;
    session_id: string;  // session the token was created in
    is_existing?: boolean; // True if this was an already-active token (duplicate phone)
}

export interface TokenRestoreResponse {
    id: string;
    token_number: number;
    status: TokenStatus;
    queue_id: string;
    session_id: string;
    queue_prefix: string;
    customer_name: string;
    customer_age: number | null;
    customer_phone: string;
    companion_names: string[];
    created_at: string;
    served_at: string | null;
    completed_at: string | null;
}

export interface PublicTokenResponse {
    token_number: number;
    status: TokenStatus;
    customer_name: string;
    customer_age: number | null;
    customer_phone: string;
    companion_names: string[];
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
    companion_names: string[];
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
    companion_names: string[];
}

export interface QueueSnapshot {
    type?: string;                 // "queue_snapshot" on initial, "queue_update" on update
    queue_id: string;
    session_id: string;            // rotates on every queue reset
    queue_name: string;
    prefix: string;
    announcement: string | null;
    is_active: boolean;
    is_paused: boolean;
    open_time?: string;
    close_time?: string;
    current_serving: number;
    serving_details: {
        token_number: number;
        customer_name: string;
        customer_age: number | null;
        customer_phone: string;
        companion_names?: string[];
    } | null;
    waiting_count: number;
    done_count: number;
    skipped_count: number;
    last_called: number;
    total_issued: number;
    recent_tokens: RecentToken[];
    waiting_tokens?: WaitingToken[];
    skipped_tokens?: WaitingToken[];
    org_logo_url?: string | null;
    org_brand_color?: string | null;
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
    limit?: number;
    offset?: number;
    sort_by?: SortBy;
    sort_order?: SortOrder;
}

// ── Organization Settings ───────────────────────────────────────
export interface OrganizationSettingsResponse {
    name: string;
    slug: string;
    email: string;
    address: string | null;
    phone_number: string | null;
    logo_url?: string | null;
    brand_color?: string | null;
}

export interface OrganizationSettingsUpdate {
    name: string;
    address: string | null;
    phone_number: string | null;
    brand_color?: string | null;
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
    companion_names: string[];
    created_at: string;
    served_at: string | null;
    completed_at: string | null;
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
    status: "pending" | "sent" | "delivered" | "read" | "failed";
    meta_message_id?: string;
    sent_at?: string | null;
    delivered_at?: string | null;
    read_at?: string | null;
    failed_at?: string | null;
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

export interface WhatsAppOrgStats {
    organization_id?: string;
    org_name?: string;
    total: number;
    delivered: number;
    read: number;
    failed: number;
    success_rate: number;
}

export interface WhatsAppOrgConfig {
    org_id?: string;
    is_enabled: boolean;
    notify_queue_joined: boolean;
    notify_position_5: boolean;
    notify_position_3: boolean;
    notify_called: boolean;
    notify_completed: boolean;
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
    status: string;
    position: number;
    queue_name: string;
    org_name: string;
    queue_is_active: boolean;
    queue_is_paused: boolean;
    open_time?: string | null;
    close_time?: string | null;
    created_at: string;
    served_at?: string | null;
    completed_at?: string | null;
}
