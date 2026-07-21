"use client";

import React, { useState, useEffect } from "react";
import { Plus, Clock, X, Trash2, Settings2, LayoutTemplate, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { QueueTemplate } from "@/types/api";

export function OperationsTab() {
    const [templates, setTemplates] = useState<QueueTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const params = useParams();

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const settings = await api.getOrganizationSettings();
            setTemplates(settings.queue_templates || []);
            setAutoSessionEnabled(settings.auto_session_enabled || false);
            setAutoSessionTime(settings.auto_session_time || "");
        } catch (err) {
            toast.error("Failed to load templates");
        } finally {
            setIsLoading(false);
        }
    };
    
    // Automated Sessions State
    const [autoSessionEnabled, setAutoSessionEnabled] = useState(false);
    const [autoSessionTime, setAutoSessionTime] = useState("");
    const [isSavingAutoSession, setIsSavingAutoSession] = useState(false);

    const saveAutoSessionSettings = async (enabled: boolean, time: string) => {
        setIsSavingAutoSession(true);
        try {
            const currentSettings = await api.getOrganizationSettings();
            await api.updateOrganizationSettings({
                name: currentSettings.name,
                address: currentSettings.address || undefined,
                phone_number: currentSettings.phone_number || undefined,
                auto_session_enabled: enabled,
                auto_session_time: time || null,
                queue_templates: currentSettings.queue_templates
            });
            toast.success("Automated session settings saved");
        } catch (err: any) {
            toast.error(err?.detail || "Failed to update settings");
        } finally {
            setIsSavingAutoSession(false);
        }
    };
    
    // Modal B State (Create)
    const [isCreating, setIsCreating] = useState(false);
    const [createName, setCreateName] = useState("");
    const [createQueueName, setCreateQueueName] = useState("");
    const [createPrefix, setCreatePrefix] = useState("");
    const [createStartingNumber, setCreateStartingNumber] = useState("1");
    const [createQueueType, setCreateQueueType] = useState<"normal" | "service_lines">("normal");
    const [createServiceLines, setCreateServiceLines] = useState("2");
    const [createOpenTime, setCreateOpenTime] = useState("");
    const [createCloseTime, setCreateCloseTime] = useState("");

    // Delete Modal State
    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

    const handleToggleTemplateActive = async (templateId: string, isActive: boolean) => {
        try {
            const currentSettings = await api.getOrganizationSettings();
            const updatedTemplates = (currentSettings.queue_templates || []).map(t => 
                t.id === templateId ? { ...t, isActive } : t
            );
            
            await api.updateOrganizationSettings({
                name: currentSettings.name,
                address: currentSettings.address || undefined,
                phone_number: currentSettings.phone_number || undefined,
                auto_session_enabled: currentSettings.auto_session_enabled,
                auto_session_time: currentSettings.auto_session_time,
                queue_templates: updatedTemplates
            });
            setTemplates(updatedTemplates);
            toast.success(isActive ? "Template activated" : "Template deactivated");
        } catch (err: any) {
            toast.error(err?.detail || "Failed to update template status");
        }
    };

    const handleConfirmCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const currentSettings = await api.getOrganizationSettings();
            
            const newTemplate: QueueTemplate = {
                id: crypto.randomUUID(),
                name: createName,
                description: `Default Queue: ${createQueueName} • Starts at ${createPrefix || '#'}${createStartingNumber}`,
                defaultPrefix: createPrefix,
                startingNumber: parseInt(createStartingNumber, 10) || 1,
                serviceLines: createQueueType === "service_lines" ? parseInt(createServiceLines, 10) : 0,
                isActive: false,
                openTime: createOpenTime || undefined,
                closeTime: createCloseTime || undefined
            };
            
            const updatedTemplates = [...(currentSettings.queue_templates || []), newTemplate];
            
            await api.updateOrganizationSettings({
                name: currentSettings.name,
                address: currentSettings.address || undefined,
                phone_number: currentSettings.phone_number || undefined,
                auto_session_enabled: currentSettings.auto_session_enabled,
                auto_session_time: currentSettings.auto_session_time,
                queue_templates: updatedTemplates
            });
            
            setTemplates(updatedTemplates);
            toast.success("Custom template created");
            setIsCreating(false);
            
            // Reset form
            setCreateName("");
            setCreateQueueName("");
            setCreatePrefix("");
            setCreateStartingNumber("1");
            setCreateQueueType("normal");
            setCreateServiceLines("2");
            setCreateOpenTime("");
            setCreateCloseTime("");
            
        } catch (err: any) {
            toast.error(err?.detail || "Failed to save template");
        }
    };

    const initiateDelete = (id: string) => {
        setTemplateToDelete(id);
    };

    const confirmDelete = async () => {
        if (!templateToDelete) return;
        const updatedTemplates = templates.filter(t => t.id !== templateToDelete);
        setTemplates(updatedTemplates);
        try {
            const currentSettings = await api.getOrganizationSettings();
            await api.updateOrganizationSettings({
                name: currentSettings.name,
                address: currentSettings.address || undefined,
                phone_number: currentSettings.phone_number || undefined,
                auto_session_enabled: currentSettings.auto_session_enabled,
                auto_session_time: currentSettings.auto_session_time,
                queue_templates: updatedTemplates
            });
            toast.success("Template deleted.");
        } catch (err: any) {
            toast.error(err?.detail || "Failed to delete template");
            setTemplates(templates); // revert
        }
        setTemplateToDelete(null);
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
            
            {/* Header Section */}
            <div>
                <h1 className="text-[22px] font-bold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-md border border-indigo-100 dark:border-indigo-800">
                        <Settings2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    Workflow Operations
                </h1>
                <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl text-[15px] leading-relaxed">
                    Configure your daily queue operations, automated scheduling, and reusable session templates to streamline your branch management.
                </p>
            </div>

            {/* Automated Sessions Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800/50">
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex gap-4">
                        <div className="hidden sm:flex mt-0.5 w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 items-center justify-center shrink-0">
                            <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                            <h2 className="text-[16px] font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                                Automated Daily Sessions
                                {autoSessionEnabled && (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold tracking-wider uppercase">Active</span>
                                )}
                            </h2>
                            <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1.5 max-w-lg leading-relaxed">
                                Automatically close the active session and start a new one at a specific time every day. Eliminates the need for manual daily resets.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        {autoSessionEnabled && (
                            <input 
                                type="time"
                                disabled={isSavingAutoSession}
                                value={autoSessionTime}
                                onChange={(e) => {
                                    setAutoSessionTime(e.target.value);
                                    saveAutoSessionSettings(autoSessionEnabled, e.target.value);
                                }}
                                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none shadow-sm"
                            />
                        )}
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                disabled={isSavingAutoSession}
                                checked={autoSessionEnabled}
                                onChange={(e) => {
                                    const enabled = e.target.checked;
                                    setAutoSessionEnabled(enabled);
                                    saveAutoSessionSettings(enabled, autoSessionTime);
                                }}
                            />
                            <div className={`w-[44px] h-[24px] rounded-full transition-colors duration-200 relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${autoSessionEnabled ? 'bg-emerald-500 after:translate-x-5' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                        </label>
                    </div>
                </div>
            </div>

            <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />

            {/* Session Templates Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-[18px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <LayoutTemplate className="w-4 h-4 text-slate-400" />
                        Session Templates
                    </h2>
                    <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-1">
                        Reusable queue configurations to launch your daily operations.
                    </p>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="group inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[14px] font-medium rounded-lg transition-all shadow-sm shadow-indigo-600/20 active:scale-95"
                >
                    <Plus size={16} className="transition-transform group-hover:rotate-90" />
                    Create Template
                </button>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {templates.length === 0 && !isLoading && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm mb-4">
                            <LayoutTemplate className="w-5 h-5 text-slate-400" />
                        </div>
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-1">No Templates Found</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-[14px] max-w-sm mb-6">Create your first queue template to easily launch identical queue sessions every day.</p>
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-600 hover:text-indigo-600 text-slate-900 dark:text-white text-[14px] font-medium rounded-lg transition-all shadow-sm"
                        >
                            <Plus size={16} />
                            Create Template
                        </button>
                    </div>
                )}

                {templates.map(template => (
                    <div 
                        key={template.id} 
                        className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 flex flex-col h-full"
                    >
                        {/* Status Bar Indicator */}
                        <div className={`h-1 w-full transition-colors ${template.isActive ? 'bg-emerald-500' : 'bg-transparent'}`} />
                        
                        <div className="p-5 flex flex-col flex-grow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-center shadow-sm">
                                    <span className="text-[16px] font-bold text-indigo-700 dark:text-indigo-300 font-mono uppercase tracking-tight">
                                        {template.defaultPrefix || "#"}
                                    </span>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); initiateDelete(template.id); }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Delete template"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            <h3 className="text-[16px] font-bold text-slate-900 dark:text-white mb-1 line-clamp-1 tracking-tight">
                                {template.name}
                            </h3>
                            <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 mb-6 flex-grow">
                                {template.description}
                            </p>
                            
                            {/* Card Action Bar */}
                            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                                <span className={`text-[12px] font-bold tracking-wide uppercase transition-colors ${template.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                    {template.isActive ? "Auto-Creates Daily" : "Manual Usage"}
                                </span>
                                <label className="relative inline-flex items-center cursor-pointer" title={template.isActive ? "Deactivate auto-creation" : "Activate auto-creation"}>
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={template.isActive || false}
                                        onChange={(e) => handleToggleTemplateActive(template.id, e.target.checked)}
                                    />
                                    <div className={`w-9 h-5 rounded-full transition-colors duration-200 relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${template.isActive ? 'bg-emerald-500 after:translate-x-4' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                                </label>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal B: Create & Automate Workflow */}
            {isCreating && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[20px] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
                            <div>
                                <h3 className="text-[18px] font-bold text-slate-900 dark:text-white tracking-tight">Create Custom Template</h3>
                                <p className="text-[13px] text-slate-500 mt-0.5">Configure reusable settings for your daily queues.</p>
                            </div>
                            <button onClick={() => setIsCreating(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-95">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto shrink p-6">
                            <form id="create-template-form" onSubmit={handleConfirmCreate} className="space-y-6">
                                
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-[13px] font-semibold text-slate-900 dark:text-slate-200 mb-1.5">Template Name <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            required
                                            value={createName}
                                            onChange={e => setCreateName(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 shadow-sm"
                                            placeholder="e.g. General Check-ups"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-slate-900 dark:text-slate-200 mb-1.5">Default Queue Name <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                required
                                                value={createQueueName}
                                                onChange={e => setCreateQueueName(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 shadow-sm"
                                                placeholder="e.g. Daily Queue"
                                            />
                                        </div>
                                        
                                        <div className="flex gap-3">
                                            <div className="w-1/2">
                                                <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Open Time</label>
                                                <input 
                                                    type="time" 
                                                    value={createOpenTime}
                                                    onChange={e => setCreateOpenTime(e.target.value)}
                                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
                                                />
                                            </div>
                                            <div className="w-1/2">
                                                <label className="block text-[13px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Close Time</label>
                                                <input 
                                                    type="time" 
                                                    value={createCloseTime}
                                                    onChange={e => setCreateCloseTime(e.target.value)}
                                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[13px] font-semibold text-slate-900 dark:text-slate-200 mb-1.5">Token Prefix <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                required
                                                value={createPrefix}
                                                onChange={e => setCreatePrefix(e.target.value)}
                                                maxLength={3}
                                                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 shadow-sm font-mono uppercase"
                                                placeholder="e.g. A"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[13px] font-semibold text-slate-900 dark:text-slate-200 mb-1.5">Starting Number <span className="text-red-500">*</span></label>
                                            <input 
                                                type="number" 
                                                required
                                                min="1"
                                                value={createStartingNumber}
                                                onChange={e => setCreateStartingNumber(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 shadow-sm font-mono"
                                                placeholder="e.g. 1"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <label className="block text-[13px] font-semibold text-slate-900 dark:text-slate-200 mb-2">Queue Mode</label>
                                        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700/50">
                                            <button
                                                type="button"
                                                onClick={() => setCreateQueueType("normal")}
                                                className={`flex-1 py-2 px-3 rounded-md text-[13px] font-medium transition-all duration-200 ${
                                                    createQueueType === "normal"
                                                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-600"
                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent"
                                                }`}
                                            >
                                                Standard Queue
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCreateQueueType("service_lines")}
                                                className={`flex-1 py-2 px-3 rounded-md text-[13px] font-medium transition-all duration-200 ${
                                                    createQueueType === "service_lines"
                                                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-600"
                                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent"
                                                }`}
                                            >
                                                Multi-Counter (Lanes)
                                            </button>
                                        </div>
                                    </div>

                                    {createQueueType === "service_lines" && (
                                        <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                                            <label className="block text-[13px] font-semibold text-slate-900 dark:text-slate-200 mb-1.5">Number of Service Counters</label>
                                            <input
                                                type="number"
                                                min="2"
                                                max="20"
                                                value={createServiceLines}
                                                onChange={(e) => setCreateServiceLines(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-[14px] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400 shadow-sm"
                                            />
                                            <p className="text-[12px] text-slate-500 mt-2 flex items-center gap-1.5">
                                                <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                                                Example: Choosing 3 instantly creates Counter #1, #2, and #3.
                                            </p>
                                        </div>
                                    )}
                                </div>
                                
                            </form>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0 flex justify-end gap-3">
                            <button 
                                type="button" 
                                onClick={() => setIsCreating(false)}
                                className="px-5 py-2 text-[14px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                form="create-template-form"
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[14px] font-medium rounded-lg shadow-sm shadow-indigo-600/20 transition-all active:scale-95"
                            >
                                Create Template
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal C: Delete Confirmation */}
            {templateToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[20px] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-500/20">
                                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-[18px] font-bold text-slate-900 dark:text-white tracking-tight mb-2">Delete Template?</h3>
                            <p className="text-[14px] text-slate-500 dark:text-slate-400">
                                Are you sure you want to delete this queue template? This action cannot be undone.
                            </p>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-center gap-3">
                            <button 
                                type="button" 
                                onClick={() => setTemplateToDelete(null)}
                                className="flex-1 px-4 py-2.5 text-[14px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-all active:scale-95 shadow-sm"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-[14px] font-medium rounded-lg shadow-sm shadow-red-600/20 transition-all active:scale-95"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
}
