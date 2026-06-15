"use client";

import { useEffect, ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";
import { initGlobalErrorHandlers } from "@/lib/logger";

import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import { AlertProvider } from "@/context/AlertContext";

export default function ClientProviders({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isDashboard = pathname?.includes("/dashboard");
    const forcedTheme = isDashboard ? undefined : "light";

    useEffect(() => {
        initGlobalErrorHandlers();
    }, []);

    return (
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme={forcedTheme}>
            <AlertProvider>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </AlertProvider>
        </ThemeProvider>
    );
}
