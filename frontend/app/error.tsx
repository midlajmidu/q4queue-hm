"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        logger.error("Page crash", { message: error.message, digest: error.digest });
    }, [error]);

    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4" role="alert">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6" aria-hidden="true">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
                <p className="text-gray-500 mb-4 text-sm leading-relaxed">
                    An unexpected error occurred. This has been logged for review. Please try again.
                </p>
                {error?.message && (
                    <div className="mb-6 p-3 bg-red-50 text-red-700 text-xs text-left font-mono rounded-lg border border-red-200 overflow-auto max-h-48 break-words">
                        <div className="font-bold mb-1">Error: {error.message}</div>
                        {error.stack && <pre className="text-[10px] whitespace-pre-wrap">{error.stack}</pre>}
                    </div>
                )}
                <button
                    onClick={reset}
                    className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    aria-label="Try again"
                >
                    Try Again
                </button>
            </div>
        </main>
    );
}
