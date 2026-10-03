export type Role = 'administrateur' | 'responsable_qhse' | 'responsable_surete' | 'agent_securite' | 'utilisateur';

export type Permission = 
  | 'dashboard:view'
  | 'sst:view' | 'sst:create' | 'sst:edit' | 'sst:delete'
  | 'incendie:view' | 'incendie:create' | 'incendie:edit' | 'incendie:delete'
  | 'surete:view' | 'surete:create' | 'surete:edit' | 'surete:delete'
  | 'environnement:view' | 'environnement:create'
  | 'qualite:view' | 'qualite:create' | 'qualite:edit'
  | 'rapports:view' | 'rapports:export'
  | 'parametres:view' | 'parametres:manage_users' | 'parametres:manage_sites';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  administrateur: [
    'dashboard:view',
    'sst:view', 'sst:create', 'sst:edit', 'sst:delete',
    'incendie:view', 'incendie:create', 'incendie:edit', 'incendie:delete',
    'surete:view', 'surete:create', 'surete:edit', 'surete:delete',
    'environnement:view', 'environnement:create',
    'qualite:view', 'qualite:create', 'qualite:edit',
    'rapports:view', 'rapports:export',
    'parametres:view', 'parametres:manage_users', 'parametres:manage_sites'
  ],
  responsable_qhse: [
    'dashboard:view',
    'sst:view', 'sst:create', 'sst:edit',
    'incendie:view', 'incendie:create', 'incendie:edit',
    'environnement:view', 'environnement:create',
    'qualite:view', 'qualite:create', 'qualite:edit',
    'rapports:view', 'rapports:export',
    'parametres:view'
  ],
  responsable_surete: [
    'dashboard:view',
    'surete:view', 'surete:create', 'surete:edit', 'surete:delete',
    'incendie:view',
    'rapports:view',
    'parametres:view'
  ],
  agent_securite: [
    'dashboard:view',
    'surete:view', 'surete:create',
    'incendie:view'
  ],
  utilisateur: [
    'dashboard:view',
    'sst:view', 'incendie:view', 'surete:view', 'qualite:view', 'environnement:view'
  ]
};

export function hasPermission(userRole: Role | null | undefined, requiredPermission: Permission): boolean {
  if (!userRole) return false;
  if (userRole === 'administrateur') return true; // Super-pouvoir de l'admin
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(requiredPermission);
}
