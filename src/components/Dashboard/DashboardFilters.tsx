// src/components/Dashboard/DashboardFilters.tsx
import { Search, X, Filter, Calendar, MapPin, Download, RotateCcw } from 'lucide-react';
import { DashboardFilters as DashboardFiltersType } from '../../hooks/useDashboardFilters';

interface DashboardFiltersProps {
  filters: DashboardFiltersType;
  setFilters: (filters: Partial<DashboardFiltersType>) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  activeFiltersCount: number;
  onExport?: () => void;
}

const MODULES = [
  { value: 'all', label: 'Tous les modules' },
  { value: 'sst', label: 'Santé & Sécurité' },
  { value: 'incendie', label: 'Incendie' },
  { value: 'surete', label: 'Sûreté' },
  { value: 'environnement', label: 'Environnement' },
  { value: 'qualite', label: 'Qualité' },
];

const STATUSES = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'ouvert', label: 'Ouvert' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'cloture', label: 'Clôturé' },
];

const SEVERITIES = [
  { value: 'all', label: 'Toutes les gravités' },
  { value: 'faible', label: 'Faible' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'grave', label: 'Grave' },
  { value: 'critique', label: 'Critique' },
];

const QUICK_PERIODS = [
  { value: '', label: 'Toutes les dates' },
  { value: 'today', label: "Aujourd'hui" },
  { value: 'week', label: '7 derniers jours' },
  { value: 'month', label: '30 derniers jours' },
  { value: 'quarter', label: '3 derniers mois' },
  { value: 'year', label: 'Cette année' },
];

// ✅ UNE SEULE déclaration de la fonction
export function DashboardFilters({
  filters,
  setFilters,
  resetFilters,
  hasActiveFilters,
  activeFiltersCount,
  onExport,
}: DashboardFiltersProps) {
  const handleQuickPeriod = (period: string) => {
    if (!period) {
      setFilters({ dateFrom: '', dateTo: '' });
      return;
    }

    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start = '';

    switch (period) {
      case 'today':
        start = end;
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        start = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);
        start = monthAgo.toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarterAgo = new Date(now);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        start = quarterAgo.toISOString().split('T')[0];
        break;
      case 'year':
        start = `${now.getFullYear()}-01-01`;
        break;
    }

    setFilters({ dateFrom: start, dateTo: end });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Barre de recherche principale */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              placeholder="Rechercher par titre, référence, description, lieu..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-3 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              title="Réinitialiser tous les filtres"
            >
              <RotateCcw size={16} />
              <span className="hidden sm:inline">Réinitialiser</span>
              <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-3 text-sm text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
              title="Exporter les données filtrées"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtres détaillés */}
      <div className="p-4 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtres avancés</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filtre Module */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Module</label>
            <select
              value={filters.module}
              onChange={(e) => setFilters({ module: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {MODULES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Filtre Statut */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Statut</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Filtre Gravité */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Gravité</label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters({ severity: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {SEVERITIES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Filtre Lieu */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <MapPin size={12} className="inline mr-1" />
              Lieu
            </label>
            <input
              type="text"
              value={filters.location}
              onChange={(e) => setFilters({ location: e.target.value })}
              placeholder="Ex: Atelier A, Bureau..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filtres de période */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Période</span>
          </div>

          {/* Périodes rapides */}
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_PERIODS.map(period => (
              <button
                key={period.value}
                onClick={() => handleQuickPeriod(period.value)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  isPeriodActive(filters, period.value)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Dates personnalisées */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date début</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ dateFrom: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date fin</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ dateTo: e.target.value })}
                min={filters.dateFrom}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Tags des filtres actifs */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-gray-500">Filtres actifs :</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.module !== 'all' && (
                <FilterTag
                  label={`Module: ${MODULES.find(m => m.value === filters.module)?.label}`}
                  onRemove={() => setFilters({ module: 'all' })}
                />
              )}
              {filters.status !== 'all' && (
                <FilterTag
                  label={`Statut: ${STATUSES.find(s => s.value === filters.status)?.label}`}
                  onRemove={() => setFilters({ status: 'all' })}
                />
              )}
              {filters.severity !== 'all' && (
                <FilterTag
                  label={`Gravité: ${SEVERITIES.find(s => s.value === filters.severity)?.label}`}
                  onRemove={() => setFilters({ severity: 'all' })}
                />
              )}
              {filters.location && (
                <FilterTag
                  label={`Lieu: ${filters.location}`}
                  onRemove={() => setFilters({ location: '' })}
                />
              )}
              {filters.dateFrom && (
                <FilterTag
                  label={`Du: ${new Date(filters.dateFrom).toLocaleDateString('fr-FR')}`}
                  onRemove={() => setFilters({ dateFrom: '' })}
                />
              )}
              {filters.dateTo && (
                <FilterTag
                  label={`Au: ${new Date(filters.dateTo).toLocaleDateString('fr-FR')}`}
                  onRemove={() => setFilters({ dateTo: '' })}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant Tag de filtre
function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
      {label}
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 hover:bg-emerald-100 rounded-full transition-colors"
      >
        <X size={12} />
      </button>
    </span>
  );
}

// Helper pour vérifier si une période rapide est active
function isPeriodActive(filters: DashboardFiltersType, periodValue: string): boolean {
  if (!periodValue) {
    return !filters.dateFrom && !filters.dateTo;
  }

  const now = new Date();
  let expectedStart = '';
  let expectedEnd = now.toISOString().split('T')[0];

  switch (periodValue) {
    case 'today':
      expectedStart = expectedEnd;
      break;
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      expectedStart = weekAgo.toISOString().split('T')[0];
      break;
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      expectedStart = monthAgo.toISOString().split('T')[0];
      break;
    case 'quarter':
      const quarterAgo = new Date(now);
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      expectedStart = quarterAgo.toISOString().split('T')[0];
      break;
    case 'year':
      expectedStart = `${now.getFullYear()}-01-01`;
      break;
  }

  return filters.dateFrom === expectedStart && filters.dateTo === expectedEnd;
}