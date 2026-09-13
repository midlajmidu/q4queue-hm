"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, GripVertical, Trash2, Save, Settings2, LayoutList, Type, Hash, Phone, Mail, Calendar, List, Lock } from "lucide-react";

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
        <div ref={dropdownRef} className="relative w-full">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800 border ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700'} rounded-lg px-3 py-2 text-sm text-left outline-none transition-all focus:border-indigo-500`}
            >
                <div className="flex items-center gap-2.5">
                    {selectedOption?.icon && React.createElement(selectedOption.icon, { className: "w-4 h-4 text-slate-400 dark:text-slate-500" })}
                    <span className="text-slate-700 dark:text-slate-200 font-medium">{selectedOption?.label}</span>
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-60 overflow-y-auto py-1">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${value === opt.value ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                {opt.icon && React.createElement(opt.icon, { className: `w-4 h-4 ${value === opt.value ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}` })}
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ensureMandatoryFields = (rawFields: CustomField[] | null | undefined): CustomField[] => {
    let list = rawFields ? rawFields.map(f => ({ ...f })) : [...DEFAULT_FIELDS];
    
    const nameIndex = list.findIndex(f => f.key === 'name');
    if (nameIndex === -1) {
        list.unshift({ id: "default_name", key: "name", label: "Full Name", type: "text", required: true, order: 0 });
    } else {
        list[nameIndex].required = true;
    }

    const phoneIndex = list.findIndex(f => f.key === 'phone');
    if (phoneIndex === -1) {
        const insertIdx = list.findIndex(f => f.key === 'name') + 1;
        list.splice(insertIdx > 0 ? insertIdx : 1, 0, { id: "default_phone", key: "phone", label: "Phone Number", type: "phone", required: true, order: 1 });
    } else {
        list[phoneIndex].required = true;
    }

    list.forEach((f, i) => { f.order = i; });
    return list;
};

export default function QueueTokenSettings({ queueId, initialFields, readOnly = false, readOnlyReason, onUpdate }: QueueTokenSettingsProps) {
    const [fields, setFields] = useState<CustomField[]>(() => ensureMandatoryFields(initialFields));
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

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
        const fieldToRemove = fields.find(f => f.id === id);
        if (fieldToRemove && ['name', 'phone'].includes(fieldToRemove.key)) {
            toast.error("Full Name and Phone Number are mandatory fields and cannot be removed.");
            return;
        }
        setFields(fields.filter(f => f.id !== id));
        setIsDirty(true);
    };

    const handleFieldChange = (id: string, key: keyof CustomField, value: any) => {
        if (readOnly) return;
        setFields(fields.map(f => {
            if (f.id === id) {
                if (['name', 'phone'].includes(f.key) && key === 'required') {
                    return { ...f, required: true };
                }
                const updated = { ...f, [key]: value };
                if (key === 'label' && !['name', 'phone', 'pax'].includes(f.key)) {
                    const oldAutoKey = f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
                    if (!f.key || f.key === oldAutoKey || f.key.startsWith('field_') || f.key.startsWith('custom_')) {
                        updated.key = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
                    }
                }
                return updated;
            }
            return f;
        }));
        setIsDirty(true);
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        if (readOnly) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === fields.length - 1) return;

        const newFields = [...fields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        const temp = newFields[index];
        newFields[index] = newFields[targetIndex];
        newFields[targetIndex] = temp;

        newFields.forEach((f, i) => { f.order = i; });
        setFields(newFields);
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

    return (
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm">
            {readOnly && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-6 py-3.5 flex items-center gap-3 text-amber-800 dark:text-amber-200 text-xs sm:text-sm font-medium">
                    <Lock className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{readOnlyReason || "Viewing a closed or historical queue session. Registration form settings are read-only."}</span>
                </div>
            )}
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-indigo-500" />
                        Queue Token Settings
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Configure the exact fields customers must fill out when joining this queue.
                        If empty, the system defaults to asking for Name, Phone, and Group Size.
                    </p>
                </div>
                {!readOnly && (
                    <button
                        onClick={handleSave}
                        disabled={!isDirty || isSaving}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-all"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                )}
            </div>

            <div className="p-6 space-y-4">
                {fields.length === 0 ? (
                    <div className="text-center py-12 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-dashed border-amber-300 dark:border-amber-800/60 p-6">
                        <LayoutList className="w-12 h-12 text-amber-500/80 mx-auto mb-3" />
                        <h3 className="text-slate-900 dark:text-white font-bold text-base mb-1">No Registration Fields Configured</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed">
                            You have removed all input fields. Token registration forms will display a notice stating that no fields are configured until you add fields or restore defaults.
                        </p>
                        <div className="flex flex-col items-center justify-center gap-3 w-full max-w-sm mx-auto">
                            <button
                                onClick={handleResetToDefault}
                                className="w-full text-indigo-600 dark:text-indigo-400 font-semibold text-sm hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 bg-indigo-50 dark:bg-indigo-950/60 px-4 py-3 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 transition-colors"
                            >
                                Restore Default Fields (Name, Phone, Pax)
                            </button>
                            <div className="w-full relative flex items-center py-2">
                                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium">OR BUILD MANUALLY</span>
                                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 w-full">
                                <button onClick={() => handleAddCoreField('name')} className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2.5 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm">
                                    + Name
                                </button>
                                <button onClick={() => handleAddCoreField('phone')} className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2.5 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm">
                                    + Phone
                                </button>
                                <button onClick={() => handleAddCoreField('pax')} className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2.5 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm">
                                    + Pax
                                </button>
                                <button onClick={handleAddField} className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2.5 rounded-lg shadow-sm transition-colors">
                                    + Custom
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {fields.map((field, index) => (
                            <div key={field.id} style={{ zIndex: fields.length - index }} className="relative flex items-start gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                                <div className="flex flex-col gap-1 mt-1 text-slate-400">
                                    <button onClick={() => moveField(index, 'up')} disabled={index === 0} className="hover:text-slate-900 disabled:opacity-30">▲</button>
                                    <button onClick={() => moveField(index, 'down')} disabled={index === fields.length - 1} className="hover:text-slate-900 disabled:opacity-30">▼</button>
                                </div>

                                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Field Label</label>
                                        <input
                                            type="text"
                                            value={field.label}
                                            disabled={readOnly}
                                            onChange={(e) => handleFieldChange(field.id, "label", e.target.value)}
                                            placeholder="e.g. Full Name"
                                            className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Field Type</label>
                                        {readOnly ? (
                                            <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 opacity-60 cursor-not-allowed">
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
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Database Key</label>
                                        <input
                                            type="text"
                                            value={field.key}
                                            onChange={(e) => handleFieldChange(field.id, "key", e.target.value)}
                                            placeholder="e.g. full_name"
                                            disabled={readOnly || ['name', 'phone', 'pax'].includes(field.key)}
                                            className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 font-mono ${readOnly || ['name', 'phone', 'pax'].includes(field.key) ? 'opacity-60 cursor-not-allowed text-slate-500' : ''}`}
                                            title={['name', 'phone', 'pax'].includes(field.key) ? 'Core database keys cannot be changed to prevent tracking errors.' : ''}
                                        />
                                    </div>
                                    <div className="md:col-span-2 flex items-center justify-between pt-5">
                                        <label className="flex items-center gap-2 cursor-pointer" title={['name', 'phone'].includes(field.key) ? "Full Name and Phone Number are mandatory required fields" : ""}>
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
    );
}
