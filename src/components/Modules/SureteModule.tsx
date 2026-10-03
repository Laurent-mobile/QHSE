import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Users, KeyRound, AlertCircle, UserPlus, Plus, QrCode, 
  Clock, Building, UserCircle, BadgeCheck, LogOut, Eye, CreditCard,
  Edit, Trash2, RefreshCw, Loader
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import { Modal } from '../common/Modal';
import { VisitorForm } from '../Forms/VisitorForm';
import { IncidentForm } from '../Forms/IncidentForm';
import { QRScanner } from '../common/QRScanner';
import { useUserSite } from '../../hooks/useUserSite';
import { useToast } from '../common/Toast';
import { useConfirm } from '../common/ConfirmDialog';

type Visiteur = Database['public']['Tables']['visiteurs']['Row'];
type Incident = Database['public']['Tables']['incidents']['Row'];

export function SureteModule() {
  const toast = useToast();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'visiteurs' | 'acces' | 'incidents'>('visiteurs');
  const [visiteurs, setVisiteurs] = useState<Visiteur[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visiteur | null>(null);
  
  // 🆕 États pour la gestion des incidents (Edit/View)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidentModalMode, setIncidentModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [updatingIncidentStatusId, setUpdatingIncidentStatusId] = useState<string | null>(null);
  
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'today'>('all');
  const [qrScanResult, setQrScanResult] = useState<string | null>(null);
  const [badgesStats, setBadgesStats] = useState({ total: 0, disponible: 0, attribue: 0 });

  const { userSite } = useUserSite();
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null);

  useEffect(() => {
    if (userSite?.site_id) setCurrentSiteId(userSite.site_id);
  }, [userSite]);

  const loadData = useCallback(async () => {
    if (!currentSiteId) return;
    try {
      const visiteursQuery = supabase.from('visiteurs').select('*').eq('site_id', currentSiteId).order('entry_time', { ascending: false });
      const incidentsQuery = supabase.from('incidents').select('*').eq('module', 'surete').eq('site_id', currentSiteId).order('created_at', { ascending: false });
      const badgesQuery = supabase.from('badges').select('status').eq('site_id', currentSiteId);
      
      const [visiteursResult, incidentsResult, badgesResult] = await Promise.all([visiteursQuery, incidentsQuery, badgesQuery]);
      
      setVisiteurs(visiteursResult.data || []);
      setIncidents(incidentsResult.data || []);
      
      const badgesData = badgesResult.data || [];
      setBadgesStats({
        total: badgesData.length,
        disponible: badgesData.filter((b: any) => b.status === 'disponible').length,
        attribue: badgesData.filter((b: any) => b.status === 'attribue').length,
      });
    } catch (error) {
      console.error('Error loading security data:', error);
      toast.error('Erreur', 'Impossible de charger les données de sûreté');
    } finally {
      setLoading(false);
    }
  }, [currentSiteId, toast]);

  useEffect(() => {
    if (currentSiteId) loadData();
  }, [currentSiteId, loadData]);

  // ... (Fonctions handleExitVisitor et handleQRScan restent identiques, je les garde pour la complétude)
  async function handleExitVisitor(visitor: Visiteur) {
    const ok = await confirm({
      title: 'Confirmer la sortie',
      message: `Confirmer la sortie de ${visitor.full_name} ? Le badge ${visitor.badge_number || 'non attribué'} sera automatiquement libéré.`,
      variant: 'info',
      confirmText: 'Confirmer la sortie',
      cancelText: 'Annuler'
    });
    if (!ok) return;
    try {
      const { error: visitorError } = await supabase.from('visiteurs').update({ exit_time: new Date().toISOString(), status: 'parti' }).eq('id', visitor.id);
      if (visitorError) throw visitorError;
      if (visitor.badge_number && currentSiteId) {
        await supabase.from('badges').update({ status: 'disponible', assigned_to: null }).eq('badge_number', visitor.badge_number).eq('site_id', currentSiteId);
      }
      toast.success('Sortie enregistrée', `${visitor.full_name} est sorti et le badge a été libéré.`);
      setSelectedVisitor(null);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error('Erreur', 'Impossible d\'enregistrer la sortie');
    }
  }

  const handleQRScan = (data: string) => {
    setQrScanResult(data);
    setShowQRModal(false);
    try {
      const parsed = JSON.parse(data);
      toast.info('QR Code scanné', parsed.name || parsed.reference || data.substring(0, 30));
    } catch (error) {
      toast.info('QR Code scanné', data.substring(0, 30));
    }
  };

  // 🆕 Handlers pour les incidents
  const handleIncidentStatusChange = async (incidentId: string, newStatus: string) => {
    setUpdatingIncidentStatusId(incidentId);
    try {
      const { error } = await supabase.from('incidents').update({ status: newStatus }).eq('id', incidentId);
      if (error) throw error;
      const statusLabel = newStatus === 'cloture' ? 'Clôturé' : newStatus === 'en_cours' ? 'En cours' : 'Ouvert';
      toast.success('Statut mis à jour', `L'incident est maintenant "${statusLabel}"`);
      loadData();
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      toast.error('Erreur', 'Impossible de mettre à jour le statut');
    } finally {
      setUpdatingIncidentStatusId(null);
    }
  };

  const handleDeleteIncident = async (incident: Incident) => {
    const ok = await confirm({
      title: 'Supprimer cet incident ?',
      message: `L'incident ${incident.reference} sera définitivement supprimé. Cette action est irréversible.`,
      variant: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from('incidents').delete().eq('id', incident.id);
      if (error) throw error;
      toast.success('Incident supprimé', `Référence: ${incident.reference}`);
      loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur', 'Impossible de supprimer l\'incident');
    }
  };

  const openIncidentModal = (mode: 'create' | 'edit' | 'view', incident?: Incident) => {
    setIncidentModalMode(mode);
    setSelectedIncident(incident || null);
    setShowIncidentModal(true);
  };

  const getFilteredVisitors = () => {
    const today = new Date().toDateString();
    switch (filterStatus) {
      case 'active': return visiteurs.filter(v => !v.exit_time);
      case 'today': return visiteurs.filter(v => new Date(v.entry_time).toDateString() === today);
      default: return visiteurs;
    }
  };

  const activeVisitors = visiteurs.filter(v => !v.exit_time);
  const todayVisitors = visiteurs.filter(v => new Date(v.entry_time).toDateString() === new Date().toDateString());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sûreté des Sites</h2>
          <p className="text-gray-500">Contrôle d'accès, gestion visiteurs et incidents de sûreté</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setQrScanResult(null); setShowQRModal(true); }} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
            <QrCode size={20} /> Scanner QR
          </button>
          <button onClick={() => openIncidentModal('create')} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
            <AlertCircle size={20} /> Signaler incident
          </button>
          <button onClick={() => setShowVisitorModal(true)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
            <UserPlus size={20} /> Enregistrer visiteur
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          <button onClick={() => setActiveTab('visiteurs')} className={`px-6 py-4 font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'visiteurs' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-800'}`}>
            <Users size={18} /> Visiteurs
          </button>
          <button onClick={() => setActiveTab('acces')} className={`px-6 py-4 font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'acces' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-800'}`}>
            <KeyRound size={18} /> Contrôle d'accès
          </button>
          <button onClick={() => setActiveTab('incidents')} className={`px-6 py-4 font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'incidents' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-800'}`}>
            <Shield size={18} /> Incidents de Sûreté
          </button>
        </div>

        <div className="p-6">
          {/* ==========================================
              ONGLET : VISITEURS (inchangé, résumé pour la brièveté)
          ========================================== */}
          {activeTab === 'visiteurs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Users size={20} /> Statistiques</h3>
                  <div className="space-y-4">
                    <div><p className="text-blue-100 text-sm">Visiteurs aujourd'hui</p><p className="text-3xl font-bold">{todayVisitors.length}</p></div>
                    <div><p className="text-blue-100 text-sm">Actuellement sur site</p><p className="text-3xl font-bold">{activeVisitors.length}</p></div>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Visiteurs actifs</h3>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="text-sm bg-gray-100 border-0 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500">
                      <option value="all">Tous les visiteurs</option>
                      <option value="active">Sur site</option>
                      <option value="today">Aujourd'hui</option>
                    </select>
                  </div>
                  {activeVisitors.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                      <Users size={48} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">Aucun visiteur sur site</p>
                      <button onClick={() => setShowVisitorModal(true)} className="mt-4 text-blue-600 hover:text-blue-700 font-medium">+ Enregistrer un visiteur</button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {getFilteredVisitors().map((visitor) => (
                        <div key={visitor.id} onClick={() => setSelectedVisitor(visitor)} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md hover:bg-blue-50/50 transition-all cursor-pointer group">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-blue-600 group-hover:bg-blue-200 transition-colors">
                            {(visitor.full_name || 'V').split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800">{visitor.full_name}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1"><Building size={14} />{visitor.company || 'Non spécifié'}</span>
                              <span className="flex items-center gap-1"><UserCircle size={14} />{visitor.host_name}</span>
                              <span className="flex items-center gap-1"><Clock size={14} />Entrée: {new Date(visitor.entry_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Objet: {visitor.purpose}</p>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {!visitor.exit_time && (
                              <button onClick={() => handleExitVisitor(visitor)} className="px-3 py-2 bg-emerald-100 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-all flex items-center gap-1">
                                <LogOut size={16} /> Sortie
                              </button>
                            )}
                            <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all" title="Voir les détails">
                              <Eye size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              ONGLET : CONTRÔLE D'ACCÈS (inchangé)
          ========================================== */}
          {activeTab === 'acces' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-sm text-gray-500 font-medium mb-1">Badges en circulation</p>
                  <p className="text-3xl font-bold text-blue-600">{badgesStats.attribue}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-sm text-gray-500 font-medium mb-1">Badges disponibles</p>
                  <p className="text-3xl font-bold text-emerald-600">{badgesStats.disponible}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-sm text-gray-500 font-medium mb-1">Parc total de badges</p>
                  <p className="text-3xl font-bold text-gray-800">{badgesStats.total}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2"><BadgeCheck size={18} className="text-blue-500" /> Badges actuellement attribués</h3>
                </div>
                {visiteurs.filter(v => v.badge_number && !v.exit_time).length === 0 ? (
                  <div className="text-center py-12 text-gray-500"><BadgeCheck size={48} className="mx-auto text-gray-300 mb-3" /><p>Aucun badge n'est actuellement en circulation.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b bg-gray-50">
                          <th className="p-4 font-medium">N° Badge</th>
                          <th className="p-4 font-medium">Attribué à</th>
                          <th className="p-4 font-medium">Heure d'entrée</th>
                          <th className="p-4 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {visiteurs.filter(v => v.badge_number && !v.exit_time).map((visitor) => (
                          <tr key={visitor.id} className="hover:bg-gray-50">
                            <td className="p-4 font-mono font-semibold text-blue-700">{visitor.badge_number}</td>
                            <td className="p-4 font-medium">{visitor.full_name}</td>
                            <td className="p-4 text-gray-600">{new Date(visitor.entry_time).toLocaleString('fr-FR')}</td>
                            <td className="p-4 text-right">
                              <button onClick={() => handleExitVisitor(visitor)} className="text-xs px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg font-medium transition-colors">Libérer le badge</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              ONGLET : INCIDENTS DE SÛRETÉ (🆕 AMÉLIORÉ)
          ========================================== */}
          {activeTab === 'incidents' && (
            <div className="overflow-x-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">Incidents de sûreté</h3>
                <button onClick={() => openIncidentModal('create')} className="text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1">
                  <Plus size={16} /> Signaler
                </button>
              </div>
              {incidents.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <Shield size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Aucun incident de sûreté enregistré</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b bg-gray-50">
                      <th className="pb-3 p-4 font-medium">ID</th>
                      <th className="pb-3 p-4 font-medium">Nature</th>
                      <th className="pb-3 p-4 font-medium">Lieu</th>
                      <th className="pb-3 p-4 font-medium">Date/Heure</th>
                      <th className="pb-3 p-4 font-medium">Niveau</th>
                      <th className="pb-3 p-4 font-medium">Statut</th>
                      <th className="pb-3 p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {incidents.map((incident) => (
                      <tr key={incident.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-mono text-xs">{incident.reference}</td>
                        <td className="p-4 font-medium">{incident.title}</td>
                        <td className="p-4 text-gray-600">{incident.location}</td>
                        <td className="p-4 text-gray-600 whitespace-nowrap">{new Date(incident.incident_date || incident.created_at).toLocaleString('fr-FR')}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            incident.severity === 'critique' ? 'bg-red-100 text-red-600' : 
                            incident.severity === 'grave' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'
                          }`}>
                            {incident.severity?.toUpperCase()}
                          </span>
                        </td>
                        
                        {/* 🆕 COLONNE STATUT INTERACTIVE */}
                        <td className="p-4">
                          <select
                            value={incident.status || 'ouvert'}
                            onChange={(e) => handleIncidentStatusChange(incident.id, e.target.value)}
                            disabled={updatingIncidentStatusId === incident.id}
                            className={`text-xs font-semibold rounded-full px-3 py-1.5 border-0 cursor-pointer focus:ring-2 focus:ring-red-500 focus:outline-none transition-all appearance-none ${
                              updatingIncidentStatusId === incident.id ? 'opacity-50 cursor-wait' : 'hover:brightness-95'
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

                        {/* 🆕 COLONNE ACTIONS */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => openIncidentModal('view', incident)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                              title="Voir les détails"
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              onClick={() => openIncidentModal('edit', incident)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" 
                              title="Modifier"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteIncident(incident)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          MODALES
      ========================================== */}
      
      {/* Modale Détails Visiteur */}
      {selectedVisitor && (
        <Modal isOpen={!!selectedVisitor} onClose={() => setSelectedVisitor(null)} title="Détails de la visite" size="md">
          <div className="space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                  {(selectedVisitor.full_name || 'V').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{selectedVisitor.full_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Building size={14} /> {selectedVisitor.company || 'Visiteur individuel'}
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${!selectedVisitor.exit_time ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                {!selectedVisitor.exit_time ? '● Présent' : '○ Parti'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem icon={<CreditCard size={16} />} label="N° Pièce d'identité" value={(selectedVisitor as any).id_number || 'Non renseigné'} />
              <DetailItem icon={<UserCircle size={16} />} label="Personne à rencontrer" value={selectedVisitor.host_name || 'Non spécifié'} />
              <DetailItem icon={<Shield size={16} />} label="Motif de la visite" value={selectedVisitor.purpose || 'Non spécifié'} />
              <DetailItem icon={<BadgeCheck size={16} />} label="Badge attribué" value={selectedVisitor.badge_number || 'Aucun'} highlight={!!selectedVisitor.badge_number} />
              <DetailItem icon={<Clock size={16} />} label="Heure d'entrée" value={new Date(selectedVisitor.entry_time).toLocaleString('fr-FR')} />
              {selectedVisitor.exit_time && <DetailItem icon={<LogOut size={16} />} label="Heure de sortie" value={new Date(selectedVisitor.exit_time).toLocaleString('fr-FR')} highlight />}
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              {!selectedVisitor.exit_time && (
                <button onClick={() => handleExitVisitor(selectedVisitor)} className="flex-1 px-4 py-3 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                  <LogOut size={18} /> Marquer comme parti
                </button>
              )}
              <button onClick={() => setSelectedVisitor(null)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">Fermer</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modale QR Code */}
      <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} title="Scanner QR Code" size="md">
        <div className="space-y-4">
          <QRScanner onScan={handleQRScan} onClose={() => setShowQRModal(false)} />
          {qrScanResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-sm font-medium text-emerald-800 mb-1">Dernier scan :</p>
              <p className="text-xs text-emerald-700 font-mono break-all">{qrScanResult}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* 🆕 Modale Incident (Create / Edit / View) */}
      <Modal 
        isOpen={showIncidentModal} 
        onClose={() => { setShowIncidentModal(false); setSelectedIncident(null); }} 
        title={
          incidentModalMode === 'create' ? "Signaler un incident de sûreté" : 
          incidentModalMode === 'edit' ? "Modifier l'incident" : 
          "Détails de l'incident"
        } 
        size="lg"
      >
        <IncidentForm 
          module="surete" 
          incident={selectedIncident} 
          mode={incidentModalMode}
          onSuccess={() => { 
            setShowIncidentModal(false); 
            setSelectedIncident(null); 
            toast.success(incidentModalMode === 'create' ? 'Incident signalé' : 'Incident mis à jour'); 
            loadData(); 
          }} 
          onCancel={() => { setShowIncidentModal(false); setSelectedIncident(null); }} 
        />
      </Modal>

      {/* Modale Visiteur */}
      <Modal isOpen={showVisitorModal} onClose={() => setShowVisitorModal(false)} title="Enregistrer un visiteur" size="lg">
        <VisitorForm onSuccess={() => { setShowVisitorModal(false); toast.success('Visiteur enregistré'); loadData(); }} onCancel={() => setShowVisitorModal(false)} />
      </Modal>
    </div>
  );
}

// ==========================================
// Composant helper pour les détails
// ==========================================
function DetailItem({ icon, label, value, highlight = false, fullWidth = false }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  highlight?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={`${fullWidth ? 'col-span-1 md:col-span-2' : 'col-span-1'} flex items-start gap-3 p-3 bg-gray-50 rounded-xl`}>
      <div className={`mt-0.5 ${highlight ? 'text-orange-600' : 'text-gray-500'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-semibold truncate ${highlight ? 'text-orange-700' : 'text-gray-800'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
