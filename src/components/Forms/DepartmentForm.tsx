// src/components/Forms/DepartmentForm.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';

interface Department {
    id?: string;
    name?: string;
    description?: string | null;
    site_id?: string | null;
    manager_id?: string | null;
    is_active?: boolean;
    code?: string;
    created_at?: string;
    updated_at?: string;
}

interface DepartmentFormProps {
    department?: Department;
    mode: 'create' | 'edit' | 'view';
    onSuccess: () => void;
    onCancel: () => void;
}

export function DepartmentForm({ department, mode, onSuccess, onCancel }: DepartmentFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sites, setSites] = useState<{ id: string; name: string; code: string }[]>([]);
    const [managers, setManagers] = useState<{ id: string; full_name: string; email: string }[]>([]);
    const [checkingName, setCheckingName] = useState(false);
    const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);

    const [formData, setFormData] = useState<Department>({
        name: department?.name || '',
        description: department?.description || '',
        site_id: department?.site_id || null,
        manager_id: department?.manager_id || null,
        is_active: department?.is_active !== undefined ? department.is_active : true
    });

    useEffect(() => {
        loadSites();
        loadManagers();
    }, []);

    // Vérifier si le nom existe déjà
    const checkNameAvailability = useCallback(async (name: string) => {
        if (!name || name.length < 2) {
            setNameAvailable(null);
            return;
        }

        setCheckingName(true);
        try {
            let query = supabase
                .from('departments')
                .select('id')
                .eq('name', name.trim());

            if (mode === 'edit' && department) {
                query = query.neq('id', department.id);
            }

            const { data, error } = await query.maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('Name check error:', error);
            }

            if (data) {
                setNameAvailable(false);
                setError(`Le nom "${name}" est déjà utilisé. Veuillez en choisir un autre.`);
            } else {
                setNameAvailable(true);
                setError(null);
            }
        } catch (error) {
            console.error('Error checking name:', error);
        } finally {
            setCheckingName(false);
        }
    }, [mode, department]);

    // Debounce pour la vérification du nom
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.name) {
                checkNameAvailability(formData.name);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.name, checkNameAvailability]);

    async function loadSites() {
        try {
            const { data, error } = await supabase
                .from('sites')
                .select('id, name, code')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setSites(data || []);
        } catch (error) {
            console.error('Error loading sites:', error);
        }
    }

    async function loadManagers() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('role', ['administrateur', 'chef_site', 'direction', 'responsable_hse'])
                .order('full_name');

            if (error) throw error;
            setManagers(data || []);
        } catch (error) {
            console.error('Error loading managers:', error);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Vérifier si le nom est disponible
        if (nameAvailable === false) {
            setError('Ce nom de département est déjà utilisé');
            setLoading(false);
            return;
        }

        if (!formData.name.trim()) {
            setError('Le nom du département est requis');
            setLoading(false);
            return;
        }

        try {
            // Générer un code automatiquement à partir du nom
            const autoCode = formData.name
                .toUpperCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^A-Z0-9]/g, '_')
                .substring(0, 20);

            // Vérifier si le code existe déjà
            let finalCode = autoCode;
            let counter = 1;
            let codeExists = true;

            while (codeExists) {
                const { data: existingDept, error: checkError } = await supabase
                    .from('departments')
                    .select('id')
                    .eq('code', finalCode)
                    .maybeSingle();

                if (checkError && checkError.code !== 'PGRST116') {
                    throw checkError;
                }

                if (!existingDept) {
                    codeExists = false;
                } else if (mode === 'edit' && existingDept.id === department?.id) {
                    codeExists = false;
                } else {
                    finalCode = `${autoCode}_${counter}`;
                    counter++;
                }
            }

            const insertData: Department = {
                name: formData.name.trim(),
                code: finalCode,
                description: formData.description?.trim() || null,
                site_id: formData.site_id || null,
                manager_id: formData.manager_id || null,
                is_active: formData.is_active
            };

            console.log('Inserting department:', insertData);

            if (mode === 'create') {
                const { error } = await supabase
                    .from('departments')
                    .insert<Department>([insertData]);

                if (error) {
                    console.error('Insert error:', error);
                    if (error.code === '23505') {
                        if (error.message.includes('name')) {
                            setError('Ce nom de département existe déjà');
                        } else if (error.message.includes('code')) {
                            setError('Un problème est survenu avec le code généré');
                        } else {
                            setError('Un département avec ces informations existe déjà');
                        }
                    } else {
                        throw error;
                    }
                    setLoading(false);
                    return;
                }
            } else if (mode === 'edit' && department) {
                const updateData: Department = {
                    name: formData.name.trim(),
                    description: formData.description?.trim() || null,
                    site_id: formData.site_id || null,
                    manager_id: formData.manager_id || null,
                    is_active: formData.is_active,
                    updated_at: new Date().toISOString()
                };

                const { error } = await supabase
                    .from('departments')
                    .update(updateData)
                    .eq('id', department.id);

                if (error) {
                    console.error('Update error:', error);
                    if (error.code === '23505') {
                        setError('Ce nom de département existe déjà');
                    } else {
                        throw error;
                    }
                    setLoading(false);
                    return;
                }
            }

            onSuccess();
        } catch (err) {
            if (err instanceof Error) {
                console.error('Error saving department:', err);
                setError(err.message || 'Erreur lors de l\'enregistrement');
            } else {
                console.error('Error saving department:', err);
                setError('Erreur lors de l\'enregistrement');
            }
        } finally {
            setLoading(false);
        }
    }

    if (mode === 'view' && department) {
        return (
            <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm text-gray-600">{department.code}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${department.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                            {department.is_active ? 'Actif' : 'Inactif'}
                        </span>
                    </div>
                    <h3 className="font-bold text-gray-800 text-lg">{department.name}</h3>
                    {department.description && (
                        <p className="text-gray-600 mt-2">{department.description}</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-gray-500">Site</label>
                        <p className="font-medium">{sites.find(s => s.id === department.site_id)?.name || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-500">Responsable</label>
                        <p className="font-medium">{managers.find(m => m.id === department.manager_id)?.full_name || '-'}</p>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button onClick={onCancel} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
                        Fermer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="text-red-500" size={20} />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du département *
                </label>
                <div className="relative">
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Production, Ressources Humaines, QHSE..."
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 ${nameAvailable === false ? 'border-red-500 bg-red-50' :
                                nameAvailable === true ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                            }`}
                        disabled={loading}
                    />
                    {checkingName && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader size={16} className="animate-spin text-gray-400" />
                        </div>
                    )}
                    {nameAvailable === true && !checkingName && (
                        <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                    )}
                </div>
                {nameAvailable === false && (
                    <p className="text-xs text-red-500 mt-1">Ce nom est déjà utilisé</p>
                )}
                {nameAvailable === true && (
                    <p className="text-xs text-emerald-500 mt-1">Nom disponible</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                    Le code sera généré automatiquement à partir du nom
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Description du département..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    disabled={loading}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Site
                    </label>
                    <select
                        value={formData.site_id || ''}
                        onChange={(e) => setFormData({ ...formData, site_id: e.target.value || null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        disabled={loading}
                    >
                        <option value="">Non assigné</option>
                        {sites.map(site => (
                            <option key={site.id} value={site.id}>{site.name} ({site.code})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Responsable
                    </label>
                    <select
                        value={formData.manager_id || ''}
                        onChange={(e) => setFormData({ ...formData, manager_id: e.target.value || null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        disabled={loading}
                    >
                        <option value="">Non assigné</option>
                        {managers.map(manager => (
                            <option key={manager.id} value={manager.id}>{manager.full_name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Département actif</label>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="sr-only peer"
                        disabled={loading}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                    Annuler
                </button>
                <button
                    type="submit"
                    disabled={loading || nameAvailable === false || checkingName}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                    {mode === 'create' ? 'Créer le département' : 'Enregistrer les modifications'}
                </button>
            </div>
        </form>
    );
}
