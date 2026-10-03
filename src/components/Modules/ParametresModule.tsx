import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Building, Bell, RefreshCw, Save, Loader,
  Plus, Edit, Trash2, Users, UserCog, Briefcase, History, User, Calendar, Clock, Monitor, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useUserSite } from '../../hooks/useUserSite';
import { DepartmentForm } from '../Forms/DepartmentForm';
import { useToast } from '../common/Toast';
import { useConfirm } from '../common/ConfirmDialog';

interface LoginHistory {
  id: string; user_id: string; user_email: string; user_name: string;
  ip_address: string; login_time: string; login_type: string;
  device_type: string; browser: string; os: string;
}

interface Site {
  id: string; name: string; code: string; address: string | null;
  city: string | null; country: string; manager_id: string | null;
  is_active: boolean; created_at: string;
}

interface SiteManager { id: string; full_name: string; email: string; }

interface Settings {
  company_name: string; company_country: string; company_city: string;
  notifications_alerts: boolean; notifications_reminders: boolean;
  notifications_push: boolean; notifications_weekly: boolean;
  offline_mode: boolean; sync_frequency: string;
  language: string; date_format: string; timezone: string;
}

interface Employee {
  id: string;
  full_name: string;
  department: string;
  phone: string;
  email: string;
  is_active: boolean;
}

interface AppUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export function ParametresModule() {
  const toast = useToast();
  const confirm = useConfirm();
  const { userSite } = useUserSite();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Historique
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState<'all' | 'success' | 'failed' | 'logout'>('all');
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const historyItemsPerPage = 20;

