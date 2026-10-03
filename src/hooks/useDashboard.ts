// src/hooks/useDashboard.ts
import { useEffect, useMemo } from 'react';
import { useIncidentStore } from '../stores/incidentStore';
import { useActionStore } from '../stores/actionStore';
import { useUserSite } from './useUserSite';

export interface DashboardStats {
  incidentsThisMonth: number;
  incidentsLastMonth: number;
  incidentsEvolution: number;
  actionsEnCours: number;
  actionsTerminees: number;
  conformityRate: number;
  daysWithoutAccident: number;
  totalIncidents: number;
  totalSites: number;
}

export function useDashboard() {
  const { userSite } = useUserSite();
  const {
    incidents,
    loading: incidentsLoading,
    fetchIncidents: fetchIncidentsStore,
    enableRealtime: enableIncidentsRealtime,
    realtimeEnabled,
  } = useIncidentStore();

  const {
    actions,
    stats: actionStats,
    loading: actionsLoading,
    fetchActions,
    enableRealtime: enableActionsRealtime,
  } = useActionStore();

  // Charger les données au montage
  useEffect(() => {
    if (userSite?.site_id) {
      fetchIncidentsStore(userSite.site_id, true);
      fetchActions(userSite.site_id);
      
      if (!realtimeEnabled) {
        enableIncidentsRealtime();
        enableActionsRealtime();
      }
    }
  }, [userSite?.site_id]);

  // Calculer les stats du dashboard
  const stats = useMemo<DashboardStats>(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const incidentsThisMonth = incidents.filter(inc => {
      const date = new Date(inc.incident_date || inc.created_at);
      return date >= startOfMonth;
    }).length;

    const incidentsLastMonth = incidents.filter(inc => {
      const date = new Date(inc.incident_date || inc.created_at);
      return date >= startOfLastMonth && date <= endOfLastMonth;
    }).length;

    const incidentsEvolution = incidentsLastMonth > 0
      ? Math.round(((incidentsThisMonth - incidentsLastMonth) / incidentsLastMonth) * 100)
      : 0;

    // Calculer les jours sans accident
    let daysWithoutAccident = 0;
    const sortedIncidents = [...incidents].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    if (sortedIncidents.length > 0) {
      const lastIncidentDate = new Date(sortedIncidents[0].created_at);
      const diffTime = Math.abs(now.getTime() - lastIncidentDate.getTime());
      daysWithoutAccident = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      incidentsThisMonth,
      incidentsLastMonth,
      incidentsEvolution,
      actionsEnCours: actionStats.enCours,
      actionsTerminees: actionStats.terminees,
      conformityRate: actionStats.completionRate || 94,
      daysWithoutAccident,
      totalIncidents: incidents.length,
      totalSites: 1,
    };
  }, [incidents, actionStats]);

  // Stats par module pour les graphiques
  const modulesData = useMemo(() => {
    const counts: Record<string, number> = {
      sst: 0,
      incendie: 0,
      surete: 0,
      environnement: 0,
      qualite: 0,
    };

    incidents.forEach(inc => {
      if (counts[inc.module] !== undefined) {
        counts[inc.module]++;
      }
    });

    return [
      counts.sst,
      counts.incendie,
      counts.surete,
      counts.environnement,
      counts.qualite,
    ];
  }, [incidents]);

  // Évolution par mois (6 derniers mois)
  const incidentsByMonth = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const data = new Array(6).fill(0);
    const labels: string[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      labels.push(months[date.getMonth()]);
    }

    incidents.forEach(inc => {
      const incDate = new Date(inc.incident_date || inc.created_at);
      if (incDate >= sixMonthsAgo) {
        const monthDiff = 
          (incDate.getFullYear() - sixMonthsAgo.getFullYear()) * 12 +
          (incDate.getMonth() - sixMonthsAgo.getMonth());
        
        if (monthDiff >= 0 && monthDiff < 6) {
          data[monthDiff]++;
        }
      }
    });

    return { data, labels };
  }, [incidents]);

  // Accidents par mois
  const accidentsByMonth = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const data = new Array(6).fill(0);

    incidents.forEach(inc => {
      if (inc.type === 'accident') {
        const incDate = new Date(inc.incident_date || inc.created_at);
        if (incDate >= sixMonthsAgo) {
          const monthDiff = 
            (incDate.getFullYear() - sixMonthsAgo.getFullYear()) * 12 +
            (incDate.getMonth() - sixMonthsAgo.getMonth());
          
          if (monthDiff >= 0 && monthDiff < 6) {
            data[monthDiff]++;
          }
        }
      }
    });

    return data;
  }, [incidents]);

  // Incidents récents (top 5)
  const recentIncidents = useMemo(() => {
    return [...incidents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [incidents]);

  return {
    stats,
    modulesData,
    incidentsByMonth: incidentsByMonth.data,
    accidentsByMonth,
    months: incidentsByMonth.labels,
    recentIncidents,
    loading: incidentsLoading || actionsLoading,
    refresh: () => {
      if (userSite?.site_id) {
        fetchIncidentsStore(userSite.site_id, true);
        fetchActions(userSite.site_id);
      }
    },
  };
}
