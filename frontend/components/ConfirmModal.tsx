"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface Props {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: "danger" | "primary" | "warning";
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
            : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500";

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
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
                className="relative bg-white dark:bg-slate-900 border border-transparent dark:border-white/10 rounded-[20px] shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200"
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

                <div className="flex gap-3 justify-end">
                    <button
                        ref={cancelRef}
                        onClick={onCancel}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-white/10 rounded-xl transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        aria-label={cancelLabel}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        onClick={onConfirm}
                        disabled={isLoading || (requireInput && inputValue !== requiredText)}
                        className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${btnColor}`}
                        aria-label={confirmLabel}
                    >
                        {isLoading ? "Processing..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
