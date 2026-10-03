// src/components/Forms/IncidentForm.tsx
import { useState, useRef, useCallback, memo, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  AlertTriangle, Loader, Paperclip, Camera, FileText, Building, 
  CheckCircle, Pen, ShieldAlert, MapPin, RefreshCw, Navigation
} from 'lucide-react';
import { useUserSite } from '../../hooks/useUserSite';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../common/Toast';
import { useConfirm } from '../common/ConfirmDialog';
import { useIncidentStore } from '../../stores/incidentStore';
import { SignaturePad } from '../common/SignaturePad';
import { SignatureView } from '../common/SignatureView';
import { Modal } from '../common/Modal';
import { IncidentComments } from '../features/IncidentComments';
import { useGeolocation } from '../../hooks/useGeolocation';

const MODULE_COLORS: Record<string, string> = {
  sst: 'orange',
  incendie: 'red',
  surete: 'blue',
  environnement: 'green',
  qualite: 'purple'
};

const INCIDENT_TYPES = [
  { value: 'accident', label: 'Accident' },
  { value: 'presque_accident', label: 'Presque-accident' },
  { value: 'incident', label: 'Incident' },
  { value: 'situation_dangereuse', label: 'Situation dangereuse' }
];

const SEVERITY_LEVELS = [
  { value: 'faible', label: 'Faible', requiresSignature: false },
  { value: 'moyen', label: 'Moyen', requiresSignature: false },
  { value: 'grave', label: 'Grave', requiresSignature: true },
  { value: 'critique', label: 'Critique', requiresSignature: true }
];

interface Incident {
  id?: string;
  reference?: string;
  module?: string;
  type?: 'accident' | 'presque_accident' | 'incident' | 'situation_dangereuse';
  title?: string;
  description?: string;
  location?: string;
  incident_date?: string | null;
  incident_time?: string;
  severity?: 'faible' | 'moyen' | 'grave' | 'critique';
  immediate_actions?: string | null;
  witnesses?: string | null;
  affected_people?: string | null;
  status?: 'ouvert' | 'en_cours' | 'cloture';
  reporter_id?: string;
  site_id?: string;
  attachments?: string[] | null;
  signature?: string | null;
  signature_date?: string | null;
  signer_name?: string | null;
  location_gps?: any;
  location_address?: string | null;
  location_accuracy?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface IncidentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  module: string;
  incident?: Incident;
  mode?: 'create' | 'edit' | 'view';
}

