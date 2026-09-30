"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { OrganizationSettingsResponse } from "@/types/api";

interface BranchContextType {
    settings: OrganizationSettingsResponse | null;
    hasAppointmentFeature: boolean;
    branchType: "standard" | "dine";
    timezone: string;
    loading: boolean;
    refreshSettings: () => Promise<void>;
}

export const BranchContext = createContext<BranchContextType>({
    settings: null,
    hasAppointmentFeature: false,
    branchType: "standard",
    timezone: "Asia/Kolkata",
    loading: true,
    refreshSettings: async () => {},
});

export function BranchProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<OrganizationSettingsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshSettings = useCallback(async () => {
        try {
            const s = await api.getOrganizationSettings();
            setSettings(s);
        } catch {
            // Keep existing fallback
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshSettings();
    }, [refreshSettings]);

    const hasAppointmentFeature = Boolean(settings?.appointment_feature_enabled);
    const branchType = (settings?.branch_type as "standard" | "dine") || "standard";
    const timezone = settings?.timezone || "Asia/Kolkata";

    return (
        <BranchContext.Provider
            value={{
                settings,
                hasAppointmentFeature,
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
