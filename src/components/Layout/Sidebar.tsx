import { useState, useEffect } from 'react';
import {
  LayoutDashboard, HardHat, Flame, Shield, Leaf, Award,
  BarChart3, Users, Settings, Building, ChevronDown, LogOut
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUserSite } from '../../hooks/useUserSite';
import { usePermission } from '../../hooks/usePermission'; // 🆕 AJOUT
import { supabase } from '../../lib/supabase';

interface SidebarProps {
  currentModule: string;
  onModuleChange: (module: string) => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

// 🆕 AJOUT : Champ 'permission' pour chaque élément du menu
const menuItems = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, color: 'emerald', permission: 'dashboard:view' },
  { id: 'sst', label: 'Santé & Sécurité', icon: HardHat, color: 'orange', permission: 'sst:view' },
  { id: 'incendie', label: 'Sécurité Incendie', icon: Flame, color: 'red', permission: 'incendie:view' },
  { id: 'surete', label: 'Sûreté', icon: Shield, color: 'blue', permission: 'surete:view' },
  { id: 'environnement', label: 'Environnement', icon: Leaf, color: 'green', permission: 'environnement:view' },
  { id: 'qualite', label: 'Qualité', icon: Award, color: 'purple', permission: 'qualite:view' },
  { id: 'rapports', label: 'Rapports', icon: BarChart3, color: 'indigo', permission: 'rapports:view' },
  { id: 'utilisateurs', label: 'Utilisateurs', icon: Users, color: 'teal', permission: 'parametres:manage_users' },
  { id: 'parametres', label: 'Paramètres', icon: Settings, color: 'gray', permission: 'parametres:view' },
];

export function Sidebar({ currentModule, onModuleChange, isMobileOpen, onMobileClose }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const { userSite, loading: siteLoading, allSites, switchSite } = useUserSite();
  const [showSiteSelector, setShowSiteSelector] = useState(false);
  const [appName, setAppName] = useState<string>('Afri SafeTrack');
  const [appSlogan, setAppSlogan] = useState<string>('Plateforme QHSE');

  useEffect(() => {
    loadAppSettings();
  }, []);

  async function loadAppSettings() {
    try {
      const { data, error } = await supabase.from('app_settings').select('app_name, app_version').limit(1).maybeSingle();
      if (data) {
        setAppName(data.app_name || 'Afri SafeTrack');
        setAppSlogan(data.app_version ? `Version ${data.app_version}` : 'Plateforme QHSE');
      }
    } catch (error) {
      console.error('Error loading app settings:', error);
    }
  }

  function handleModuleClick(moduleId: string) {
    onModuleChange(moduleId);
    onMobileClose();
  }

  // 🆕 FILTRAGE : On ne garde que les éléments du menu pour lesquels l'utilisateur a la permission
  const allowedMenuItems = menuItems.filter(item => {
    // Import local de la fonction pour éviter de créer un composant wrapper complexe ici
    const { hasPermission } = usePermission(item.permission as any);
    return hasPermission;
  });

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white shadow-xl transform transition-transform duration-300 overflow-y-auto ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-xl text-gray-800">{appName}</h1>
              <p className="text-xs text-gray-500">{appSlogan}</p>
            </div>
          </div>
        </div>

        {/* Profil et Site */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-emerald-600 font-semibold">{profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-800 truncate">{profile?.full_name || 'Utilisateur'}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{profile?.role?.replace(/_/g, ' ') || 'Employé'}</p>
            </div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          </div>

          <div className="mt-3 relative">
            <button onClick={() => setShowSiteSelector(!showSiteSelector)} className="w-full flex items-center justify-between gap-2 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" disabled={siteLoading}>
              <div className="flex items-center gap-2 min-w-0">
                <Building size={14} className="text-blue-600 flex-shrink-0" />
                <span className="text-xs font-medium text-blue-700 truncate">{siteLoading ? 'Chargement...' : userSite?.site_name || 'Aucun site'}</span>
              </div>
              {allSites.length > 1 && <ChevronDown size={14} className={`text-blue-600 flex-shrink-0 transition-transform duration-200 ${showSiteSelector ? 'rotate-180' : ''}`} />}
            </button>
            
            {showSiteSelector && allSites.length > 1 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                {allSites.map(site => (
                  <button key={site.site_id} onClick={() => { switchSite(site.site_id); setShowSiteSelector(false); }} className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${userSite?.site_id === site.site_id ? 'bg-emerald-50' : ''}`}>
                    <div className={`font-medium ${userSite?.site_id === site.site_id ? 'text-emerald-600' : 'text-gray-800'}`}>{site.site_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 🆕 Menu de navigation filtré par permissions */}
        <nav className="p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-4">Menu Principal</p>
          {allowedMenuItems.filter(i => i.id === 'dashboard').map((item) => <MenuItem key={item.id} item={item} currentModule={currentModule} onClick={handleModuleClick} />)}

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-3 px-4">Modules QHSE</p>
          {allowedMenuItems.filter(i => ['sst', 'incendie', 'surete', 'environnement', 'qualite'].includes(i.id)).map((item) => <MenuItem key={item.id} item={item} currentModule={currentModule} onClick={handleModuleClick} />)}

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-3 px-4">Administration</p>
          {allowedMenuItems.filter(i => ['rapports', 'utilisateurs', 'parametres'].includes(i.id)).map((item) => <MenuItem key={item.id} item={item} currentModule={currentModule} onClick={handleModuleClick} />)}
        </nav>

        {/* Footer */}
        <div className="p-4 mt-auto">
          <button onClick={signOut} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all">
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}

// Petit composant helper pour garder le code de la Sidebar propre
function MenuItem({ item, currentModule, onClick }: any) {
  const Icon = item.icon;
  const isActive = currentModule === item.id;
  return (
    <button
      onClick={() => onClick(item.id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-50'}`}
    >
      <Icon size={20} className={isActive ? '' : `text-${item.color}-500`} />
      <span className="font-medium">{item.label}</span>
    </button>
  );
}
