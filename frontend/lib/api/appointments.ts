/**
 * lib/api/appointments.ts
 * Domain API: appointments
 */

import { request } from "./client";
import type {
    AppointmentCreateRequest,
    AppointmentPublicPass,
    AppointmentResponse,
    AppointmentUpdateRequest,
    AvailableSlotsResponse,
    PublicQueueBookingInfo,
    StaffAppointmentCreateRequest,
} from "@/types/api";

export const appointmentApi = {
    getAppointments: (params?: {
        queue_id?: string;
        date?: string;
        start_date?: string;
        end_date?: string;
        status?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }) => {
        const q = new URLSearchParams();
        if (params?.queue_id) q.set("queue_id", params.queue_id);
        if (params?.date) q.set("date", params.date);
        if (params?.start_date) q.set("start_date", params.start_date);
        if (params?.end_date) q.set("end_date", params.end_date);
        if (params?.status) q.set("status", params.status);
        if (params?.search) q.set("search", params.search);
        if (params?.limit) q.set("limit", String(params.limit));
        if (params?.offset) q.set("offset", String(params.offset));
        const qs = q.toString();
        return request<AppointmentResponse[]>(`/appointments${qs ? `?${qs}` : ""}`);
    },

    createStaffAppointment: (data: StaffAppointmentCreateRequest) => {
        return request<AppointmentResponse>("/appointments", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    getAppointmentDetail: (appointmentId: string) => {
        return request<AppointmentResponse>(`/appointments/${appointmentId}`);
    },

    updateAppointment: (appointmentId: string, data: AppointmentUpdateRequest) => {
        return request<AppointmentResponse>(`/appointments/${appointmentId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },

    approveAppointment: (appointmentId: string) => {
        return request<AppointmentResponse>(`/appointments/${appointmentId}/approve`, {
            method: "POST",
        });
    },

    rejectAppointment: (appointmentId: string) => {
        return request<AppointmentResponse>(`/appointments/${appointmentId}/reject`, {
            method: "POST",
        });
    },

    deleteAppointment: (appointmentId: string) => {
        return request<{ message: string }>(`/appointments/${appointmentId}`, {
            method: "DELETE",
        });
    },

    staffCheckInAppointment: (appointmentId: string, sessionId?: string) => {
        const query = sessionId ? `?session_id=${sessionId}` : "";
        return request<{ message: string; token_id: string; token_number: number; prefix: string; status: string }>(
            `/appointments/${appointmentId}/check-in${query}`,
            { method: "POST" }
        );
    },

    // ── Public Appointments ───────────────────────────────────────,

    getPublicQueueBookingInfo: (queueId: string) => {
        return request<PublicQueueBookingInfo>(`/public/queues/${queueId}/info`);
    },

    getAvailableSlots: (queueId: string, dateStr: string) => {
        return request<AvailableSlotsResponse>(`/public/queues/${queueId}/available-slots?date=${dateStr}`);
    },

    createPublicAppointment: (queueId: string, data: AppointmentCreateRequest) => {
        return request<AppointmentResponse>(`/public/queues/${queueId}/appointments`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    getPublicAppointmentPass: (bookingRef: string) => {
        return request<AppointmentPublicPass>(`/public/appointments/${bookingRef}`);
    },

    publicCheckInAppointment: (bookingRef: string) => {
        return request<{ message: string; token_id: string; token_number: number; prefix: string; tracking_id: string }>(
            `/public/appointments/${bookingRef}/check-in`,
            { method: "POST" }
        );
    },

    publicCancelAppointment: (bookingRef: string, pin?: string) => {
        const q = pin ? `?pin=${encodeURIComponent(pin)}` : "";
        return request<{ message: string }>(`/public/appointments/${bookingRef}/cancel${q}`, {
            method: "POST",
        });
    },
};
