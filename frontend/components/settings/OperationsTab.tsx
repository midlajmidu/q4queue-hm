"use client";

import React, { useState, useEffect } from "react";
import { Play, Plus, Clock, X, Trash2 } from "lucide-react";
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
                auto_session_enabled: enabled,
                auto_session_time: time || null
            });
            toast.success("Automated session settings saved");
        } catch (err) {
            toast.error("Failed to update settings");
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

    const handleToggleTemplateActive = async (templateId: string, isActive: boolean) => {
        try {
            const currentSettings = await api.getOrganizationSettings();
            const updatedTemplates = (currentSettings.queue_templates || []).map(t => 
                t.id === templateId ? { ...t, isActive } : t
            );
            
            await api.updateOrganizationSettings({
                name: currentSettings.name,
                queue_templates: updatedTemplates
            });
            setTemplates(updatedTemplates);
            toast.success(isActive ? "Template activated" : "Template deactivated");
        } catch (err) {
            toast.error("Failed to update template status");
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
            
        } catch (err) {
            toast.error("Failed to save template");
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!window.confirm("Are you sure you want to delete this template?")) return;
        const updatedTemplates = templates.filter(t => t.id !== templateId);
        setTemplates(updatedTemplates);
        try {
            const currentSettings = await api.getOrganizationSettings();
            await api.updateOrganizationSettings({
                name: currentSettings.name,
                queue_templates: updatedTemplates
            });
            toast.success("Template deleted.");
        } catch (err) {
            toast.error("Failed to delete template");
            setTemplates(templates);
        }
    };

    return (
        <div className="w-full">
            {/* Automated Sessions Section */}
            <div className="mb-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <Clock className="w-5 h-5 text-indigo-500" />
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white m-0">Automated Daily Sessions</h2>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Automatically close the active session and start a new one at a specific time every day.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {autoSessionEnabled && (
                            <input 
                                type="time"
                                disabled={isSavingAutoSession}
                                value={autoSessionTime}
                                onChange={(e) => {
                                    setAutoSessionTime(e.target.value);
                                    saveAutoSessionSettings(autoSessionEnabled, e.target.value);
                                }}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            />
                        )}
                        <label className="relative inline-flex items-center cursor-pointer">
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
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white m-0">Session Templates</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                        Manage pre-configured queue templates to quickly launch your daily queues.
                    </p>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                >
                    <Plus size={18} />
                    Create Custom Template
                </button>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {templates.map(template => (
                    <div 
                        key={template.id} 
                        className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all hover:border-blue-500/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col h-full"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-700/50">
                                <span className="text-xl font-bold text-slate-700 dark:text-slate-300">
                                    {template.defaultPrefix || "#"}
                                </span>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 line-clamp-1">
                            {template.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 line-clamp-2 flex-grow">
                            {template.description}
                        </p>
                        
                        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {template.isActive ? "Active (Auto-Creates)" : "Inactive"}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={template.isActive || false}
                                    onChange={(e) => handleToggleTemplateActive(template.id, e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                ))}
            </div>



            {/* Modal B: Create & Automate Workflow */}
            {isCreating && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Custom Template</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Design a reusable configuration for your queues.</p>
                            </div>
                            <button onClick={() => setIsCreating(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto shrink p-6">
                            <form id="create-template-form" onSubmit={handleConfirmCreate} className="space-y-6">
                                
                                {/* Standard Inputs */}
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Template Name</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={createName}
                                            onChange={e => setCreateName(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                            placeholder="e.g. General Check-ups"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Default Queue Name</label>
                                            <input 
                                                type="text" 
                                                required
                                                value={createQueueName}
                                                onChange={e => setCreateQueueName(e.target.value)}
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                                placeholder="e.g. Daily Queue"
                                            />
                                        </div>
                                        
                                        <div className="flex gap-3">
                                            <div className="w-1/2">
                                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Open Time (Opt)</label>
                                                <input 
                                                    type="time" 
                                                    value={createOpenTime}
                                                    onChange={e => setCreateOpenTime(e.target.value)}
                                                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-400"
                                                />
                                            </div>
                                            <div className="w-1/2">
                                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Close Time (Opt)</label>
                                                <input 
                                                    type="time" 
                                                    value={createCloseTime}
                                                    onChange={e => setCreateCloseTime(e.target.value)}
                                                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-400"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Default Prefix</label>
                                            <input 
                                                type="text" 
                                                required
                                                value={createPrefix}
                                                onChange={e => setCreatePrefix(e.target.value)}
                                                maxLength={3}
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                                placeholder="e.g. A"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Starting Number</label>
                                        <input 
                                            type="number" 
                                            required
                                            min="1"
                                            value={createStartingNumber}
                                            onChange={e => setCreateStartingNumber(e.target.value)}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                            placeholder="e.g. 1"
                                        />
                                        <p className="text-xs text-slate-500 mt-2">The very first token number assigned when using this template.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Queue Type</label>
                                        <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                                            <button
                                                type="button"
                                                onClick={() => setCreateQueueType("normal")}
                                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                                    createQueueType === "normal"
                                                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700"
                                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                                }`}
                                            >
                                                Normal Queue
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCreateQueueType("service_lines")}
                                                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                                    createQueueType === "service_lines"
                                                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700"
                                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                                }`}
                                            >
                                                Service Lines
                                            </button>
                                        </div>
                                    </div>

                                    {createQueueType === "service_lines" && (
                                        <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Number of Service Lines</label>
                                            <input
                                                type="number"
                                                min="2"
                                                max="10"
                                                value={createServiceLines}
                                                onChange={(e) => setCreateServiceLines(e.target.value)}
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                                            />
                                            <p className="text-xs text-slate-500 mt-2">Example: 3 lines creates counters #1, #2, and #3</p>
                                        </div>
                                    )}
                                </div>
                                
                            </form>
                        </div>
                        
                        <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0 flex justify-end gap-3">
                            <button 
                                type="button" 
                                onClick={() => setIsCreating(false)}
                                className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                form="create-template-form"
                                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                            >
                                Create Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
}
