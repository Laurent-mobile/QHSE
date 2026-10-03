import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, FileText, Loader } from 'lucide-react';
import { useToast } from '../common/Toast';

interface ActionProps {
  reference?: string;
  description?: string;
  type?: 'corrective' | 'preventive';
  priority?: 'basse' | 'moyenne' | 'haute' | 'critique';
  status?: 'ouverte' | 'en_cours' | 'terminee';
  responsible_id?: string;
  due_date?: string | null;
  source_type?: string;
  source_id?: string;
  notes?: string;
  id?: string;
  created_at?: string;
  updated_at?: string;
  site_id?: string;
  incident_id?: string;
  completion_date?: string | null;
}

interface NCProps {
  id?: string;
  reference?: string;
  description?: string;
  corrective_actions?: string;
  priority?: 'basse' | 'moyenne' | 'haute' | 'critique';
  responsible_id?: string;
  due_date?: string | null;
  notes?: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface FormData {
  reference: string;
  description: string;
  type: 'corrective' | 'preventive';
  priority: 'basse' | 'moyenne' | 'haute' | 'critique';
  status: 'ouverte' | 'en_cours' | 'terminee';
  responsible_id: string;
  due_date: string;
  source_type: string;
  source_id: string;
  notes: string;
}

interface CAPAFormProps {
  action?: ActionProps;
  nc?: NCProps;
  mode: 'create' | 'edit' | 'view';
  onSuccess: () => void;
  onCancel: () => void;
}

export function CAPAForm({ action, nc, mode, onSuccess, onCancel }: CAPAFormProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [formData, setFormData] = useState<FormData>({
    reference: action?.reference ?? `CAPA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    description: action?.description ?? nc?.corrective_actions ?? nc?.description ?? '',
    type: action?.type ?? 'corrective',
    priority: (action?.priority ?? nc?.priority ?? 'moyenne') as FormData['priority'],
    status: (action?.status ?? 'ouverte') as FormData['status'],
    responsible_id: action?.responsible_id ?? nc?.responsible_id ?? '',
    due_date: (action?.due_date ?? nc?.due_date ?? '').split('T')[0],
    source_type: action?.source_type ?? (nc ? 'non_conformite' : ''),
    source_id: action?.source_id ?? nc?.id ?? '',
    notes: action?.notes ?? nc?.notes ?? ''
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  }

  const priorities = [
    { value: 'basse', label: 'Basse' },
    { value: 'moyenne', label: 'Moyenne' },
    { value: 'haute', label: 'Haute' },
    { value: 'critique', label: 'Critique' }
  ];

  const sourceTypes = [
    { value: 'incident', label: 'Incident' },
    { value: 'audit', label: 'Audit' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'reclamation', label: 'Réclamation' },
    { value: 'non_conformite', label: 'Non-conformité' },
    { value: 'autre', label: 'Autre' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data: userSite } = await supabase
        .from('user_sites')
        .select('site_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const insertData: any = {
        reference: formData.reference,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        status: formData.status,
        responsible_id: formData.responsible_id,
        due_date: formData.due_date,
        source_type: formData.source_type || null,
        source_id: formData.source_id || null,
        notes: formData.notes || null,
        created_at: new Date().toISOString(),
        site_id: userSite?.site_id || null
      };

      if (nc?.id) {
        insertData.incident_id = nc.id;
      }

      if (mode === 'create') {
        const { error } = await supabase.from('actions_capa').insert([insertData]);
        if (error) throw error;
        toast.success('Action CAPA créée', `Réf: ${formData.reference}`);
      } else if (mode === 'edit' && action?.id) {
        const { error } = await supabase
          .from('actions_capa')
          .update({
            description: formData.description,
            type: formData.type,
            priority: formData.priority,
            status: formData.status,
            responsible_id: formData.responsible_id,
            due_date: formData.due_date,
            source_type: formData.source_type || null,
            source_id: formData.source_id || null,
            notes: formData.notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', action.id);
        if (error) throw error;
        toast.success('Action CAPA mise à jour');
      }
      onSuccess();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
      toast.error('Erreur', err.message || 'Impossible d\'enregistrer l\'action');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'view') {
    return (
      <div className="space-y-4">
        <div className="bg-emerald-50 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-sm text-gray-600">{action?.reference}</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${action?.type === 'corrective' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {action?.type === 'corrective' ? 'Corrective' : 'Préventive'}
            </span>
          </div>
          <h3 className="font-bold text-gray-800">{action?.description}</h3>
        </div>
        <div className="flex justify-end pt-4">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
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

      {nc && (
        <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 flex items-start gap-2">
          <FileText size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Action CAPA liée à la non-conformité :</span>
            <p className="mt-1">{nc.reference} - {nc.description?.substring(0, 100)}...</p>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Référence</label>
        <input
          type="text"
          value={formData.reference}
          onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
          readOnly
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description de l'action *</label>
        <textarea
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder="Décrivez l'action corrective ou préventive..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <select
            required
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="corrective">Corrective</option>
            <option value="preventive">Préventive</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priorité *</label>
          <select
            required
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            {priorities.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Responsable *</label>
          <select
            required
            value={formData.responsible_id}
            onChange={(e) => setFormData({ ...formData, responsible_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Sélectionner...</option>
            {profiles.map(profile => (
              <option key={profile.id} value={profile.id}>{profile.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date d'échéance *</label>
          <input
            type="date"
            required
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          <option value="ouverte">Ouverte</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminée</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          placeholder="Notes additionnelles..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
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
          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader size={16} className="animate-spin" />
              Enregistrement...
            </>
          ) : (
            mode === 'create' ? 'Créer l\'action' : 'Mettre à jour'
          )}
        </button>
      </div>
    </form>
  );
}