  // Sites
  const [sites, setSites] = useState<Site[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [siteModalMode, setSiteModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [siteManagers, setSiteManagers] = useState<SiteManager[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Départements
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [departmentModalMode, setDepartmentModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [departments, setDepartments] = useState<any[]>([]);

  // 🆕 Employés (Hôtes)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState({ full_name: '', department: '', phone: '', email: '' });

  // 🆕 Utilisateurs et Rôles
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // Paramètres généraux
  const [settings, setSettings] = useState<Settings>({
    company_name: '', company_country: 'Sénégal', company_city: '',
    notifications_alerts: true, notifications_reminders: true,
    notifications_push: false, notifications_weekly: true,
    offline_mode: true, sync_frequency: '5',
    language: 'fr', date_format: 'DD/MM/YYYY', timezone: 'Africa/Dakar'
  });

  const [siteForm, setSiteForm] = useState({
    name: '', code: '', address: '', city: '',
    country: 'Sénégal', manager_id: '', is_active: true
  });

  useEffect(() => {
    loadSettings();
    loadSites();
    loadSiteManagers();
    loadDepartments();
    checkAdminStatus();
    loadLoginHistory();
    loadEmployees();
    loadAppUsers();
  }, []);

  async function checkAdminStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        setIsAdmin(profile?.role === 'administrateur' || profile?.role === 'direction');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  }

  async function loadLoginHistory() {
    if (!isAdmin) return;
    setLoadingHistory(true);
    try {
      let query = supabase.from('login_history').select('*', { count: 'exact' })
        .order('login_time', { ascending: false })
        .range((historyCurrentPage - 1) * historyItemsPerPage, historyCurrentPage * historyItemsPerPage - 1);
      if (historyFilterType !== 'all') query = query.eq('login_type', historyFilterType);
      const { data, error, count } = await query;
      if (error) throw error;
      setLoginHistory(data || []);
      setHistoryTotalPages(Math.ceil((count || 0) / historyItemsPerPage));
    } catch (error) {
      console.error('Error loading login history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }

  function exportLoginHistory() {
    const csv = loginHistory.map(h => `${h.user_email},${h.user_name},${h.login_time},${h.login_type},${h.ip_address},${h.device_type},${h.browser},${h.os}`).join('\n');
    const blob = new Blob(['Email,Nom,Date/Heure,Type,IP,Appareil,Navigateur,OS\n' + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connexions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export réussi', 'Historique exporté en CSV');
  }

  async function loadDepartments() {
    try {
      const { data, error } = await supabase.from('departments').select(`id, name, code, description, site_id, manager_id, is_active, created_at, updated_at`).order('name');
      if (error) throw error;
      const sites = await supabase.from('sites').select('id, name, code');
      const managers = await supabase.from('profiles').select('id, full_name, email');
      const enrichedData = (data || []).map(dept => ({
        ...dept,
        site_name: sites.data?.find(s => s.id === dept.site_id)?.name || '-',
        manager_name: managers.data?.find(m => m.id === dept.manager_id)?.full_name || '-'
      }));
      setDepartments(enrichedData);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  }

  async function loadSettings() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('user_settings').select('settings').eq('user_id', user.id).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (data && data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSites() {
    try {
      setLoadingSites(true);
      const { data, error } = await supabase.from('sites').select(`id, name, code, address, city, country, manager_id, is_active, created_at`).order('name', { ascending: true });
      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Error loading sites:', error);
      toast.error('Erreur', 'Impossible de charger les sites');
    } finally {
      setLoadingSites(false);
    }
  }

  async function loadSiteManagers() {
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name, email').in('role', ['administrateur', 'chef_site', 'direction']).order('full_name');
      if (error) throw error;
      setSiteManagers(data || []);
    } catch (error) {
      console.error('Error loading site managers:', error);
    }
  }

  // 🆕 Charger les employés du site actuel
  async function loadEmployees() {
    if (!userSite?.site_id) return;
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('site_id', userSite.site_id)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  }

  // 🆕 Charger tous les utilisateurs pour la gestion des rôles
  async function loadAppUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name');
      if (error) throw error;
      setAppUsers(data || []);
    } catch (error) {
      console.error('Error loading app users:', error);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');
      const { data: existing } = await supabase.from('user_settings').select('id').eq('user_id', user.id).maybeSingle();
      let error;
      if (existing) {
        const { error: updateError } = await supabase.from('user_settings').update({ settings, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('user_settings').insert({ user_id: user.id, settings, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        error = insertError;
      }
      if (error) throw error;
      toast.success('Paramètres enregistrés', 'Vos préférences ont été sauvegardées');
      applySettings();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Erreur', error.message || 'Impossible d\'enregistrer les paramètres');
    } finally {
      setSaving(false);
    }
  }

  function applySettings() {
    if (settings.language === 'fr') document.documentElement.lang = 'fr';
    else if (settings.language === 'en') document.documentElement.lang = 'en';
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }

  async function handleSaveSite() {
    try {
      const siteData = {
        name: siteForm.name, code: siteForm.code.toUpperCase(),
        address: siteForm.address || null, city: siteForm.city || null,
        country: siteForm.country, manager_id: siteForm.manager_id || null,
        is_active: siteForm.is_active
      };
      if (siteModalMode === 'create') {
        const { error } = await supabase.from('sites').insert([siteData]);
        if (error) throw error;
        toast.success('Site créé', siteForm.name);
      } else if (siteModalMode === 'edit' && selectedSite) {
        const { error } = await supabase.from('sites').update({ ...siteData, updated_at: new Date().toISOString() }).eq('id', selectedSite.id);
        if (error) throw error;
        toast.success('Site modifié', siteForm.name);
      }
      setShowSiteModal(false);
      resetSiteForm();
      loadSites();
    } catch (error: any) {
      console.error('Error saving site:', error);
      toast.error('Erreur', error.message || 'Impossible de sauvegarder le site');
    }
  }

  async function handleDeleteSite(site: Site) {
    const ok = await confirm({
      title: 'Supprimer ce site ?',
      message: `Le site "${site.name}" et toutes ses données seront supprimés. Cette action est irréversible.`,
      variant: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from('sites').delete().eq('id', site.id);
      if (error) throw error;
      loadSites();
      toast.success('Site supprimé', site.name);
    } catch (error: any) {
      console.error('Error deleting site:', error);
      toast.error('Erreur', error.message || 'Impossible de supprimer le site');
    }
  }

  async function handleToggleSiteStatus(site: Site) {
    try {
      const { error } = await supabase.from('sites').update({ is_active: !site.is_active }).eq('id', site.id);
      if (error) throw error;
      loadSites();
      toast.success('Statut modifié', `Le site est maintenant ${site.is_active ? 'inactif' : 'actif'}`);
    } catch (error: any) {
      console.error('Error toggling site status:', error);
      toast.error('Erreur', error.message || 'Impossible de changer le statut');
    }
  }

  function openSiteModal(mode: 'create' | 'edit' | 'view', site?: Site) {
    setSiteModalMode(mode);
    if (site && (mode === 'edit' || mode === 'view')) {
      setSelectedSite(site);
      setSiteForm({
        name: site.name, code: site.code, address: site.address || '',
        city: site.city || '', country: site.country || 'Sénégal',
        manager_id: site.manager_id || '', is_active: site.is_active
      });
    } else {
      resetSiteForm();
    }
    setShowSiteModal(true);
  }

  function resetSiteForm() {
    setSiteForm({ name: '', code: '', address: '', city: '', country: 'Sénégal', manager_id: '', is_active: true });
    setSelectedSite(null);
  }

  function handleInputChange(field: keyof Settings, value: any) {
    setSettings(prev => ({ ...prev, [field]: value }));
  }

  // 🆕 Handlers pour les employés
  async function handleSaveEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!userSite?.site_id) {
      toast.error('Erreur', 'Aucun site sélectionné');
      return;
    }
    try {
      const payload = { ...employeeForm, site_id: userSite.site_id };
      if (editingEmployee) {
        const { error } = await supabase.from('employees').update(payload).eq('id', editingEmployee.id);
        if (error) throw error;
        toast.success('Employé mis à jour');
      } else {
        const { error } = await supabase.from('employees').insert(payload);
        if (error) throw error;
        toast.success('Employé ajouté');
      }
      setShowEmployeeModal(false);
      resetEmployeeForm();
      loadEmployees();
    } catch (error: any) {
      toast.error('Erreur', error.message || 'Impossible de sauvegarder l\'employé');
    }
  }

  async function handleDeleteEmployee(emp: Employee) {
    const ok = await confirm({
      title: 'Supprimer cet employé ?',
      message: `${emp.full_name} ne pourra plus être sélectionné comme hôte.`,
      variant: 'danger',
      confirmText: 'Supprimer'
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from('employees').update({ is_active: false }).eq('id', emp.id);
      if (error) throw error;
      toast.success('Employé supprimé');
      loadEmployees();
    } catch (error: any) {
      toast.error('Erreur', error.message);
    }
  }

  function resetEmployeeForm() {
    setEmployeeForm({ full_name: '', department: '', phone: '', email: '' });
    setEditingEmployee(null);
  }

  // 🆕 Handler pour changer le rôle d'un utilisateur
  async function handleRoleChange(userId: string, newRole: string) {
    setUpdatingRole(userId);
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      toast.success('Rôle mis à jour');
      loadAppUsers();
    } catch (error: any) {
      toast.error('Erreur', error.message);
    } finally {
      setUpdatingRole(null);
    }
  }

  const getLoginTypeBadge = (type: string) => {
    switch (type) {
      case 'success': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-600">Succès</span>;
      case 'failed': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">Échec</span>;
      case 'logout': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Déconnexion</span>;
      default: return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100">{type}</span>;
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <span className="text-xs">📱</span>;
      case 'tablet': return <span className="text-xs">📟</span>;
      default: return <span className="text-xs">💻</span>;
    }
  };

  const filteredHistory = loginHistory.filter(item =>
    item.user_email?.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
    item.user_name?.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
    item.ip_address?.includes(historySearchTerm)
  );

  const filteredSites = sites.filter(site => {
    const matchesSearch = site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (site.city && site.city.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesActive = filterActive === 'all' ? true : filterActive === 'active' ? site.is_active : !site.is_active;
    return matchesSearch && matchesActive;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500">Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Paramètres</h2>
        <p className="text-gray-500">Configuration de l'application, gestion des sites, des employés et des rôles</p>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <History className="text-emerald-500" size={20} /> Historique des connexions
                </h3>
                <p className="text-sm text-gray-500 mt-1">Suivez toutes les connexions des utilisateurs</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setHistoryCurrentPage(1); loadLoginHistory(); }} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1">
                  <RefreshCw size={14} /> Rafraîchir
                </button>
                <button onClick={exportLoginHistory} className="px-3 py-1.5 text-sm bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 flex items-center gap-1">
                  <Download size={14} /> Exporter CSV
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex-1 min-w-[200px] relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><span className="text-sm">🔍</span></span>
                <input type="text" placeholder="Rechercher par email, nom ou IP..." value={historySearchTerm} onChange={(e) => setHistorySearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>
              <select value={historyFilterType} onChange={(e) => { setHistoryFilterType(e.target.value as any); setHistoryCurrentPage(1); loadLoginHistory(); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
                <option value="all">Tous les types</option>
                <option value="success">Succès</option>
                <option value="failed">Échec</option>
                <option value="logout">Déconnexion</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            {loadingHistory ? (
              <div className="flex justify-center py-12"><Loader className="animate-spin" size={24} /></div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12"><History size={48} className="mx-auto text-gray-300 mb-4" /><p className="text-gray-500">Aucun historique de connexion</p></div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-500">
                    <th className="px-6 py-4 font-medium">Utilisateur</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium">Date / Heure</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Appareil</th>
                    <th className="px-6 py-4 font-medium">Navigateur</th>
                    <th className="px-6 py-4 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4"><div className="flex items-center gap-2"><User size={14} className="text-gray-400" /><span className="font-medium text-gray-800">{item.user_name || '-'}</span></div></td>
                      <td className="px-6 py-4 text-gray-600">{item.user_email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1"><Calendar size={12} className="text-gray-400" /><span className="text-gray-600">{new Date(item.login_time).toLocaleDateString('fr-FR')}</span></div>
                        <div className="flex items-center gap-1 mt-1"><Clock size={12} className="text-gray-400" /><span className="text-xs text-gray-400">{new Date(item.login_time).toLocaleTimeString('fr-FR')}</span></div>
                      </td>
                      <td className="px-6 py-4">{getLoginTypeBadge(item.login_type)}</td>
                      <td className="px-6 py-4"><div className="flex items-center gap-1">{getDeviceIcon(item.device_type)}<span className="text-gray-600 capitalize">{item.device_type || '-'}</span></div></td>
                      <td className="px-6 py-4"><div className="flex items-center gap-1"><Monitor size={12} className="text-gray-400" /><span className="text-gray-600">{item.browser || '-'}</span></div><div className="text-xs text-gray-400 mt-1">{item.os || '-'}</div></td>
                      <td className="px-6 py-4"><code className="text-xs bg-gray-100 px-2 py-1 rounded">{item.ip_address || '-'}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {historyTotalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">Page {historyCurrentPage} sur {historyTotalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setHistoryCurrentPage(p => Math.max(1, p - 1))} disabled={historyCurrentPage === 1} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50"><ChevronLeft size={18} /></button>
                <button onClick={() => setHistoryCurrentPage(p => Math.min(historyTotalPages, p + 1))} disabled={historyCurrentPage === historyTotalPages} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50"><ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🆕 Gestion des Employés (Hôtes) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Users className="text-blue-500" size={20} /> Gestion des Employés (Hôtes)</h3>
            <p className="text-sm text-gray-500 mt-1">Liste des employés à sélectionner lors de l'enregistrement des visites</p>
          </div>
          <button onClick={() => { resetEmployeeForm(); setShowEmployeeModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
            <Plus size={18} /> Ajouter un employé
          </button>
        </div>
        <div className="overflow-x-auto">
          {employees.length === 0 ? (
            <div className="text-center py-12"><Users size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">Aucun employé enregistré pour ce site</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-6 py-4 font-medium">Nom complet</th>
                  <th className="px-6 py-4 font-medium">Département</th>
                  <th className="px-6 py-4 font-medium">Téléphone</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">{emp.full_name}</td>
                    <td className="px-6 py-4 text-gray-600">{emp.department || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{emp.phone || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{emp.email || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditingEmployee(emp); setEmployeeForm({ full_name: emp.full_name, department: emp.department || '', phone: emp.phone || '', email: emp.email || '' }); setShowEmployeeModal(true); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="Modifier"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteEmployee(emp)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 🆕 Gestion des Utilisateurs et Rôles */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><UserCog className="text-purple-500" size={20} /> Gestion des Utilisateurs et Rôles</h3>
          <p className="text-sm text-gray-500 mt-1">Attribuez des rôles spécifiques aux utilisateurs de l'application</p>
        </div>
        <div className="overflow-x-auto">
          {appUsers.length === 0 ? (
            <div className="text-center py-12"><UserCog size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">Aucun utilisateur trouvé</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-6 py-4 font-medium">Utilisateur</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Rôle</th>
                  <th className="px-6 py-4 font-medium text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">{user.full_name || 'Non renseigné'}</td>
                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.role || 'utilisateur'} 
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={updatingRole === user.id}
                        className="text-xs font-semibold rounded-lg px-3 py-1.5 border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white disabled:opacity-50"
                      >
                        <option value="administrateur">👑 Administrateur</option>
                        <option value="responsable_surete">🛡️ Responsable Sûreté</option>
                        <option value="agent_securite">👮 Agent de Sécurité</option>
                        <option value="responsable_qhse">📋 Responsable QHSE</option>
                        <option value="utilisateur">👤 Utilisateur</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Actif</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Gestion des Sites */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Building className="text-emerald-500" size={20} /> Gestion des Sites</h3>
            <p className="text-sm text-gray-500 mt-1">Créez, modifiez et gérez les sites de votre entreprise</p>
          </div>
          <button onClick={() => openSiteModal('create')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
            <Plus size={18} /> Ajouter un site
          </button>
        </div>
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><span className="text-sm">🔍</span></span>
            <input type="text" placeholder="Rechercher un site..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
          </div>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value as any)} className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500">
            <option value="all">Tous les sites</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          {loadingSites ? (
            <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>
          ) : filteredSites.length === 0 ? (
            <div className="text-center py-12"><Building size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">Aucun site trouvé</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-6 py-4 font-medium">Code</th>
                  <th className="px-6 py-4 font-medium">Nom du site</th>
                  <th className="px-6 py-4 font-medium">Ville</th>
                  <th className="px-6 py-4 font-medium">Responsable</th>
                  <th className="px-6 py-4 font-medium">Statut</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSites.map((site) => (
                  <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4"><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{site.code}</span></td>
                    <td className="px-6 py-4 font-medium text-gray-800">{site.name}</td>
                    <td className="px-6 py-4 text-gray-600">{site.city || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{siteManagers.find(m => m.id === site.manager_id)?.full_name || '-'}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleToggleSiteStatus(site)} className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${site.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${site.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {site.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openSiteModal('view', site)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Voir"><span className="text-sm">👁️</span></button>
                        <button onClick={() => openSiteModal('edit', site)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="Modifier"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteSite(site)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Gestion des Départements */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Briefcase className="text-purple-500" size={20} /> Gestion des Départements</h3>
            <p className="text-sm text-gray-500 mt-1">Créez et gérez les départements par site</p>
          </div>
          <button onClick={() => { setDepartmentModalMode('create'); setSelectedDepartment(null); setShowDepartmentModal(true); }} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
            <Plus size={18} /> Ajouter un département
          </button>
        </div>
        <div className="overflow-x-auto">
          {departments.length === 0 ? (
            <div className="text-center py-12"><Briefcase size={48} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500">Aucun département créé</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-6 py-4 font-medium">Code</th>
                  <th className="px-6 py-4 font-medium">Nom</th>
                  <th className="px-6 py-4 font-medium">Site</th>
                  <th className="px-6 py-4 font-medium">Responsable</th>
                  <th className="px-6 py-4 font-medium">Statut</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs">{dept.code}</td>
                    <td className="px-6 py-4 font-medium">{dept.name}</td>
                    <td className="px-6 py-4">{dept.site_name || '-'}</td>
                    <td className="px-6 py-4">{dept.manager_name || '-'}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${dept.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{dept.is_active ? 'Actif' : 'Inactif'}</span></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setSelectedDepartment(dept); setDepartmentModalMode('view'); setShowDepartmentModal(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><span className="text-sm">👁️</span></button>
                        <button onClick={() => { setSelectedDepartment(dept); setDepartmentModalMode('edit'); setShowDepartmentModal(true); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"><Edit size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Paramètres généraux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Building className="text-emerald-500" size={20} /> Entreprise</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Nom de l'entreprise</label>
              <input type="text" value={settings.company_name} onChange={(e) => handleInputChange('company_name', e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nom de votre entreprise" />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Pays</label>
              <select value={settings.company_country} onChange={(e) => handleInputChange('company_country', e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option>Burkina Faso</option><option>Sénégal</option><option>Côte d'Ivoire</option><option>Mali</option><option>Niger</option><option>Bénin</option><option>Togo</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Ville principale</label>
              <input type="text" value={settings.company_city} onChange={(e) => handleInputChange('company_city', e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Ouagadougou" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Bell className="text-emerald-500" size={20} /> Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Alertes incidents graves</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.notifications_alerts} onChange={(e) => handleInputChange('notifications_alerts', e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Rappels d'échéances</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings.notifications_reminders} onChange={(e) => handleInputChange('notifications_reminders', e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => loadSettings()} className="px-6 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all">Annuler</button>
        <button onClick={saveSettings} disabled={saving} className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? <><Loader className="animate-spin" size={18} />Enregistrement...</> : <><Save size={18} />Enregistrer les modifications</>}
        </button>
      </div>

      {/* ==========================================
          MODALES
      ========================================== */}
      
      {/* Modal Site */}
      <Modal isOpen={showSiteModal} onClose={() => setShowSiteModal(false)} title={siteModalMode === 'create' ? "Ajouter un site" : siteModalMode === 'edit' ? "Modifier le site" : "Détails du site"} size="lg">
        <div className="space-y-6">
          {siteModalMode === 'view' && selectedSite ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-gray-600">{selectedSite.code}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${selectedSite.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{selectedSite.is_active ? 'Actif' : 'Inactif'}</span>
                </div>
                <h3 className="font-bold text-gray-800 text-lg">{selectedSite.name}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-gray-500">Adresse</label><p className="font-medium">{selectedSite.address || '-'}</p></div>
                <div><label className="text-sm text-gray-500">Ville</label><p className="font-medium">{selectedSite.city || '-'}</p></div>
                <div><label className="text-sm text-gray-500">Pays</label><p className="font-medium">{selectedSite.country || '-'}</p></div>
                <div><label className="text-sm text-gray-500">Responsable</label><p className="font-medium">{siteManagers.find(m => m.id === selectedSite.manager_id)?.full_name || '-'}</p></div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom du site *</label><input type="text" required value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} placeholder="Ex: Usine Dakar" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Code site *</label><input type="text" required value={siteForm.code} onChange={(e) => setSiteForm({ ...siteForm, code: e.target.value.toUpperCase() })} placeholder="Ex: DK-01" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 uppercase" /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Ville</label><input type="text" value={siteForm.city} onChange={(e) => setSiteForm({ ...siteForm, city: e.target.value })} placeholder="Ex: Dakar" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Pays</label><select value={siteForm.country} onChange={(e) => setSiteForm({ ...siteForm, country: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"><option>Sénégal</option><option>Burkina Faso</option><option>Côte d'Ivoire</option><option>Mali</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label><input type="text" value={siteForm.address} onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })} placeholder="Adresse complète" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label><select value={siteForm.manager_id} onChange={(e) => setSiteForm({ ...siteForm, manager_id: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"><option value="">Sélectionner</option>{siteManagers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
              <div className="flex items-center justify-between"><label className="text-sm font-medium text-gray-700">Site actif</label><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={siteForm.is_active} onChange={(e) => setSiteForm({ ...siteForm, is_active: e.target.checked })} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div></label></div>
            </>
          )}
          <div className="flex gap-3 pt-4">
            <button onClick={() => setShowSiteModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">{siteModalMode === 'view' ? 'Fermer' : 'Annuler'}</button>
            {siteModalMode !== 'view' && (<button onClick={handleSaveSite} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"><Save size={18} />{siteModalMode === 'create' ? 'Créer le site' : 'Enregistrer'}</button>)}
          </div>
        </div>
      </Modal>

      {/* Modal Département */}
      <Modal isOpen={showDepartmentModal} onClose={() => setShowDepartmentModal(false)} title="Département" size="lg">
        <DepartmentForm department={selectedDepartment} mode={departmentModalMode} onSuccess={() => { setShowDepartmentModal(false); toast.success('Département enregistré'); loadDepartments(); }} onCancel={() => setShowDepartmentModal(false)} />
      </Modal>

      {/* 🆕 Modal Employé */}
      <Modal isOpen={showEmployeeModal} onClose={() => { setShowEmployeeModal(false); resetEmployeeForm(); }} title={editingEmployee ? "Modifier l'employé" : "Ajouter un employé"} size="md">
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
            <input required type="text" value={employeeForm.full_name} onChange={e => setEmployeeForm({...employeeForm, full_name: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ex: Jean Dupont" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
              <input type="text" value={employeeForm.department} onChange={e => setEmployeeForm({...employeeForm, department: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ex: Maintenance" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input type="tel" value={employeeForm.phone} onChange={e => setEmployeeForm({...employeeForm, phone: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ex: 06 12 34 56 78" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={employeeForm.email} onChange={e => setEmployeeForm({...employeeForm, email: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="jean.dupont@entreprise.com" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => { setShowEmployeeModal(false); resetEmployeeForm(); }} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
              <Save size={18} />
              {editingEmployee ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
