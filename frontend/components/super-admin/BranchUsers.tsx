import { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/types/api";

export function BranchUsers({ orgId }: { orgId: string }) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [role, setRole] = useState<"admin" | "staff">("staff");
    const [password, setPassword] = useState("");
    const [isActive, setIsActive] = useState(true);

    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.getOrgUsers(orgId, 100, 0); // Load up to 100 for now
            setUsers(res.items);
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : "Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orgId) loadUsers();
    }, [orgId]);

    const handleCreate = async () => {
        if (!email || !firstName || !lastName || !password) {
            alert("Please fill all fields");
            return;
        }
        setIsSaving(true);
        try {
            await api.createOrgUser(orgId, {
                email,
                first_name: firstName,
                last_name: lastName,
                role,
                password
            });
            setShowCreate(false);
            loadUsers();
        } catch (err) {
            alert(err instanceof ApiError ? err.detail : "Failed to create user");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = async () => {
        if (!showEdit) return;
        setIsSaving(true);
        try {
            await api.updateOrgUser(orgId, showEdit.id, {
                email,
                first_name: firstName,
                last_name: lastName,
                role,
                is_active: isActive,
                new_password: password || undefined
            });
            setShowEdit(null);
            loadUsers();
        } catch (err) {
            alert(err instanceof ApiError ? err.detail : "Failed to update user");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
        try {
            await api.deleteOrgUser(orgId, userId);
            loadUsers();
        } catch (err) {
            alert(err instanceof ApiError ? err.detail : "Failed to delete user");
        }
    };

    const openCreate = () => {
        setEmail("");
        setFirstName("");
        setLastName("");
        setRole("staff");
        setPassword("");
        setShowCreate(true);
    };

    const openEdit = (u: User) => {
        setEmail(u.email);
        setFirstName(u.first_name || "");
        setLastName(u.last_name || "");
        setRole(u.role as "admin" | "staff");
        setIsActive(u.is_active);
        setPassword("");
        setShowEdit(u);
    };

    if (loading) return <div className="text-slate-500 animate-pulse mt-6">Loading users...</div>;
    if (error) return <div className="text-red-400 mt-6">{error}</div>;

    return (
        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl mt-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    Branch Admins & Staff
                </h2>
                <button onClick={openCreate} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors">
                    + Add User
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead>
                        <tr className="border-b border-slate-700/50 text-slate-400">
                            <th className="pb-3 font-medium">Name</th>
                            <th className="pb-3 font-medium">Email</th>
                            <th className="pb-3 font-medium">Role</th>
                            <th className="pb-3 font-medium">Status</th>
                            <th className="pb-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                        {users.map(u => (
                            <tr key={u.id} className="group hover:bg-slate-700/20 transition-colors">
                                <td className="py-3 font-medium text-white">{u.first_name} {u.last_name}</td>
                                <td className="py-3">{u.email}</td>
                                <td className="py-3">
                                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${
                                        u.role === 'admin' 
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    }`}>
                                        {u.role.toUpperCase()}
                                    </span>
                                </td>
                                <td className="py-3">
                                    {u.is_active ? (
                                        <span className="text-emerald-400 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Active</span>
                                    ) : (
                                        <span className="text-red-400 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400" /> Inactive</span>
                                    )}
                                </td>
                                <td className="py-3 text-right">
                                    <button onClick={() => openEdit(u)} className="px-2 py-1 text-slate-400 hover:text-blue-400 rounded-md transition-colors">Edit</button>
                                    <button onClick={() => handleDelete(u.id)} className="px-2 py-1 text-slate-400 hover:text-red-400 rounded-md transition-colors ml-1">Delete</button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-6 text-center text-slate-500 italic">No users found for this branch.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal for Create / Edit */}
            {(showCreate || showEdit) && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowCreate(false); setShowEdit(null); }} />
                    <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
                        <h3 className="text-xl font-bold text-white">{showCreate ? "Add New User" : "Edit User"}</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">First Name</label>
                                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Last Name</label>
                                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
                                <select value={role} onChange={e => setRole(e.target.value as "admin" | "staff")} className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors">
                                    <option value="admin">Admin</option>
                                    <option value="staff">Staff</option>
                                </select>
                            </div>
                            {showEdit && (
                                <div className="flex items-center gap-2 mt-2">
                                    <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-slate-700 text-violet-500 focus:ring-violet-500 bg-slate-900/60" />
                                    <label htmlFor="isActive" className="text-sm text-slate-300">Active Account</label>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">{showEdit ? "Reset Password (Optional)" : "Password"}</label>
                                <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button onClick={() => { setShowCreate(false); setShowEdit(null); }} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors">Cancel</button>
                            <button onClick={showCreate ? handleCreate : handleEdit} disabled={isSaving} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                                {isSaving ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
