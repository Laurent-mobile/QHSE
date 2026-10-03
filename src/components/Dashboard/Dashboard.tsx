// src/components/Dashboard/Dashboard.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  AlertTriangle, ClipboardCheck, CheckCircle, Calendar,
  TrendingUp, TrendingDown, Shield, HardHat, FireExtinguisher,
  Lock, Leaf, Award, Plus, QrCode, FileText
} from 'lucide-react';
import Chart from 'chart.js/auto';
import { Modal } from '../common/Modal';
import { IncidentForm } from '../Forms/IncidentForm';
import { appSettingsService, AppSettings } from '../../services/appSettingsService';
import { useIncidents } from '../../hooks/useIncidents';
import { useUserSite } from '../../hooks/useUserSite';
import { useDashboardFilters, DashboardFilters as DashboardFiltersType } from '../../hooks/useDashboardFilters';
import { DashboardFilters } from './DashboardFilters';

// ============================================
// TYPES
// ============================================
export interface DashboardRef {
  refreshData: () => Promise<void>;
}

interface ComputedStats {
  incidentsThisMonth: number;
  incidentsLastMonth: number;
  incidentsEvolution: number;
  totalIncidents: number;
  daysWithoutAccident: number;
  actionsEnCours: number;
  actionsTerminees: number;
  conformityRate: number;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export const Dashboard = forwardRef<DashboardRef>((props, ref) => {
  // ==========================================
  // HOOKS - Données centralisées (Zustand)
  // ==========================================
  const { userSite } = useUserSite();
  const {
    incidents: allIncidents,
    loading,
    refresh: refreshIncidents,
    lastSync,
    realtimeEnabled,
  } = useIncidents();

  // ==========================================
  // HOOKS - Filtres avancés
  // ==========================================
  const {
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    activeFiltersCount,
  } = useDashboardFilters();

  // ==========================================
  // ÉTATS LOCAUX (un seul useState par variable)
  // ==========================================
  const [refreshing, setRefreshing] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    app_name: 'Afri SafeTrack',
    app_version: '1.0.0',
    maintenance_mode: false,
    allow_registrations: true,
    default_user_role: 'user',
    session_timeout: 30,
    max_file_size_mb: 50,
    allowed_file_types: [],
  });

  // ==========================================
  // RÉFÉRENCES - Graphiques
  // ==========================================
  const incidentsChartRef = useRef<HTMLCanvasElement>(null);
  const modulesChartRef = useRef<HTMLCanvasElement>(null);
  const incidentsChartInstance = useRef<Chart | null>(null);
  const modulesChartInstance = useRef<Chart | null>(null);

  // ==========================================
  // DONNÉES FILTRÉES (useMemo - pas de conflit)
  // ==========================================
  const filteredIncidents = useMemo(() => {
    let result = [...allIncidents];

    // Filtre par module
    if (filters.module && filters.module !== 'all') {
      result = result.filter(i => i.module === filters.module);
    }

    // Filtre par statut
    if (filters.status && filters.status !== 'all') {
      result = result.filter(i => i.status === filters.status);
    }

    // Filtre par gravité
    if (filters.severity && filters.severity !== 'all') {
      result = result.filter(i => i.severity === filters.severity);
    }

    // Filtre par lieu
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      result = result.filter(i => i.location?.toLowerCase().includes(loc));
    }

    // Filtre par recherche textuelle
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(i =>
        i.title?.toLowerCase().includes(search) ||
        i.reference?.toLowerCase().includes(search) ||
        i.description?.toLowerCase().includes(search) ||
        i.location?.toLowerCase().includes(search)
      );
    }