export const IncidentForm = memo(function IncidentForm({
  onSuccess,
  onCancel,
  module,
  incident,
  mode = 'create'
}: IncidentFormProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const { createIncident, updateIncidentInDb } = useIncidentStore();
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [loadingSites, setLoadingSites] = useState(true);
  
  // États pour la signature
  const [signature, setSignature] = useState<string | null>(incident?.signature || null);
  const [signatureDate, setSignatureDate] = useState<string | null>(incident?.signature_date || null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  
  // États pour la géolocalisation
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    address: string | null;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { userSite, allSites } = useUserSite();
  const { location: geoLocation, error: geoError, loading: geoLoading, refresh: refreshGps } = useGeolocation();

  const getInitialFormData = useCallback(() => ({
    type: incident?.type || 'accident',
    title: incident?.title || '',
    description: incident?.description || '',
    location: incident?.location || '',
    incident_date: incident?.incident_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    incident_time: incident?.incident_time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    severity: incident?.severity || 'moyen',
    immediate_actions: incident?.immediate_actions || '',
    witnesses: incident?.witnesses || '',
    affected_people: incident?.affected_people || '',
  }), [incident]);

  const [formData, setFormData] = useState(getInitialFormData);

  useEffect(() => {
    if (userSite?.site_id) {
      setSelectedSiteId(userSite.site_id);
      setLoadingSites(false);
    } else if (allSites.length > 0) {
      setSelectedSiteId(allSites[0].site_id);
      setLoadingSites(false);
    } else {
      setLoadingSites(false);
    }
  }, [userSite, allSites]);

  // Récupération GPS automatique au montage (mode création uniquement)
  useEffect(() => {
    if (mode === 'create') {
      refreshGps();
    }
  }, [mode]);

  // Mettre à jour gpsLocation quand geoLocation change
  useEffect(() => {
    if (geoLocation) {
      setGpsLocation({
        latitude: geoLocation.latitude,
        longitude: geoLocation.longitude,
        accuracy: geoLocation.accuracy,
        address: geoLocation.formattedAddress || null,
      });
    }
  }, [geoLocation]);

  const color = MODULE_COLORS[module] || 'emerald';
  
  // Vérifier si la signature est requise
  const signatureRequired = SEVERITY_LEVELS.find(s => s.value === formData.severity)?.requiresSignature || false;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const oversized = newFiles.find(f => f.size > 10 * 1024 * 1024);
      if (oversized) {
        toast.error('Fichier trop volumineux', `${oversized.name} dépasse 10MB`);
        return;
      }
      setFiles(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} fichier(s) ajouté(s)`);
    }
  }, [toast]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = useCallback(async (): Promise<string[]> => {
    if (files.length === 0) return [];
    setUploadingFiles(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `incidents/${module}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);
        
        return publicUrl;
      });
      
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    } finally {
      setUploadingFiles(false);
    }
  }, [files, module]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSiteId) {
      toast.error('Site requis', 'Veuillez sélectionner un site');
      return;
    }

    // 🔒 Vérification de la signature pour incidents graves/critiques
    if (signatureRequired && !signature) {
      toast.warning('Signature requise', 'Les incidents graves/critiques doivent être signés électroniquement');
      setShowSignatureModal(true);
      return;
    }

    // Confirmation avant soumission pour les incidents graves
    if (signatureRequired && mode === 'create') {
      const ok = await confirm({
        title: 'Confirmer la déclaration',
        message: `Vous allez déclarer un incident de gravité "${formData.severity}". Cette action engage votre responsabilité.`,
        variant: 'warning',
        confirmText: 'Confirmer',
        cancelText: 'Annuler'
      });
      if (!ok) return;
    }

    setLoading(true);
    try {
      const attachmentUrls = await uploadFiles();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const reference = incident?.reference || `INC-${module.toUpperCase()}-${Date.now().toString().slice(-6)}`;
      const incidentDateTime = new Date(`${formData.incident_date}T${formData.incident_time}`).toISOString();

      const incidentData: any = {
        reference,
        module,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        incident_date: incidentDateTime,
        severity: formData.severity,
        status: incident?.status || 'ouvert',
        reporter_id: user.id,
        site_id: selectedSiteId,
        attachments: attachmentUrls.length ? attachmentUrls : null,
        immediate_actions: formData.immediate_actions || null,
        witnesses: formData.witnesses || null,
        affected_people: formData.affected_people || null,
        // 🆕 Données de signature
        signature: signature,
        signature_date: signature ? (signatureDate || new Date().toISOString()) : null,
        signer_name: signature ? (profile?.full_name || user.email) : null,
        // 🆕 Données de géolocalisation
        location_gps: gpsLocation 
          ? { 
              type: 'Point', 
              coordinates: [gpsLocation.longitude, gpsLocation.latitude] 
            }
          : null,
        location_address: gpsLocation?.address || null,
        location_accuracy: gpsLocation?.accuracy || null,
      };

      let success = false;
      
      if (mode === 'create') {
        const newIncident = await createIncident(incidentData);
        success = !!newIncident;
        if (success) {
          toast.success('Incident créé', `Référence: ${reference}`);
        }
      } else if (incident?.id) {
        success = await updateIncidentInDb(incident.id, incidentData);
        if (success) {
          toast.success('Incident mis à jour', `Référence: ${reference}`);
        }
      }

      if (success) {
        onSuccess();
      } else {
        toast.error('Échec', 'Impossible d\'enregistrer l\'incident');
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur', error.message || 'Impossible d\'enregistrer');
    } finally {
      setLoading(false);
    }
  }, [
    formData, module, uploadFiles, onSuccess, mode, incident, 
    selectedSiteId, signature, signatureDate, signatureRequired, gpsLocation,
    toast, confirm, createIncident, updateIncidentInDb, profile
  ]);

  const handleCancel = useCallback(async () => {
    const hasData = formData.title || formData.description || files.length > 0;
    
    if (hasData && mode !== 'view') {
      const ok = await confirm({
        title: 'Annuler la saisie ?',
        message: 'Les informations non enregistrées seront perdues.',
        variant: 'warning',
        confirmText: 'Quitter',
        cancelText: 'Continuer'
      });
      if (!ok) return;
    }
    onCancel();
  }, [formData, files, mode, onCancel, confirm]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Handlers pour la signature
  const handleSignatureSave = (dataUrl: string) => {
    setSignature(dataUrl);
    setSignatureDate(new Date().toISOString());
    setShowSignatureModal(false);
    toast.success('Signature enregistrée', 'Votre signature a été validée');
  };

  const handleSignatureRemove = async () => {
    const ok = await confirm({
      title: 'Supprimer la signature ?',
      message: 'La signature électronique sera supprimée. Vous devrez signer à nouveau pour les incidents graves/critiques.',
      variant: 'warning',
      confirmText: 'Supprimer'
    });
    if (ok) {
      setSignature(null);
      setSignatureDate(null);
      toast.info('Signature supprimée');
    }
  };

  if (loadingSites) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        <span className="ml-2 text-gray-600">Chargement du site...</span>
      </div>
    );
  }

  if (!selectedSiteId && allSites.length === 0) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Aucun site assigné</h3>
        <p className="text-gray-500 mb-4">Veuillez contacter votre administrateur.</p>
        <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Fermer</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Bannière d'info */}
      <div className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4 flex items-start gap-3`}>
        <AlertTriangle className={`text-${color}-500 flex-shrink-0 mt-0.5`} size={20} />
        <p className={`text-sm text-${color}-800`}>
          Signalez tout incident, accident ou presque-accident pour améliorer la sécurité.
        </p>
      </div>

      {/* Alerte signature requise */}
      {signatureRequired && !signature && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Signature électronique requise
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Les incidents de gravité <strong>{formData.severity}</strong> doivent être signés électroniquement 
              pour engager votre responsabilité.
            </p>
          </div>
        </div>
      )}

      {/* Site (lecture seule) */}
      <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
        <Building size={16} className="text-gray-500" />
        <span className="text-sm text-gray-600">Site:</span>
        <span className="text-sm font-medium text-gray-800">
          {allSites.find(s => s.site_id === selectedSiteId)?.site_name || 'Chargement...'}
        </span>
      </div>

      {/* 🆕 Géolocalisation automatique */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {geoLoading ? (
                <Loader className="text-blue-500 animate-spin" size={20} />
              ) : (
                <MapPin className="text-blue-500" size={20} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900 mb-1">Localisation GPS</p>
              {geoError && <p className="text-xs text-orange-700">{geoError}</p>}
              {gpsLocation && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-blue-800">
                    <Navigation size={12} />
                    <span className="font-mono">{gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}</span>
                  </div>
                  {gpsLocation.address && <p className="text-xs text-blue-700">📍 {gpsLocation.address}</p>}
                  <p className="text-xs text-blue-600">Précision: ±{Math.round(gpsLocation.accuracy)}m</p>
                </div>
              )}
            </div>
          </div>
          <button 
            type="button" 
            onClick={refreshGps} 
            disabled={geoLoading}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
          >
            <RefreshCw size={12} className={geoLoading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Type & Gravité */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormSelect
          label="Type d'incident"
          name="type"
          value={formData.type}
          onChange={handleInputChange}
          options={INCIDENT_TYPES}
          color={color}
          required
        />
        <FormSelect
          label="Gravité"
          name="severity"
          value={formData.severity}
          onChange={handleInputChange}
          options={SEVERITY_LEVELS.map(s => ({ value: s.value, label: s.label }))}
          color={color}
          required
        />
      </div>

      {/* Titre */}
      <FormInput
        label="Titre"
        name="title"
        type="text"
        value={formData.title}
        onChange={handleInputChange}
        placeholder="Résumé court de l'incident"
        color={color}
        required
      />

      {/* Description */}
      <FormTextarea
        label="Description détaillée"
        name="description"
        value={formData.description}
        onChange={handleInputChange}
        rows={4}
        placeholder="Décrivez les circonstances, les causes et les conséquences..."
        color={color}
        required
      />

      {/* Lieu, Date, Heure */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormInput
          label="Lieu"
          name="location"
          type="text"
          value={formData.location}
          onChange={handleInputChange}
          placeholder="Zone, atelier, bureau..."
          color={color}
          required
        />
        <FormInput
          label="Date"
          name="incident_date"
          type="date"
          value={formData.incident_date}
          onChange={handleInputChange}
          color={color}
          required
        />
        <FormInput
          label="Heure"
          name="incident_time"
          type="time"
          value={formData.incident_time}
          onChange={handleInputChange}
          color={color}
          required
        />
      </div>

      {/* Upload fichiers */}
      <FileUploadSection
        files={files}
        onFileSelect={handleFileChange}
        onRemoveFile={removeFile}
        fileInputRef={fileInputRef}
        color={color}
      />

      {/* Actions immédiates */}
      <FormTextarea
        label="Actions immédiates entreprises"
        name="immediate_actions"
        value={formData.immediate_actions}
        onChange={handleInputChange}
        rows={2}
        placeholder="Actions prises immédiatement après l'incident..."
        color={color}
      />

      {/* Témoins & Personnes affectées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput
          label="Témoins éventuels"
          name="witnesses"
          type="text"
          value={formData.witnesses}
          onChange={handleInputChange}
          placeholder="Noms des témoins"
          color={color}
        />
        <FormInput
          label="Personnes affectées"
          name="affected_people"
          type="text"
          value={formData.affected_people}
          onChange={handleInputChange}
          placeholder="Noms des personnes affectées"
          color={color}
        />
      </div>

      {/* 🆕 SECTION SIGNATURE */}
      {signatureRequired && (
        <div className="border-t-2 border-dashed border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Pen size={20} className="text-emerald-600" />
            Signature électronique
          </h3>
          
          {!signature ? (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800 mb-3">
                  Votre signature est <strong>obligatoire</strong> pour valider cet incident de gravité <strong>{formData.severity}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSignatureModal(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Pen size={18} />
                  Signer l'incident
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <SignatureView
                signature={signature}
                signatureDate={signatureDate}
                signerName={profile?.full_name || 'Signataire'}
              />
              <button
                type="button"
                onClick={handleSignatureRemove}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                Supprimer la signature
              </button>
            </div>
          )}
        </div>
      )}

      {/* Boutons d'action */}
      <FormActions
        onCancel={handleCancel}
        loading={loading || uploadingFiles}
        loadingText={uploadingFiles ? 'Téléchargement...' : 'Enregistrement...'}
        submitText={mode === 'create' ? "Enregistrer l'incident" : "Mettre à jour"}
        color={color}
        disabled={signatureRequired && !signature}
      />

      {/* 🆕 SECTION COMMENTAIRES (Uniquement en mode vue) */}
      {mode === 'view' && incident?.id && (
        <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-200">
          <IncidentComments incidentId={incident.id} />
        </div>
      )}

      {/* Modal de signature */}
      <Modal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        title="Signature électronique de l'incident"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>Engagement :</strong> En signant, vous certifiez que les informations 
              fournies sont exactes et complètes. Cette signature a valeur légale.
            </p>
          </div>
          
          <SignaturePad
            onSave={handleSignatureSave}
            onCancel={() => setShowSignatureModal(false)}
            initialSignature={signature}
            penColor="#059669"
          />
        </div>
      </Modal>
    </form>
  );
});

// ============================================
// Sous-composants mémoisés
// ============================================

const FormInput = memo(({ label, name, type, value, onChange, placeholder, color, required }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && '*'}
    </label>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-${color}-500 focus:border-transparent`}
    />
  </div>
));

