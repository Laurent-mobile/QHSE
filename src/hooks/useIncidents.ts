import { useEffect, useMemo } from 'react';
import { useIncidentStore } from '../stores/incidentStore';
import { useUserSite } from './useUserSite';

export function useIncidents(module?: string) {
  const { userSite } = useUserSite();
  const siteId = userSite?.site_id || null;

  // 🎯 1. Sélectionner UNIQUEMENT les valeurs primitives. 
  // Cela garantit une référence stable et empêche les boucles infinies de React.
  const allIncidents = useIncidentStore((state) => state.incidents);
  const loading = useIncidentStore((state) => state.loading);
  const stats = useIncidentStore((state) => state.stats);
  const realtimeEnabled = useIncidentStore((state) => state.realtimeEnabled);
  const lastSync = useIncidentStore((state) => state.lastSync);
  
  // 🎯 2. Les fonctions sont stables dans Zustand, aucun risque de boucle.
  const fetchIncidents = useIncidentStore((state) => state.fetchIncidents);
  const setFilters = useIncidentStore((state) => state.setFilters);
  const resetFilters = useIncidentStore((state) => state.resetFilters);
  const enableRealtime = useIncidentStore((state) => state.enableRealtime);

  // 🎯 3. Appliquer le filtre de module au store global si spécifié
  useEffect(() => {
    if (module) {
      setFilters({ module });
    } else {
      resetFilters();
    }
  }, [module, setFilters, resetFilters]);

  // 🎯 4. Déclencher le chargement des données quand l'ID du site change
  useEffect(() => {
    if (siteId) {
      console.log(`🔄 Chargement des données pour le site : ${siteId}`);
      fetchIncidents(siteId, true); // true = on vide les anciennes données avant
      
      if (!realtimeEnabled) {
        enableRealtime();
      }
    }
  }, [siteId, fetchIncidents, enableRealtime, realtimeEnabled]);

  // 🎯 5. Filtrer localement par module si nécessaire (useMemo garantit une référence stable)
  const incidents = useMemo(() => {
    if (!module) return allIncidents;
    return allIncidents.filter(i => i.module === module);
  }, [allIncidents, module]);

  return {
    incidents,
    allIncidents,
    loading,
    stats,
    realtimeEnabled,
    lastSync,
    userSite,
    refresh: () => {
      if (siteId) {
        fetchIncidents(siteId, true);
      }
    },
  };
}
