// src/stores/incidentStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Incident {
  id: string;
  reference: string;
  module: string;
  type: string;
  title: string;
  description: string;
  location: string;
  incident_date: string;
  severity: string;
  status: string;
  site_id: string;
  reporter_id?: string;
  created_at: string;
  updated_at?: string;
  [key: string]: any;
}

interface IncidentFilters {
  module?: string;
  status?: string;
  severity?: string;
  siteId?: string;
  search?: string;
}

interface IncidentStats {
  total: number;
  byModule: Record<string, number>;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  thisMonth: number;
  lastMonth: number;
}

interface IncidentStore {
  incidents: Incident[];
  loading: boolean;
  filters: IncidentFilters;
  stats: IncidentStats;
  realtimeEnabled: boolean;
  lastSync: Date | null;
  
  setIncidents: (incidents: Incident[]) => void;
  addIncident: (incident: Incident) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  removeIncident: (id: string) => void;
  setFilters: (filters: Partial<IncidentFilters>) => void;
  resetFilters: () => void;
  
  fetchIncidents: (siteId: string, reset?: boolean) => Promise<void>;
  createIncident: (data: Partial<Incident>) => Promise<Incident | null>;
  updateIncidentInDb: (id: string, updates: Partial<Incident>) => Promise<boolean>;
  deleteIncident: (id: string) => Promise<boolean>;
  
  enableRealtime: () => void;
  disableRealtime: () => void;
  
  getFilteredIncidents: () => Incident[];
  computeStats: () => IncidentStats;
}

let realtimeChannel: any = null;

const defaultStats: IncidentStats = {
  total: 0,
  byModule: {},
  byStatus: {},
  bySeverity: {},
  thisMonth: 0,
  lastMonth: 0,
};

export const useIncidentStore = create<IncidentStore>((set, get) => ({
  incidents: [],
  loading: false,
  filters: {},
  stats: defaultStats,
  realtimeEnabled: false,
  lastSync: null,

  setIncidents: (incidents) => {
    console.log(`📊 setIncidents: ${incidents.length} incidents`);
    set({ incidents, lastSync: new Date() });
    get().computeStats();
  },
  
  addIncident: (incident) => {
    set(s => ({ 
      incidents: [incident, ...s.incidents],
      lastSync: new Date()
    }));
    get().computeStats();
  },
  
  updateIncident: (id, updates) => {
    set(s => ({
      incidents: s.incidents.map(i => i.id === id ? { ...i, ...updates } : i),
      lastSync: new Date()
    }));
    get().computeStats();
  },
  
  removeIncident: (id) => {
    set(s => ({
      incidents: s.incidents.filter(i => i.id !== id),
      lastSync: new Date()
    }));
    get().computeStats();
  },
  
  setFilters: (filters) => set(s => ({ 
    filters: { ...s.filters, ...filters }
  })),
  
  resetFilters: () => {
    const currentFilters = get().filters;
    // Ne met à jour l'état que s'il y a réellement des filtres à effacer
    if (Object.keys(currentFilters).length > 0) {
      set({ filters: {} });
    }
  },

  fetchIncidents: async (siteId, reset = false) => {
    console.log(`🔄 fetchIncidents - siteId: ${siteId}, reset: ${reset}`);
    
    const { loading } = get();
    if (loading) {
      console.log(`⏸️ fetchIncidents déjà en cours, skip`);
      return;
    }
    
    set({ loading: true });

    try {
      let query = supabase
        .from('incidents')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Erreur fetchIncidents:', error);
        throw error;
      }

      console.log(`✅ fetchIncidents: ${data?.length || 0} incidents chargés pour le site ${siteId}`);
      
      // Si reset = true, remplacer complètement les incidents
      if (reset) {
        set({ incidents: data || [], lastSync: new Date() });
      } else {
        // Sinon, fusionner avec les incidents existants
        const { incidents } = get();
        const existingIds = new Set(incidents.map(i => i.id));
        const newIncidents = (data || []).filter(i => !existingIds.has(i.id));
        set({ incidents: [...incidents, ...newIncidents], lastSync: new Date() });
      }
      
      get().computeStats();
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      set({ loading: false });
    }
  },

  createIncident: async (data) => {
    try {
      const { data: newIncident, error } = await supabase
        .from('incidents')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      get().addIncident(newIncident);
      return newIncident;
    } catch (error) {
      console.error('Error creating incident:', error);
      throw error;
    }
  },

  updateIncidentInDb: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('incidents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      get().updateIncident(id, updates);
      return true;
    } catch (error) {
      console.error('Error updating incident:', error);
      return false;
    }
  },

  deleteIncident: async (id) => {
    try {
      const { error } = await supabase
        .from('incidents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      get().removeIncident(id);
      return true;
    } catch (error) {
      console.error('Error deleting incident:', error);
      return false;
    }
  },

  enableRealtime: () => {
    if (realtimeChannel) return;
    
    realtimeChannel = supabase
      .channel('incidents-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          console.log('🔄 Realtime incident update:', payload.eventType);
          
          switch (payload.eventType) {
            case 'INSERT':
              get().addIncident(payload.new as Incident);
              break;
            case 'UPDATE':
              get().updateIncident(payload.new.id, payload.new as Partial<Incident>);
              break;
            case 'DELETE':
              get().removeIncident(payload.old.id);
              break;
          }
        }
      )
      .subscribe();

    set({ realtimeEnabled: true });
  },

  disableRealtime: () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    set({ realtimeEnabled: false });
  },

  getFilteredIncidents: () => {
    const { incidents, filters } = get();
    
    return incidents.filter(incident => {
      if (filters.module && incident.module !== filters.module) return false;
      if (filters.status && incident.status !== filters.status) return false;
      if (filters.severity && incident.severity !== filters.severity) return false;
      
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesTitle = incident.title?.toLowerCase().includes(search);
        const matchesRef = incident.reference?.toLowerCase().includes(search);
        const matchesDesc = incident.description?.toLowerCase().includes(search);
        if (!matchesTitle && !matchesRef && !matchesDesc) return false;
      }
      
      return true;
    });
  },

  computeStats: () => {
    const { incidents } = get();
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const stats: IncidentStats = {
      total: incidents.length,
      byModule: {},
      byStatus: {},
      bySeverity: {},
      thisMonth: 0,
      lastMonth: 0,
    };

    incidents.forEach(incident => {
      stats.byModule[incident.module] = (stats.byModule[incident.module] || 0) + 1;
      stats.byStatus[incident.status] = (stats.byStatus[incident.status] || 0) + 1;
      stats.bySeverity[incident.severity] = (stats.bySeverity[incident.severity] || 0) + 1;
      
      const incidentDate = new Date(incident.incident_date || incident.created_at);
      if (incidentDate >= startOfMonth) stats.thisMonth++;
      if (incidentDate >= startOfLastMonth && incidentDate <= endOfLastMonth) {
        stats.lastMonth++;
      }
    });

    set({ stats });
    return stats;
  },
}));
