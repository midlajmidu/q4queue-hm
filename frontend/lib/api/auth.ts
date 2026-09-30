/**
 * lib/api/auth.ts
 * Domain API: auth
 */

import { request } from "./client";
import type {
    ChangeFirstPasswordRequest,
    ChangePasswordRequest,
    LoginRequest,
    RequestOtpRequest,
    SuccessResponse,
    TokenResponse,
    TrialSignupRequest,
    TrialSignupResponse,
    User,
} from "@/types/api";

export const authApi = {
    login(data: LoginRequest): Promise<TokenResponse> {
        return request<TokenResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    requestTrialSignupOtp(data: { email: string }): Promise<{ message: string; expires_in: number }> {
        return request<{ message: string; expires_in: number }>("/auth/trial-signup/request-otp", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    startTrial(data: TrialSignupRequest & { otp: string }): Promise<TrialSignupResponse> {
        return request<TrialSignupResponse>("/auth/trial-signup", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    changeFirstPassword(data: ChangeFirstPasswordRequest): Promise<TokenResponse> {
        return request<TokenResponse>("/auth/change-first-password", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    requestForgotPasswordOtp(data: { email: string; organization_slug?: string }): Promise<{ message: string }> {
        return request<{ message: string }>("/auth/forgot-password-otp", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    resetPasswordWithOtp(data: { email: string; otp: string; new_password: string; organization_slug?: string }): Promise<{ message: string }> {
        return request<{ message: string }>("/auth/reset-password-with-otp", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },


    // ── TV Pairing ────────────────────────────────────────────────,

    getMyProfile(): Promise<User> {
        return request<User>("/users/me");
    },

    sendHeartbeat(): Promise<{ status: string }> {
        return request<{ status: string }>("/users/me/heartbeat", {
            method: "POST"
        });
    },

    updateMyProfile(data: { first_name?: string, last_name?: string }): Promise<User> {
        return request<User>("/users/me", {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },

    requestPasswordChangeOtp(data: RequestOtpRequest): Promise<SuccessResponse> {
        return request<SuccessResponse>("/organization/request-password-change-otp", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
        return request("/organization/change-password", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },
};
