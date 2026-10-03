import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useUserSite } from '../../hooks/useUserSite';
import { UserCheck, Loader, Building, UserCircle, BadgeCheck, Calendar, AlertCircle, Plus, CreditCard } from 'lucide-react';
import { useToast } from '../common/Toast';

interface VisitorFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function VisitorForm({ onSuccess, onCancel }: VisitorFormProps) {
  const toast = useToast();
  const { userSite } = useUserSite();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableBadges, setAvailableBadges] = useState<{ id: string; badge_number: string }[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const [showNewBadgeInput, setShowNewBadgeInput] = useState(false);
  const [newBadgeNumber, setNewBadgeNumber] = useState('');

  // 🆕 État pour les employés (hôtes)
  const [hosts, setHosts] = useState<{ id: string; full_name: string; department: string }[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(true);

  const [formData, setFormData] = useState({
    full_name: '',
    company: '',
    purpose: '',
    host_name: '',
    id_number: '',
    badge_id: '',
    phone: '',
    entry_time: new Date().toISOString().slice(0, 16),
    expected_duration: '60',
    vehicle_plate: '',
    notes: ''
  });

  const purposes = [
    'Rendez-vous professionnel', 'Maintenance / Travaux', 'Audit / Inspection',
    'Livraison', 'Formation', 'Visite de site', 'Entretien', 'Autre'
  ];

  // 🆕 Chargement des employés (hôtes) au montage
  useEffect(() => {
    if (userSite?.site_id) {
      loadHosts();
      loadAvailableBadges(); // ✅ CORRECTION : Charger aussi les badges !
    }
  }, [userSite?.site_id]);

  async function loadHosts() {
    setLoadingHosts(true);
    try {
      const { data } = await supabase
        .from('employees')
        .select('id, full_name, department')
        .eq('site_id', userSite!.site_id)
        .eq('is_active', true)
        .order('full_name');
      setHosts(data || []);
    } catch (err) {
      console.error('Erreur chargement hôtes:', err);
    } finally {
      setLoadingHosts(false);
    }
  }

  async function loadAvailableBadges() {
    setLoadingBadges(true);
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('id, badge_number')
        .eq('site_id', userSite!.site_id)
        .eq('status', 'disponible')
        .order('badge_number', { ascending: true });
      if (error) throw error;
      setAvailableBadges(data || []);
    } catch (err) {
      console.error('Erreur chargement badges:', err);
    } finally {
      setLoadingBadges(false);
    }
  }

  async function handleAddNewBadge() {
    if (!newBadgeNumber.trim() || !userSite?.site_id) return;
    try {
      const { error } = await supabase.from('badges').insert({
        site_id: userSite.site_id,
        badge_number: newBadgeNumber.trim().toUpperCase(),
        status: 'disponible'
      });
      if (error) {
        if (error.code === '23505') toast.error('Erreur', 'Ce numéro de badge existe déjà');
        else throw error;
        return;
      }
      toast.success('Badge créé', `Le badge ${newBadgeNumber} est disponible`);
      setNewBadgeNumber('');
      setShowNewBadgeInput(false);
      loadAvailableBadges();
    } catch (err: any) {
      toast.error('Erreur', err.message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userSite?.site_id) {
      toast.error('Erreur', 'Aucun site sélectionné.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const selectedBadge = availableBadges.find(b => b.id === formData.badge_id);
      
      const { error: visitorError } = await supabase.from('visiteurs').insert({
        site_id: userSite.site_id,
        full_name: formData.full_name,
        company: formData.company,
        purpose: formData.purpose,
        host_name: formData.host_name,
        id_number: formData.id_number,
        badge_number: selectedBadge?.badge_number || null,
        phone: formData.phone,
        vehicle_plate: formData.vehicle_plate,
        notes: formData.notes,
        entry_time: formData.entry_time,
        expected_duration: parseInt(formData.expected_duration),
        status: 'present',
      });

      if (visitorError) throw visitorError;

      if (formData.badge_id && selectedBadge) {
        await supabase.from('badges').update({ 
          status: 'attribue', 
          assigned_to: formData.full_name 
        }).eq('id', formData.badge_id);
      }
      
      toast.success('Visiteur enregistré', `${formData.full_name}`);
      onSuccess();
    } catch (error: any) {
      console.error('Erreur:', error);
      setError('Erreur lors de l\'enregistrement');
      toast.error('Erreur', error.message || 'Impossible d\'enregistrer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <UserCheck className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-sm text-blue-800 font-medium">Enregistrement de visiteur</p>
          <p className="text-xs text-blue-600 mt-1">Site : <strong>{userSite?.site_name || 'Non défini'}</strong></p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <UserCircle size={16} className="inline mr-1" />Nom complet *
          </label>
          <input 
            type="text" 
            required 
            value={formData.full_name} 
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} 
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            placeholder="Prénom et nom" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Building size={16} className="inline mr-1" />Société
          </label>
          <input 
            type="text" 
            value={formData.company} 
            onChange={(e) => setFormData({ ...formData, company: e.target.value })} 
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            placeholder="Nom de la société" 
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <UserCircle size={16} className="inline mr-1" />Motif de la visite *
        </label>
        <select 
          required 
          value={formData.purpose} 
          onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} 
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Sélectionner un motif...</option>
          {purposes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 🆕 CORRECTION : Remplacement de l'input par un select pour les employés */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <UserCircle size={16} className="inline mr-1" />Personne à rencontrer (Hôte) *
          </label>
          {loadingHosts ? (
            <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm flex items-center gap-2">
              <Loader size={16} className="animate-spin" /> Chargement...
            </div>
          ) : (
            <select
              required
              value={formData.host_name}
              onChange={(e) => setFormData({ ...formData, host_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Sélectionner un employé...</option>
              {hosts.map(host => (
                <option key={host.id} value={host.full_name}>
                  {host.full_name} {host.department ? `(${host.department})` : ''}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Vous pouvez ajouter des employés dans le menu <strong>Paramètres</strong>.
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CreditCard size={16} className="inline mr-1" />N° de Pièce d'identité
          </label>
          <input 
            type="text" 
            value={formData.id_number} 
            onChange={(e) => setFormData({ ...formData, id_number: e.target.value })} 
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            placeholder="CNI, Passeport, Permis..." 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <BadgeCheck size={16} className="inline mr-1" />N° de Badge *
          </label>
          {!showNewBadgeInput ? (
            <div className="flex gap-2">
              <select 
                required 
                value={formData.badge_id} 
                onChange={(e) => setFormData({ ...formData, badge_id: e.target.value })} 
                disabled={loadingBadges} 
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Sélectionner un badge...</option>
                {availableBadges.map(b => <option key={b.id} value={b.id}>{b.badge_number}</option>)}
              </select>
              <button 
                type="button" 
                onClick={() => setShowNewBadgeInput(true)} 
                className="px-3 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors" 
                title="Ajouter un badge"
              >
                <Plus size={20} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input 
                type="text" 
                autoFocus 
                required 
                value={newBadgeNumber} 
                onChange={(e) => setNewBadgeNumber(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewBadge())} 
                placeholder="Ex: B-105" 
                className="flex-1 px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              />
              <button 
                type="button" 
                onClick={handleAddNewBadge} 
                className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                OK
              </button>
              <button 
                type="button" 
                onClick={() => { setShowNewBadgeInput(false); setNewBadgeNumber(''); }} 
                className="px-3 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200"
              >
                ✕
              </button>
            </div>
          )}
          {availableBadges.length === 0 && !showNewBadgeInput && !loadingBadges && (
            <p className="text-xs text-orange-600 mt-1">⚠️ Aucun badge disponible. Veuillez en ajouter un.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar size={16} className="inline mr-1" />Date et heure d'entrée *
          </label>
          <input 
            type="datetime-local" 
            required 
            value={formData.entry_time} 
            onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })} 
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button 
          type="button" 
          onClick={onCancel} 
          disabled={loading} 
          className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button 
          type="submit" 
          disabled={loading || (availableBadges.length === 0 && !showNewBadgeInput)} 
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
        >
          {loading ? (
            <>
              <Loader className="animate-spin" size={20} /> Enregistrement...
            </>
          ) : (
            <>
              <UserCheck size={20} /> Enregistrer le visiteur
            </>
          )}
        </button>
      </div>
    </form>
  );
}
