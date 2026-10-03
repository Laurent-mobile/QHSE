// src/components/Forms/UserSitesForm.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building, Plus, X, Loader, CheckCircle, AlertCircle } from 'lucide-react';

interface UserSitesFormProps {
    userId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export function UserSitesForm({ userId, onSuccess, onCancel }: UserSitesFormProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [sites, setSites] = useState<{ id: string; name: string; code: string }[]>([]);
    const [userSites, setUserSites] = useState<string[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string>('');

    useEffect(() => {
        loadSites();
        loadUserSites();
    }, []);

    async function loadSites() {
        try {
            const { data, error } = await supabase
                .from('sites')
                .select('id, name, code')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setSites(data || []);
            if (data && data.length > 0) {
                setSelectedSiteId(data[0].id);
            }
        } catch (error) {
            console.error('Error loading sites:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadUserSites() {
        try {
            const { data, error } = await supabase
                .from('user_sites')
                .select('site_id')
                .eq('user_id', userId);

            if (error) throw error;
            setUserSites(data?.map(us => us.site_id) || []);
        } catch (error) {
            console.error('Error loading user sites:', error);
        }
    }

    async function addSite() {
        if (!selectedSiteId || userSites.includes(selectedSiteId)) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('user_sites')
                .insert({
                    user_id: userId,
                    site_id: selectedSiteId
                });

            if (error) throw error;

            setUserSites(prev => [...prev, selectedSiteId]);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        } catch (error: any) {
            setError(error.message);
            setTimeout(() => setError(null), 3000);
        } finally {
            setSaving(false);
        }
    }

    async function removeSite(siteId: string) {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('user_sites')
                .delete()
                .eq('user_id', userId)
                .eq('site_id', siteId);

            if (error) throw error;

            setUserSites(prev => prev.filter(id => id !== siteId));
        } catch (error: any) {
            setError(error.message);
            setTimeout(() => setError(null), 3000);
        } finally {
            setSaving(false);
        }
    }

    const availableSites = sites.filter(site => !userSites.includes(site.id));

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="text-red-500" size={20} />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="text-emerald-500" size={20} />
                    <p className="text-sm text-emerald-700">Site ajouté avec succès</p>
                </div>
            )}

            {/* Sites actuels */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sites d'affectation
                </label>
                <div className="space-y-2">
                    {userSites.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Aucun site affecté</p>
                    ) : (
                        userSites.map(siteId => {
                            const site = sites.find(s => s.id === siteId);
                            return (
                                <div key={siteId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Building size={16} className="text-gray-500" />
                                        <span className="font-medium">{site?.name}</span>
                                        <span className="text-xs text-gray-400">({site?.code})</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeSite(siteId)}
                                        disabled={saving}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Ajouter un site */}
            {availableSites.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ajouter un site
                    </label>
                    <div className="flex gap-2">
                        <select
                            value={selectedSiteId}
                            onChange={(e) => setSelectedSiteId(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        >
                            {availableSites.map(site => (
                                <option key={site.id} value={site.id}>
                                    {site.name} ({site.code})
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={addSite}
                            disabled={saving || !selectedSiteId}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                        >
                            {saving ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                            Ajouter
                        </button>
                    </div>
                </div>
            )}

            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg"
                >
                    Fermer
                </button>
                <button
                    type="button"
                    onClick={onSuccess}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg"
                >
                    Terminer
                </button>
            </div>
        </div>
    );
}
