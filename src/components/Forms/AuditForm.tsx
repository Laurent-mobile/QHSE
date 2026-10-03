import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ClipboardCheck, Loader } from 'lucide-react';
import { useToast } from '../common/Toast';

interface AuditFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AuditForm({ onSuccess, onCancel }: AuditFormProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'interne',
    scope: '',
    date: new Date().toISOString().split('T')[0],
    auditor: '',
    norme: 'ISO 9001',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const reference = `AUD-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase.from('audits').insert({
        reference,
        title: formData.title,
        type: formData.type,
        scope: formData.scope,
        date: formData.date,
        auditor: formData.auditor,
        norme: formData.norme,
        status: 'planifie',
      });

      if (error) throw error;
      
      toast.success('Audit planifié', `Référence: ${reference}`);
      onSuccess();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur', error.message || 'Impossible de créer l\'audit');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <ClipboardCheck className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-blue-800">
          Planifiez un audit interne ou externe pour vérifier la conformité aux normes.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Titre de l'audit *</label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Audit ISO 9001 - Production"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type d'audit *</label>
          <select
            required
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="interne">Interne</option>
            <option value="externe">Externe</option>
            <option value="certification">Certification</option>
            <option value="surveillance">Surveillance</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Norme de référence *</label>
          <select
            required
            value={formData.norme}
            onChange={(e) => setFormData({ ...formData, norme: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="ISO 9001">ISO 9001 - Qualité</option>
            <option value="ISO 14001">ISO 14001 - Environnement</option>
            <option value="ISO 45001">ISO 45001 - SST</option>
            <option value="ISO 27001">ISO 27001 - Sécurité Info</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Périmètre *</label>
        <input
          type="text"
          required
          value={formData.scope}
          onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
          placeholder="Département, processus ou site audité..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date de l'audit *</label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Auditeur *</label>
          <input
            type="text"
            required
            value={formData.auditor}
            onChange={(e) => setFormData({ ...formData, auditor: e.target.value })}
            placeholder="Nom de l'auditeur"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
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
          disabled={loading}
          className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="animate-spin" size={20} />
              Enregistrement...
            </>
          ) : (
            'Planifier l\'audit'
          )}
        </button>
      </div>
    </form>
  );
}
