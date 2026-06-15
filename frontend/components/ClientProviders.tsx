"use client";

import { useEffect, ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";
import { initGlobalErrorHandlers } from "@/lib/logger";

import { ThemeProvider } from "next-themes";
import { AlertProvider } from "@/context/AlertContext";

export default function ClientProviders({ children }: { children: ReactNode }) {
    useEffect(() => {
        initGlobalErrorHandlers();
    }, []);

    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AlertProvider>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </AlertProvider>
        </ThemeProvider>
    );
}
