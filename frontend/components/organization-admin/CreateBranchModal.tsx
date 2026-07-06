import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { X, CheckCircle2, AlertCircle, Loader2, Link as LinkIcon, ChevronDown, User, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

interface CreateBranchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

const COUNTRY_CODES = [
    { code: '+91', country: 'India', flag: '🇮🇳', placeholder: '9876543210', maxLength: 10 },
    { code: '+1', country: 'US/CA', flag: '🇺🇸', placeholder: '5551234567', maxLength: 10 },
    { code: '+44', country: 'UK', flag: '🇬🇧', placeholder: '7712345678', maxLength: 10 },
    { code: '+971', country: 'UAE', flag: '🇦🇪', placeholder: '501234567', maxLength: 9 },
    { code: '+61', country: 'Australia', flag: '🇦🇺', placeholder: '412345678', maxLength: 9 },
    { code: '+65', country: 'Singapore', flag: '🇸🇬', placeholder: '81234567', maxLength: 8 },
];

const stepsList = [
    { id: 1, title: 'Basics' },
    { id: 2, title: 'Details' },
    { id: 3, title: 'Admin' }
];

export default function CreateBranchModal({ isOpen, onClose, onCreated }: CreateBranchModalProps) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const slugTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [countryCode, setCountryCode] = useState('+91');

    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        address: "",
        phone_number: "",
        assignAdmin: false,
        admin_first_name: "",
        admin_last_name: "",
        admin_email: "",
        admin_password: "",
    });

    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSlugStatus('idle');
            setCountryCode('+91');
            setIsSlugManuallyEdited(false);
            setFormData({
                name: "", slug: "",
                address: "", phone_number: "",
                assignAdmin: false, admin_first_name: "", admin_last_name: "", admin_email: "", admin_password: "",
            });
        }
    }, [isOpen]);

    const checkSlugAvailability = async (slug: string) => {
        if (!slug) {
            setSlugStatus('idle');
            return;
        }
        setSlugStatus('checking');
        try {
            const res = await api.checkBranchSlug(slug);
            setSlugStatus(res.available ? 'available' : 'taken');
        } catch {
            setSlugStatus('idle'); // fail silently for UI
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        const generatedSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        
        setFormData(prev => ({
            ...prev,
            name,
            ...(isSlugManuallyEdited ? {} : { slug: generatedSlug })
        }));

        if (!isSlugManuallyEdited) {
            if (slugTimeoutRef.current) clearTimeout(slugTimeoutRef.current);
            slugTimeoutRef.current = setTimeout(() => checkSlugAvailability(generatedSlug), 500);
        }
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
        setIsSlugManuallyEdited(true);
        setFormData(prev => ({ ...prev, slug }));
        
        if (slugTimeoutRef.current) clearTimeout(slugTimeoutRef.current);
        slugTimeoutRef.current = setTimeout(() => checkSlugAvailability(slug), 500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step < 3) {
            setStep(step + 1);
            return;
        }

        setIsLoading(true);
        try {
            const payload: any = {
                name: formData.name,
                slug: formData.slug,
                address: formData.address || null,
                phone_number: formData.phone_number ? `${countryCode}${formData.phone_number}` : null,
                timezone: "Asia/Kolkata", // Hardcoded default for now
            };

            if (formData.assignAdmin && formData.admin_email && formData.admin_password) {
                payload.admin_first_name = formData.admin_first_name;
                payload.admin_last_name = formData.admin_last_name;
                payload.admin_email = formData.admin_email;
                payload.admin_password = formData.admin_password;
            }

            await api.createBranch(payload);
            toast.success("Branch created successfully");
            onCreated();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to create branch");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const isStep1Valid = formData.name.trim() !== "" && formData.slug.trim() !== "" && slugStatus !== 'taken';
    const isStep2Valid = true; // Optional fields
    const isStep3Valid = !formData.assignAdmin || (formData.admin_first_name.trim() && formData.admin_last_name.trim() && formData.admin_email.trim() && formData.admin_password && formData.admin_password.length >= 8);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-900/5">
                
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Create New Branch</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1.5 hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>

                {/* Stepper */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30">
                    <div className="flex items-center justify-between gap-2">
                        {stepsList.map((s, i) => (
                            <div key={s.id} className="flex items-center flex-1 last:flex-none">
                                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors ${step === s.id ? 'bg-indigo-600 text-white shadow-sm' : step > s.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                                    {step > s.id ? <CheckCircle2 size={14} /> : s.id}
                                </div>
                                <span className={`ml-2.5 text-sm font-medium ${step === s.id ? 'text-indigo-900' : 'text-gray-500'}`}>
                                    {s.title}
                                </span>
                                {i < stepsList.length - 1 && (
                                    <div className="flex-1 h-px bg-gray-200 mx-4" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="create-branch-form" onSubmit={handleSubmit}>
                        
                        {/* STEP 1: BASICS */}
                        {step === 1 && (
                            <div className="animate-in fade-in slide-in-from-right-2 duration-200 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text" required autoFocus
                                        value={formData.name} onChange={handleNameChange}
                                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
                                        placeholder="e.g. Downtown Clinic"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">URL Slug <span className="text-red-500">*</span></label>
                                    <div className="relative flex items-center">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <LinkIcon size={16} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text" required
                                            value={formData.slug} onChange={handleSlugChange}
                                            className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-lg text-sm shadow-sm focus:outline-none focus:ring-1 transition-all font-mono ${
                                                slugStatus === 'taken' ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 
                                                slugStatus === 'available' ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : 
                                                'border-gray-300 focus:border-indigo-600 focus:ring-indigo-600'
                                            }`}
                                            placeholder="downtown-clinic"
                                        />
                                        <div className="absolute right-3.5 flex items-center">
                                            {slugStatus === 'checking' && <Loader2 size={16} className="text-gray-400 animate-spin" />}
                                            {slugStatus === 'available' && <CheckCircle2 size={16} className="text-green-500" />}
                                            {slugStatus === 'taken' && <AlertCircle size={16} className="text-red-500" />}
                                        </div>
                                    </div>
                                    <div className="mt-1.5 flex items-center justify-between">
                                        <p className="text-[13px] text-gray-500">URL: yourdomain.com/<strong>{formData.slug || 'slug'}</strong></p>
                                        {slugStatus === 'taken' && <span className="text-[13px] font-semibold text-red-500">Slug already in use</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: OPERATIONS */}
                        {step === 2 && (
                            <div className="animate-in fade-in slide-in-from-right-2 duration-200 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Address <span className="text-gray-400 font-normal">(Optional)</span></label>
                                    <textarea
                                        rows={3}
                                        value={formData.address} onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all resize-none"
                                        placeholder="e.g. 123 Main St, New Delhi, India 110001"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number <span className="text-gray-400 font-normal">(Optional)</span></label>
                                    <div className="relative flex items-center">
                                        <div className="absolute inset-y-0 left-0 flex items-center">
                                            <select
                                                value={countryCode}
                                                onChange={(e) => setCountryCode(e.target.value)}
                                                className="h-full py-0 pl-3 pr-7 bg-transparent text-gray-500 text-sm border-transparent focus:ring-0 focus:border-transparent outline-none appearance-none cursor-pointer"
                                            >
                                                {COUNTRY_CODES.map((c) => (
                                                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                                <ChevronDown size={14} className="text-gray-400" />
                                            </div>
                                        </div>
                                        <input
                                            type="tel"
                                            value={formData.phone_number} onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                const maxLen = COUNTRY_CODES.find(c => c.code === countryCode)?.maxLength || 15;
                                                if (val.length <= maxLen) setFormData(prev => ({ ...prev, phone_number: val }));
                                            }}
                                            className="w-full pl-[95px] pr-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
                                            placeholder={COUNTRY_CODES.find(c => c.code === countryCode)?.placeholder || "9876543210"}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1.5">Required for WhatsApp integration. Leave blank if not ready.</p>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: ADMIN */}
                        {step === 3 && (
                            <div className="animate-in fade-in slide-in-from-right-2 duration-200">
                                <label className="flex items-center justify-between p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50/50 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Assign Initial Branch Admin</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Create an admin account immediately</p>
                                    </div>
                                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.assignAdmin ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.assignAdmin ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </div>
                                    <input type="checkbox" className="hidden" checked={formData.assignAdmin} onChange={(e) => setFormData(prev => ({ ...prev, assignAdmin: e.target.checked }))} />
                                </label>

                                {formData.assignAdmin && (
                                    <div className="mt-6 pt-6 border-t border-gray-100 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-900 mb-1.5">First Name <span className="text-red-500">*</span></label>
                                                <div className="relative flex items-center">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                        <User size={16} className="text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="text" required maxLength={50}
                                                        value={formData.admin_first_name} onChange={(e) => setFormData(prev => ({ ...prev, admin_first_name: e.target.value }))}
                                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
                                                        placeholder="e.g. Jane"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Last Name <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text" required maxLength={50}
                                                    value={formData.admin_last_name} onChange={(e) => setFormData(prev => ({ ...prev, admin_last_name: e.target.value }))}
                                                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
                                                    placeholder="e.g. Doe"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                                            <div className="relative flex items-center">
                                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                    <Mail size={16} className="text-gray-400" />
                                                </div>
                                                <input
                                                    type="email" required maxLength={100}
                                                    value={formData.admin_email} onChange={(e) => setFormData(prev => ({ ...prev, admin_email: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
                                                    placeholder="jane@company.com"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-1.5">Password <span className="text-red-500">*</span></label>
                                            <div className="relative flex items-center">
                                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                    <Lock size={16} className="text-gray-400" />
                                                </div>
                                                <input
                                                    type="password" required minLength={8} maxLength={128}
                                                    value={formData.admin_password} onChange={(e) => setFormData(prev => ({ ...prev, admin_password: e.target.value }))}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all"
                                                    placeholder="Minimum 8 characters"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => step === 1 ? onClose() : setStep(step - 1)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
                        disabled={isLoading}
                    >
                        {step === 1 ? "Cancel" : "Back"}
                    </button>
                    
                    <button
                        type="submit"
                        form="create-branch-form"
                        disabled={isLoading || (step === 1 && !isStep1Valid) || (step === 3 && !isStep3Valid)}
                        className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 flex items-center"
                    >
                        {isLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : step < 3 ? (
                            "Continue"
                        ) : (
                            "Create Branch"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
