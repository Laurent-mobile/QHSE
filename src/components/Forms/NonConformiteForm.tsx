//src/components/Forms/NonConformiteForm.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Calendar, Users, FileText, Flag, X } from 'lucide-react';

interface NonConformiteFormProps {
  nc?: any;
  mode: 'create' | 'edit' | 'view';
  onSuccess: () => void;
  onCancel: () => void;
}

export function NonConformiteForm({ nc, mode, onSuccess, onCancel }: NonConformiteFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    reference: nc?.reference || `NC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    description: nc?.description || '',
    priority: nc?.priority || 'mineure',
    status: nc?.status || 'ouvert',
    responsible_id: nc?.responsible_id || '',
    due_date: nc?.due_date?.split('T')[0] || '',
    audit_id: nc?.audit_id || '',
    source: nc?.source || '',
    corrective_actions: nc?.corrective_actions || '',
    notes: nc?.notes || ''
  });

  const priorities = [
    { value: 'mineure', label: 'Mineure', color: 'yellow' },
    { value: 'majeure', label: 'Majeure', color: 'orange' },
    { value: 'critique', label: 'Critique', color: 'red' }
  ];

  const statuses = [
    { value: 'ouvert', label: 'Ouvert', color: 'orange' },
    { value: 'en_cours', label: 'En cours', color: 'blue' },
    { value: 'cloture', label: 'Clôturé', color: 'emerald' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Charger les audits pour la sélection
      const { data: auditsData } = await supabase
        .from('audits')
        .select('id, reference, type, date')
        .order('date', { ascending: false });

      setAudits(auditsData || []);

      // Charger les profils pour la sélection des responsables
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      setProfiles(profilesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Obtenir le site de l'utilisateur
      const { data: userSite } = await supabase
        .from('user_sites')
        .select('site_id')
        .eq('user_id', user?.id)
        .single();

      if (mode === 'create') {
        const { error } = await supabase
          .from('non_conformites')
          .insert([{
            ...formData,
            created_at: new Date().toISOString(),
            site_id: userSite?.site_id
          }]);
        
        if (error) throw error;
      } else if (mode === 'edit' && nc) {
        const { error } = await supabase
          .from('non_conformites')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', nc.id);
        
        if (error) throw error;
      }
      
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getResponsibleName = (id: string) => {
    const profile = profiles.find(p => p.id === id);
    return profile?.full_name || 'Non assigné';
  };

  if (mode === 'view') {
    return (
      <div className="space-y-4">
        <div className="bg-orange-50 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-sm text-gray-600">{nc?.reference}</span>
            <span className={`px-2 py-1 rounded text-xs font-bold ${
              nc?.priority === 'critique' ? 'bg-red-100 text-red-600' :
              nc?.priority === 'majeure' ? 'bg-orange-100 text-orange-600' :
              'bg-yellow-100 text-yellow-600'
            }`}>
              {nc?.priority.toUpperCase()}
            </span>
          </div>
          <h3 className="font-bold text-gray-800">{nc?.description}</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Statut</label>
            <p className="font-medium">
              <span className={`px-2 py-1 rounded text-xs ${
                nc?.status === 'cloture' ? 'bg-emerald-100 text-emerald-600' :
                nc?.status === 'en_cours' ? 'bg-blue-100 text-blue-600' :
                'bg-orange-100 text-orange-600'
              }`}>
                {nc?.status === 'cloture' ? 'Clôturé' :
                 nc?.status === 'en_cours' ? 'En cours' : 'Ouvert'}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Responsable</label>
            <p className="font-medium">{getResponsibleName(nc?.responsible_id)}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Date d'échéance</label>
            <p className="font-medium">{new Date(nc?.due_date).toLocaleDateString('fr-FR')}</p>
          </div>
          {nc?.audit_id && (
            <div>
              <label className="text-sm text-gray-500">Audit lié</label>
              <p className="font-medium">
                {audits.find(a => a.id === nc?.audit_id)?.reference || 'Non spécifié'}
              </p>
            </div>
          )}
          <div>
            <label className="text-sm text-gray-500">Créée le</label>
            <p className="font-medium">{new Date(nc?.created_at).toLocaleDateString('fr-FR')}</p>
          </div>
          {nc?.updated_at && (
            <div>
              <label className="text-sm text-gray-500">Dernière modification</label>
              <p className="font-medium">{new Date(nc?.updated_at).toLocaleDateString('fr-FR')}</p>
            </div>
          )}
        </div>

        {nc?.corrective_actions && (
          <div>
            <label className="text-sm text-gray-500">Actions correctives proposées</label>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{nc.corrective_actions}</p>
          </div>
        )}

        {nc?.notes && (
          <div>
            <label className="text-sm text-gray-500">Notes</label>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{nc.notes}</p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Référence
        </label>
        <input
          type="text"
          value={formData.reference}
          onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
          readOnly
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description de la non-conformité *
        </label>
        <textarea
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder="Décrivez la non-conformité constatée..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priorité *
          </label>
          <select
            required
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {priorities.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Statut
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {statuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Responsable *
          </label>
          <select
            required
            value={formData.responsible_id}
            onChange={(e) => setFormData({ ...formData, responsible_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Sélectionner...</option>
            {profiles.map(profile => (
              <option key={profile.id} value={profile.id}>{profile.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date d'échéance *
          </label>
          <input
            type="date"
            required
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Audit lié (optionnel)
        </label>
        <select
          value={formData.audit_id}
          onChange={(e) => setFormData({ ...formData, audit_id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="">Aucun audit lié</option>
          {audits.map(audit => (
            <option key={audit.id} value={audit.id}>
              {audit.reference} - {audit.type} ({new Date(audit.date).toLocaleDateString('fr-FR')})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Actions correctives proposées
        </label>
        <textarea
          value={formData.corrective_actions}
          onChange={(e) => setFormData({ ...formData, corrective_actions: e.target.value })}
          rows={2}
          placeholder="Actions à mettre en place pour corriger cette non-conformité..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Source / Origine
        </label>
        <input
          type="text"
          value={formData.source}
          onChange={(e) => setFormData({ ...formData, source: e.target.value })}
          placeholder="Ex: Audit interne, Réclamation client, Inspection..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          placeholder="Informations complémentaires..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Enregistrement...
            </>
          ) : (
            mode === 'create' ? 'Créer la non-conformité' : 'Mettre à jour'
          )}
        </button>
      </div>
    </form>
  );
}
