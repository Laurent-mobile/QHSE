// src/components/Users/UserSitesModal.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building, Plus, X, Loader, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { Modal } from '../common/Modal';

interface UserSitesModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
    onSuccess: () => void;
}

export function UserSitesModal({ isOpen, onClose, userId, userName, onSuccess }: UserSitesModalProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sites, setSites] = useState<any[]>([]);
    const [userSites, setUserSites] = useState<string[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            loadData();
        }
    }, [isOpen, userId]);

    async function loadData() {
        setLoading(true);
        setError(null);
        try {
            const { data: sitesData } = await supabase
                .from('sites')
                .select('id, name, code')
                .eq('is_active', true)
                .order('name');

            const { data: userSitesData } = await supabase
                .from('user_sites')
                .select('site_id')
                .eq('user_id', userId);

            setSites(sitesData || []);
            setUserSites(userSitesData?.map(us => us.site_id) || []);
        } catch (error) {
            console.error('Error loading data:', error);
            setError('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    }

    async function addSite() {
        if (!selectedSiteId) return;
        setSaving(true);
        setError(null);
        try {
            const { error } = await supabase
                .from('user_sites')
                .insert({ user_id: userId, site_id: selectedSiteId });

            if (error) throw error;
            setUserSites(prev => [...prev, selectedSiteId]);
            setSelectedSiteId('');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
            onSuccess();
        } catch (error) {
            console.error('Error adding site:', error);
            setError('Erreur lors de l\'ajout du site');
        } finally {
            setSaving(false);
        }
    }

    async function removeSite(siteId: string) {
        setSaving(true);
        setError(null);
        try {
            const { error } = await supabase
                .from('user_sites')
                .delete()
                .eq('user_id', userId)
                .eq('site_id', siteId);

            if (error) throw error;
            setUserSites(prev => prev.filter(id => id !== siteId));
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
            onSuccess();
        } catch (error) {
            console.error('Error removing site:', error);
            setError('Erreur lors de la suppression du site');
        } finally {
            setSaving(false);
        }
    }

    const availableSites = sites.filter(site =>
        !userSites.includes(site.id) &&
        (searchTerm === '' || site.name.toLowerCase().includes(searchTerm.toLowerCase()) || site.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const assignedSites = sites.filter(site => userSites.includes(site.id));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Sites de ${userName || 'l\'utilisateur'}`} size="lg">
            <div className="space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                        <AlertCircle size={18} className="text-red-500" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                        <CheckCircle size={18} className="text-emerald-500" />
                        <p className="text-sm text-emerald-700">Modification effectuée avec succès</p>
                    </div>
                )}

                {/* Sites assignés */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Building size={18} className="text-emerald-500" />
                        Sites assignés ({assignedSites.length})
                    </h3>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader className="animate-spin" size={24} />
                        </div>
                    ) : assignedSites.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-xl">
                            <Building size={32} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-gray-500 text-sm">Aucun site assigné</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {assignedSites.map(site => (
                                <div key={site.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-800">{site.name}</p>
                                        <p className="text-xs text-gray-400">Code: {site.code}</p>
                                    </div>
                                    <button
                                        onClick={() => removeSite(site.id)}
                                        disabled={saving}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Ajouter un site */}
                {availableSites.length > 0 && (
                    <div className="border-t pt-4">
                        <h3 className="font-semibold text-gray-800 mb-3">Ajouter un site</h3>

                        <div className="relative mb-3">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Rechercher un site..."
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                            />
                        </div>

                        <div className="flex gap-2">
                            <select
                                value={selectedSiteId}
                                onChange={(e) => setSelectedSiteId(e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                disabled={loading || saving}
                            >
                                <option value="">Sélectionner un site</option>
                                {availableSites.map(site => (
                                    <option key={site.id} value={site.id}>
                                        {site.name} ({site.code})
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={addSite}
                                disabled={!selectedSiteId || saving || loading}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                                Ajouter
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                        Fermer
                    </button>
                </div>
            </div>
        </Modal>
    );
}
