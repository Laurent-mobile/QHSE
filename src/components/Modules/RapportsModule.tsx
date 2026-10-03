// src/components/Modules/RapportsModule.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart3, FileText, Download, Calendar, TrendingUp,
  TrendingDown, AlertTriangle, CheckCircle, Clock,
  Building, Users, HardHat, Flame, Shield, Leaf, Award,
  Loader, Filter, X, ChevronDown, FileSpreadsheet
} from 'lucide-react';
import { Modal } from '../common/Modal';

interface GlobalStats {
  totalIncidents: number;
  totalIncidentsThisMonth: number;
  incidentsEvolution: number;
  totalActions: number;
  closedActions: number;
  actionsCompletionRate: number;
  daysWithoutAccident: number;
  activeSites: number;
  totalUsers: number;
  incidentsByModule: Record<string, number>;
  incidentsBySeverity: Record<string, number>;
  incidentsByStatus: Record<string, number>;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

export function RapportsModule() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<GlobalStats>({
    totalIncidents: 0,
    totalIncidentsThisMonth: 0,
    incidentsEvolution: 0,
    totalActions: 0,
    closedActions: 0,
    actionsCompletionRate: 0,
    daysWithoutAccident: 0,
    activeSites: 0,
    totalUsers: 0,
    incidentsByModule: {},
    incidentsBySeverity: {},
    incidentsByStatus: {}
  });

