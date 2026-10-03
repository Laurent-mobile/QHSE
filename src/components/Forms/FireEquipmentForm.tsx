import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useUserSite } from '../../hooks/useUserSite';
import { useToast } from '../common/Toast';
import { Loader, Save, Eye, Edit, Calendar, MapPin, Tag, CheckCircle, AlertCircle } from 'lucide-react';
import type { Database } from '../../lib/database.types';

type EquipementIncendie = Database['public']['Tables']['equipements_incendie']['Row'];

interface FireEquipmentFormProps {
  equipment?: EquipementIncendie | null;
  mode: 'create' | 'edit' | 'view';
  onSuccess: () => void;
  onCancel: () => void;
}

export function FireEquipmentForm({ equipment, mode, onSuccess, onCancel }: FireEquipmentFormProps) {
  const toast = useToast();
  const { userSite } = useUserSite();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reference: '',
    type: 'extincteur',
    location: '',
    status: 'conforme',
    last_inspection: new Date().toISOString().split('T')[0],
    next_inspection: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });

  // 🎯 Pré-remplir les données en mode edit ou view
  useEffect(() => {
    if ((mode === 'edit' || mode === 'view') && equipment) {
      setFormData({
        reference: equipment.reference || '',
        type: equipment.type || 'extincteur',
        location: equipment.location || '',
        status: equipment.status || 'conforme',
        last_inspection: equipment.last_inspection ? new Date(equipment.last_inspection).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        next_inspection: equipment.next_inspection ? new Date(equipment.next_inspection).toISOString().split('T')[0] : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: (equipment as any).notes || ''
      });
    }
  }, [equipment, mode]);

  const equipmentTypes = [
    { value: 'extincteur', label: 'Extincteur' },
    { value: 'ria', label: 'RIA (Robinet d\'Incendie Armé)' },
    { value: 'alarme', label: 'Système d\'alarme' },
    { value: 'detecteur', label: 'Détecteur de fumée' },
    { value: 'sprinkler', label: 'Sprinkler' },
    { value: 'autre', label: 'Autre' }
  ];

  const statusOptions = [
    { value: 'conforme', label: '✅ Conforme', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'a_reviser', label: '⚠️ À réviser', color: 'bg-orange-100 text-orange-700' },
    { value: 'hors_service', label: '❌ Hors service', color: 'bg-red-100 text-red-700' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userSite?.site_id) {
      toast.error('Erreur', 'Aucun site sélectionné');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        site_id: userSite.site_id,
        updated_at: new Date().toISOString()
      };

      if (mode === 'create') {
        const { error } = await supabase.from('equipements_incendie').insert(dataToSave);
        if (error) throw error;
        toast.success('Équipement ajouté', `Référence: ${formData.reference}`);
      } else if (mode === 'edit' && equipment?.id) {
        const { error } = await supabase
          .from('equipements_incendie')
          .update(dataToSave)
          .eq('id', equipment.id);
        if (error) throw error;
        toast.success('Équipement mis à jour', `Référence: ${formData.reference}`);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur', error.message || 'Impossible d\'enregistrer l\'équipement');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isReadOnly = mode === 'view';
  const getStatusInfo = (status: string) => statusOptions.find(s => s.value === status) || statusOptions[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Bannière d'info selon le mode */}
      <div className={`rounded-xl p-4 flex items-start gap-3 ${
        mode === 'view' ? 'bg-blue-50 border border-blue-200' :
        mode === 'edit' ? 'bg-amber-50 border border-amber-200' :
        'bg-red-50 border border-red-200'
      }`}>
        {mode === 'view' ? <Eye className="text-blue-500 flex-shrink-0 mt-0.5" size={20} /> :
         mode === 'edit' ? <Edit className="text-amber-500 flex-shrink-0 mt-0.5" size={20} /> :
         <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />}
        <p className={`text-sm ${
          mode === 'view' ? 'text-blue-800' :
          mode === 'edit' ? 'text-amber-800' :
          'text-red-800'
        }`}>
          {mode === 'view' ? 'Consultation des détails de l\'équipement (lecture seule)' :
           mode === 'edit' ? 'Modification de l\'équipement existant' :
           'Ajout d\'un nouvel équipement incendie'}
        </p>
      </div>

      {/* Référence et Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Tag size={16} className="inline mr-1" />
            Référence *
          </label>
          <input
            type="text"
            name="reference"
            value={formData.reference}
            onChange={handleInputChange}
            required={!isReadOnly}
            disabled={isReadOnly}
            placeholder="Ex: EXT-001"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type d'équipement *
          </label>
          {isReadOnly ? (
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800">
              {equipmentTypes.find(t => t.value === formData.type)?.label || formData.type}
            </div>
          ) : (
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              {equipmentTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Localisation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin size={16} className="inline mr-1" />
          Localisation *
        </label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleInputChange}
          required={!isReadOnly}
          disabled={isReadOnly}
          placeholder="Ex: Bâtiment A, Étage 2, Couloir principal"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
        />
      </div>

      {/* État */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <CheckCircle size={16} className="inline mr-1" />
          État de l'équipement *
        </label>
        {isReadOnly ? (
          <div className={`px-4 py-3 rounded-xl ${getStatusInfo(formData.status).color}`}>
            {getStatusInfo(formData.status).label}
          </div>
        ) : (
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Dates d'inspection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar size={16} className="inline mr-1" />
            Dernière inspection
          </label>
          <input
            type="date"
            name="last_inspection"
            value={formData.last_inspection}
            onChange={handleInputChange}
            disabled={isReadOnly}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar size={16} className="inline mr-1" />
            Prochaine inspection
          </label>
          <input
            type="date"
            name="next_inspection"
            value={formData.next_inspection}
            onChange={handleInputChange}
            disabled={isReadOnly}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes complémentaires
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          disabled={isReadOnly}
          rows={3}
          placeholder="Informations supplémentaires sur l'équipement..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-600"
        />
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {isReadOnly ? 'Fermer' : 'Annuler'}
        </button>
        {!isReadOnly && (
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Enregistrement...
              </>
            ) : (
              <>
                <Save size={20} />
                {mode === 'create' ? 'Ajouter l\'équipement' : 'Mettre à jour'}
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
}
