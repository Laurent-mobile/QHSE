import { useState, useEffect, useRef } from 'react';
import { Menu, Search, Bell, Plus, RefreshCw, User, LogOut, Settings, ChevronDown, CheckCircle, AlertCircle, Clock, X, UserCircle, Shield, Building, Mail, Phone, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useUserSite } from '../../hooks/useUserSite';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface Notification {
  id: string; title: string; message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean; created_at: string; link?: string;
}

interface TopBarProps {
  onMenuClick: () => void;
  onNewIncident: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onNavigateToModule?: (module: string) => void;
}

export function TopBar({ onMenuClick, onNewIncident, onRefresh, refreshing, onNavigateToModule }: TopBarProps) {
  const toast = useToast();
  const { profile, signOut } = useAuth();
  const { userSite } = useUserSite();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState({
    incident_alerts: true, deadline_reminders: true,
    push_notifications: false, weekly_emails: true,
    email_frequency: 'immediate'
  });

  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    department: profile?.department || ''
  });

  const [savingProfile, setSavingProfile] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.id) {
      loadNotifications();
      loadNotificationSettings();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    const subscription = supabase.channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const newNotification = payload.new as Notification;
        if (newNotification.user_id === profile.id) {
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast.info(newNotification.title, newNotification.message);
        }
      }).subscribe();
    return () => { subscription.unsubscribe(); };
  }, [profile?.id, toast]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setShowNotifications(false);
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setShowUserMenu(false);
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowSearchResults(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadNotifications() {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  async function loadNotificationSettings() {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase.from('notification_settings').select('*').eq('user_id', profile.id).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setNotificationSettings({
          incident_alerts: data.incident_alerts,
          deadline_reminders: data.deadline_reminders,
          push_notifications: data.push_notifications,
          weekly_emails: data.weekly_emails,
          email_frequency: data.email_frequency
        });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
      if (error) throw error;
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', profile?.id).eq('read', false);
      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('Notifications marquées', 'Toutes les notifications ont été marquées comme lues');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Erreur', 'Impossible de marquer les notifications');
    }
  }

  // ✅ Remplacement alert() par toast
  async function updateProfile() {
    setSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        department: profileForm.department,
        updated_at: new Date().toISOString()
      }).eq('id', profile?.id);

      if (error) throw error;
      toast.success('Profil mis à jour', 'Vos informations ont été sauvegardées');
      setShowProfileModal(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Erreur', error.message || 'Impossible de mettre à jour le profil');
    } finally {
      setSavingProfile(false);
    }
  }

  // ✅ Remplacement alert() par toast
  async function updateNotificationSettings() {
    try {
      const { error } = await supabase.from('notification_settings').upsert({
        user_id: profile?.id,
        incident_alerts: notificationSettings.incident_alerts,
        deadline_reminders: notificationSettings.deadline_reminders,
        push_notifications: notificationSettings.push_notifications,
        weekly_emails: notificationSettings.weekly_emails,
        email_frequency: notificationSettings.email_frequency,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      toast.success('Paramètres enregistrés', 'Vos préférences de notification ont été mises à jour');
      setShowSettingsModal(false);
    } catch (error: any) {
      console.error('Error updating notification settings:', error);
      toast.error('Erreur', error.message || 'Impossible d\'enregistrer les paramètres');
    }
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); setShowSearchResults(false); return; }
    try {
      const { data: incidents } = await supabase.from('incidents').select('id, reference, title, module, status').ilike('title', `%${query}%`).limit(5);
      const { data: users } = await supabase.from('profiles').select('id, full_name, email, role').ilike('full_name', `%${query}%`).limit(3);
      const results = [
        ...(incidents || []).map(i => ({ ...i, type: 'incident', label: i.reference, subtitle: i.title })),
        ...(users || []).map(u => ({ ...u, type: 'user', label: u.full_name, subtitle: u.email }))
      ];
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching:', error);
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'warning': return <AlertCircle size={16} className="text-orange-500" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      default: return <Bell size={16} className="text-blue-500" />;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    return `Il y a ${diffDays} j`;
  };

  return (
    <>
      <div className="bg-white shadow-sm px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={onMenuClick} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors" aria-label="Ouvrir le menu">
            <Menu size={24} />
          </button>
          <div className="hidden lg:block relative flex-1 max-w-md" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)} placeholder="Rechercher un incident, un utilisateur..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 z-50 max-h-96 overflow-y-auto">
                {searchResults.map((result) => (
                  <button key={`${result.type}-${result.id}`} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0" onClick={() => { setSearchQuery(''); setShowSearchResults(false); if (result.type === 'incident' && onNavigateToModule) onNavigateToModule('sst'); }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${result.type === 'incident' ? 'bg-red-100' : 'bg-blue-100'}`}>
                        {result.type === 'incident' ? <AlertCircle size={14} className="text-red-500" /> : <User size={14} className="text-blue-500" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 text-sm">{result.label}</p>
                        <p className="text-xs text-gray-400">{result.subtitle}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          {onRefresh && (
            <button onClick={onRefresh} disabled={refreshing} className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50" aria-label="Rafraîchir">
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
          )}

          <div className="relative" ref={notificationRef}>
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs text-emerald-600 hover:text-emerald-700">Tout marquer comme lu</button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center"><Bell size={32} className="mx-auto text-gray-300 mb-2" /><p className="text-gray-500 text-sm">Aucune notification</p></div>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif.id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.read ? 'bg-blue-50/30' : ''}`} onClick={() => markAsRead(notif.id)}>
                        <div className="flex gap-3">
                          <div className="flex-shrink-0">{getNotificationIcon(notif.type)}</div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 text-sm">{notif.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                            <div className="flex items-center gap-2 mt-2"><Clock size={12} className="text-gray-400" /><span className="text-xs text-gray-400">{formatRelativeTime(notif.created_at)}</span></div>
                          </div>
                          {!notif.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={onNewIncident} className="hidden lg:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md">
            <Plus size={20} /><span className="font-medium">Nouveau signalement</span>
          </button>

          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 ml-2 p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-blue-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{profile?.full_name || 'Utilisateur'}</p>
                      <p className="text-xs text-gray-500 truncate">{profile?.email || 'email@exemple.com'}</p>
                      <p className="text-xs text-emerald-600 mt-0.5 capitalize">{profile?.role?.replace(/_/g, ' ') || 'Employé'}</p>
                    </div>
                  </div>
                  {userSite && (
                    <div className="mt-3 pt-2 border-t border-emerald-100">
                      <p className="text-xs text-gray-500">Site actuel</p>
                      <p className="text-sm font-medium text-gray-800">{userSite.site_name}</p>
                    </div>
                  )}
                </div>
                <div className="py-2">
                  <button onClick={() => { setShowUserMenu(false); setShowProfileModal(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <UserCircle size={16} className="text-gray-400" /> Mon profil
                  </button>
                  <button onClick={() => { setShowUserMenu(false); setShowSettingsModal(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Settings size={16} className="text-gray-400" /> Paramètres
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut size={16} /> Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Profil */}
      <Modal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} title="Mon Profil" size="md">
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{profile?.full_name}</h3>
              <p className="text-sm text-gray-500 capitalize">{profile?.role?.replace(/_/g, ' ')}</p>
              <p className="text-xs text-emerald-600 mt-1">{userSite?.site_name}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <input type="text" value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={profileForm.email} disabled className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500" />
            <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+226 XX XX XX XX" className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
            <input type="text" value={profileForm.department} onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })} placeholder="Production, RH, QHSE..." className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setShowProfileModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg">Annuler</button>
            <button onClick={updateProfile} disabled={savingProfile} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center justify-center gap-2">
              {savingProfile ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />} Enregistrer
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Paramètres notification */}
      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="Paramètres de notification" size="md">
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-xl">
            <p className="text-sm text-blue-800">Configurez vos préférences de notification</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><label className="font-medium text-gray-800">Alertes incidents</label><p className="text-xs text-gray-500">Recevoir les alertes pour les nouveaux incidents</p></div>
              <button onClick={() => setNotificationSettings({ ...notificationSettings, incident_alerts: !notificationSettings.incident_alerts })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationSettings.incident_alerts ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationSettings.incident_alerts ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div><label className="font-medium text-gray-800">Rappels d'échéances</label><p className="text-xs text-gray-500">Recevoir les rappels pour les échéances CAPA</p></div>
              <button onClick={() => setNotificationSettings({ ...notificationSettings, deadline_reminders: !notificationSettings.deadline_reminders })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationSettings.deadline_reminders ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationSettings.deadline_reminders ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div><label className="font-medium text-gray-800">Notifications push</label><p className="text-xs text-gray-500">Recevoir les notifications sur votre navigateur</p></div>
              <button onClick={() => setNotificationSettings({ ...notificationSettings, push_notifications: !notificationSettings.push_notifications })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationSettings.push_notifications ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationSettings.push_notifications ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div><label className="font-medium text-gray-800">Emails hebdomadaires</label><p className="text-xs text-gray-500">Recevoir un résumé hebdomadaire par email</p></div>
              <button onClick={() => setNotificationSettings({ ...notificationSettings, weekly_emails: !notificationSettings.weekly_emails })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationSettings.weekly_emails ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationSettings.weekly_emails ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div>
              <label className="block font-medium text-gray-800 mb-2">Fréquence des emails</label>
              <select value={notificationSettings.email_frequency} onChange={(e) => setNotificationSettings({ ...notificationSettings, email_frequency: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500" disabled={!notificationSettings.weekly_emails}>
                <option value="immediate">Immédiate</option>
                <option value="daily">Quotidienne</option>
                <option value="weekly">Hebdomadaire</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setShowSettingsModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg">Annuler</button>
            <button onClick={updateNotificationSettings} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center justify-center gap-2"><Save size={16} />Enregistrer</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