    // Filtre par date début
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter(i => new Date(i.incident_date || i.created_at) >= from);
    }

    // Filtre par date fin
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(i => new Date(i.incident_date || i.created_at) <= to);
    }

    return result;
  }, [allIncidents, filters]);

  // ==========================================
  // STATISTIQUES CALCULÉES (useMemo)
  // ==========================================
  const computedStats = useMemo<ComputedStats>(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const incidentsThisMonth = filteredIncidents.filter(i =>
      new Date(i.incident_date || i.created_at) >= startOfMonth
    ).length;

    const incidentsLastMonth = filteredIncidents.filter(i => {
      const d = new Date(i.incident_date || i.created_at);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    }).length;

    const incidentsEvolution = incidentsLastMonth > 0
      ? Math.round(((incidentsThisMonth - incidentsLastMonth) / incidentsLastMonth) * 100)
      : 0;

    // Jours sans accident
    let daysWithoutAccident = 0;
    const sorted = [...filteredIncidents].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (sorted.length > 0) {
      const lastDate = new Date(sorted[0].created_at);
      daysWithoutAccident = Math.floor(Math.abs(now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Actions (comptées depuis les incidents avec statut)
    const actionsEnCours = filteredIncidents.filter(i => i.status === 'en_cours').length;
    const actionsTerminees = filteredIncidents.filter(i => i.status === 'cloture').length;
    const conformityRate = filteredIncidents.length > 0
      ? Math.round((actionsTerminees / filteredIncidents.length) * 100)
      : 94;

    return {
      incidentsThisMonth,
      incidentsLastMonth,
      incidentsEvolution,
      totalIncidents: filteredIncidents.length,
      daysWithoutAccident,
      actionsEnCours,
      actionsTerminees,
      conformityRate,
    };
  }, [filteredIncidents]);

  // ==========================================
  // DONNÉES GRAPHIQUES (useMemo)
  // ==========================================
  const chartMonths = useMemo(() => {
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const labels: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      labels.push(monthNames[d.getMonth()]);
    }
    return labels;
  }, []);

  const chartIncidentsByMonth = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const data = new Array(6).fill(0);

    filteredIncidents.forEach(i => {
      const d = new Date(i.incident_date || i.created_at);
      if (d >= sixMonthsAgo) {
        const diff = (d.getFullYear() - sixMonthsAgo.getFullYear()) * 12 + (d.getMonth() - sixMonthsAgo.getMonth());
        if (diff >= 0 && diff < 6) data[diff]++;
      }
    });
    return data;
  }, [filteredIncidents]);

  const chartAccidentsByMonth = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const data = new Array(6).fill(0);

    filteredIncidents.forEach(i => {
      if (i.type === 'accident') {
        const d = new Date(i.incident_date || i.created_at);
        if (d >= sixMonthsAgo) {
          const diff = (d.getFullYear() - sixMonthsAgo.getFullYear()) * 12 + (d.getMonth() - sixMonthsAgo.getMonth());
          if (diff >= 0 && diff < 6) data[diff]++;
        }
      }
    });
    return data;
  }, [filteredIncidents]);

  const chartModulesData = useMemo(() => {
    const counts: Record<string, number> = { sst: 0, incendie: 0, surete: 0, environnement: 0, qualite: 0 };
    filteredIncidents.forEach(i => {
      if (counts[i.module] !== undefined) counts[i.module]++;
    });
    return [counts.sst, counts.incendie, counts.surete, counts.environnement, counts.qualite];
  }, [filteredIncidents]);

  // Incidents récents (top 5 des filtrés)
  const recentDisplay = useMemo(() => {
    return [...filteredIncidents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [filteredIncidents]);

  // ==========================================
  // GRAPHIQUES - Init & Cleanup
  // ==========================================
  const initCharts = useCallback(() => {
    if (incidentsChartInstance.current) {
      incidentsChartInstance.current.destroy();
      incidentsChartInstance.current = null;
    }
    if (modulesChartInstance.current) {
      modulesChartInstance.current.destroy();
      modulesChartInstance.current = null;
    }

    // Graphique ligne
    if (incidentsChartRef.current) {
      const ctx = incidentsChartRef.current.getContext('2d');
      if (ctx) {
        incidentsChartInstance.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: chartMonths,
            datasets: [
              {
                label: 'Incidents',
                data: chartIncidentsByMonth,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2, fill: true, tension: 0.4,
                pointBackgroundColor: '#10b981', pointBorderColor: '#fff',
                pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
              },
              {
                label: 'Accidents',
                data: chartAccidentsByMonth,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2, fill: true, tension: 0.4,
                pointBackgroundColor: '#ef4444', pointBorderColor: '#fff',
                pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6,
              },
            ],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 6, padding: 20, font: { size: 12 } } },
              tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff' },
            },
            scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { stepSize: 1, font: { size: 11 } } },
              x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            },
          },
        });
      }
    }

    // Graphique doughnut
    if (modulesChartRef.current && chartModulesData.some(v => v > 0)) {
      const ctx = modulesChartRef.current.getContext('2d');
      if (ctx) {
        modulesChartInstance.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['SST', 'Incendie', 'Sûreté', 'Environnement', 'Qualité'],
            datasets: [{
              data: chartModulesData,
              backgroundColor: ['#f97316', '#ef4444', '#3b82f6', '#22c55e', '#a855f7'],
              borderWidth: 0, hoverOffset: 4,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false, cutout: '60%',
            plugins: {
              legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 6, padding: 20, font: { size: 12 } } },
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff',
                callbacks: {
                  label: (context) => {
                    const label = context.label || '';
                    const value = (context.raw as number) || 0;
                    const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                    return `${label}: ${value} (${pct}%)`;
                  },
                },
              },
            },
          },
        });
      }
    }
  }, [chartMonths, chartIncidentsByMonth, chartAccidentsByMonth, chartModulesData]);

  useEffect(() => {
    if (!loading) initCharts();
    return () => {
      incidentsChartInstance.current?.destroy();
      modulesChartInstance.current?.destroy();
    };
  }, [loading, initCharts]);

  // ==========================================
  // SETTINGS
  // ==========================================
  const loadAppSettings = useCallback(async () => {
    try {
      const settings = await appSettingsService.getAppSettings();
      setAppSettings(settings);
    } catch (error) {
      console.error('Error loading app settings:', error);
    }
  }, []);

  useEffect(() => { loadAppSettings(); }, [loadAppSettings]);

  // ==========================================
  // REFRESH
  // ==========================================
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshIncidents();
    await loadAppSettings();
    setRefreshing(false);
  }, [refreshIncidents, loadAppSettings]);

  useImperativeHandle(ref, () => ({ refreshData: handleRefresh }), [handleRefresh]);

  // ==========================================
  // EXPORT CSV
  // ==========================================
  const handleExportCSV = useCallback(() => {
    if (filteredIncidents.length === 0) return;

    const headers = ['Référence', 'Titre', 'Module', 'Gravité', 'Statut', 'Lieu', 'Date'];
    const rows = filteredIncidents.map(i => [
      i.reference,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      i.module,
      i.severity,
      i.status,
      `"${(i.location || '').replace(/"/g, '""')}"`,
      new Date(i.incident_date || i.created_at).toLocaleDateString('fr-FR'),
    ]);

    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `incidents_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [filteredIncidents]);

  // ==========================================
  // NAVIGATION
  // ==========================================
  const navigateTo = (module: string) => {
    window.dispatchEvent(new CustomEvent('navigateToModule', { detail: module }));
  };

  // ==========================================
  // HELPERS VISUELS
  // ==========================================
  const getSeverityColor = (s: string) => {
    if (s === 'critique' || s === 'grave') return 'bg-red-50 border-red-500 text-red-700';
    if (s === 'moyen') return 'bg-orange-50 border-orange-500 text-orange-700';
    if (s === 'faible') return 'bg-yellow-50 border-yellow-500 text-yellow-700';
    return 'bg-gray-50 border-gray-500 text-gray-700';
  };

  const getSeverityBadge = (s: string) => {
    if (s === 'critique' || s === 'grave') return 'bg-red-500 text-white';
    if (s === 'moyen') return 'bg-orange-500 text-white';
    if (s === 'faible') return 'bg-yellow-500 text-white';
    return 'bg-gray-500 text-white';
  };

  const getModuleIcon = (m: string) => {
    switch (m) {
      case 'sst': return <HardHat className="text-orange-500" size={20} />;
      case 'incendie': return <FireExtinguisher className="text-red-500" size={20} />;
      case 'surete': return <Lock className="text-blue-500" size={20} />;
      case 'environnement': return <Leaf className="text-green-500" size={20} />;
      case 'qualite': return <Award className="text-purple-500" size={20} />;
      default: return <AlertTriangle className="text-gray-500" size={20} />;
    }
  };

  const getModuleLabel = (m: string) => {
    switch (m) {
      case 'sst': return 'SST';
      case 'incendie': return 'Incendie';
      case 'surete': return 'Sûreté';
      case 'environnement': return 'Environnement';
      case 'qualite': return 'Qualité';
      default: return m;
    }
  };

  // ==========================================
  // LOADING
  // ==========================================
  if (loading && allIncidents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="space-y-8">
      {/* ======== BANNIÈRE ======== */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10">
          <Shield size={200} className="-mr-10 -mt-10" />
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold mb-2">
              Bienvenue sur {appSettings.app_name}
            </h2>
            <p className="text-emerald-100 mb-4">
              {appSettings.app_version && `Version ${appSettings.app_version} • `}
              Plateforme QHSE intégrée
              {userSite && <span className="ml-2">• Site: {userSite.site_name}</span>}
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2">
                <span className="text-sm">Total incidents:</span>
                <span className="font-semibold ml-2">{computedStats.totalIncidents}</span>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2">
                <span className="text-sm">Date:</span>
                <span className="font-semibold ml-2">
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              {realtimeEnabled && (
                <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm">Temps réel</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======== FILTRES AVANCÉS ======== */}
      <DashboardFilters
        filters={filters}
        setFilters={setFilters}
        resetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
        activeFiltersCount={activeFiltersCount}
        onExport={handleExportCSV}
      />

      {/* ======== CARTES STATISTIQUES ======== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Incidents du mois */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${
              computedStats.incidentsEvolution >= 0 ? 'text-red-500 bg-red-50' : 'text-emerald-500 bg-emerald-50'
            }`}>
              {computedStats.incidentsEvolution >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(computedStats.incidentsEvolution)}%
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{computedStats.incidentsThisMonth}</p>
          <p className="text-sm text-gray-500">
            Incidents ce mois
            {computedStats.incidentsLastMonth > 0 && (
              <span className="text-xs text-gray-400 ml-1">(vs {computedStats.incidentsLastMonth} mois dernier)</span>
            )}
            {hasActiveFilters && <span className="ml-1 text-xs text-emerald-600">(filtré)</span>}
          </p>
        </div>

        {/* Actions en cours */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <ClipboardCheck className="text-orange-500" size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{computedStats.actionsEnCours}</p>
          <p className="text-sm text-gray-500">
            Actions en cours
            {computedStats.actionsTerminees > 0 && (
              <span className="text-xs text-gray-400 ml-1">({computedStats.actionsTerminees} terminées)</span>
            )}
          </p>
        </div>

        {/* Conformité */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-emerald-500" size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{computedStats.conformityRate}%</p>
          <p className="text-sm text-gray-500">Taux de conformité</p>
        </div>

        {/* Jours sans accident */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="text-blue-500" size={24} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{computedStats.daysWithoutAccident}</p>
          <p className="text-sm text-gray-500">Jours sans accident</p>
        </div>
      </div>

      {/* ======== GRAPHIQUES ======== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-800">Évolution des incidents</h3>
          </div>
          <div className="h-[300px] w-full">
            <canvas ref={incidentsChartRef}></canvas>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-800">Répartition par module</h3>
            <button onClick={() => navigateTo('qualite')} className="text-sm text-emerald-600 hover:underline">
              Voir détails
            </button>
          </div>
          <div className="h-[300px] w-full">
            <canvas ref={modulesChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* ======== INCIDENTS RÉCENTS + ACTIONS RAPIDES ======== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incidents récents */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-800">
              Incidents récents
              {hasActiveFilters && <span className="ml-2 text-xs text-emerald-600 font-normal">(filtré)</span>}
            </h3>
            <button onClick={() => navigateTo('sst')} className="text-sm text-emerald-600 hover:underline">
              Voir tout
            </button>
          </div>

          {recentDisplay.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-gray-400" size={32} />
              </div>
              <p className="text-gray-500">
                {hasActiveFilters ? 'Aucun incident ne correspond aux filtres' : 'Aucun incident récent'}
              </p>
              {hasActiveFilters && (
                <button onClick={resetFilters} className="mt-4 text-emerald-600 hover:text-emerald-700 font-medium">
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {recentDisplay.map((incident) => (
                <div
                  key={incident.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border-l-4 ${getSeverityColor(incident.severity)}`}
                >
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    {getModuleIcon(incident.module)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800 truncate">{incident.title}</p>
                      <span className="text-xs text-gray-400 font-mono">{incident.reference}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{getModuleLabel(incident.module)}</span>
                      <span>•</span>
                      <span>{new Date(incident.incident_date || incident.created_at).toLocaleDateString('fr-FR')}</span>
                      <span>•</span>
                      <span className="truncate">{incident.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityBadge(incident.severity)}`}>
                      {incident.severity}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      incident.status === 'cloture' ? 'bg-emerald-100 text-emerald-600' :
                      incident.status === 'en_cours' ? 'bg-blue-100 text-blue-600' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {incident.status === 'cloture' ? 'Clôturé' : incident.status === 'en_cours' ? 'En cours' : 'Ouvert'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions rapides */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-6">Actions rapides</h3>
          <div className="space-y-3">
            <button
              onClick={() => setShowIncidentModal(true)}
              className="w-full flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all text-left"
            >
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Plus className="text-white" size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Déclarer un incident</p>
                <p className="text-xs text-gray-500">SST, Incendie, Sûreté...</p>
              </div>
            </button>

            <button
              onClick={() => navigateTo('qualite')}
              className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all text-left"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="text-white" size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Lancer une inspection</p>
                <p className="text-xs text-gray-500">Audit terrain</p>
              </div>
            </button>

            <button
              onClick={() => setShowQRModal(true)}
              className="w-full flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all text-left"
            >
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <QrCode className="text-white" size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Scanner QR Code</p>
                <p className="text-xs text-gray-500">Équipement, visiteur</p>
              </div>
            </button>

            <button
              onClick={() => navigateTo('rapports')}
              className="w-full flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all text-left"
            >
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <FileText className="text-white" size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-800">Générer un rapport</p>
                <p className="text-xs text-gray-500">Export PDF/Excel</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ======== MODAL INCIDENT ======== */}
      <Modal
        isOpen={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        title="Nouveau signalement d'incident"
        size="lg"
      >
        <IncidentForm
          module="sst"
          onSuccess={() => {
            setShowIncidentModal(false);
            handleRefresh();
          }}
          onCancel={() => setShowIncidentModal(false)}
        />
      </Modal>

      {/* ======== MODAL QR SCANNER ======== */}
      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="Scanner QR Code"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl h-64 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-emerald-400 rounded-lg animate-pulse" />
            </div>
            <div className="text-center relative z-10">
              <QrCode size={48} className="text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">Caméra en attente...</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center">
            Pointez la caméra vers un QR code d'équipement ou de badge visiteur
          </p>
          <button
            onClick={() => setShowQRModal(false)}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </Modal>
    </div>
  );
});
