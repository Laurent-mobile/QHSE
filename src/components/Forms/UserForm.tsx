// src/components/Forms/UserForm.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { UserPlus, Loader, AlertCircle, CheckCircle, Mail, Lock, User, Building, Phone } from 'lucide-react';

interface UserFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function UserForm({ onSuccess, onCancel }: UserFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sites, setSites] = useState<{ id: string; name: string; code: string }[]>([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [showSiteSelection, setShowSiteSelection] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: 'employe',
    phone: '',
  });

  // Charger les sites disponibles
  useEffect(() => {
    loadSites();
  }, []);

  async function loadSites() {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Error loading sites:', error);
    }
  }

  // Vérifier si l'email existe déjà
  const checkEmailAvailability = async (email: string) => {
    if (!email || email.length < 3) {
      setEmailAvailable(null);
      return;
    }

    setCheckingEmail(true);
    try {
      // Vérifier dans la table profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile check error:', profileError);
      }

      if (profileData) {
        setEmailAvailable(false);
        setError(`L'email "${email}" est déjà utilisé. Veuillez en choisir un autre.`);
      } else {
        setEmailAvailable(true);
        setError(null);
      }
    } catch (error) {
      console.error('Error checking email:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  // Debounce pour la vérification d'email
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.email) {
        checkEmailAvailability(formData.email);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.email]);

  // Basculer la sélection d'un site
  const toggleSiteSelection = (siteId: string) => {
    setSelectedSiteIds(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  // Sélectionner tous les sites
  const selectAllSites = () => {
    setSelectedSiteIds(sites.map(site => site.id));
  };

  // Désélectionner tous les sites
  const deselectAllSites = () => {
    setSelectedSiteIds([]);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation des champs
    if (!formData.full_name.trim()) {
      setError('Le nom complet est requis');
      return;
    }

    if (!formData.email.trim()) {
      setError('L\'email est requis');
      return;
    }

    if (!formData.password) {
      setError('Le mot de passe est requis');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (emailAvailable === false) {
      setError('Cet email est déjà utilisé. Veuillez en choisir un autre.');
      return;
    }

    setLoading(true);

    try {
      // Étape 1: Créer l'utilisateur dans Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          },
        },
      });

      if (authError) {
        console.error('Auth error:', authError);

        if (authError.message.includes('already registered')) {
          setError(`L'email "${formData.email}" est déjà enregistré. Veuillez utiliser un autre email.`);
        } else if (authError.message.includes('password')) {
          setError('Le mot de passe doit contenir au moins 6 caractères.');
        } else {
          setError(`Erreur d'authentification: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Erreur lors de la création de l\'utilisateur');
        setLoading(false);
        return;
      }

      // Étape 2: Créer le profil dans la table profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone || null,
          created_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        setError(`Erreur lors de la création du profil: ${profileError.message}`);
        setLoading(false);
        return;
      }

      // Stocker l'ID utilisateur temporairement
      setTempUserId(authData.user.id);

      // Si des sites sont sélectionnés, les associer
      if (selectedSiteIds.length > 0) {
        const userSitesData = selectedSiteIds.map(siteId => ({
          user_id: authData.user.id,
          site_id: siteId,
          created_at: new Date().toISOString()
        }));

        const { error: userSiteError } = await supabase
          .from('user_sites')
          .insert(userSitesData);

        if (userSiteError) {
          console.error('Error assigning user to sites:', userSiteError);
          // Ne pas bloquer la création, juste logger l'erreur
        }
      }

      setSuccess(true);

      // Réinitialiser le formulaire
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        role: 'employe',
        phone: '',
      });
      setSelectedSiteIds([]);
      setEmailAvailable(null);

      // Attendre 2 secondes avant de fermer
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (err: any) {
      console.error('Erreur lors de la création de l\'utilisateur:', err);
      setError(err.message || 'Une erreur inattendue est survenue');
    } finally {
      setLoading(false);
    }
  }

  const roles = [
    { value: 'employe', label: 'Employé', description: 'Accès limité aux fonctionnalités de base' },
    { value: 'responsable_hse', label: 'Responsable HSE', description: 'Gestion des incidents, EPI et formations' },
    { value: 'responsable_surete', label: 'Responsable Sûreté', description: 'Gestion des visiteurs et contrôle d\'accès' },
    { value: 'chef_site', label: 'Chef de site', description: 'Gestion complète du site' },
    { value: 'agent_securite', label: 'Agent de sécurité', description: 'Enregistrement visiteurs et surveillance' },
    { value: 'direction', label: 'Direction', description: 'Accès aux rapports et tableaux de bord' },
    { value: 'administrateur', label: 'Administrateur', description: 'Accès complet à toutes les fonctionnalités' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Message de succès */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in duration-300">
          <CheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-emerald-800">Utilisateur créé avec succès !</p>
            <p className="text-xs text-emerald-600 mt-1">
              Un email de confirmation a été envoyé à {formData.email}
            </p>
            {selectedSiteIds.length > 0 && (
              <p className="text-xs text-emerald-600 mt-1">
                Affecté à {selectedSiteIds.length} site(s)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-medium text-red-800">Erreur</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <UserPlus className="text-blue-500 flex-shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-blue-800">
          Créez un nouveau compte utilisateur. Un email de confirmation sera envoyé automatiquement.
        </p>
      </div>

      {/* Informations personnelles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <User size={16} className="inline mr-1" />
          Nom complet *
        </label>
        <input
          type="text"
          required
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="Prénom et nom"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          disabled={loading || success}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Mail size={16} className="inline mr-1" />
            Email *
          </label>
          <div className="relative">
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemple.com"
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${emailAvailable === false ? 'border-red-500 bg-red-50' :
                  emailAvailable === true ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                }`}
              disabled={loading || success}
            />
            {checkingEmail && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader size={16} className="animate-spin text-gray-400" />
              </div>
            )}
            {emailAvailable === true && !checkingEmail && (
              <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
            )}
          </div>
          {emailAvailable === false && (
            <p className="text-xs text-red-500 mt-1">Cet email est déjà utilisé</p>
          )}
          {emailAvailable === true && (
            <p className="text-xs text-emerald-500 mt-1">Email disponible</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Phone size={16} className="inline mr-1" />
            Téléphone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+226 XX XX XX XX"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            disabled={loading || success}
          />
        </div>
      </div>

      {/* Mot de passe */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Lock size={16} className="inline mr-1" />
            Mot de passe *
          </label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Minimum 6 caractères"
            minLength={6}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            disabled={loading || success}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Lock size={16} className="inline mr-1" />
            Confirmer le mot de passe *
          </label>
          <input
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="Confirmer le mot de passe"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            disabled={loading || success}
          />
        </div>
      </div>

      {/* Rôle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rôle *
        </label>
        <select
          required
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          disabled={loading || success}
        >
          {roles.map(role => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {roles.find(r => r.value === formData.role)?.description}
        </p>
      </div>

      {/* Sélection des sites (multi-sites) */}
      {sites.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Building size={16} className="inline mr-1" />
            Sites d'affectation *
          </label>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={selectAllSites}
              className="text-xs text-emerald-600 hover:text-emerald-700"
            >
              Tout sélectionner
            </button>
            <span className="text-xs text-gray-300">|</span>
            <button
              type="button"
              onClick={deselectAllSites}
              className="text-xs text-gray-500 hover:text-gray-600"
            >
              Tout désélectionner
            </button>
          </div>
          <div className="border border-gray-200 rounded-xl p-4 max-h-48 overflow-y-auto">
            <div className="space-y-2">
              {sites.map(site => (
                <label key={site.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={selectedSiteIds.includes(site.id)}
                    onChange={() => toggleSiteSelection(site.id)}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    disabled={loading || success}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">{site.name}</span>
                    <span className="text-xs text-gray-400 ml-2">({site.code})</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            L'utilisateur pourra accéder à tous les sites sélectionnés
          </p>
        </div>
      )}

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
          disabled={loading || success || emailAvailable === false || checkingEmail || selectedSiteIds.length === 0}
          className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="animate-spin" size={20} />
              Création en cours...
            </>
          ) : success ? (
            <>
              <CheckCircle size={20} />
              Créé avec succès
            </>
          ) : (
            <>
              <UserPlus size={20} />
              Créer l'utilisateur
            </>
          )}
        </button>
      </div>
    </form>
  );
}
