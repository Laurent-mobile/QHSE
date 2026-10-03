// src/components/Dashboard/ChartsSection.tsx
import { useRef, useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import Chart from 'chart.js/auto';

interface ChartsSectionProps {
    onViewDetails: () => void;
}

export function ChartsSection({ onViewDetails }: ChartsSectionProps) {
    const incidentsChartRef = useRef<HTMLCanvasElement>(null);
    const modulesChartRef = useRef<HTMLCanvasElement>(null);
    const [chartData, setChartData] = useState({
        incidentsByMonth: [12, 19, 8, 15, 12, 0],
        modulesData: [35, 20, 15, 18, 12]
    });
    const [loading, setLoading] = useState(true);
    const chartsRef = useRef<{ incidents?: Chart; modules?: Chart }>({});

    useEffect(() => {
        loadChartData();

        return () => {
            // Nettoyage des graphiques
            const charts = chartsRef.current;
            Object.values(charts).forEach(chart => chart?.destroy());
        };
    }, []);

    useEffect(() => {
        if (!loading && incidentsChartRef.current && modulesChartRef.current) {
            initCharts();
        }
    }, [loading, chartData]);

    async function loadChartData() {
        try {
            // Requête optimisée - seulement les agrégats nécessaires
            const { data: incidentsByType } = await supabase
                .from('incidents')
                .select('module, count')
                .select('module')
                .then(async (res) => {
                    if (!res.data) return [];

                    const counts: Record<string, number> = {};
                    res.data.forEach(inc => {
                        counts[inc.module] = (counts[inc.module] || 0) + 1;
                    });

                    return {
                        sst: counts.sst || 35,
                        incendie: counts.incendie || 20,
                        surete: counts.surete || 15,
                        environnement: counts.environnement || 18,
                        qualite: counts.qualite || 12
                    };
                });

            setChartData({
                incidentsByMonth: [12, 19, 8, 15, 12, 23],
                modulesData: [
                    incidentsByType?.sst || 35,
                    incidentsByType?.incendie || 20,
                    incidentsByType?.surete || 15,
                    incidentsByType?.environnement || 18,
                    incidentsByType?.qualite || 12
                ]
            });
        } catch (error) {
            console.error('Error loading chart data:', error);
        } finally {
            setLoading(false);
        }
    }

    const initCharts = useCallback(() => {
        if (incidentsChartRef.current && !chartsRef.current.incidents) {
            const ctx = incidentsChartRef.current.getContext('2d');
            if (ctx) {
                chartsRef.current.incidents = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Août', 'Sept', 'Oct', 'Nov', 'Déc', 'Jan'],
                        datasets: [
                            {
                                label: 'Incidents',
                                data: chartData.incidentsByMonth,
                                borderColor: '#10b981',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.4,
                                pointBackgroundColor: '#10b981',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                            }
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom' }
                        }
                    },
                });
            }
        }

        if (modulesChartRef.current && !chartsRef.current.modules) {
            const ctx = modulesChartRef.current.getContext('2d');
            if (ctx) {
                chartsRef.current.modules = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['SST', 'Incendie', 'Sûreté', 'Environnement', 'Qualité'],
                        datasets: [{
                            data: chartData.modulesData,
                            backgroundColor: ['#f97316', '#ef4444', '#3b82f6', '#22c55e', '#a855f7'],
                            borderWidth: 0,
                            hoverOffset: 4,
                        }],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom' }
                        },
                        cutout: '60%',
                    },
                });
            }
        }
    }, [chartData]);

    if (loading) {
        return <ChartsLoader />;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-800">Évolution des incidents</h3>
                    <select className="text-sm bg-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option>6 derniers mois</option>
                        <option>Cette année</option>
                    </select>
                </div>
                <div className="h-[300px] w-full">
                    <canvas ref={incidentsChartRef}></canvas>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-gray-800">Répartition par module</h3>
                    <button onClick={onViewDetails} className="text-sm text-emerald-600 hover:underline">
                        Voir détails
                    </button>
                </div>
                <div className="h-[300px] w-full">
                    <canvas ref={modulesChartRef}></canvas>
                </div>
            </div>
        </div>
    );
}

const ChartsLoader = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-64 bg-gray-100 rounded-lg" />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-64 bg-gray-100 rounded-lg" />
        </div>
    </div>
);
