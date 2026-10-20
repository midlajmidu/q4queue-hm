"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { OrganizationSettingsResponse } from "@/types/api";

interface BranchContextType {
    settings: OrganizationSettingsResponse | null;
    hasAppointmentFeature: boolean;
    is3DViewEnabled: boolean;
    branchType: "standard" | "dine";
    timezone: string;
    loading: boolean;
    refreshSettings: () => Promise<void>;
}

export const BranchContext = createContext<BranchContextType>({
    settings: null,
    hasAppointmentFeature: false,
    is3DViewEnabled: true,
    branchType: "standard",
    timezone: "Asia/Kolkata",
    loading: true,
    refreshSettings: async () => {},
});

export function BranchProvider({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const orgSlug = (params?.orgSlug as string) || "";

    const [settings, setSettings] = useState<OrganizationSettingsResponse | null>(() => {
        if (typeof window !== "undefined") {
            try {
                const targetSlug = orgSlug || (() => {
                    const userStr = localStorage.getItem("user");
                    return userStr ? JSON.parse(userStr)?.org_slug : "";
                })();
                if (targetSlug) {
                    const cached = sessionStorage.getItem(`org_settings_${targetSlug}`);
                    if (cached) return JSON.parse(cached) as OrganizationSettingsResponse;
                }
            } catch {}
        }
        return null;
    });

    const [cachedBranchType, setCachedBranchType] = useState<"standard" | "dine" | null>(() => {
        if (typeof window !== "undefined") {
            try {
                const targetSlug = orgSlug || (() => {
                    const userStr = localStorage.getItem("user");
                    return userStr ? JSON.parse(userStr)?.org_slug : "";
                })();
                if (targetSlug) {
                    const cached = sessionStorage.getItem(`org_branch_type_${targetSlug}`);
                    if (cached === "dine" || cached === "standard") return cached;
                }
            } catch {}
        }
        return null;
    });

    const [loading, setLoading] = useState(() => !(settings || cachedBranchType));

    const refreshSettings = useCallback(async () => {
        try {
            const s = await api.getOrganizationSettings();
            setSettings(s);
            if (typeof window !== "undefined" && s) {
                try {
                    const targetSlug = orgSlug || (() => {
                        const userStr = localStorage.getItem("user");
                        return userStr ? JSON.parse(userStr)?.org_slug : "";
                    })();
                    if (targetSlug) {
                        sessionStorage.setItem(`org_settings_${targetSlug}`, JSON.stringify(s));
                        if (s.branch_type) {
                            sessionStorage.setItem(`org_branch_type_${targetSlug}`, s.branch_type);
                            setCachedBranchType(s.branch_type as "standard" | "dine");
                        }
                    }
                } catch {}
            }
        } catch {
            // Keep existing fallback
        } finally {
            setLoading(false);
        }
    }, [orgSlug]);

    useEffect(() => {
        refreshSettings();
    }, [refreshSettings]);

    const hasAppointmentFeature = Boolean(settings?.appointment_feature_enabled);
    const is3DViewEnabled = settings?.dine_3d_view_enabled ?? true;
    const branchType = (settings?.branch_type as "standard" | "dine") || cachedBranchType || "standard";
    const timezone = settings?.timezone || "Asia/Kolkata";

    return (
        <BranchContext.Provider
            value={{
                settings,
                hasAppointmentFeature,
                is3DViewEnabled,
                branchType,
                timezone,
                loading,
                refreshSettings,
            }}
        >
            {children}
        </BranchContext.Provider>
    );
}

export function useBranch() {
    return useContext(BranchContext);
}
