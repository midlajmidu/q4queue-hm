import React, { useState, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";

export type DateRange = {
    start_date: string | null;
    end_date: string | null;
    preset: string;
};

interface DateRangeFilterProps {
    onChange: (range: DateRange) => void;
    initialPreset?: string;
}

export default function DateRangeFilter({ onChange, initialPreset = "today" }: DateRangeFilterProps) {
    const [preset, setPreset] = useState<string>(initialPreset);
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        applyPreset(preset);
    }, []);

    const formatDate = (date: Date) => {
        return date.toISOString().split("T")[0];
    };

    const applyPreset = (selectedPreset: string) => {
        const today = new Date();
        let start: string | null = null;
        let end: string | null = null;

        switch (selectedPreset) {
            case "today":
                start = formatDate(today);
                end = formatDate(today);
                break;
            case "yesterday":
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                start = formatDate(yesterday);
                end = formatDate(yesterday);
                break;
            case "last7days":
                const last7 = new Date(today);
                last7.setDate(last7.getDate() - 7);
                start = formatDate(last7);
                end = formatDate(today);
                break;
            case "last30days":
                const last30 = new Date(today);
                last30.setDate(last30.getDate() - 30);
                start = formatDate(last30);
                end = formatDate(today);
                break;
            case "thismonth":
                const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                start = formatDate(thisMonthStart);
                end = formatDate(today);
                break;
            case "custom":
                start = customStart || null;
                end = customEnd || null;
                break;
            default:
                start = null;
                end = null;
        }

        setPreset(selectedPreset);
        onChange({ start_date: start, end_date: end, preset: selectedPreset });
        if (selectedPreset !== "custom") {
            setIsOpen(false);
        }
    };

    const handleCustomApply = () => {
        onChange({ start_date: customStart || null, end_date: customEnd || null, preset: "custom" });
        setIsOpen(false);
    };

    const PRESETS = [
        { id: "today", label: "Today" },
        { id: "yesterday", label: "Yesterday" },
        { id: "last7days", label: "Last 7 Days" },
        { id: "last30days", label: "Last 30 Days" },
        { id: "thismonth", label: "This Month" },
        { id: "alltime", label: "All Time" },
        { id: "custom", label: "Custom Range" },
    ];

    const currentLabel = PRESETS.find(p => p.id === preset)?.label || "Select Date";
    
    const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const displayLabel = preset === "today" ? `Today, ${todayStr}` : currentLabel;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between gap-3 min-w-[180px] bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300 hover:shadow-sm transition-all shadow-sm"
            >
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <span className="truncate">{preset === "custom" && customStart && customEnd ? `${customStart} to ${customEnd}` : displayLabel}</span>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-50 p-2 overflow-hidden">
                        <div className="flex flex-col space-y-1 mb-2">
                            {PRESETS.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => applyPreset(p.id)}
                                    className={`text-left px-3 py-2 text-sm rounded-lg transition-colors ${preset === p.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {preset === "custom" && (
                            <div className="p-3 border-t border-slate-100 bg-slate-50 rounded-b-lg">
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={customStart}
                                            onChange={(e) => setCustomStart(e.target.value)}
                                            className="w-full border-slate-200 rounded-lg text-sm p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={customEnd}
                                            onChange={(e) => setCustomEnd(e.target.value)}
                                            className="w-full border-slate-200 rounded-lg text-sm p-2"
                                        />
                                    </div>
                                    <button
                                        onClick={handleCustomApply}
                                        disabled={!customStart || !customEnd}
                                        className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                    >
                                        Apply Range
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
