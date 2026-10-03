// src/stores/actionStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Action {
  id: string;
  reference: string;
  description: string;
  type: 'corrective' | 'preventive';
  priority: 'basse' | 'moyenne' | 'haute' | 'critique';
  status: 'ouverte' | 'en_cours' | 'terminee';
  responsible_id: string;
  due_date: string;
  site_id: string;
  created_at: string;
  updated_at?: string;
  profiles?: { full_name: string };
}

interface ActionStats {
  total: number;
  enCours: number;
  terminees: number;
  ouvertes: number;
  overdue: number;
  completionRate: number;
}

interface ActionStore {
  actions: Action[];
  loading: boolean;
  stats: ActionStats;
  lastSync: Date | null;
  
  fetchActions: (siteId: string) => Promise<void>;
  getStats: () => ActionStats;
  enableRealtime: () => void;
}

let realtimeChannel: any = null;

const defaultStats: ActionStats = {
  total: 0,
  enCours: 0,
  terminees: 0,
  ouvertes: 0,
  overdue: 0,
  completionRate: 0,
};

export const useActionStore = create<ActionStore>((set, get) => ({
  actions: [],
  loading: false,
  stats: defaultStats,
  lastSync: null,

  fetchActions: async (siteId) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('actions_capa')
        .select('*, profiles:responsible_id(full_name)')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ actions: data || [], lastSync: new Date() });
      get().getStats();
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      set({ loading: false });
    }
  },

  getStats: () => {
    const { actions } = get();
    const now = new Date();
    
    const stats: ActionStats = {
      total: actions.length,
      enCours: actions.filter(a => a.status === 'en_cours').length,
      terminees: actions.filter(a => a.status === 'terminee').length,
      ouvertes: actions.filter(a => a.status === 'ouverte').length,
      overdue: actions.filter(a => 
        a.status !== 'terminee' && new Date(a.due_date) < now
      ).length,
      completionRate: actions.length > 0 
        ? Math.round((actions.filter(a => a.status === 'terminee').length / actions.length) * 100)
        : 0,
    };

    set({ stats });
    return stats;
  },

  enableRealtime: () => {
    if (realtimeChannel) return;
    
    realtimeChannel = supabase
      .channel('actions-capa-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'actions_capa' },
        () => {
          // Re-fetch pour garantir la cohérence
          const currentSiteId = localStorage.getItem('currentSiteId');
          if (currentSiteId) {
            get().fetchActions(currentSiteId);
          }
        }
      )
      .subscribe();
  },
}));
