/**
 * lib/api/subscriptions.ts
 * Domain API: subscriptions
 */

import { request } from "./client";
import type {
    AdminCustomerCreate,
    AdminSalesRequestPage,
    AdminSubscriptionItem,
    AvailableBranchItem,
    ManagedCustomerDetail,
    ManagedCustomerLimits,
    ManagedCustomerPage,
    ManagedCustomerUpdate,
    ManagedParentAdminCreate,
    PermanentCustomerDelete,
    SalesRecipientItem,
    SalesRequestItem,
    SubscriptionAdminUpdate,
    SubscriptionSummary,
} from "@/types/api";

export const subscriptionApi = {
    getCurrentSubscription(): Promise<SubscriptionSummary> {
        return request<SubscriptionSummary>("/subscriptions/current", { cache: "no-store" });
    },

    submitContactSales(data: { contact_phone?: string; message?: string }): Promise<SalesRequestItem> {
        return request<SalesRequestItem>("/subscriptions/contact-sales", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    submitExpiredTrialContactSales(data: { email: string; organization_slug?: string; password: string; contact_phone?: string; message?: string }): Promise<{ message: string }> {
        return request<{ message: string }>("/subscriptions/contact-sales/expired", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    listSalesRequests(params?: { status?: string; search?: string; skip?: number; limit?: number }): Promise<AdminSalesRequestPage> {
        const query = new URLSearchParams();
        if (params?.status && params.status !== "all") query.set("status", params.status);
        if (params?.search) query.set("search", params.search);
        if (params?.skip !== undefined) query.set("skip", String(params.skip));
        if (params?.limit !== undefined) query.set("limit", String(params.limit));
        return request<AdminSalesRequestPage>(`/subscriptions/admin/sales-requests${query.size ? `?${query}` : ""}`, { cache: "no-store" });
    },

    listSalesRecipients(): Promise<SalesRecipientItem[]> {
        return request<SalesRecipientItem[]>("/subscriptions/admin/sales-recipients", { cache: "no-store" });
    },

    addSalesRecipient(data: { email: string; name?: string }): Promise<SalesRecipientItem> {
        return request<SalesRecipientItem>("/subscriptions/admin/sales-recipients", {
            method: "POST", body: JSON.stringify(data),
        });
    },

    deleteSalesRecipient(recipientId: string): Promise<void> {
        return request<void>(`/subscriptions/admin/sales-recipients/${recipientId}`, { method: "DELETE" });
    },

    retrySalesNotification(requestId: string): Promise<SalesRequestItem> {
        return request<SalesRequestItem>(`/subscriptions/admin/sales-requests/${requestId}/retry-notification`, {
            method: "POST",
        });
    },

    listSubscriptions(): Promise<AdminSubscriptionItem[]> {
        return request<AdminSubscriptionItem[]>("/subscriptions/admin", { cache: "no-store" });
    },

    listManagedCustomers(params?: { search?: string; commercial_status?: string; skip?: number; limit?: number }): Promise<ManagedCustomerPage> {
        const query = new URLSearchParams();
        if (params?.search) query.set("search", params.search);
        if (params?.commercial_status && params.commercial_status !== "all") query.set("commercial_status", params.commercial_status);
        if (params?.skip !== undefined) query.set("skip", String(params.skip));
        if (params?.limit !== undefined) query.set("limit", String(params.limit));
        const suffix = query.toString() ? `?${query.toString()}` : "";
        return request<ManagedCustomerPage>(`/subscriptions/admin/customers${suffix}`, { cache: "no-store" });
    },

    createManagedCustomer(data: AdminCustomerCreate): Promise<ManagedCustomerDetail> {
        return request<ManagedCustomerDetail>("/subscriptions/admin/customers", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    getManagedCustomer(parentId: string): Promise<ManagedCustomerDetail> {
        return request<ManagedCustomerDetail>(`/subscriptions/admin/customers/${parentId}`, { cache: "no-store" });
    },

    updateManagedCustomer(parentId: string, data: ManagedCustomerUpdate): Promise<ManagedCustomerDetail> {
        return request<ManagedCustomerDetail>(`/subscriptions/admin/customers/${parentId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },

    listAvailableBranches(parentId: string): Promise<AvailableBranchItem[]> {
        return request<AvailableBranchItem[]>(`/subscriptions/admin/customers/${parentId}/available-branches`, { cache: "no-store" });
    },

    assignManagedBranches(parentId: string, branchIds: string[]): Promise<ManagedCustomerDetail> {
        return request<ManagedCustomerDetail>(`/subscriptions/admin/customers/${parentId}/assign-branches`, {
            method: "POST",
            body: JSON.stringify({ branch_ids: branchIds }),
        });
    },

    createManagedParentAdmin(parentId: string, data: ManagedParentAdminCreate): Promise<ManagedCustomerDetail> {
        return request<ManagedCustomerDetail>(`/subscriptions/admin/customers/${parentId}/parent-admins`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    permanentlyDeleteManagedCustomer(parentId: string, data: PermanentCustomerDelete): Promise<{ message: string; parent_organization_id: string; files_removed: number; file_cleanup_failures: number }> {
        return request(`/subscriptions/admin/customers/${parentId}/permanent`, {
            method: "DELETE",
            body: JSON.stringify(data),
        });
    },

    updateManagedSubscription(parentId: string, data: SubscriptionAdminUpdate): Promise<ManagedCustomerDetail> {
        return request<ManagedCustomerDetail>(`/subscriptions/admin/customers/${parentId}/subscription`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },

    reviewSalesRequest(parentId: string, requestId: string, data: { action: "approve" | "contacted" | "reject"; note: string }): Promise<ManagedCustomerDetail> {
        return request<ManagedCustomerDetail>(`/subscriptions/admin/customers/${parentId}/sales-requests/${requestId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },

    updateManagedLimits(parentId: string, limits: ManagedCustomerLimits, reason: string): Promise<ManagedCustomerDetail> {
        return request<ManagedCustomerDetail>(`/subscriptions/admin/customers/${parentId}/limits`, {
            method: "PUT",
            body: JSON.stringify({ limits, reason }),
        });
    },

    getSubscriptionSummary(): Promise<SubscriptionSummary> {
        return request<SubscriptionSummary>("/subscriptions/current");
    },

    // ── Public Tracking ───────────────────────────────────────────,
};
