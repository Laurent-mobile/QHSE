//src/components/Forms/EPIForm.tsx
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle } from 'lucide-react';

interface EPI {
  id?: string;
  user_id?: string;
  equipment_type?: string;
  attribution_date?: string | null;
  expiry_date?: string | null;
  status?: 'conforme' | 'a_verifier' | 'perime';
  serial_number?: string;
  manufacturer?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  profiles?: {
    full_name?: string;
  };
}

interface EPIFormProps {
  epi?: EPI;
  mode: 'create' | 'edit' | 'view';
  onSuccess: () => void;
  onCancel: () => void;
}

export function EPIForm({ epi, mode, onSuccess, onCancel }: EPIFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<EPI>({
    user_id: epi?.user_id || '',
    equipment_type: epi?.equipment_type || '',
    attribution_date: epi?.attribution_date ? epi?.attribution_date.split('T')[0] : new Date().toISOString().split('T')[0],
    expiry_date: epi?.expiry_date ? epi?.expiry_date.split('T')[0] : '',
    status: epi?.status || 'conforme',
    serial_number: epi?.serial_number || '',
    manufacturer: epi?.manufacturer || '',
    notes: epi?.notes || ''
  });

  const equipmentTypes = [
    'Casque de sécurité',
    'Chaussures de sécurité S3',
    'Gants anti-coupure',
    'Gants protection chimique',
    'Lunettes de protection',
    'Bouchons d\'oreilles',
    'Casque anti-bruit',
    'Harnais de sécurité',
    'Gilet haute visibilité',
    'Masque de protection respiratoire'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        const { error } = await supabase
          .from('epi')
          .insert([{
            ...formData,
            created_at: new Date().toISOString()
          }]);
        
        if (error) throw error;
      } else if (mode === 'edit' && epi) {
        const { error } = await supabase
          .from('epi')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', epi.id);
        
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

  const calculateExpiryDate = () => {
    if (formData.attribution_date) {
      const date = new Date(formData.attribution_date);
      date.setFullYear(date.getFullYear() + 1);
      setFormData({ ...formData, expiry_date: date.toISOString().split('T')[0] });
    }
  };

  if (mode === 'view') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500">Agent</label>
            <p className="font-medium">{epi?.profiles?.full_name || 'Non spécifié'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Type d'équipement</label>
            <p className="font-medium">{epi?.equipment_type}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Date d'attribution</label>
            <p className="font-medium">{new Date(epi?.attribution_date).toLocaleDateString('fr-FR')}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Date d'expiration</label>
            <p className={`font-medium ${new Date(epi?.expiry_date) < new Date() ? 'text-red-600' : ''}`}>
              {new Date(epi?.expiry_date).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500">N° de série</label>
            <p className="font-medium">{epi?.serial_number || 'Non spécifié'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Fabricant</label>
            <p className="font-medium">{epi?.manufacturer || 'Non spécifié'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Statut</label>
            <p className="font-medium">
              <span className={`px-2 py-1 rounded text-xs ${
                epi?.status === 'conforme' ? 'bg-emerald-100 text-emerald-600' :
                epi?.status === 'a_verifier' ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                {epi?.status?.replace('_', ' ')}
              </span>
            </p>
          </div>
        </div>
        {epi?.notes && (
          <div>
            <label className="text-sm text-gray-500">Notes</label>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{epi.notes}</p>
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
          Agent bénéficiaire *
        </label>
        <select
          required
          value={formData.user_id}
          onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={mode === 'view'}
        >
          <option value="">Sélectionner un agent...</option>
          <option value="1">Moussa Ndiaye</option>
          <option value="2">Fatou Keita</option>
          <option value="3">Bakary Traoré</option>
          <option value="4">Ibrahim Koné</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type d'équipement *
        </label>
        <select
          required
          value={formData.equipment_type}
          onChange={(e) => setFormData({ ...formData, equipment_type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={mode === 'view'}
        >
          <option value="">Sélectionner un type...</option>
          {equipmentTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date d'attribution *
          </label>
          <input
            type="date"
            required
            value={formData.attribution_date}
            onChange={(e) => setFormData({ ...formData, attribution_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            disabled={mode === 'view'}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date d'expiration *
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              required
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              disabled={mode === 'view'}
            />
            {mode === 'create' && (
              <button
                type="button"
                onClick={calculateExpiryDate}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
              >
                +1 an
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            N° de série
          </label>
          <input
            type="text"
            value={formData.serial_number}
            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
            placeholder="Ex: EPI-2024-001"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            disabled={mode === 'view'}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fabricant
          </label>
          <input
            type="text"
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            placeholder="Ex: Delta Plus"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            disabled={mode === 'view'}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Statut
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={mode === 'view'}
        >
          <option value="conforme">Conforme</option>
          <option value="a_verifier">À vérifier</option>
          <option value="perime">Périmé</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="Informations complémentaires..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={mode === 'view'}
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
        {mode !== 'view' && (
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
              mode === 'create' ? 'Attribuer' : 'Mettre à jour'
            )}
          </button>
        )}
      </div>
    </form>
  );
}
