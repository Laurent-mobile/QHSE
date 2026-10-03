// src/components/Modules/IncendieModule.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Flame, FireExtinguisher, Droplets, Bell, Plus, Eye, Edit, Trash2, RefreshCw, Loader } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { Modal } from '../common/Modal';
import { FireEquipmentForm } from '../Forms/FireEquipmentForm';
import { useUserSite } from '../../hooks/useUserSite';
import { useToast } from '../common/Toast';
import { useConfirm } from '../common/ConfirmDialog';

type EquipementIncendie = Database['public']['Tables']['equipements_incendie']['Row'];

export function IncendieModule() {
  const toast = useToast();
  const confirm = useConfirm();
  
  const [equipements, setEquipements] = useState<EquipementIncendie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [selectedEquipement, setSelectedEquipement] = useState<EquipementIncendie | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  
  const [stats, setStats] = useState({
    extincteurs: 0,
    ria: 0,
    alarmes: 0,
    exercices: 4,
  });
  
  const { userSite } = useUserSite();
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null);

  useEffect(() => {
    if (userSite?.site_id) {
      setCurrentSiteId(userSite.site_id);
    }
  }, [userSite]);

  const loadData = useCallback(async () => {
    if (!currentSiteId) return;

    try {
      const { data: equipData, error } = await supabase
        .from('equipements_incendie')
        .select('*')
        .eq('site_id', currentSiteId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const extincteurs = equipData?.filter(e => e.type?.toLowerCase().includes('extincteur')) || [];
      const ria = equipData?.filter(e => e.type?.toLowerCase().includes('ria') || e.type?.toLowerCase().includes('robinet')) || [];
      const alarmes = equipData?.filter(e => e.type?.toLowerCase().includes('alarme') || e.type?.toLowerCase().includes('détecteur')) || [];

      setEquipements(equipData || []);
      setStats({
        extincteurs: extincteurs.length,
        ria: ria.length,
        alarmes: alarmes.length,
        exercices: 4,
      });
    } catch (error) {
      console.error('Error loading fire safety data:', error);
      toast.error('Erreur', 'Impossible de charger les équipements');
    } finally {
      setLoading(false);
    }
  }, [currentSiteId, toast]);

  useEffect(() => {
    if (currentSiteId) {
      loadData();
    }
  }, [currentSiteId, loadData]);

  // 🆕 Fonction pour changer l'état rapidement
  const handleStatusChange = async (equipId: string, newStatus: string) => {
    setUpdatingStatusId(equipId);
    try {
      const { error } = await supabase
        .from('equipements_incendie')
        .update({ status: newStatus })
        .eq('id', equipId);

      if (error) throw error;
      
      const statusLabel = newStatus === 'conforme' ? 'Conforme' : newStatus === 'a_reviser' ? 'À réviser' : 'Hors service';
      toast.success('État mis à jour', `L'équipement est maintenant "${statusLabel}"`);
      loadData();
    } catch (error) {
      console.error('Erreur mise à jour état:', error);
      toast.error('Erreur', 'Impossible de mettre à jour l\'état');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // 🆕 Fonction pour supprimer un équipement
  const handleDelete = async (equip: EquipementIncendie) => {
    const ok = await confirm({
      title: 'Supprimer cet équipement ?',
      message: `L'équipement ${equip.reference} sera définitivement supprimé. Cette action est irréversible.`,
      variant: 'danger',
      confirmText: 'Supprimer',
    });

    if (!ok) return;

    try {
      const { error } = await supabase
        .from('equipements_incendie')
        .delete()
        .eq('id', equip.id);

      if (error) throw error;
      
      toast.success('Équipement supprimé', `Référence: ${equip.reference}`);
      loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur', 'Impossible de supprimer l\'équipement');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'conforme': return 'bg-emerald-100 text-emerald-600';
      case 'a_reviser': return 'bg-orange-100 text-orange-600';
      case 'hors_service': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const nonConformes = equipements.filter(e => e.status !== 'conforme');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sécurité Incendie</h2>
          <p className="text-gray-500">Registre incendie, équipements et exercices d'évacuation</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={() => {
              setModalMode('create');
              setSelectedEquipement(null);
              setShowEquipmentModal(true);
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
          >
            <Plus size={20} />
            Ajouter équipement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <FireExtinguisher className="text-red-500" size={24} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.extincteurs}</p>
          <p className="text-sm text-gray-500">Extincteurs</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Droplets className="text-blue-500" size={24} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.ria}</p>
          <p className="text-sm text-gray-500">RIA (Robinets)</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Bell className="text-orange-500" size={24} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.alarmes}</p>
          <p className="text-sm text-gray-500">Alarmes</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Flame className="text-purple-500" size={24} />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{stats.exercices}</p>
          <p className="text-sm text-gray-500">Exercices/an</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">
          Équipements nécessitant attention {nonConformes.length > 0 && `(${nonConformes.length})`}
        </h3>

        {nonConformes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FireExtinguisher className="text-emerald-500" size={32} />
            </div>
            <p className="text-gray-500">Tous les équipements sont conformes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nonConformes.map((equip) => (
              <div key={equip.id} className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <FireExtinguisher className="text-orange-500" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{equip.reference}</p>
                  <p className="text-sm text-gray-500">{equip.location} • {equip.type}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(equip.status)}`}>
                  {equip.status?.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Tous les équipements</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">Référence</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Localisation</th>
                <th className="pb-3 font-medium">Dernière inspection</th>
                <th className="pb-3 font-medium">Prochaine inspection</th>
                <th className="pb-3 font-medium">État</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {equipements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    Aucun équipement enregistré
                  </td>
                </tr>
              ) : (
                equipements.map((equip) => (
                  <tr key={equip.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-4 font-mono text-gray-600">{equip.reference}</td>
                    <td className="py-4 text-gray-800">{equip.type}</td>
                    <td className="py-4 text-gray-600">{equip.location}</td>
                    <td className="py-4 text-gray-600">
                      {equip.last_inspection ? new Date(equip.last_inspection).toLocaleDateString('fr-FR') : 'N/A'}
                    </td>
                    <td className="py-4 text-gray-600">
                      {equip.next_inspection ? new Date(equip.next_inspection).toLocaleDateString('fr-FR') : 'N/A'}
                    </td>
                    
                    {/* 🆕 COLONNE ÉTAT INTERACTIVE */}
                    <td className="py-4">
                      <select
                        value={equip.status || 'conforme'}
                        onChange={(e) => handleStatusChange(equip.id, e.target.value)}
                        disabled={updatingStatusId === equip.id}
                        className={`text-xs font-semibold rounded-full px-3 py-1.5 border-0 cursor-pointer focus:ring-2 focus:ring-red-500 focus:outline-none transition-all appearance-none ${
                          updatingStatusId === equip.id ? 'opacity-50 cursor-wait' : 'hover:brightness-95'
                        } ${getStatusColor(equip.status)}`}
                      >
                        <option value="conforme">✅ Conforme</option>
                        <option value="a_reviser">⚠️ À réviser</option>
                        <option value="hors_service">❌ Hors service</option>
                      </select>
                    </td>

                    {/* 🆕 COLONNE ACTIONS FONCTIONNELLE */}
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setModalMode('view');
                            setSelectedEquipement(equip);
                            setShowEquipmentModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                          title="Voir les détails"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setModalMode('edit');
                            setSelectedEquipement(equip);
                            setShowEquipmentModal(true);
                          }}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" 
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(equip)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showEquipmentModal}
        onClose={() => setShowEquipmentModal(false)}
        title={
          modalMode === 'create' ? "Ajouter un équipement incendie" : 
          modalMode === 'edit' ? "Modifier l'équipement" : 
          "Détails de l'équipement"
        }
        size="lg"
      >
        <FireEquipmentForm
          equipment={selectedEquipement}
          mode={modalMode}
          onSuccess={() => {
            setShowEquipmentModal(false);
            toast.success(modalMode === 'create' ? 'Équipement ajouté' : 'Équipement mis à jour');
            loadData();
          }}
          onCancel={() => setShowEquipmentModal(false)}
        />
      </Modal>
    </div>
  );
}
