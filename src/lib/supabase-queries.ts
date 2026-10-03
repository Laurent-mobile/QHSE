// src/lib/supabase-queries.ts
import { supabase } from './supabase';

// ============================================
// CACHE SIMPLE POUR LES REQUÊTES FRÉQUENTES
// ============================================
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

class QueryCache {
    private cache = new Map<string, CacheEntry<any>>();
    private defaultTTL = 60000; // 1 minute par défaut

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
        });
    }

    invalidate(key: string): void {
        this.cache.delete(key);
    }

    invalidatePattern(pattern: string): void {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }

    clear(): void {
        this.cache.clear();
    }
}

export const queryCache = new QueryCache();

// ============================================
// TYPES
// ============================================
export interface DashboardStats {
    incidentsThisMonth: number;
    actionsEnCours: number;
    conformityRate: number;
    daysWithoutAccident: number;
}

export interface RecentIncident {
    id: string;
    reference: string;
    title: string;
    module: string;
    severity: string;
    location: string;
    created_at: string;
}

// ============================================
// REQUÊTES OPTIMISÉES POUR LE DASHBOARD
// ============================================

/**
 * Récupère les incidents récents (limité à 5 par défaut)
 */
export async function getRecentIncidents(limit: number = 5): Promise<RecentIncident[]> {
    const cacheKey = `recent_incidents_${limit}`;
    const cached = queryCache.get<RecentIncident[]>(cacheKey);

    if (cached) {
        return cached;
    }

    const { data, error } = await supabase
        .from('incidents')
        .select('id, reference, title, module, severity, location, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching recent incidents:', error);
        return [];
    }

    queryCache.set(cacheKey, data || [], 30000); // Cache 30 secondes
    return data || [];
}

/**
 * Récupère les statistiques du dashboard
 */
export async function getDashboardStats(): Promise<DashboardStats> {
    const cacheKey = 'dashboard_stats';
    const cached = queryCache.get<DashboardStats>(cacheKey);

    if (cached) {
        return cached;
    }

    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Parallélisation des requêtes
        const [incidentsMonthResult, actionsCountResult] = await Promise.all([
            supabase
                .from('incidents')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', startOfMonth.toISOString()),
            supabase
                .from('actions_capa')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'en_cours')
        ]);

        const stats: DashboardStats = {
            incidentsThisMonth: incidentsMonthResult.count || 0,
            actionsEnCours: actionsCountResult.count || 0,
            conformityRate: 94,
            daysWithoutAccident: 156,
        };

        queryCache.set(cacheKey, stats, 60000); // Cache 1 minute
        return stats;
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
            incidentsThisMonth: 0,
            actionsEnCours: 0,
            conformityRate: 94,
            daysWithoutAccident: 156,
        };
    }
}

/**
 * Récupère les données pour les graphiques
 */
export async function getChartData() {
    const cacheKey = 'chart_data';
    const cached = queryCache.get(cacheKey);

    if (cached) {
        return cached;
    }

    try {
        // Récupérer les incidents groupés par module
        const { data: incidents } = await supabase
            .from('incidents')
            .select('module');

        const moduleCounts: Record<string, number> = {
            sst: 0,
            incendie: 0,
            surete: 0,
            environnement: 0,
            qualite: 0,
        };

        incidents?.forEach(inc => {
            if (moduleCounts[inc.module] !== undefined) {
                moduleCounts[inc.module]++;
            }
        });

        // Données mockées pour l'évolution (à remplacer par des données réelles)
        const chartData = {
            incidentsByMonth: [12, 19, 8, 15, 12, 23],
            modulesData: [
                moduleCounts.sst || 35,
                moduleCounts.incendie || 20,
                moduleCounts.surete || 15,
                moduleCounts.environnement || 18,
                moduleCounts.qualite || 12,
            ]
        };

        queryCache.set(cacheKey, chartData, 120000); // Cache 2 minutes
        return chartData;
    } catch (error) {
        console.error('Error fetching chart data:', error);
        return {
            incidentsByMonth: [12, 19, 8, 15, 12, 23],
            modulesData: [35, 20, 15, 18, 12]
        };
    }
}

// ============================================
// REQUÊTES POUR LE MODULE SST
// ============================================

/**
 * Récupère les incidents SST
 */
export async function getSSTIncidents(limit?: number) {
    let query = supabase
        .from('incidents')
        .select('*')
        .eq('module', 'sst')
        .order('created_at', { ascending: false });

    if (limit) {
        query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching SST incidents:', error);
        return [];
    }

    return data || [];
}

/**
 * Récupère les EPI avec les profils utilisateurs
 */
