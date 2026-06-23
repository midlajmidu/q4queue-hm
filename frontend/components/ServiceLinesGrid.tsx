"use client";

import React from "react";
import { api } from "@/lib/api";
import { ServingToken } from "@/types/api";
import { CheckCircle, PhoneCall, FastForward } from "lucide-react";
import { toast } from "sonner";

interface Props {
    queueId: string;
    serviceLines: number;
    allServingTokens: ServingToken[];
    prefix: string;
    onUpdate: () => void; // refresh after action
}

export default function ServiceLinesGrid({
    queueId,
    serviceLines,
    allServingTokens,
    prefix,
    onUpdate,
}: Props) {
    const [loadingLine, setLoadingLine] = React.useState<number | null>(null);

    // Build a map of line_number -> token for O(1) lookup
    const lineMap = React.useMemo(() => {
        const map = new Map<number, ServingToken>();
        for (const t of allServingTokens) {
            if (t.assigned_line !== null && t.assigned_line !== undefined) {
                map.set(t.assigned_line, t);
            }
        }
        return map;
    }, [allServingTokens]);

    const callNext = async (lineNum: number, status: "done" | "skipped" = "done") => {
        setLoadingLine(lineNum);
        try {
            await api.callNext(queueId, status, lineNum);
            toast.success(status === "skipped" ? `Skipped current and called next to Line ${lineNum}` : `Called next customer to Line ${lineNum}`);
            onUpdate();
        } catch {
            toast.error(`Failed to call next for Line ${lineNum}`);
        } finally {
            setLoadingLine(null);
        }
    };

    const clearLine = async (lineNum: number) => {
        setLoadingLine(lineNum);
        try {
            await api.clearLine(queueId, lineNum);
            toast.success(`Line ${lineNum} cleared`);
            onUpdate();
        } catch {
            toast.error(`Failed to clear Line ${lineNum}`);
        } finally {
            setLoadingLine(null);
        }
    };

    return (
        <div style={{ marginBottom: 24 }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14
            }}>
                <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--q-text)", margin: 0 }}>
                        Service Lines
                    </h2>
                    <p style={{ fontSize: 12, color: "var(--q-text-muted)", margin: "2px 0 0" }}>
                        {allServingTokens.length} of {serviceLines} lines occupied
                    </p>
                </div>
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
            }}>
                {Array.from({ length: serviceLines }, (_, i) => i + 1).map((lineNum) => {
                    const token = lineMap.get(lineNum);
                    const isOccupied = !!token;
                    const isLoading = loadingLine === lineNum;

                    return (
                        <div
                            key={lineNum}
                            style={{
                                background: isOccupied
                                    ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
                                    : "var(--q-card-bg)",
                                border: `1.5px solid ${isOccupied ? "#86efac" : "var(--q-border)"}`,
                                borderRadius: 12,
                                padding: "14px 16px",
                                transition: "all 0.2s ease",
                                position: "relative",
                                overflow: "hidden",
                            }}
                        >
                            {/* Line badge */}
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 10,
                            }}>
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: "0.06em",
                                    textTransform: "uppercase",
                                    color: isOccupied ? "#16a34a" : "var(--q-text-muted)",
                                }}>
                                    Line {lineNum}
                                </span>
                                <span style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: "2px 8px",
                                    borderRadius: 20,
                                    background: isOccupied ? "#dcfce7" : "var(--q-card-bg-alt)",
                                    color: isOccupied ? "#16a34a" : "var(--q-text-muted)",
                                    border: `1px solid ${isOccupied ? "#86efac" : "var(--q-border)"}`,
                                }}>
                                    {isOccupied ? "Serving" : "Available"}
                                </span>
                            </div>

                            {isOccupied && token ? (
                                <>
                                    {/* Token number */}
                                    <div style={{
                                        fontSize: 28,
                                        fontWeight: 800,
                                        color: "#15803d",
                                        lineHeight: 1,
                                        marginBottom: 4,
                                    }}>
                                        {prefix}{token.token_number}
                                    </div>
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: "#166534",
                                        marginBottom: 12,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}>
                                        {token.customer_name}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: "flex", gap: 6 }}>
                                        {/* Skip & Next */}
                                        <button
                                            onClick={() => callNext(lineNum, "skipped")}
                                            disabled={isLoading}
                                            title="Mark skipped and call next customer to this line"
                                            style={{
                                                flex: 1,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 4,
                                                padding: "7px 4px",
                                                borderRadius: 8,
                                                border: "1px solid #fca5a5",
                                                background: "#fef2f2",
                                                color: "#dc2626",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: isLoading ? "not-allowed" : "pointer",
                                                opacity: isLoading ? 0.5 : 1,
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            <FastForward size={13} /> Skip
                                        </button>
                                        {/* Done & Next */}
                                        <button
                                            onClick={() => callNext(lineNum, "done")}
                                            disabled={isLoading}
                                            title="Mark done and call next customer to this line"
                                            style={{
                                                flex: 1.2,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 4,
                                                padding: "7px 4px",
                                                borderRadius: 8,
                                                border: "none",
                                                background: "#16a34a",
                                                color: "#fff",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: isLoading ? "not-allowed" : "pointer",
                                                opacity: isLoading ? 0.5 : 1,
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            <PhoneCall size={13} /> Next
                                        </button>
                                        {/* Clear Line */}
                                        <button
                                            onClick={() => clearLine(lineNum)}
                                            disabled={isLoading}
                                            title="Mark done, clear this line without calling next"
                                            style={{
                                                flex: 1,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 4,
                                                padding: "7px 4px",
                                                borderRadius: 8,
                                                border: "1px solid #86efac",
                                                background: "#fff",
                                                color: "#16a34a",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: isLoading ? "not-allowed" : "pointer",
                                                opacity: isLoading ? 0.5 : 1,
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            <CheckCircle size={13} /> Clear
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Empty state */}
                                    <div style={{
                                        fontSize: 12,
                                        color: "var(--q-text-muted)",
                                        marginBottom: 14,
                                        minHeight: 44,
                                        display: "flex",
                                        alignItems: "center",
                                    }}>
                                        No customer assigned
                                    </div>
                                    <button
                                        onClick={() => callNext(lineNum)}
                                        disabled={isLoading}
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 6,
                                            padding: "8px 12px",
                                            borderRadius: 8,
                                            border: "none",
                                            background: "linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)",
                                            color: "#fff",
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: isLoading ? "not-allowed" : "pointer",
                                            opacity: isLoading ? 0.5 : 1,
                                            transition: "all 0.15s ease",
                                        }}
                                    >
                                        <PhoneCall size={13} />
                                        {isLoading ? "Calling..." : `Call Next to Line ${lineNum}`}
                                    </button>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