  const [showSSTDateModal, setShowSSTDateModal] = useState(false);
  const [showKPIDateModal, setShowKPIDateModal] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  const [sstDateRange, setSstDateRange] = useState<DateRange>(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: startOfMonth.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
  });

  const [kpiDateRange, setKpiDateRange] = useState<DateRange>(() => {
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    return { startDate: oneYearAgo.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
  });

  const [customDateRange, setCustomDateRange] = useState<DateRange>(() => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { startDate: oneMonthAgo.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
  });

  const [customFilter, setCustomFilter] = useState({ module: 'all', siteId: 'all' });
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  
  const modules = [
    { id: 'all', name: 'Tous les modules', icon: BarChart3, color: 'gray' },
    { id: 'sst', name: 'Santé & Sécurité', icon: HardHat, color: 'orange' },
    { id: 'incendie', name: 'Sécurité Incendie', icon: Flame, color: 'red' },
    { id: 'surete', name: 'Sûreté', icon: Shield, color: 'blue' },
    { id: 'environnement', name: 'Environnement', icon: Leaf, color: 'green' },
    { id: 'qualite', name: 'Qualité', icon: Award, color: 'purple' }
  ];

  const presetPeriods = {
    '7days': { label: '7 derniers jours', getRange: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 7); return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] }; } },
    '30days': { label: '30 derniers jours', getRange: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 30); return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] }; } },
    'thisMonth': { label: 'Ce mois', getRange: () => { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1); return { startDate: start.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] }; } },
    'lastMonth': { label: 'Mois dernier', getRange: () => { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); const end = new Date(now.getFullYear(), now.getMonth(), 0); return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] }; } },
    'thisYear': { label: 'Cette année', getRange: () => { const now = new Date(); const start = new Date(now.getFullYear(), 0, 1); return { startDate: start.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] }; } },
    'lastYear': { label: 'Année dernière', getRange: () => { const now = new Date(); const start = new Date(now.getFullYear() - 1, 0, 1); const end = new Date(now.getFullYear() - 1, 11, 31); return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] }; } }
  };

  useEffect(() => {
    loadGlobalStats();
    loadSites();
  }, []);

  async function loadSites() {
    try {
      const { data, error } = await supabase.from('sites').select('id, name').eq('is_active', true);
      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Error loading sites:', error);
    }
  }

  async function loadGlobalStats() {
    try {
      setLoading(true);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      const [
        totalIncidentsResult, incidentsThisMonthResult, incidentsLastMonthResult,
        totalActionsResult, closedActionsResult, lastIncidentResult,
        sitesResult, usersResult, incidentsByModuleResult, incidentsBySeverityResult, incidentsByStatusResult
      ] = await Promise.all([
        supabase.from('incidents').select('id', { count: 'exact', head: true }),
        supabase.from('incidents').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
        supabase.from('incidents').select('id', { count: 'exact', head: true }).gte('created_at', startOfLastMonth.toISOString()).lt('created_at', endOfLastMonth.toISOString()),
        supabase.from('actions_capa').select('id', { count: 'exact', head: true }),
        supabase.from('actions_capa').select('id', { count: 'exact', head: true }).eq('status', 'terminee'),
        supabase.from('incidents').select('created_at').order('created_at', { ascending: false }).limit(1),
        supabase.from('sites').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('incidents').select('module'),
        supabase.from('incidents').select('severity'),
        supabase.from('incidents').select('status')
      ]);

      const incidentsLastMonth = incidentsLastMonthResult.count || 0;
      const incidentsThisMonth = incidentsThisMonthResult.count || 0;
      const incidentsEvolution = incidentsLastMonth > 0 ? Math.round(((incidentsThisMonth - incidentsLastMonth) / incidentsLastMonth) * 100) : 0;

      let daysWithoutAccident = 0;
      if (lastIncidentResult.data && lastIncidentResult.data.length > 0) {
        const lastIncidentDate = new Date(lastIncidentResult.data[0].created_at);
        daysWithoutAccident = Math.floor(Math.abs(new Date().getTime() - lastIncidentDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      const incidentsByModule: Record<string, number> = {};
      incidentsByModuleResult.data?.forEach((inc: any) => { incidentsByModule[inc.module] = (incidentsByModule[inc.module] || 0) + 1; });

      const incidentsBySeverity: Record<string, number> = {};
      incidentsBySeverityResult.data?.forEach((inc: any) => { incidentsBySeverity[inc.severity] = (incidentsBySeverity[inc.severity] || 0) + 1; });

      const incidentsByStatus: Record<string, number> = {};
      incidentsByStatusResult.data?.forEach((inc: any) => { incidentsByStatus[inc.status] = (incidentsByStatus[inc.status] || 0) + 1; });

      const totalActions = totalActionsResult.count || 0;
      const closedActions = closedActionsResult.count || 0;

      setStats({
        totalIncidents: totalIncidentsResult.count || 0,
        totalIncidentsThisMonth: incidentsThisMonth,
        incidentsEvolution,
        totalActions,
        closedActions,
        actionsCompletionRate: totalActions > 0 ? Math.round((closedActions / totalActions) * 100) : 0,
        daysWithoutAccident,
        activeSites: sitesResult.count || 0,
        totalUsers: usersResult.count || 0,
        incidentsByModule,
        incidentsBySeverity,
        incidentsByStatus
      });
    } catch (error) {
      console.error('Error loading global stats:', error);
    } finally {
      setLoading(false);
    }
  }

  async function getIncidentsForReport(moduleFilter?: string, dateRange?: DateRange, siteId?: string) {
    let query = supabase.from('incidents').select(`*, sites:site_id (name, code), profiles:reporter_id (full_name, email)`);
    if (moduleFilter && moduleFilter !== 'all') query = query.eq('module', moduleFilter);
    if (dateRange?.startDate) query = query.gte('incident_date', dateRange.startDate);
    if (dateRange?.endDate) query = query.lte('incident_date', dateRange.endDate);
    if (siteId && siteId !== 'all') query = query.eq('site_id', siteId);

    const { data, error } = await query.order('incident_date', { ascending: false });
    if (error) { console.error('Error fetching incidents:', error); return []; }
    return data || [];
  }

  async function generateSSTMonthlyReport() {
    setGenerating(true);
    try {
      const incidents = await getIncidentsForReport('sst', sstDateRange);
      const { data: actionsData } = await supabase.from('actions_capa').select('*').eq('source_type', 'incident').gte('created_at', sstDateRange.startDate).lte('created_at', sstDateRange.endDate);
      const { data: formationsData } = await supabase.from('formations').select('*').eq('type', 'sst').gte('date', sstDateRange.startDate).lte('date', sstDateRange.endDate);

      generatePDFReport(incidents, {
        title: 'Rapport Mensuel SST',
        subtitle: `Période: ${formatDate(sstDateRange.startDate)} au ${formatDate(sstDateRange.endDate)}`,
        showActions: true, showFormations: true, actions: actionsData || [], formations: formationsData || []
      });
      setShowSSTDateModal(false);
    } catch (error) {
      console.error('Error generating SST report:', error);
      alert('Erreur lors de la génération du rapport SST');
    } finally {
      setGenerating(false);
    }
  }

  async function generateKPIDashboard() {
    setGenerating(true);
    try {
      const incidents = await getIncidentsForReport('all', kpiDateRange);
      const kpiData = {
        totalIncidents: incidents.length,
        incidentsByMonth: getIncidentsByMonth(incidents),
        incidentsByModule: getIncidentsByModule(incidents),
        incidentsBySeverity: getIncidentsBySeverity(incidents),
        incidentsByStatus: getIncidentsByStatus(incidents),
        resolutionRate: calculateResolutionRate(incidents),
      };
      generateKPIReport(incidents, kpiData, kpiDateRange);
      setShowKPIDateModal(false);
    } catch (error) {
      console.error('Error generating KPI report:', error);
      alert('Erreur lors de la génération du rapport KPI');
    } finally {
      setGenerating(false);
    }
  }

  async function generateCustomReport() {
    setGenerating(true);
    try {
      const incidents = await getIncidentsForReport(customFilter.module, customDateRange, customFilter.siteId);
      const moduleName = modules.find(m => m.id === customFilter.module)?.name || 'Tous';
      const siteName = customFilter.siteId === 'all' ? 'Tous les sites' : sites.find(s => s.id === customFilter.siteId)?.name;

      generatePDFReport(incidents, {
        title: 'Rapport Personnalisé',
        subtitle: `Période: ${formatDate(customDateRange.startDate)} au ${formatDate(customDateRange.endDate)} | Module: ${moduleName} | Site: ${siteName}`,
        showActions: false, showFormations: false, actions: [], formations: []
      });
      setShowCustomDateModal(false);
    } catch (error) {
      console.error('Error generating custom report:', error);
      alert('Erreur lors de la génération du rapport personnalisé');
    } finally {
      setGenerating(false);
    }
  }

  function getIncidentsByMonth(incidents: any[]) {
    const months: Record<string, number> = {};
    incidents.forEach(inc => {
      const date = new Date(inc.incident_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = (months[key] || 0) + 1;
    });
    return months;
  }

  function getIncidentsByModule(incidents: any[]) {
    const modulesCount: Record<string, number> = {};
    incidents.forEach(inc => { modulesCount[inc.module] = (modulesCount[inc.module] || 0) + 1; });
    return modulesCount;
  }

  function getIncidentsBySeverity(incidents: any[]) {
    const severities: Record<string, number> = {};
    incidents.forEach(inc => { severities[inc.severity] = (severities[inc.severity] || 0) + 1; });
    return severities;
  }

  function getIncidentsByStatus(incidents: any[]) {
    const statuses: Record<string, number> = {};
    incidents.forEach(inc => { statuses[inc.status] = (statuses[inc.status] || 0) + 1; });
    return statuses;
  }

  function calculateResolutionRate(incidents: any[]) {
    const closed = incidents.filter(inc => inc.status === 'cloture').length;
    return incidents.length > 0 ? Math.round((closed / incidents.length) * 100) : 0;
  }

  function formatDate(dateString: string) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  function applyPresetPeriod(preset: string, target: 'sst' | 'kpi' | 'custom') {
    const range = presetPeriods[preset as keyof typeof presetPeriods].getRange();
    if (target === 'sst') setSstDateRange(range);
    else if (target === 'kpi') setKpiDateRange(range);
    else setCustomDateRange(range);
  }

  function generatePDFReport(incidents: any[], options: any) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const severityStats = {
      critique: incidents.filter(i => i.severity === 'critique').length,
      grave: incidents.filter(i => i.severity === 'grave').length,
      moyen: incidents.filter(i => i.severity === 'moyen').length,
      faible: incidents.filter(i => i.severity === 'faible').length
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${options.title} - Afri SafeTrack</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1f2937; }
          .header { border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
          h1 { color: #059669; margin: 0; font-size: 28px; }
          .subtitle { color: #6b7280; font-size: 14px; margin-top: 5px; }
          .stats { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
          .stat-card { background: #f9fafb; padding: 20px; border-radius: 8px; flex: 1; min-width: 150px; border-left: 4px solid #059669; }
          .stat-card h3 { margin: 0 0 10px 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
          .stat-card .value { font-size: 32px; font-weight: bold; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: 600; color: #374151; }
          .badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
          .badge-critique { background: #fee2e2; color: #dc2626; }
          .badge-grave { background: #ffedd5; color: #ea580c; }
          .badge-moyen { background: #fef3c7; color: #d97706; }
          .badge-faible { background: #dbeafe; color: #2563eb; }
          .footer { margin-top: 50px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${options.title}</h1>
          <p class="subtitle">Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} | ${options.subtitle}</p>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <h3>Total Incidents</h3>
            <div class="value">${incidents.length}</div>
          </div>
          <div class="stat-card">
            <h3>Critiques / Graves</h3>
            <div class="value">${severityStats.critique + severityStats.grave}</div>
          </div>
          <div class="stat-card">
            <h3>Taux de Clôture</h3>
            <div class="value">${incidents.length > 0 ? Math.round((incidents.filter(i => i.status === 'cloture').length / incidents.length) * 100) : 0}%</div>
          </div>
        </div>

        <h2 style="color: #374151; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Détail des incidents</h2>
        ${incidents.length === 0 ? '<p style="color: #6b7280; font-style: italic;">Aucun incident à signaler pour cette période.</p>' : `
          <table>
            <thead>
              <tr><th>Référence</th><th>Titre</th><th>Module</th><th>Sévérité</th><th>Statut</th><th>Date</th><th>Lieu</th></tr>
            </thead>
            <tbody>
              ${incidents.map(inc => `
                <tr>
                  <td style="font-family: monospace;">${inc.reference}</td>
                  <td>${inc.title || '-'}</td>
                  <td>${inc.module ? inc.module.toUpperCase() : '-'}</td>
                  <td><span class="badge badge-${inc.severity}">${inc.severity || 'Non défini'}</span></td>
                  <td>${inc.status === 'cloture' ? 'Clôturé' : inc.status === 'en_cours' ? 'En cours' : 'Ouvert'}</td>
                  <td>${new Date(inc.incident_date).toLocaleDateString('fr-FR')}</td>
                  <td>${inc.location || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
        
        <div class="footer">
          <p>Rapport généré automatiquement par <strong>Afri SafeTrack</strong> - Plateforme QHSE intégrée</p>
          <p>Document confidentiel - Usage interne uniquement</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  function generateKPIReport(incidents: any[], kpiData: any, dateRange: DateRange) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const sortedMonths = Object.keys(kpiData.incidentsByMonth).sort();
    const monthlyData = sortedMonths.map(month => ({ month, count: kpiData.incidentsByMonth[month] }));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tableau de Bord KPI - Afri SafeTrack</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1f2937; }
          h1 { color: #4f46e5; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
          .kpi-card { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .kpi-card h3 { margin: 0 0 10px 0; font-size: 13px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
          .kpi-card .value { font-size: 36px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
          th { background-color: #f3f4f6; font-weight: 600; }
          .footer { margin-top: 50px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        </style>
      </head>
      <body>
        <h1>Tableau de Bord KPI</h1>
        <p style="color: #6b7280;">Période: ${formatDate(dateRange.startDate)} au ${formatDate(dateRange.endDate)} | Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
        
        <div class="kpi-grid">
          <div class="kpi-card">
            <h3>Total Incidents</h3>
            <div class="value">${kpiData.totalIncidents}</div>
          </div>
          <div class="kpi-card">
            <h3>Taux de Résolution</h3>
            <div class="value">${kpiData.resolutionRate}%</div>
          </div>
        </div>

        <h2 style="margin-top: 40px; color: #374151;">Évolution mensuelle</h2>
        <table>
          <thead><tr><th>Mois</th><th>Nombre d'incidents</th></tr></thead>
          <tbody>${monthlyData.map(data => `<tr><td>${data.month}</td><td><strong>${data.count}</strong></td></tr>`).join('')}</tbody>
        </table>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px;">
          <div>
            <h2 style="color: #374151;">Par Module</h2>
            <table>
              <thead><tr><th>Module</th><th>Nombre</th></tr></thead>
              <tbody>${Object.entries(kpiData.incidentsByModule).map(([module, count]) => `<tr><td>${module ? module.toUpperCase() : 'Non défini'}</td><td>${count}</td></tr>`).join('')}</tbody>
            </table>
          </div>
          <div>
            <h2 style="color: #374151;">Par Sévérité</h2>
            <table>
              <thead><tr><th>Sévérité</th><th>Nombre</th></tr></thead>
              <tbody>${Object.entries(kpiData.incidentsBySeverity).map(([severity, count]) => `<tr><td>${severity ? severity.toUpperCase() : 'Non défini'}</td><td>${count}</td></tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
        
        <div class="footer">
          <p>Rapport généré automatiquement par <strong>Afri SafeTrack</strong></p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  function generateCSV(incidents: any[]) {
    const headers = ['Référence', 'Titre', 'Module', 'Type', 'Sévérité', 'Statut', 'Date', 'Lieu', 'Site', 'Déclarant'];
    const rows = incidents.map(inc => [
      inc.reference,
      `"${(inc.title || '').replace(/"/g, '""')}"`,
      inc.module,
      inc.type,
      inc.severity,
      inc.status === 'cloture' ? 'Clôturé' : inc.status === 'en_cours' ? 'En cours' : 'Ouvert',
      new Date(inc.incident_date).toLocaleDateString('fr-FR'),
      `"${(inc.location || '').replace(/"/g, '""')}"`,
      inc.sites?.name || '',
      inc.profiles?.full_name || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `rapport_incidents_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  async function exportAllDataCSV() {
    setGenerating(true);
    try {
      const incidents = await getIncidentsForReport();
      generateCSV(incidents);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4" />
          <p className="text-gray-500">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  // 🎯 Calcul pour les barres de progression visuelles
  const maxModule = Math.max(...Object.values(stats.incidentsByModule), 1);
  const maxSeverity = Math.max(...Object.values(stats.incidentsBySeverity), 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Rapports & Analytics</h2>
          <p className="text-gray-500">Génération de rapports, export de données et indicateurs clés</p>
        </div>
      </div>

      {/* Statistiques Globales */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl p-6 lg:p-8 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <BarChart3 size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-bold">Statistiques Globales</h3>
            <p className="text-indigo-100">Vue d'ensemble de toutes vos données QHSE</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/20 backdrop-blur rounded-xl p-4">
            <p className="text-3xl font-bold">{stats.daysWithoutAccident}</p>
            <p className="text-sm text-indigo-100">Jours sans accident</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-4">
            <p className="text-3xl font-bold">{stats.actionsCompletionRate}%</p>
            <p className="text-sm text-indigo-100">Taux de conformité</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-4">
            <p className="text-3xl font-bold flex items-center gap-1">
              {stats.incidentsEvolution >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              {Math.abs(stats.incidentsEvolution)}%
            </p>
            <p className="text-sm text-indigo-100">
              {stats.incidentsEvolution >= 0 ? 'Augmentation' : 'Baisse'} des incidents
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-4">
            <p className="text-3xl font-bold">{stats.totalActions}</p>
            <p className="text-sm text-indigo-100">Actions CAPA ({stats.closedActions} terminées)</p>
          </div>
        </div>
      </div>

      {/* 🆕 Section Analyse Visuelle Rapide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-500" />
            Répartition par Module
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.incidentsByModule).length === 0 ? (
              <p className="text-sm text-gray-400 italic">Aucune donnée disponible</p>
            ) : (
              Object.entries(stats.incidentsByModule).map(([module, count]) => {
                const mod = modules.find(m => m.id === module) || { name: module, color: 'gray' };
                const percentage = Math.round((count / stats.totalIncidents) * 100) || 0;
                return (
                  <div key={module}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 capitalize">{mod.name}</span>
                      <span className="text-gray-500">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className={`bg-${mod.color}-500 h-2.5 rounded-full transition-all duration-500`} style={{ width: `${(count / maxModule) * 100}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            Répartition par Gravité
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.incidentsBySeverity).length === 0 ? (
              <p className="text-sm text-gray-400 italic">Aucune donnée disponible</p>
            ) : (
              Object.entries(stats.incidentsBySeverity).map(([severity, count]) => {
                const color = severity === 'critique' ? 'red' : severity === 'grave' ? 'orange' : severity === 'moyen' ? 'yellow' : 'blue';
                const percentage = Math.round((count / stats.totalIncidents) * 100) || 0;
                return (
                  <div key={severity}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 capitalize">{severity}</span>
                      <span className="text-gray-500">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className={`bg-${color}-500 h-2.5 rounded-full transition-all duration-500`} style={{ width: `${(count / maxSeverity) * 100}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Cartes de génération de rapports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Rapport SST */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
          <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
            <HardHat className="text-orange-500" size={28} />
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">Rapport SST</h3>
          <p className="text-sm text-gray-500 mb-4">Rapport détaillé Santé & Sécurité</p>
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              {formatDate(sstDateRange.startDate)} - {formatDate(sstDateRange.endDate)}
            </div>
            <button onClick={() => setShowSSTDateModal(true)} disabled={generating} className="text-emerald-600 text-sm font-medium hover:underline flex items-center gap-1">
              <Calendar size={16} /> Choisir période
            </button>
          </div>
        </div>

        {/* Rapport KPI */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
            <BarChart3 className="text-blue-500" size={28} />
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">Tableau de bord KPI</h3>
          <p className="text-sm text-gray-500 mb-4">Indicateurs clés de performance</p>
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              {formatDate(kpiDateRange.startDate)} - {formatDate(kpiDateRange.endDate)}
            </div>
            <button onClick={() => setShowKPIDateModal(true)} disabled={generating} className="text-emerald-600 text-sm font-medium hover:underline flex items-center gap-1">
              <Calendar size={16} /> Choisir période
            </button>
          </div>
        </div>

        {/* 🆕 Rapport Personnalisé (Ajouté) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
          <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
            <Filter className="text-purple-500" size={28} />
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">Rapport Personnalisé</h3>
          <p className="text-sm text-gray-500 mb-4">Filtrez par module, site et période</p>
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">Configuration manuelle</div>
            <button onClick={() => setShowCustomDateModal(true)} disabled={generating} className="text-emerald-600 text-sm font-medium hover:underline flex items-center gap-1">
              <ChevronDown size={16} /> Configurer
            </button>
          </div>
        </div>

        {/* Export CSV */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all md:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                <FileSpreadsheet className="text-green-500" size={28} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Export complet des données QHSE</h3>
                <p className="text-sm text-gray-500">Téléchargez l'intégralité des incidents au format CSV pour analyse Excel</p>
              </div>
            </div>
            <button onClick={exportAllDataCSV} disabled={generating} className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50">
              {generating ? <Loader size={20} className="animate-spin" /> : <Download size={20} />}
              Exporter CSV
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================
          MODALES
      ========================================== */}
      
      {/* Modal choix période pour Rapport SST */}
      <Modal isOpen={showSSTDateModal} onClose={() => setShowSSTDateModal(false)} title="Période du rapport SST" size="md">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Période prédéfinie</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(presetPeriods).map(([key, preset]) => (
                <button key={key} onClick={() => applyPresetPeriod(key, 'sst')} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors">
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Période personnalisée</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Date début</label>
                <input type="date" value={sstDateRange.startDate} onChange={(e) => setSstDateRange(prev => ({ ...prev, startDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Date fin</label>
                <input type="date" value={sstDateRange.endDate} onChange={(e) => setSstDateRange(prev => ({ ...prev, endDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setShowSSTDateModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
            <button onClick={generateSSTMonthlyReport} disabled={generating} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2">
              {generating ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
              Générer le rapport
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal choix période pour Rapport KPI */}
      <Modal isOpen={showKPIDateModal} onClose={() => setShowKPIDateModal(false)} title="Période du rapport KPI" size="md">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Période prédéfinie</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => applyPresetPeriod('thisYear', 'kpi')} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">Cette année</button>
              <button onClick={() => applyPresetPeriod('lastYear', 'kpi')} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">Année dernière</button>
              <button onClick={() => applyPresetPeriod('30days', 'kpi')} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">30 derniers jours</button>
              <button onClick={() => applyPresetPeriod('thisMonth', 'kpi')} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">Ce mois</button>
            </div>
          </div>
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Période personnalisée</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Date début</label>
                <input type="date" value={kpiDateRange.startDate} onChange={(e) => setKpiDateRange(prev => ({ ...prev, startDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Date fin</label>
                <input type="date" value={kpiDateRange.endDate} onChange={(e) => setKpiDateRange(prev => ({ ...prev, endDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setShowKPIDateModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
            <button onClick={generateKPIDashboard} disabled={generating} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2">
              {generating ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
              Générer le rapport
            </button>
          </div>
        </div>
      </Modal>

      {/* 🆕 Modal rapport personnalisé */}
      <Modal isOpen={showCustomDateModal} onClose={() => setShowCustomDateModal(false)} title="Rapport personnalisé" size="md">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Période prédéfinie</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(presetPeriods).map(([key, preset]) => (
                <button key={key} onClick={() => applyPresetPeriod(key, 'custom')} className="px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Période personnalisée</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Date début</label>
                <input type="date" value={customDateRange.startDate} onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Date fin</label>
                <input type="date" value={customDateRange.endDate} onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Module</label>
            <select value={customFilter.module} onChange={(e) => setCustomFilter(prev => ({ ...prev, module: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500">
              {modules.map(module => <option key={module.id} value={module.id}>{module.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
            <select value={customFilter.siteId} onChange={(e) => setCustomFilter(prev => ({ ...prev, siteId: e.target.value }))} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500">
              <option value="all">Tous les sites</option>
              {sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={() => setShowCustomDateModal(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">Annuler</button>
            <button onClick={generateCustomReport} disabled={generating} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2">
              {generating ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
              Générer le rapport
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
