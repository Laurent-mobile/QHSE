// src/hooks/useDashboardFilters.ts
import { useState, useEffect, useCallback, useMemo } from 'react';

export interface DashboardFilters {
  search: string;
  module: string;
  status: string;
  severity: string;
  dateFrom: string;
  dateTo: string;
  location: string;
}

const STORAGE_KEY = 'dashboard_filters';

const defaultFilters: DashboardFilters = {
  search: '',
  module: 'all',
  status: 'all',
  severity: 'all',
  dateFrom: '',
  dateTo: '',
  location: '',
};

export function useDashboardFilters() {
  // Charger les filtres persistés
  const [filters, setFiltersState] = useState<DashboardFilters>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultFilters, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
    return defaultFilters;
  });

  // Persister les filtres
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  }, [filters]);

  const setFilters = useCallback((newFilters: Partial<DashboardFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'module' || key === 'status' || key === 'severity') {
        return value !== 'all' && value !== '';
      }
      return value !== '' && value !== null;
    });
  }, [filters]);

  // Compter les filtres actifs
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.module !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.severity !== 'all') count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.location) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  // Générer la requête Supabase avec les filtres
  const buildQueryParams = useCallback(() => {
    const params: Record<string, any> = {};
    
    if (filters.module && filters.module !== 'all') {
      params.module = filters.module;
    }
    if (filters.status && filters.status !== 'all') {
      params.status = filters.status;
    }
    if (filters.severity && filters.severity !== 'all') {
      params.severity = filters.severity;
    }
    if (filters.dateFrom) {
      params.dateFrom = filters.dateFrom;
    }
    if (filters.dateTo) {
      params.dateTo = filters.dateTo;
    }
    if (filters.location) {
      params.location = filters.location;
    }
    if (filters.search) {
      params.search = filters.search;
    }
    
    return params;
  }, [filters]);

  return {
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    activeFiltersCount,
    buildQueryParams,
  };
}
