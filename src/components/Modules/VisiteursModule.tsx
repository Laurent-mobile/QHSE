import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useUserSite } from '../../hooks/useUserSite';
import { useToast } from '../common/Toast';
import { useConfirm } from '../common/ConfirmDialog';
import { 
  Search, UserCheck, UserX, Clock, RefreshCw, Plus, FileText, 
  Eye, Building, CreditCard, BadgeCheck, Calendar, MapPin, X 
} from 'lucide-react';
import { VisitorForm } from '../Forms/VisitorForm';
import { Modal } from '../common/Modal';

interface Visitor {
  id: string;
  full_name: string;
  company: string | null;
  purpose: string;
  host_name: string;
  id_number: string | null;
  badge_number: string | null;
  phone: string | null;
  vehicle_plate: string | null;
  entry_time: string;
  expected_duration: number | null;
  notes: string | null;
  status: 'present' | 'parti' | 'exited' | 'refuse';
}

export function VisiteursModule() {
  const toast = useToast();
  const confirm = useConfirm();
  const { userSite } = useUserSite();
  
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // États pour les modales
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (userSite?.site_id) loadVisitors();
  }, [userSite?.site_id]);

  async function loadVisitors() {
    if (!userSite?.site_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visiteurs')
        .select('*')
        .eq('site_id', userSite.site_id)
        .order('entry_time', { ascending: false });
      
      if (error) throw error;
      setVisitors(data || []);
    } catch (error) {
      console.error('Erreur chargement visiteurs:', error);
      toast.error('Erreur', 'Impossible de charger la liste des visiteurs');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsDeparted(visitor: Visitor) {
    const ok = await confirm({
      title: 'Confirmer le départ',
      message: `Le visiteur ${visitor.full_name} a-t-il rendu son badge ${visitor.badge_number || 'non attribué'} ?`,
      variant: 'warning',
      confirmText: 'Oui, marquer comme parti'
    });

    if (!ok) return;

    setProcessingId(visitor.id);
    try {
      // 1. Mettre à jour le statut du visiteur
      await supabase.from('visiteurs').update({ status: 'parti' }).eq('id', visitor.id);

      // 2. Libérer le badge s'il y en a un
      if (visitor.badge_number) {
        await supabase.from('badges').update({
          status: 'disponible',
          assigned_to: null
        }).eq('badge_number', visitor.badge_number).eq('site_id', userSite!.site_id);
      }

      toast.success('Départ enregistré', 'Le badge a été libéré.');
      setSelectedVisitor(null); // Fermer la modale de détails
      loadVisitors();
    } catch (error) {
      console.error(error);
      toast.error('Erreur', 'Impossible de mettre à jour le statut');
    } finally {
      setProcessingId(null);
    }
  }

  const filteredVisitors = useMemo(() => {
    if (!searchTerm) return visitors;
    const search = searchTerm.toLowerCase();
    return visitors.filter(v => 
      v.full_name.toLowerCase().includes(search) ||
      v.company?.toLowerCase().includes(search) ||
      v.host_name?.toLowerCase().includes(search) ||
      v.id_number?.toLowerCase().includes(search) ||
      v.badge_number?.toLowerCase().includes(search)
    );
  }, [visitors, searchTerm]);

  const activeVisitorsCount = visitors.filter(v => v.status === 'present').length;

  if (!userSite?.site_id) {
    return <div className="text-center p-8 text-gray-500">Aucun site assigné.</div>;
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestion des Visiteurs</h2>
          <p className="text-gray-500">
            Site: {userSite.site_name} • <span className="text-emerald-600 font-medium">{activeVisitorsCount} visiteurs actuellement sur site</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadVisitors} disabled={loading} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
          <button onClick={() => setShowFormModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
            <Plus size={20} /> Nouveau visiteur
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par nom, société, hôte, badge ou N° de pièce d'identité..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Tableau des visiteurs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-blue-500" size={32} /></div>
        ) : filteredVisitors.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Aucun visiteur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="p-4 font-medium">Visiteur / Société</th>
                  <th className="p-4 font-medium">Hôte & Motif</th>
                  <th className="p-4 font-medium">N° Pièce d'identité</th>
                  <th className="p-4 font-medium">Badge</th>
                  <th className="p-4 font-medium">Entrée</th>
                  <th className="p-4 font-medium">Statut</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.map((v) => (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors cursor-pointer" onClick={() => setSelectedVisitor(v)}>
                    <td className="p-4">
                      <p className="font-semibold text-gray-800">{v.full_name}</p>
                      <p className="text-xs text-gray-500">{v.company || 'Sans société'}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-gray-800">{v.host_name}</p>
                      <p className="text-xs text-gray-500">{v.purpose}</p>
                    </td>
                    <td className="p-4">
                      {v.id_number ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700">
                          <FileText size={12} /> {v.id_number}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Non renseigné</span>
                      )}
                    </td>
                    <td className="p-4">
                      {v.badge_number ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                          <BadgeCheck size={12} /> {v.badge_number}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Aucun</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock size={14} />
                        {new Date(v.entry_time).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        v.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 
                        v.status === 'parti' || v.status === 'exited' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'
                      }`}>
                        {v.status === 'present' ? '● Présent' : v.status === 'parti' || v.status === 'exited' ? '○ Parti' : 'Refusé'}
                      </span>
                    </td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}> {/* Empêche l'ouverture de la modale quand on clique sur le bouton */}
                      <button
                        onClick={() => setSelectedVisitor(v)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors"
                        title="Voir les détails"
                      >
                        <Eye size={14} /> Détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==========================================
          MODALE : FORMULAIRE D'AJOUT
      ========================================== */}
      {showFormModal && (
        <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title="Enregistrer un nouveau visiteur" size="lg">
          <VisitorForm 
            onSuccess={() => {
              setShowFormModal(false);
              loadVisitors();
            }} 
            onCancel={() => setShowFormModal(false)} 
          />
        </Modal>
      )}

      {/* ==========================================
          MODALE : DÉTAILS DU VISITEUR
      ========================================== */}
      {selectedVisitor && (
        <Modal isOpen={!!selectedVisitor} onClose={() => setSelectedVisitor(null)} title="Détails de la visite" size="md">
          <div className="space-y-6">
            {/* En-tête du visiteur */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                  {selectedVisitor.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{selectedVisitor.full_name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Building size={14} /> {selectedVisitor.company || 'Visiteur individuel'}
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                selectedVisitor.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 
                'bg-gray-100 text-gray-600'
              }`}>
                {selectedVisitor.status === 'present' ? '● Présent sur site' : '○ Parti'}
              </span>
            </div>

            {/* Grille d'informations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailItem icon={<CreditCard size={16} />} label="N° Pièce d'identité" value={selectedVisitor.id_number || 'Non renseigné'} />
              <DetailItem icon={<UserCheck size={16} />} label="Personne à rencontrer" value={selectedVisitor.host_name} />
              <DetailItem icon={<MapPin size={16} />} label="Motif de la visite" value={selectedVisitor.purpose} />
              <DetailItem icon={<BadgeCheck size={16} />} label="Badge attribué" value={selectedVisitor.badge_number || 'Aucun'} highlight={!!selectedVisitor.badge_number} />
              <DetailItem icon={<Calendar size={16} />} label="Date et heure d'entrée" value={new Date(selectedVisitor.entry_time).toLocaleString('fr-FR')} />
              <DetailItem icon={<Clock size={16} />} label="Durée prévue" value={selectedVisitor.expected_duration ? `${selectedVisitor.expected_duration} minutes` : 'Non spécifiée'} />
            </div>

            {selectedVisitor.phone && (
              <DetailItem icon={<FileText size={16} />} label="Téléphone" value={selectedVisitor.phone} fullWidth />
            )}
            
            {selectedVisitor.vehicle_plate && (
              <DetailItem icon={<FileText size={16} />} label="Véhicule / Immatriculation" value={selectedVisitor.vehicle_plate} fullWidth />
            )}

            {selectedVisitor.notes && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes complémentaires</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedVisitor.notes}</p>
              </div>
            )}

            {/* Actions en bas de la modale */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              {selectedVisitor.status === 'present' && (
                <button
                  onClick={() => handleMarkAsDeparted(selectedVisitor)}
                  disabled={processingId === selectedVisitor.id}
                  className="flex-1 px-4 py-3 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processingId === selectedVisitor.id ? <RefreshCw size={18} className="animate-spin" /> : <UserX size={18} />}
                  Marquer comme parti (Libérer badge)
                </button>
              )}
              <button
                onClick={() => setSelectedVisitor(null)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} /> Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Petit composant helper pour afficher les détails proprement
function DetailItem({ icon, label, value, highlight = false, fullWidth = false }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  highlight?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={`${fullWidth ? 'col-span-1 md:col-span-2' : 'col-span-1'} flex items-start gap-3 p-3 bg-gray-50 rounded-xl`}>
      <div className={`mt-0.5 ${highlight ? 'text-blue-600' : 'text-gray-500'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-semibold truncate ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
