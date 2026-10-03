import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import {
  Ambulance, AlertTriangle, HardHat, GraduationCap, Plus, Calendar,
  CheckCircle, Eye, Edit, Trash2, RefreshCw, Loader, Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../common/Modal';
import { useUserSite } from '../../hooks/useUserSite';
import { useIncidents } from '../../hooks/useIncidents';
import { useIncidentStore } from '../../stores/incidentStore';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../common/Toast';
import { useConfirm } from '../common/ConfirmDialog';

const IncidentForm = lazy(() => import('../Forms/IncidentForm').then(m => ({ default: m.IncidentForm })));

export function SSTModule() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { userSite } = useUserSite();
  
  // Hook centralisé avec filtre "sst"
  const { 
    incidents, 
    loading, 
    refresh, 
    lastSync,
    realtimeEnabled,
  } = useIncidents('sst');
  
  const { deleteIncident, updateIncidentInDb } = useIncidentStore();
  
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 🆕 État pour gérer l'indicateur de chargement lors du changement de statut
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Statistiques calculées
  const moduleStats = useMemo(() => ({
    accidents: incidents.filter(i => i.type === 'accident').length,
    presqueAccidents: incidents.filter(i => i.type === 'presque_accident').length,
    incidentsOuverts: incidents.filter(i => i.status === 'ouvert').length,
    incidentsClotures: incidents.filter(i => i.status === 'cloture').length,
  }), [incidents]);

  // Recherche
  const filteredIncidents = useMemo(() => {
    if (!searchTerm) return incidents;
    const search = searchTerm.toLowerCase();
    return incidents.filter(i => 
      i.title?.toLowerCase().includes(search) ||
      i.reference?.toLowerCase().includes(search) ||
      i.location?.toLowerCase().includes(search)
    );
  }, [incidents, searchTerm]);

  // Handler de suppression avec confirmation
  const handleDeleteIncident = async (incident: any) => {
    const ok = await confirm({
      title: 'Supprimer cet incident ?',
      message: `L'incident ${incident.reference} sera définitivement supprimé. Cette action est irréversible.`,
      variant: 'danger',
      confirmText: 'Supprimer',
    });

    if (!ok) return;

    const success = await deleteIncident(incident.id);
    if (success) {
      toast.success('Incident supprimé', `Référence: ${incident.reference}`);
    } else {
      toast.error('Erreur', 'Impossible de supprimer l\'incident');
    }
  };

  // 🆕 Handler pour changer le statut rapidement avec commentaire automatique
  const handleStatusChange = async (incidentId: string, newStatus: 'ouvert' | 'en_cours' | 'cloture') => {
    setUpdatingStatusId(incidentId);
    try {
      const success = await updateIncidentInDb(incidentId, { status: newStatus });
      
      if (success) {
        // Bonus : Ajouter un commentaire système automatique pour tracer l'action
        if (user) {
          await supabase.from('incident_comments').insert({
            incident_id: incidentId,
            user_id: user.id,
            content: `Statut changé en : ${newStatus === 'cloture' ? 'Clôturé' : newStatus === 'en_cours' ? 'En cours' : 'Ouvert'}`,
            is_internal: true,
          });
        }
        
        const statusLabel = newStatus === 'cloture' ? 'Clôturé' : newStatus === 'en_cours' ? 'En cours' : 'Ouvert';
        toast.success('Statut mis à jour', `L'incident est maintenant "${statusLabel}"`);
      } else {
        toast.error('Erreur', 'Impossible de mettre à jour le statut');
      }
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      toast.error('Erreur', 'Une erreur est survenue lors de la mise à jour');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const openModal = (mode: 'create' | 'edit' | 'view', item?: any) => {
    setModalMode(mode);
    setSelectedItem(item || null);
    setShowIncidentModal(true);
  };

  const closeModal = () => {
    setShowIncidentModal(false);
    setSelectedItem(null);
  };

  // Gestion des états de chargement
  if (!userSite?.site_id) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-orange-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun site assigné</h3>
          <p className="text-gray-500">Veuillez contacter votre administrateur.</p>
        </div>
      </div>
    );
  }

  if (loading && incidents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Chargement des incidents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Santé & Sécurité au Travail</h2>
          <p className="text-gray-500">
            Site: {userSite.site_name}
            {realtimeEnabled && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-600">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Temps réel
              </span>
            )}
            {lastSync && (
              <span className="ml-2 text-xs text-gray-400">
                • Sync: {lastSync.toLocaleTimeString('fr-FR')}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={() => openModal('create')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Nouveau signalement
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Ambulance className="text-red-500" size={20} />}
          value={moduleStats.accidents}
          label="Accidents"
          bgColor="bg-red-100"
        />
        <StatCard
          icon={<AlertTriangle className="text-orange-500" size={20} />}
          value={moduleStats.presqueAccidents}
          label="Presque-accidents"
          bgColor="bg-orange-100"
        />
        <StatCard
          icon={<AlertTriangle className="text-yellow-500" size={20} />}
          value={moduleStats.incidentsOuverts}
          label="Incidents ouverts"
          bgColor="bg-yellow-100"
        />
        <StatCard
          icon={<CheckCircle className="text-emerald-500" size={20} />}
          value={moduleStats.incidentsClotures}
          label="Incidents clôturés"
          bgColor="bg-emerald-100"
        />
      </div>

      {/* Liste des incidents */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h3 className="font-semibold text-gray-800">
              Incidents ({filteredIncidents.length})
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>
          
          {loading && incidents.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader className="animate-spin text-orange-500" size={32} />
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Aucun incident enregistré</p>
              <button
                onClick={() => openModal('create')}
                className="mt-4 text-orange-600 hover:text-orange-700 font-medium"
              >
                + Créer le premier incident
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-3 font-medium">Référence</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Titre</th>
                    <th className="pb-3 font-medium">Lieu</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Gravité</th>
                    <th className="pb-3 font-medium">Statut</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((incident) => (
                    <tr key={incident.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-4 font-mono text-xs text-gray-600">{incident.reference}</td>
                      <td className="py-4">
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 capitalize">
                          {incident.type?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 text-gray-800 max-w-xs truncate font-medium">{incident.title}</td>
                      <td className="py-4 text-gray-600">{incident.location || 'N/A'}</td>
                      <td className="py-4 text-gray-600 whitespace-nowrap">
                        {new Date(incident.incident_date || incident.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          incident.severity === 'critique' || incident.severity === 'grave' ? 'bg-red-100 text-red-700' :
                          incident.severity === 'moyen' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {incident.severity}
                        </span>
                      </td>
                      
                      {/* 🆕 COLONNE STATUT INTERACTIVE */}
                      <td className="py-4">
                        <select
                          value={incident.status}
                          onChange={(e) => handleStatusChange(incident.id, e.target.value as 'ouvert' | 'en_cours' | 'cloture')}
                          disabled={updatingStatusId === incident.id}
                          className={`text-xs font-semibold rounded-full px-3 py-1.5 border-0 cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all appearance-none ${
                            updatingStatusId === incident.id ? 'opacity-50 cursor-wait' : 'hover:brightness-95'
                          } ${
                            incident.status === 'cloture' ? 'bg-emerald-100 text-emerald-700' :
                            incident.status === 'en_cours' ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                          }`}
                        >
                          <option value="ouvert">🔴 Ouvert</option>
                          <option value="en_cours">🟡 En cours</option>
                          <option value="cloture">🟢 Clôturé</option>
                        </select>
                      </td>

                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => openModal('view', incident)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Voir les détails"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => openModal('edit', incident)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteIncident(incident)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Incident */}
      <Suspense fallback={
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <Loader className="animate-spin text-orange-500 mx-auto mb-4" size={32} />
            <p className="text-gray-600 text-center">Chargement du formulaire...</p>
          </div>
        </div>
      }>
        {showIncidentModal && (
          <Modal
            isOpen={showIncidentModal}
            onClose={closeModal}
            title={modalMode === 'create' ? 'Nouveau signalement' : modalMode === 'edit' ? 'Modifier l\'incident' : 'Détails de l\'incident'}
            size="lg"
          >
            <IncidentForm
              module="sst"
              incident={selectedItem}
              mode={modalMode}
              onSuccess={() => {
                closeModal();
                toast.success('Incident enregistré avec succès');
              }}
              onCancel={closeModal}
            />
          </Modal>
        )}
      </Suspense>
    </div>
  );
}

// Composant mémoisé pour les cartes de statistiques
const StatCard = React.memo(({ icon, value, label, bgColor }: any) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      </div>
    </div>
  </div>
));