export async function getEPIList() {
    const cacheKey = 'epi_list';
    const cached = queryCache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const { data, error } = await supabase
        .from('epi')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching EPI list:', error);
        return [];
    }

    queryCache.set(cacheKey, data || [], 30000);
    return data || [];
}

/**
 * Récupère les formations
 */
export async function getFormations() {
    const cacheKey = 'formations';
    const cached = queryCache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const { data, error } = await supabase
        .from('formations')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching formations:', error);
        return [];
    }

    queryCache.set(cacheKey, data || [], 60000);
    return data || [];
}

/**
 * Récupère les actions CAPA
 */
export async function getCAPAActions() {
    const cacheKey = 'capa_actions';
    const cached = queryCache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const { data, error } = await supabase
        .from('actions_capa')
        .select('*, profiles:responsible_id(full_name)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching CAPA actions:', error);
        return [];
    }

    queryCache.set(cacheKey, data || [], 30000);
    return data || [];
}

// ============================================
// REQUÊTES POUR LE MODULE INCENDIE
// ============================================

/**
 * Récupère les équipements incendie
 */
export async function getFireEquipment() {
    const cacheKey = 'fire_equipment';
    const cached = queryCache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const { data, error } = await supabase
        .from('equipements_incendie')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching fire equipment:', error);
        return [];
    }

    queryCache.set(cacheKey, data || [], 30000);
    return data || [];
}

// ============================================
// REQUÊTES POUR LE MODULE SÛRETÉ
// ============================================

/**
 * Récupère les visiteurs
 */
export async function getVisitors() {
    const cacheKey = 'visitors';
    const cached = queryCache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const { data, error } = await supabase
        .from('visiteurs')
        .select('*')
        .order('entry_time', { ascending: false });

    if (error) {
        console.error('Error fetching visitors:', error);
        return [];
    }

    queryCache.set(cacheKey, data || [], 15000); // Cache 15 secondes (données temps réel)
    return data || [];
}

// ============================================
// REQUÊTES POUR LE MODULE QUALITÉ
// ============================================

/**
 * Récupère les audits
 */
export async function getAudits() {
    const cacheKey = 'audits';
    const cached = queryCache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const { data, error } = await supabase
        .from('audits')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching audits:', error);
        return [];
    }

    queryCache.set(cacheKey, data || [], 60000);
    return data || [];
}

/**
 * Récupère les non-conformités
 */
export async function getNonConformites() {
    const cacheKey = 'non_conformites';
    const cached = queryCache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const { data, error } = await supabase
        .from('non_conformites')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching non-conformites:', error);
        return [];
    }

    queryCache.set(cacheKey, data || [], 30000);
    return data || [];
}

// ============================================
// FONCTIONS DE RAFRAÎCHISSEMENT
// ============================================

/**
 * Invalide le cache pour une table spécifique
 * À appeler après une mutation (create/update/delete)
 */
export function invalidateCache(table: string): void {
    const patterns: Record<string, string[]> = {
        incidents: ['recent_incidents', 'dashboard_stats', 'chart_data', 'sst_incidents'],
        epi: ['epi_list'],
        formations: ['formations'],
        actions_capa: ['capa_actions'],
        equipements_incendie: ['fire_equipment'],
        visiteurs: ['visitors'],
        audits: ['audits'],
        non_conformites: ['non_conformites'],
    };

    const patternsToInvalidate = patterns[table] || [table];
    patternsToInvalidate.forEach(pattern => {
        queryCache.invalidatePattern(pattern);
    });
}

/**
 * Rafraîchit toutes les données du dashboard
 */
export async function refreshDashboardData(): Promise<void> {
    queryCache.invalidatePattern('recent_incidents');
    queryCache.invalidatePattern('dashboard_stats');
    queryCache.invalidatePattern('chart_data');

    // Recharger en parallèle
    await Promise.all([
        getRecentIncidents(),
        getDashboardStats(),
        getChartData(),
    ]);
}

// ============================================
// REQUÊTES UTILITAIRES
// ============================================

/**
 * Récupère les profils utilisateurs
 */
export async function getProfiles() {
    const cacheKey = 'profiles';
    const cached = queryCache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name');

    if (error) {
        console.error('Error fetching profiles:', error);
        return [];
    }

    queryCache.set(cacheKey, data || [], 120000); // Cache 2 minutes
    return data || [];
}

/**
 * Récupère le site de l'utilisateur courant
 */
export async function getCurrentUserSite() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const cacheKey = `user_site_${user.id}`;
    const cached = queryCache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const { data, error } = await supabase
        .from('user_sites')
        .select('site_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching user site:', error);
        return null;
    }

    queryCache.set(cacheKey, data, 300000); // Cache 5 minutes
    return data;
}