const FormSelect = memo(({ label, name, value, onChange, options, color, required }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && '*'}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-${color}-500 focus:border-transparent`}
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
));

const FormTextarea = memo(({ label, name, value, onChange, rows, placeholder, color, required }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && '*'}
    </label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={rows}
      required={required}
      placeholder={placeholder}
      className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-${color}-500 focus:border-transparent resize-none`}
    />
  </div>
));

const FileUploadSection = memo(({ files, onFileSelect, onRemoveFile, fileInputRef, color }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      <Paperclip size={16} className="inline mr-1" />
      Photos / Documents (optionnel)
    </label>
    <input
      type="file"
      ref={fileInputRef}
      onChange={onFileSelect}
      multiple
      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
      className="hidden"
    />
    <div
      onClick={() => fileInputRef.current?.click()}
      className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer"
    >
      <Camera className="mx-auto text-gray-400 mb-2" size={32} />
      <p className="text-sm text-gray-600">
        <span className={`font-medium text-${color}-600`}>Cliquez pour ajouter</span> ou glissez vos fichiers
      </p>
      <p className="text-xs text-gray-400 mt-1">
        Photos, PDF, Word, Excel (max 10MB par fichier)
      </p>
    </div>
    {files.length > 0 && (
      <div className="mt-3 space-y-2">
        <p className="text-xs font-medium text-gray-500">Fichiers à télécharger :</p>
        {files.map((file: File, index: number) => (
          <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-blue-500" />
              <span className="text-sm truncate max-w-[200px]">{file.name}</span>
              <span className="text-xs text-gray-500">
                ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemoveFile(index)}
              className="p-1 text-red-500 hover:bg-red-100 rounded"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
));

const FormActions = memo(({ onCancel, loading, loadingText, submitText, color, disabled }: any) => (
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
      disabled={loading || disabled}
      className={`flex-1 px-6 py-3 bg-${color}-500 text-white rounded-xl hover:bg-${color}-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
    >
      {loading ? (
        <>
          <Loader className="animate-spin" size={20} />
          {loadingText}
        </>
      ) : (
        <>
          <CheckCircle size={20} />
          {submitText}
        </>
      )}
    </button>
  </div>
));
