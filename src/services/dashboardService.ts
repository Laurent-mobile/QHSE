// src/services/dashboardService.ts
import { supabase } from '../lib/supabase';

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

export interface RecentIncident {
    id: string;
    reference: string;
    title: string;
    module: string;
    severity: string;
    location: string;
    status: string;
    created_at: string;
    incident_date: string;
}

export interface ChartData {
    incidentsByMonth: number[];
    accidentsByMonth: number[];
    modulesData: number[];
    months: string[];
}

class DashboardService {
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private CACHE_DURATION = 60000; // 1 minute

    private getCached<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data as T;
        }
        return null;
    }

    private setCache(key: string, data: any): void {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    private getCacheKey(siteId: string | null, suffix: string): string {
        return `${siteId || 'all'}_${suffix}`;
    }

    async getCurrentUserSite(): Promise<string | null> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // Récupérer le site actif depuis localStorage
            const savedSiteId = localStorage.getItem('currentSiteId');
            if (savedSiteId) return savedSiteId;

            // Sinon, prendre le premier site de l'utilisateur
            const { data: userSites } = await supabase
                .from('user_sites')
                .select('site_id')
                .eq('user_id', user.id)
                .limit(1);

            if (userSites && userSites.length > 0) {
                return userSites[0].site_id;
            }
            return null;
        } catch (error) {
            console.error('Error getting current user site:', error);
            return null;
        }
    }

    async getDashboardStats(siteId?: string): Promise<DashboardStats> {
        const currentSiteId = siteId || await this.getCurrentUserSite();
        const cacheKey = this.getCacheKey(currentSiteId, 'dashboard_stats');
        const cached = this.getCached<DashboardStats>(cacheKey);
        if (cached) return cached;

        try {
            const now = new Date();
            const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

            // Construire les requêtes avec filtre site si disponible
            let incidentsQuery = supabase.from('incidents').select('*', { count: 'exact', head: true });
            let incidentsThisMonthQuery = supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('created_at', startOfThisMonth.toISOString());
            let incidentsLastMonthQuery = supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('created_at', startOfLastMonth.toISOString()).lt('created_at', endOfLastMonth.toISOString());
            let actionsQuery = supabase.from('actions_capa').select('id', { count: 'exact', head: true }).eq('status', 'en_cours');
            let closedActionsQuery = supabase.from('actions_capa').select('id', { count: 'exact', head: true }).eq('status', 'terminee');
            let lastIncidentQuery = supabase.from('incidents').select('created_at').order('created_at', { ascending: false }).limit(1);

            if (currentSiteId) {
                incidentsQuery = incidentsQuery.eq('site_id', currentSiteId);
                incidentsThisMonthQuery = incidentsThisMonthQuery.eq('site_id', currentSiteId);
                incidentsLastMonthQuery = incidentsLastMonthQuery.eq('site_id', currentSiteId);
                actionsQuery = actionsQuery.eq('site_id', currentSiteId);
                closedActionsQuery = closedActionsQuery.eq('site_id', currentSiteId);
                lastIncidentQuery = lastIncidentQuery.eq('site_id', currentSiteId);
            }

            const [
                totalIncidentsResult,
                incidentsThisMonthResult,
                incidentsLastMonthResult,
                actionsResult,
                closedActionsResult,
                lastIncidentResult,
            ] = await Promise.all([
                incidentsQuery,
                incidentsThisMonthQuery,
                incidentsLastMonthQuery,
                actionsQuery,
                closedActionsQuery,
                lastIncidentQuery,
            ]);

            const incidentsLastMonth = incidentsLastMonthResult.count || 0;
            const incidentsThisMonth = incidentsThisMonthResult.count || 0;
            const incidentsEvolution = incidentsLastMonth > 0
                ? Math.round(((incidentsThisMonth - incidentsLastMonth) / incidentsLastMonth) * 100)
                : 0;

            let daysWithoutAccident = 156;
            if (lastIncidentResult.data && lastIncidentResult.data.length > 0) {
                const lastIncidentDate = new Date(lastIncidentResult.data[0].created_at);
                const today = new Date();
                const diffTime = Math.abs(today.getTime() - lastIncidentDate.getTime());
                daysWithoutAccident = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }

            const totalActions = actionsResult.count || 0;
            const closedActions = closedActionsResult.count || 0;
            const conformityRate = totalActions > 0 ? Math.round((closedActions / totalActions) * 100) : 94;

            const stats: DashboardStats = {
                incidentsThisMonth,
                incidentsLastMonth,
                incidentsEvolution,
                actionsEnCours: totalActions,
                actionsTerminees: closedActions,
                conformityRate,
                daysWithoutAccident,
                totalIncidents: totalIncidentsResult.count || 0,
                totalSites: 1
            };

            this.setCache(cacheKey, stats);
            return stats;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            return {
                incidentsThisMonth: 0,
                incidentsLastMonth: 0,
                incidentsEvolution: 0,
                actionsEnCours: 0,
                actionsTerminees: 0,
                conformityRate: 94,
                daysWithoutAccident: 156,
                totalIncidents: 0,
                totalSites: 1
            };
        }
    }


    async getFilteredIncidents(
  siteId: string | null,
  filters: {
    search?: string;
    module?: string;
    status?: string;
    severity?: string;
    dateFrom?: string;
    dateTo?: string;
    location?: string;
  },
  limit: number = 50
): Promise<RecentIncident[]> {
  try {
    let query = supabase
      .from('incidents')
      .select('id, reference, title, module, severity, location, status, created_at, incident_date, description')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filtre par site
    if (siteId) {
      query = query.eq('site_id', siteId);
    }

    // Filtre par module
    if (filters.module && filters.module !== 'all') {
      query = query.eq('module', filters.module);
    }

    // Filtre par statut
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Filtre par gravité
    if (filters.severity && filters.severity !== 'all') {
      query = query.eq('severity', filters.severity);
    }

    // Filtre par date début
    if (filters.dateFrom) {
      query = query.gte('incident_date', filters.dateFrom);
    }

    // Filtre par date fin
    if (filters.dateTo) {
      query = query.lte('incident_date', filters.dateTo);
    }

    // Filtre par lieu
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    // Recherche textuelle
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(
        `title.ilike.${searchTerm},reference.ilike.${searchTerm},description.ilike.${searchTerm},location.ilike.${searchTerm}`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching filtered incidents:', error);
    return [];
  }
}

/**
 * Récupère les stats filtrées
 */
async getFilteredStats(
  siteId: string | null,
  filters: {
    module?: string;
    status?: string;
    severity?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<DashboardStats> {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    let baseQuery = supabase.from('incidents').select('*', { count: 'exact', head: true });

    if (siteId) baseQuery = baseQuery.eq('site_id', siteId);
    if (filters.module && filters.module !== 'all') baseQuery = baseQuery.eq('module', filters.module);
    if (filters.severity && filters.severity !== 'all') baseQuery = baseQuery.eq('severity', filters.severity);
    if (filters.dateFrom) baseQuery = baseQuery.gte('incident_date', filters.dateFrom);
    if (filters.dateTo) baseQuery = baseQuery.lte('incident_date', filters.dateTo);

    // Clone pour les différentes requêtes
    let thisMonthQuery = supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('created_at', startOfThisMonth.toISOString());
    let lastMonthQuery = supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('created_at', startOfLastMonth.toISOString()).lt('created_at', endOfLastMonth.toISOString());

    if (siteId) {
      thisMonthQuery = thisMonthQuery.eq('site_id', siteId);
      lastMonthQuery = lastMonthQuery.eq('site_id', siteId);
    }
    if (filters.module && filters.module !== 'all') {
      thisMonthQuery = thisMonthQuery.eq('module', filters.module);
      lastMonthQuery = lastMonthQuery.eq('module', filters.module);
    }
    if (filters.severity && filters.severity !== 'all') {
      thisMonthQuery = thisMonthQuery.eq('severity', filters.severity);
      lastMonthQuery = lastMonthQuery.eq('severity', filters.severity);
    }

    const [totalResult, thisMonthResult, lastMonthResult] = await Promise.all([
      baseQuery,
      thisMonthQuery,
      lastMonthQuery,
    ]);

    const incidentsLastMonth = lastMonthResult.count || 0;
    const incidentsThisMonth = thisMonthResult.count || 0;
    const incidentsEvolution = incidentsLastMonth > 0
      ? Math.round(((incidentsThisMonth - incidentsLastMonth) / incidentsLastMonth) * 100)
      : 0;

    return {
      incidentsThisMonth,
      incidentsLastMonth,
      incidentsEvolution,
      actionsEnCours: 0,
      actionsTerminees: 0,
      conformityRate: 94,
      daysWithoutAccident: 0,
      totalIncidents: totalResult.count || 0,
      totalSites: 1,
    };
  } catch (error) {
    console.error('Error fetching filtered stats:', error);
    return {
      incidentsThisMonth: 0,
      incidentsLastMonth: 0,
      incidentsEvolution: 0,
      actionsEnCours: 0,
      actionsTerminees: 0,
      conformityRate: 94,
      daysWithoutAccident: 0,
      totalIncidents: 0,
      totalSites: 1,
    };
  }
}
    async getRecentIncidents(limit: number = 5, siteId?: string): Promise<RecentIncident[]> {
        const currentSiteId = siteId || await this.getCurrentUserSite();
        const cacheKey = this.getCacheKey(currentSiteId, `recent_incidents_${limit}`);
        const cached = this.getCached<RecentIncident[]>(cacheKey);
        if (cached) return cached;

        try {
            let query = supabase
                .from('incidents')
                .select('id, reference, title, module, severity, location, status, created_at, incident_date')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (currentSiteId) {
                query = query.eq('site_id', currentSiteId);
            }

            const { data, error } = await query;

            if (error) throw error;

            const incidents = data || [];
            this.setCache(cacheKey, incidents);
            return incidents;
        } catch (error) {
            console.error('Error fetching recent incidents:', error);
            return [];
        }
    }

    async getChartData(siteId?: string): Promise<ChartData> {
        const currentSiteId = siteId || await this.getCurrentUserSite();
        const cacheKey = this.getCacheKey(currentSiteId, 'chart_data');
        const cached = this.getCached<ChartData>(cacheKey);
        if (cached) return cached;

        try {
            const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
            sixMonthsAgo.setDate(1);
            sixMonthsAgo.setHours(0, 0, 0, 0);

            let query = supabase
                .from('incidents')
                .select('created_at, type')
                .gte('created_at', sixMonthsAgo.toISOString());

            if (currentSiteId) {
                query = query.eq('site_id', currentSiteId);
            }

            const { data: incidents, error } = await query;

            if (error) throw error;

            const incidentsByMonth: number[] = new Array(6).fill(0);
            const accidentsByMonth: number[] = new Array(6).fill(0);
            const last6Months: string[] = [];

            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                last6Months.push(months[date.getMonth()]);
            }

            incidents?.forEach(incident => {
                const incidentDate = new Date(incident.created_at);
                const monthDiff = this.getMonthDifference(incidentDate, sixMonthsAgo);

                if (monthDiff >= 0 && monthDiff < 6) {
                    incidentsByMonth[monthDiff]++;
                    if (incident.type === 'accident') {
                        accidentsByMonth[monthDiff]++;
                    }
                }
            });

            let moduleQuery = supabase
                .from('incidents')
                .select('module')
                .gte('created_at', sixMonthsAgo.toISOString());

            if (currentSiteId) {
                moduleQuery = moduleQuery.eq('site_id', currentSiteId);
            }

            const { data: moduleData } = await moduleQuery;

            const moduleCounts: Record<string, number> = {
                sst: 0,
                incendie: 0,
                surete: 0,
                environnement: 0,
                qualite: 0
            };

            moduleData?.forEach(inc => {
                if (moduleCounts[inc.module] !== undefined) {
                    moduleCounts[inc.module]++;
                }
            });

            const chartData: ChartData = {
                incidentsByMonth,
                accidentsByMonth,
                modulesData: [
                    moduleCounts.sst,
                    moduleCounts.incendie,
                    moduleCounts.surete,
                    moduleCounts.environnement,
                    moduleCounts.qualite
                ],
                months: last6Months
            };

            this.setCache(cacheKey, chartData);
            return chartData;
        } catch (error) {
            console.error('Error fetching chart data:', error);
            return {
                incidentsByMonth: [0, 0, 0, 0, 0, 0],
                accidentsByMonth: [0, 0, 0, 0, 0, 0],
                modulesData: [0, 0, 0, 0, 0],
                months: ['Aoû', 'Sep', 'Oct', 'Nov', 'Déc', 'Jan']
            };
        }
    }

    private getMonthDifference(date1: Date, date2: Date): number {
        const months = (date1.getFullYear() - date2.getFullYear()) * 12;
        return months + date1.getMonth() - date2.getMonth();
    }

    invalidateCache(siteId?: string): void {
        if (siteId) {
            // Invalider uniquement le cache du site spécifique
            const keysToDelete: string[] = [];
            for (const key of this.cache.keys()) {
                if (key.startsWith(siteId)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => this.cache.delete(key));
        } else {
            this.cache.clear();
        }
    }
}

export const dashboardService = new DashboardService();
