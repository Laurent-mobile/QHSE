import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, UserPlus, Edit, Trash2, KeyRound, Shield, UserCheck, Building } from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { Modal } from '../common/Modal';
import { UserForm } from '../Forms/UserForm';
import { UserSitesModal } from '../Users/UserSitesModal';
import { useToast } from '../common/Toast';
import { useConfirm } from '../common/ConfirmDialog';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function UtilisateursModule() {
  const toast = useToast();
  const confirm = useConfirm();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [showUserSitesModal, setShowUserSitesModal] = useState(false);
  const [selectedUserForSites, setSelectedUserForSites] = useState<Profile | null>(null);

  const roles = [
    { value: 'employe', label: 'Employé', color: 'gray', permissions: ['Voir les incidents', 'Signaler un incident'] },
    { value: 'responsable_hse', label: 'Responsable HSE', color: 'orange', permissions: ['Gérer les incidents', 'Gérer les EPI', 'Planifier les formations'] },
    { value: 'responsable_surete', label: 'Responsable Sûreté', color: 'blue', permissions: ['Gérer les visiteurs', 'Contrôle accès', 'Gérer les incidents sûreté'] },
    { value: 'chef_site', label: 'Chef de site', color: 'emerald', permissions: ['Gérer tous les modules', 'Valider les actions', 'Générer rapports'] },
    { value: 'agent_securite', label: 'Agent de sécurité', color: 'purple', permissions: ['Enregistrer visiteurs', 'Scanner QR code', 'Gérer alarmes'] },
    { value: 'direction', label: 'Direction', color: 'indigo', permissions: ['Voir tous les rapports', 'Tableaux de bord', 'Statistiques globales'] },
    { value: 'administrateur', label: 'Administrateur', color: 'red', permissions: ['Gestion complète', 'Gestion utilisateurs', 'Configuration'] }
  ];

  useEffect(() => { loadProfiles(); }, []);

  function handleManageSites(user: Profile) {
    setSelectedUserForSites(user);
    setShowUserSitesModal(true);
  }

  async function loadProfiles() {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast.error('Erreur', 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateRole(userId: string, newRole: string) {
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole as any }).eq('id', userId);
      if (error) throw error;
      await loadProfiles();
      setShowRoleModal(false);
      setSelectedUser(null);
      toast.success('Rôle mis à jour', 'Les permissions ont été modifiées');
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Erreur', error.message || 'Impossible de mettre à jour le rôle');
    }
  }

  async function handleResetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Email envoyé', `Email de réinitialisation envoyé à ${email}`);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error('Erreur', error.message || 'Impossible d\'envoyer l\'email');
    }
  }

  // ✅ Remplacement confirm() par useConfirm
  async function handleDeleteUser(userId: string, userName: string) {
    const ok = await confirm({
      title: 'Supprimer cet utilisateur ?',
      message: `${userName} sera définitivement supprimé. Cette action est irréversible.`,
      variant: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    });

    if (!ok) return;

    try {
      await supabase.from('user_sites').delete().eq('user_id', userId);
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      await loadProfiles();
      toast.success('Utilisateur supprimé', userName);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Erreur', error.message || 'Impossible de supprimer l\'utilisateur');
    }
  }

  const getRoleBadgeColor = (role: string) => {
    const roleConfig = roles.find(r => r.value === role);
    switch (roleConfig?.color) {
      case 'purple': return 'bg-purple-100 text-purple-600';
      case 'orange': return 'bg-orange-100 text-orange-600';
      case 'blue': return 'bg-blue-100 text-blue-600';
      case 'emerald': return 'bg-emerald-100 text-emerald-600';
      case 'indigo': return 'bg-indigo-100 text-indigo-600';
      case 'red': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatRole = (role: string) => {
    const roleConfig = roles.find(r => r.value === role);
    return roleConfig?.label || role.replace('_', ' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestion des Utilisateurs</h2>
          <p className="text-gray-500">Gérez les rôles, permissions et accès des utilisateurs</p>
        </div>
        <button onClick={() => setShowUserModal(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
          <UserPlus size={20} /> Ajouter utilisateur
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center"><Users className="text-teal-500" size={20} /></div>
            <div><p className="text-2xl font-bold text-gray-800">{profiles.length}</p><p className="text-xs text-gray-500">Total utilisateurs</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><UserCheck className="text-emerald-500" size={20} /></div>
            <div><p className="text-2xl font-bold text-gray-800">{profiles.length}</p><p className="text-xs text-gray-500">Actifs</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"><Shield className="text-red-500" size={20} /></div>
            <div><p className="text-2xl font-bold text-gray-800">{profiles.filter(p => p.role === 'administrateur').length}</p><p className="text-xs text-gray-500">Administrateurs</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center"><UserCheck className="text-orange-500" size={20} /></div>
            <div><p className="text-2xl font-bold text-gray-800">{profiles.filter(p => p.role === 'responsable_hse').length}</p><p className="text-xs text-gray-500">Responsables HSE</p></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-500">
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Date création</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-xs">{profile.full_name?.charAt(0) || 'U'}</span>
                      </div>
                      <div><p className="font-medium text-gray-800">{profile.full_name}</p></div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(profile.role)}`}>{formatRole(profile.role)}</span></td>
                  <td className="px-6 py-4 text-gray-600">{profile.email}</td>
                  <td className="px-6 py-4 text-gray-600">{new Date(profile.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-emerald-600">Actif</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleManageSites(profile)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Gérer les sites"><Building size={16} /></button>
                      <button onClick={() => { setSelectedUser(profile); setSelectedRole(profile.role); setShowRoleModal(true); }} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg" title="Changer le rôle"><Shield size={16} /></button>
                      <button onClick={() => handleResetPassword(profile.email)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Réinitialiser le mot de passe"><KeyRound size={16} /></button>
                      <button onClick={() => handleDeleteUser(profile.id, profile.full_name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="Ajouter un nouvel utilisateur" size="lg">
        <UserForm onSuccess={() => { setShowUserModal(false); loadProfiles(); }} onCancel={() => setShowUserModal(false)} />
      </Modal>

      <Modal isOpen={showRoleModal} onClose={() => { setShowRoleModal(false); setSelectedUser(null); }} title="Changer le rôle de l'utilisateur" size="md">
        {selectedUser && (
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="font-medium text-gray-800">{selectedUser.full_name}</p>
              <p className="text-sm text-gray-500">{selectedUser.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau rôle</label>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500">
                {roles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Permissions :</p>
              <ul className="space-y-1">
                {roles.find(r => r.value === selectedRole)?.permissions.map((perm, idx) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />{perm}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRoleModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={() => handleUpdateRole(selectedUser.id, selectedRole)} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Mettre à jour</button>
            </div>
          </div>
        )}
      </Modal>

      <UserSitesModal
        isOpen={showUserSitesModal}
        onClose={() => { setShowUserSitesModal(false); setSelectedUserForSites(null); loadProfiles(); }}
        userId={selectedUserForSites?.id || ''}
        userName={selectedUserForSites?.full_name || ''}
        onSuccess={() => loadProfiles()}
      />
    </div>
  );
}
