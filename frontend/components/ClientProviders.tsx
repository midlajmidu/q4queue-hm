"use client";

import { useEffect, ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";
import { initGlobalErrorHandlers } from "@/lib/logger";

import { AlertProvider } from "@/context/AlertContext";

export default function ClientProviders({ children }: { children: ReactNode }) {
    useEffect(() => {
        initGlobalErrorHandlers();
    }, []);

    return (
        <AlertProvider>
            <ToastProvider>
                {children}
            </ToastProvider>
        </AlertProvider>
    );
}
