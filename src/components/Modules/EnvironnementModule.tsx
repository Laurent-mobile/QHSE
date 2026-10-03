import { useState, useMemo } from 'react';
import { Leaf, Recycle, Cloud, AlertCircle, Plus, RefreshCw, Trash2, Loader } from 'lucide-react';
import { Modal } from '../common/Modal';
import { IncidentForm } from '../Forms/IncidentForm';
import { useUserSite } from '../../hooks/useUserSite';
import { useIncidents } from '../../hooks/useIncidents';
import { useIncidentStore } from '../../stores/incidentStore';
import { useToast } from '../common/Toast';
import { useConfirm } from '../common/ConfirmDialog';

export function EnvironnementModule() {
  const toast = useToast();
  const confirm = useConfirm();
  const { userSite } = useUserSite();
  const { deleteIncident } = useIncidentStore();
  
  // 🆕 Hook centralisé avec filtre "environnement"
  const { 
    incidents, 
    loading, 
    refresh, 
    lastSync,
    realtimeEnabled,
    stats
  } = useIncidents('environnement');

  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [showIncidentDetailModal, setShowIncidentDetailModal] = useState(false);

  const handleDeleteIncident = async (incident: any) => {
    const ok = await confirm({
      title: 'Supprimer cet incident ?',
      message: `L'incident ${incident.reference} sera définitivement supprimé.`,
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

  const moduleStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      totalIncidents: incidents.length,
      incidentsThisMonth: incidents.filter(inc => 
        new Date(inc.incident_date || inc.created_at) >= startOfMonth
      ).length,
      incidentsOpen: incidents.filter(inc => 
        inc.status === 'ouvert' || inc.status === 'en_cours'
      ).length,
      incidentsClosed: incidents.filter(inc => inc.status === 'cloture').length,
      co2Evite: incidents.filter(inc => inc.status === 'cloture').length * 5,
    };
  }, [incidents]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critique': return 'bg-red-100 text-red-600';
      case 'grave': return 'bg-orange-100 text-orange-600';
      case 'moyen': return 'bg-yellow-100 text-yellow-600';
      default: return 'bg-blue-100 text-blue-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cloture': return 'bg-emerald-100 text-emerald-600';
      case 'en_cours': return 'bg-blue-100 text-blue-600';
      default: return 'bg-orange-100 text-orange-600';
    }
  };

  if (!userSite?.site_id && !loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-orange-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun site assigné</h3>
          <p className="text-gray-500">Veuillez contacter votre administrateur.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Environnement</h2>
          <p className="text-gray-500">
            Site: {userSite?.site_name}
            {realtimeEnabled && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-600">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Temps réel
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={() => setShowIncidentModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl flex items-center gap-2"
          >
            <Plus size={20} />
            Signaler incident
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-5 text-white">
          <Recycle className="text-3xl opacity-50 mb-2" size={32} />
          <p className="text-2xl font-bold">{moduleStats.totalIncidents}</p>
          <p className="text-sm opacity-80">Total incidents</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-blue-500" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{moduleStats.incidentsThisMonth}</p>
              <p className="text-xs text-gray-500">Incidents ce mois</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="text-orange-500" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{moduleStats.incidentsOpen}</p>
              <p className="text-xs text-gray-500">En cours</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Cloud className="text-gray-500" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{moduleStats.co2Evite}t</p>
              <p className="text-xs text-gray-500">CO2 évité</p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des incidents */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center justify-between">
          <span>Incidents environnementaux</span>
          <span className="text-sm text-gray-500">{incidents.length} incident(s)</span>
        </h3>
        
        {loading && incidents.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader className="animate-spin" size={32} />
          </div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-12">
            <Leaf size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Aucun incident environnemental enregistré</p>
            <button
              onClick={() => setShowIncidentModal(true)}
              className="mt-4 text-green-600 hover:text-green-700 font-medium"
            >
              + Signaler un incident
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  setSelectedIncident(incident);
                  setShowIncidentDetailModal(true);
                }}
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Leaf className="text-green-500" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800 truncate">{incident.title}</p>
                    <span className="text-xs text-gray-400 font-mono">{incident.reference}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{new Date(incident.incident_date || incident.created_at).toLocaleDateString('fr-FR')}</span>
                    <span>•</span>
                    <span className="truncate">{incident.location || 'Lieu non spécifié'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityBadge(incident.severity)}`}>
                    {incident.severity}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(incident.status)}`}>
                    {incident.status === 'cloture' ? 'Clôturé' : incident.status === 'en_cours' ? 'En cours' : 'Ouvert'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteIncident(incident);
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Incident */}
      <Modal
        isOpen={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        title="Signaler un incident environnemental"
        size="lg"
      >
        <IncidentForm
          module="environnement"
          onSuccess={() => {
            setShowIncidentModal(false);
            toast.success('Incident enregistré');
          }}
          onCancel={() => setShowIncidentModal(false)}
        />
      </Modal>

      {/* Modal Détail Incident */}
      <Modal
        isOpen={showIncidentDetailModal}
        onClose={() => {
          setShowIncidentDetailModal(false);
          setSelectedIncident(null);
        }}
        title="Détail de l'incident"
        size="lg"
      >
        {selectedIncident && (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm text-gray-600">{selectedIncident.reference}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityBadge(selectedIncident.severity)}`}>
                  {selectedIncident.severity}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 text-lg">{selectedIncident.title}</h3>
              <p className="text-gray-600 mt-2">{selectedIncident.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Lieu</label>
                <p className="font-medium">{selectedIncident.location || 'Non spécifié'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Date</label>
                <p className="font-medium">
                  {new Date(selectedIncident.incident_date || selectedIncident.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Statut</label>
                <p className="font-medium">
                  <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(selectedIncident.status)}`}>
                    {selectedIncident.status === 'cloture' ? 'Clôturé' : 
                     selectedIncident.status === 'en_cours' ? 'En cours' : 'Ouvert'}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Type</label>
                <p className="font-medium">{selectedIncident.type?.replace(/_/g, ' ') || 'Non spécifié'}</p>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowIncidentDetailModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setShowIncidentDetailModal(false);
                  handleDeleteIncident(selectedIncident);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
