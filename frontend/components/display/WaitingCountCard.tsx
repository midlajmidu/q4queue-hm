"use client";
import React from "react";
import { Users } from "lucide-react";
import type { DisplayTheme } from "./displayTheme";
import { cardBg, cardBorder, cardShadow, iconBg, iconColor, labelText, gradientText, mutedText } from "./displayTheme";

export function WaitingCountCard({ count, theme = "light" }: { count: number; theme?: DisplayTheme }) {
    return (
        <div className={`${cardBg(theme)} border ${cardBorder(theme)} ${cardShadow(theme)} rounded-2xl px-6 py-6 flex flex-col items-center justify-center shrink-0`}>
            <div className="flex items-center gap-3 w-full mb-4">
                <div className={`w-9 h-9 rounded-lg border ${iconBg(theme)} flex items-center justify-center`}>
                    <Users className={`w-4 h-4 ${iconColor(theme)}`} />
                </div>
                <h3 className={`text-lg lg:text-xl font-bold tracking-[0.15em] ${labelText(theme)} uppercase`}>
                    Waiting
                </h3>
            </div>

            <div key={count} className={`text-8xl lg:text-9xl font-black ${gradientText(theme)} tabular-nums leading-none tracking-tight my-2`}>
                {count}
            </div>

            <p className={`text-xs font-bold tracking-[0.2em] uppercase ${mutedText(theme)} mt-2`}>Customers</p>
        </div>
    );
}
