import { useAuth } from './useAuth';
import { hasPermission, Permission, Role } from '../lib/permissions';

export function usePermission(requiredPermission: Permission) {
  // ⚠️ Assurez-vous que votre useAuth retourne bien l'objet 'profile' avec le 'role'
  const { profile } = useAuth(); 
  const userRole = (profile?.role as Role) || 'utilisateur';

  return {
    hasPermission: hasPermission(userRole, requiredPermission),
    role: userRole,
    isReadOnly: !hasPermission(userRole, requiredPermission)
  };
}
