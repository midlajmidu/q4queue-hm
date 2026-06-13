"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StandardPageHeader } from "./StandardPageHeader";

interface Breadcrumb {
    label: string;
    href?: string;
}

interface PageWrapperProps {
    title: string;
    breadcrumbs?: Breadcrumb[];
    subtitle?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}

export function PageWrapper({ title, subtitle, breadcrumbs, action, children }: PageWrapperProps) {
    return (
        <div className="flex flex-col gap-7 w-full h-full max-w-7xl mx-auto">
            {/* Header Area */}
            {(title || breadcrumbs || action) && (
                <StandardPageHeader
                    title={title}
                    subtitle={subtitle}
                    breadcrumbs={breadcrumbs || []}
                    action={action}
                />
            )}

            {/* Main Content Area */}
            <div className="flex-1 w-full relative">
                {children}
            </div>
        </div>
    );
}
