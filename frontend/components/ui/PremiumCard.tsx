import React from "react";
import { cn } from "@/lib/utils";

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    hoverEffect?: boolean;
    gradientBorder?: boolean;
}

export function PremiumCard({ 
    children, 
    className, 
    hoverEffect = false,
    gradientBorder = false,
    ...props 
}: PremiumCardProps) {
    return (
        <div 
            className={cn(
                "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden",
                hoverEffect && "hover:shadow-md transition-shadow duration-200",
                gradientBorder && "border-0 p-[1px] bg-gradient-to-b from-slate-200 to-slate-100",
                className
            )} 
            {...props}
        >
            {gradientBorder ? (
                <div className="bg-white rounded-[11px] h-full">
                    {children}
                </div>
            ) : (
                children
            )}
        </div>
    );
}
