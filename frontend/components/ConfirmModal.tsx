"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface Props {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: "danger" | "primary" | "warning" | "whatsapp";
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    requireInput?: boolean;
    requiredText?: string;
    autoFocusConfirm?: boolean;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel = "Confirm",
    confirmVariant = "danger",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    isLoading = false,
    requireInput = false,
    requiredText = "",
    autoFocusConfirm = false,
}: Props) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const [inputValue, setInputValue] = useState("");

    // Auto-focus cancel button or input when opened
    useEffect(() => {
        if (isOpen) {
            setInputValue("");
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => {
                if (requireInput) {
                    const input = dialogRef.current?.querySelector("input");
                    input?.focus();
                } else if (autoFocusConfirm) {
                    confirmRef.current?.focus();
                } else {
                    cancelRef.current?.focus();
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen, requireInput]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onCancel();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onCancel]);

    // Focus trap: Tab cycles only within modal
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key !== "Tab" || !dialogRef.current) return;

        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }, []);

    if (!isOpen) return null;

    const btnColor = confirmVariant === "danger"
        ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
        : confirmVariant === "warning"
            ? "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500"
            : confirmVariant === "whatsapp"
                ? "bg-[#25D366] hover:bg-[#20bd5a] active:bg-[#1caa51] text-white shadow-[0_2px_12px_rgba(37,211,102,0.35)] hover:shadow-[0_4px_16px_rgba(37,211,102,0.45)] focus-visible:ring-[#25D366]"
                : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500";

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-message"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

            {/* Panel */}
            <div
                ref={dialogRef}
                onKeyDown={handleKeyDown}
                className="relative bg-white dark:bg-slate-900 border border-transparent dark:border-white/10 rounded-[20px] shadow-2xl max-w-sm sm:max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200"
            >
                <h3 id="modal-title" className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">{title}</h3>
                <p id="modal-message" className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{message}</p>
                
                {requireInput && (
                    <div className="mb-6">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Type <span className="font-bold text-slate-900 dark:text-white select-all bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{requiredText}</span> to confirm.
                        </label>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm transition-all"
                            placeholder={requiredText}
                        />
                    </div>
                )}

                <div className="flex gap-3 justify-end items-center">
                    <button
                        ref={cancelRef}
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-white/10 rounded-xl transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 whitespace-nowrap shrink-0"
                        aria-label={cancelLabel}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        onClick={onConfirm}
                        disabled={isLoading || (requireInput && inputValue !== requiredText)}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0 ${btnColor}`}
                        aria-label={confirmLabel}
                    >
                        {confirmVariant === "whatsapp" && !isLoading && (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                            </svg>
                        )}
                        <span>{isLoading ? "Processing..." : confirmLabel}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
