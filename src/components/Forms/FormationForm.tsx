//src/components/Forms/FormationForm.tsx
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle } from 'lucide-react';

interface Formation {
  id?: string;
  title?: string;
  description?: string;
  type?: 'sst' | 'incendie' | 'surete' | 'environnement' | 'qualite';
  date?: string | null;
  duration_hours?: number;
  trainer?: string;
  location?: string;
  max_participants?: number;
  status?: 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface FormationFormProps {
  formation?: Formation;
  mode: 'create' | 'edit' | 'view';
  onSuccess: () => void;
  onCancel: () => void;
}

export function FormationForm({ formation, mode, onSuccess, onCancel }: FormationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Formation>({
    title: formation?.title || '',
    description: formation?.description || '',
    type: formation?.type || 'sst',
    date: formation?.date ? formation?.date.split('T')[0] : '',
    duration_hours: formation?.duration_hours || 4,
    trainer: formation?.trainer || '',
    location: formation?.location || '',
    max_participants: formation?.max_participants || 15,
    status: formation?.status || 'planifiee',
    notes: formation?.notes || ''
  });

  const formationTypes = [
    { value: 'sst', label: 'Santé & Sécurité' },
    { value: 'incendie', label: 'Sécurité Incendie' },
    { value: 'surete', label: 'Sûreté' },
    { value: 'environnement', label: 'Environnement' },
    { value: 'qualite', label: 'Qualité' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        const { error } = await supabase
          .from('formations')
          .insert([{
            ...formData,
            created_at: new Date().toISOString()
          }]);
        
        if (error) throw error;
      } else if (mode === 'edit' && formation) {
        const { error } = await supabase
          .from('formations')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', formation.id);
        
        if (error) throw error;
      }
      
      onSuccess();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'view') {
    return (
      <div className="space-y-4">
        <div className="bg-emerald-50 p-4 rounded-xl">
          <h3 className="font-bold text-gray-800 text-lg mb-2">{formation?.title}</h3>
          <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${
            formation?.status === 'terminee' ? 'bg-emerald-100 text-emerald-600' :
            formation?.status === 'en_cours' ? 'bg-blue-100 text-blue-600' :
            formation?.status === 'planifiee' ? 'bg-orange-100 text-orange-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {formation?.status?.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Type</label>
            <p className="font-medium">{formationTypes.find(t => t.value === formation?.type)?.label}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Date</label>
            <p className="font-medium">{new Date(formation?.date).toLocaleDateString('fr-FR')}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Durée</label>
            <p className="font-medium">{formation?.duration_hours} heures</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Formateur</label>
            <p className="font-medium">{formation?.trainer || 'Non spécifié'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Lieu</label>
            <p className="font-medium">{formation?.location || 'Non spécifié'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Participants max.</label>
            <p className="font-medium">{formation?.max_participants}</p>
          </div>
        </div>

        {formation?.description && (
          <div>
            <label className="text-sm text-gray-500">Description</label>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{formation.description}</p>
          </div>
        )}

        {formation?.notes && (
          <div>
            <label className="text-sm text-gray-500">Notes</label>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{formation.notes}</p>
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
          Titre de la formation *
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Secourisme au travail"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type de formation *
        </label>
        <select
          required
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          {formationTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date *
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Durée (heures) *
          </label>
          <input
            type="number"
            required
            min="1"
            max="40"
            value={formData.duration_hours}
            onChange={(e) => setFormData({ ...formData, duration_hours: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Formateur / Organisme
        </label>
        <input
          type="text"
          value={formData.trainer}
          onChange={(e) => setFormData({ ...formData, trainer: e.target.value })}
          placeholder="Ex: Jean Dupont (Apave)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lieu
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Ex: Salle de formation"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Participants max.
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={formData.max_participants}
            onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder="Description détaillée de la formation..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Statut
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="planifiee">Planifiée</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminée</option>
          <option value="annulee">Annulée</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          placeholder="Notes additionnelles..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Enregistrement...
            </>
          ) : (
            mode === 'create' ? 'Planifier' : 'Mettre à jour'
          )}
        </button>
      </div>
    </form>
  );
}
