"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

import { toast } from "sonner";
import {
    Plus,
    GripVertical,
    Trash2,
    Save,
    Settings2,
    LayoutList,
    Type,
    Hash,
    Phone,
    Mail,
    Calendar,
    List,
    Lock,
    Clock,
    Copy,
    ExternalLink,
    CheckCircle,
    CalendarDays,
    Sliders
} from "lucide-react";

export interface CustomField {
    id: string; // for drag and drop keys
    key: string;
    label: string;
    type: "text" | "number" | "phone" | "email" | "date" | "select" | "textarea";
    required: boolean;
    order: number;
    options?: string[]; // array of strings for 'select' type
}

interface QueueTokenSettingsProps {
    queueId: string;
    initialFields: CustomField[] | null;
    readOnly?: boolean;
    readOnlyReason?: string;
    onUpdate: (fields: CustomField[]) => void;
}

export const DEFAULT_FIELDS: CustomField[] = [
    { id: "default_name", key: "name", label: "Full Name", type: "text", required: true, order: 0 },
    { id: "default_phone", key: "phone", label: "Phone Number", type: "phone", required: true, order: 1 },
    { id: "default_pax", key: "pax", label: "Number of Pax", type: "number", required: true, order: 2 },
];

const FIELD_TYPES = [
    { value: "text", label: "Text", icon: Type },
    { value: "number", label: "Short Number", icon: Hash },
    { value: "phone", label: "Phone Number", icon: Phone },
    { value: "email", label: "Email Address", icon: Mail },
    { value: "date", label: "Date", icon: Calendar },
    { value: "select", label: "Dropdown (Select)", icon: List },
];

const TagsInput = ({ options, onChange }: { options: string[], onChange: (options: string[]) => void }) => {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = inputValue.trim();
            if (val && !options.includes(val)) {
                onChange([...options, val]);
            }
            setInputValue("");
        } else if (e.key === 'Backspace' && inputValue === '' && options.length > 0) {
            e.preventDefault();
            onChange(options.slice(0, -1));
        }
    };

    const removeOption = (index: number) => {
        onChange(options.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-wrap items-center gap-2 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all min-h-[42px]">
            {options.map((opt, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm">
                    {opt}
                    <button type="button" onClick={() => removeOption(i)} className="text-slate-400 hover:text-rose-500 transition-colors focus:outline-none">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </span>
            ))}
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={options.length === 0 ? "Type option & press Enter" : "Add another..."}
                className="flex-1 min-w-[140px] bg-transparent text-sm text-slate-900 dark:text-white outline-none placeholder-slate-400"
            />
        </div>
    );
};

