/**
 * hooks/useAuth.ts
 * Global authentication hook.
 *
 * Provides:
 *   - isAuthenticated: boolean
 *   - user: decoded JWT payload (display only)
 *   - login(credentials): Promise<void>
 *   - logout(): void
 *   - isLoading: boolean during login
 *   - error: string | null
 */

"use client";

import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