const CustomDropdown = ({ value, onChange, options }: { value: string, onChange: (val: string) => void, options: { value: string, label: string, icon?: React.ElementType }[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white hover:border-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
            >
                <span className="flex items-center gap-2 truncate">
                    {selectedOption.icon && <selectedOption.icon className="w-4 h-4 text-slate-400" />}
                    {selectedOption.label}
                </span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
                    {options.map((option) => {
                        const Icon = option.icon;
                        const isSelected = option.value === value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors ${
                                    isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                {Icon && <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />}
                                <span>{option.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const ensureMandatoryFields = (fieldsList: CustomField[] | null): CustomField[] => {
    if (!fieldsList || fieldsList.length === 0) {
        return DEFAULT_FIELDS;
    }
    const result = [...fieldsList];
    const hasName = result.some(f => f.key === 'name');
    const hasPhone = result.some(f => f.key === 'phone');

    if (!hasName) {
        result.unshift({ id: "default_name", key: "name", label: "Full Name", type: "text", required: true, order: 0 });
    }
    if (!hasPhone) {
        const nameIdx = result.findIndex(f => f.key === 'name');
        result.splice(nameIdx + 1, 0, { id: "default_phone", key: "phone", label: "Phone Number", type: "phone", required: true, order: 1 });
    }
    return result;
};

export default function QueueTokenSettings({ queueId, initialFields, readOnly = false, readOnlyReason, onUpdate }: QueueTokenSettingsProps) {
    const [activeTab, setActiveTab] = useState<"fields" | "appointments">("fields");
    const [fields, setFields] = useState<CustomField[]>(() => ensureMandatoryFields(initialFields));
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Appointment settings state
    const [appointmentEnabled, setAppointmentEnabled] = useState<boolean>(true);
    const [slotDuration, setSlotDuration] = useState<number>(15);
    const [slotCapacity, setSlotCapacity] = useState<number>(1);
    const [advanceDays, setAdvanceDays] = useState<number>(7);
    const [approvalMode, setApprovalMode] = useState<string>("instant");
    const [industryTemplate, setIndustryTemplate] = useState<string>("general");
    const [isSavingAppt, setIsSavingAppt] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);

    // Load queue appointment settings on mount
    useEffect(() => {
        api.getQueue(queueId).then((q: any) => {
            if (q.appointment_enabled !== undefined) setAppointmentEnabled(q.appointment_enabled);
            if (q.slot_duration) setSlotDuration(q.slot_duration);
            if (q.slot_capacity) setSlotCapacity(q.slot_capacity);
            if (q.advance_booking_days) setAdvanceDays(q.advance_booking_days);
            if (q.approval_mode) setApprovalMode(q.approval_mode);
            if (q.industry_template) setIndustryTemplate(q.industry_template);
        }).catch(() => {});
    }, [queueId]);

    // Sync state when initialFields prop updates asynchronously from parent
    useEffect(() => {
        if (!isDirty) {
            setFields(ensureMandatoryFields(initialFields));
        }
    }, [initialFields, isDirty]);

    const handleResetToDefault = () => {
        if (readOnly) return;
        setFields(ensureMandatoryFields(DEFAULT_FIELDS));
        setIsDirty(true);
    };

    const handleAddField = () => {
        if (readOnly) return;
        const newField: CustomField = {
            id: Math.random().toString(36).substr(2, 9),
            key: `custom_${fields.length + 1}`,
            label: `Custom Field ${fields.length + 1}`,
            type: "text",
            required: false,
            order: fields.length,
        };
        setFields([...fields, newField]);
        setIsDirty(true);
    };

    const handleAddCoreField = (type: 'name' | 'phone' | 'pax') => {
        if (readOnly) return;
        const newField: CustomField = {
            id: Math.random().toString(36).substr(2, 9),
            key: type,
            label: type === 'name' ? 'Full Name' : type === 'phone' ? 'Phone Number' : 'Number of Pax',
            type: type === 'name' ? 'text' : type === 'phone' ? 'phone' : 'number',
            required: true,
            order: fields.length,
        };
        setFields(ensureMandatoryFields([...fields, newField]));
        setIsDirty(true);
    };

    const handleRemoveField = (id: string) => {
        if (readOnly) return;
        const target = fields.find(f => f.id === id);
        if (target && ['name', 'phone'].includes(target.key)) {
            toast.error("Name and Phone are mandatory core fields and cannot be deleted");
            return;
        }
        setFields(fields.filter(f => f.id !== id));
        setIsDirty(true);
    };

    const handleFieldChange = (id: string, prop: keyof CustomField, val: any) => {
        if (readOnly) return;
        setFields(fields.map(f => {
            if (f.id === id) {
                if (prop === 'key' && ['name', 'phone'].includes(f.key)) {
                    return f;
                }
                if (prop === 'required' && ['name', 'phone'].includes(f.key)) {
                    return f;
                }
                const updated = { ...f, [prop]: val };
                if (prop === 'label' && !['name', 'phone', 'pax'].includes(f.key) && (!f.key || f.key.startsWith('custom_'))) {
                    updated.key = val.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 32);
                }
                return updated;
            }
            return f;
        }));
        setIsDirty(true);
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        if (readOnly) return;
        e.dataTransfer.setData("text/plain", index.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (readOnly) return;
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        if (readOnly) return;
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
        if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

        const newFields = [...fields];
        const [movedField] = newFields.splice(sourceIndex, 1);
        newFields.splice(targetIndex, 0, movedField);

        const reordered = newFields.map((f, i) => ({ ...f, order: i }));
        setFields(reordered);
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (readOnly) return;
        setIsSaving(true);
        try {
            const validatedFields = ensureMandatoryFields(fields);
            const keys = new Set();
            for (const f of validatedFields) {
                if (!f.key || !f.label) {
                    toast.error("All fields must have a label and key.");
                    setIsSaving(false);
                    return;
                }
                if (keys.has(f.key)) {
                    toast.error(`Duplicate key found: ${f.key}`);
                    setIsSaving(false);
                    return;
                }
                keys.add(f.key);
            }

            await api.updateQueue(queueId, { custom_fields: validatedFields });
            toast.success("Token fields saved successfully");
            setFields(validatedFields);
            onUpdate(validatedFields);
            setIsDirty(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAppointmentSettings = async () => {
        if (readOnly) return;
        setIsSavingAppt(true);
        try {
            await api.updateQueue(queueId, {
                appointment_enabled: appointmentEnabled,
                slot_duration: slotDuration,
                slot_capacity: slotCapacity,
                advance_booking_days: advanceDays,
                approval_mode: approvalMode,
                industry_template: industryTemplate
            });
            toast.success("Appointment booking settings updated successfully!");
        } catch (err: any) {
            toast.error(err.message || "Failed to update appointment settings");
        } finally {
            setIsSavingAppt(false);
        }
    };

    const params = useParams();
    const branchSlug = params?.orgSlug as string;
    const bookingUrl = typeof window !== "undefined"
        ? (branchSlug ? `${window.location.origin}/${branchSlug}/book?queueId=${queueId}` : `${window.location.origin}/book/${queueId}`)
        : (branchSlug ? `/${branchSlug}/book?queueId=${queueId}` : `/book/${queueId}`);

    const copyBookingUrl = () => {
        navigator.clipboard.writeText(bookingUrl);
        setCopied(true);
        toast.success("Branch booking link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };


    return (
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
            {readOnly && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-6 py-3.5 flex items-center gap-3 text-amber-800 dark:text-amber-200 text-xs sm:text-sm font-medium">
                    <Lock className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{readOnlyReason || "Viewing a closed or historical queue session. Registration form settings are read-only."}</span>
                </div>
            )}

            {/* Header with Sub-tabs */}
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-indigo-500" />
                        Queue Configuration
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Customize registration inputs and manage early appointment booking rules.
                    </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab("fields")}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === "fields"
                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                    >
                        <Sliders size={14} />
                        <span>Form Fields</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("appointments")}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === "appointments"
                                ? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm"
                                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        }`}
                    >
                        <CalendarDays size={14} />
                        <span>Appointments</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: FORM FIELDS */}
            {activeTab === "fields" && (
                <div>
                    <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Customer Registration Fields</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Fields asked to customers joining on-site via QR or staff manual entry.
                            </p>
                        </div>
                        {!readOnly && (
                            <button
                                onClick={handleSave}
                                disabled={!isDirty || isSaving}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm"
                            >
                                <Save className="w-4 h-4" />
                                {isSaving ? "Saving..." : "Save Fields"}
                            </button>
                        )}
                    </div>

                    <div className="p-6 space-y-4">
                        {fields.length === 0 ? (
                            <div className="text-center py-12 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-dashed border-amber-300 dark:border-amber-800/60 p-6">
                                <LayoutList className="w-12 h-12 text-amber-500/80 mx-auto mb-3" />
                                <h3 className="text-slate-900 dark:text-white font-bold text-base mb-1">No Registration Fields Configured</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed">
                                    Your customers will be asked for Name, Phone, and Pax Count by default.
                                </p>
                                {!readOnly && (
                                    <button
                                        onClick={handleResetToDefault}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                    >
                                        Use Default Fields
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {fields.map((field, index) => (
                                    <div
                                        key={field.id}
                                        draggable={!readOnly}
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, index)}
                                        className={`flex flex-col gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 transition-all ${
                                            readOnly ? 'opacity-90' : 'hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                            <div className="md:col-span-1 flex items-center gap-2">
                                                {!readOnly ? (
                                                    <span className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1">
                                                        <GripVertical className="w-4 h-4" />
                                                    </span>
                                                ) : null}
                                                <span className="text-xs font-bold text-slate-400 w-4">#{index + 1}</span>
                                            </div>

                                            <div className="md:col-span-4">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1">Label Name</label>
                                                <input
                                                    type="text"
                                                    value={field.label}
                                                    disabled={readOnly}
                                                    onChange={(e) => handleFieldChange(field.id, "label", e.target.value)}
                                                    placeholder="e.g. Appointment Type"
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:opacity-60"
                                                />
                                            </div>

                                            <div className="md:col-span-3">
                                                <label className="block text-xs font-semibold text-slate-500 mb-1">Field Type</label>
                                                {readOnly ? (
                                                    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                                                        {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                                                    </div>
                                                ) : (
                                                    <CustomDropdown
                                                        value={field.type}
                                                        onChange={(val) => handleFieldChange(field.id, "type", val)}
                                                        options={FIELD_TYPES}
                                                    />
                                                )}
                                            </div>

                                            <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-4">
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={field.required || ['name', 'phone'].includes(field.key)}
                                                        disabled={readOnly || ['name', 'phone'].includes(field.key)}
                                                        onChange={(e) => handleFieldChange(field.id, "required", e.target.checked)}
                                                        className={`w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 ${readOnly || ['name', 'phone'].includes(field.key) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    />
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                        Required {['name', 'phone'].includes(field.key) && <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider ml-0.5">(Always)</span>}
                                                    </span>
                                                </label>

                                                {!['name', 'phone'].includes(field.key) && !readOnly ? (
                                                    <button
                                                        onClick={() => handleRemoveField(field.id)}
                                                        className="text-rose-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                                        title="Remove Field"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <span className="p-1 cursor-not-allowed" title={readOnly ? "Read-only mode" : "Name and Phone are mandatory core fields and cannot be deleted"}>
                                                        <Trash2 className="w-4 h-4 text-slate-300 dark:text-slate-700 opacity-40" />
                                                    </span>
                                                )}
                                            </div>

                                            {field.type === 'select' && (
                                                <div className="md:col-span-8 md:col-start-5 mt-1">
                                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Options</label>
                                                    {readOnly ? (
                                                        <div className="flex flex-wrap gap-1.5 py-1">
                                                            {(field.options || []).map((opt, optIdx) => (
                                                                <span key={optIdx} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs">
                                                                    {opt}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <TagsInput
                                                            options={field.options || []}
                                                            onChange={(newOptions) => handleFieldChange(field.id, "options", newOptions)}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {!readOnly && (
                                    <div className="pt-4 flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800/60 mt-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {!fields.some(f => f.key === 'name') && (
                                                <button onClick={() => handleAddCoreField('name')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <Plus className="w-3.5 h-3.5" /> Name
                                                </button>
                                            )}
                                            {!fields.some(f => f.key === 'phone') && (
                                                <button onClick={() => handleAddCoreField('phone')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <Plus className="w-3.5 h-3.5" /> Phone
                                                </button>
                                            )}
                                            {!fields.some(f => f.key === 'pax') && (
                                                <button onClick={() => handleAddCoreField('pax')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <Plus className="w-3.5 h-3.5" /> Pax
                                                </button>
                                            )}
                                            <button
                                                onClick={handleAddField}
                                                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-2 rounded-lg transition-colors border border-indigo-200/60"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Add Custom Field
                                            </button>

                                            <div className="flex-1"></div>

                                            <button
                                                onClick={handleResetToDefault}
                                                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 rounded-lg transition-colors shrink-0"
                                            >
                                                Reset to Defaults
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: APPOINTMENT SETTINGS */}
            {activeTab === "appointments" && (
                <div className="p-6 space-y-6">
                    {/* Shareable Booking Link Banner */}
                    <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent p-5 rounded-2xl border border-purple-200/60 dark:border-purple-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                                <CalendarDays size={14} /> Unified Branch Booking Link
                            </span>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                Customers use this single booking link to choose any doctor or service. This link pre-selects this queue.
                            </p>
                            <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 break-all select-all pt-1">
                                {bookingUrl}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={copyBookingUrl}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors shadow-sm"
                            >
                                {copied ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                <span>{copied ? "Copied" : "Copy Link"}</span>
                            </button>
                            <a
                                href={bookingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                            >
                                <span>Preview Portal</span>
                                <ExternalLink size={14} />
                            </a>
                        </div>
                    </div>


                    {/* Enable Switch */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Enable Early Appointments</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Allow customers to book time slots in advance before arriving at your branch.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={appointmentEnabled}
                                disabled={readOnly}
                                onChange={(e) => setAppointmentEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-purple-600"></div>
                        </label>
                    </div>

                    {/* Slot Configuration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                Slot Duration (Minutes)
                            </label>
                            <p className="text-[11px] text-slate-500">How long each appointment takes.</p>
                            <select
                                value={slotDuration}
                                disabled={readOnly || !appointmentEnabled}
                                onChange={(e) => setSlotDuration(parseInt(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                            >
                                <option value={10}>10 minutes</option>
                                <option value={15}>15 minutes (Standard)</option>
                                <option value={20}>20 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={45}>45 minutes</option>
                                <option value={60}>60 minutes (1 hour)</option>
                            </select>
                        </div>

                        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                Slot Capacity
                            </label>
                            <p className="text-[11px] text-slate-500">Max concurrent bookings permitted per slot.</p>
                            <input
                                type="number"
                                min={1}
                                max={50}
                                value={slotCapacity}
                                disabled={readOnly || !appointmentEnabled}
                                onChange={(e) => setSlotCapacity(parseInt(e.target.value) || 1)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                            />
                        </div>

                        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                Advance Booking Window (Days)
                            </label>
                            <p className="text-[11px] text-slate-500">How many days in advance customers can schedule.</p>
                            <input
                                type="number"
                                min={1}
                                max={90}
                                value={advanceDays}
                                disabled={readOnly || !appointmentEnabled}
                                onChange={(e) => setAdvanceDays(parseInt(e.target.value) || 7)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                            />
                        </div>

                        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                Approval Mode
                            </label>
                            <p className="text-[11px] text-slate-500">Control if bookings are immediately confirmed or need review.</p>
                            <select
                                value={approvalMode}
                                disabled={readOnly || !appointmentEnabled}
                                onChange={(e) => setApprovalMode(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                            >
                                <option value="instant">Instant Auto-Confirmation</option>
                                <option value="manual">Manual Staff Approval Required</option>
                            </select>
                        </div>
                    </div>

                    {/* Save Button */}
                    {!readOnly && (
                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={handleSaveAppointmentSettings}
                                disabled={isSavingAppt}
                                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-[1.01] disabled:opacity-50"
                            >
                                <Save size={15} />
                                <span>{isSavingAppt ? "Saving..." : "Save Appointment Settings"}</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
