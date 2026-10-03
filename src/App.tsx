import { lazy, Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useUserSite } from './hooks/useUserSite'; // 🆕 AJOUT : Import du hook de site
import { LoginForm } from './components/Auth/LoginForm';
import { Sidebar } from './components/Layout/Sidebar';
import { TopBar } from './components/Layout/TopBar';
import { Modal } from './components/common/Modal';
import { ToastProvider } from './components/common/Toast';
import { ConfirmProvider } from './components/common/ConfirmDialog';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';

// Lazy loading
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const SSTModule = lazy(() => import('./components/Modules/SSTModule').then(m => ({ default: m.SSTModule })));
const IncendieModule = lazy(() => import('./components/Modules/IncendieModule').then(m => ({ default: m.IncendieModule })));
const SureteModule = lazy(() => import('./components/Modules/SureteModule').then(m => ({ default: m.SureteModule })));
const EnvironnementModule = lazy(() => import('./components/Modules/EnvironnementModule').then(m => ({ default: m.EnvironnementModule })));
const QualiteModule = lazy(() => import('./components/Modules/QualiteModule').then(m => ({ default: m.QualiteModule })));
const RapportsModule = lazy(() => import('./components/Modules/RapportsModule').then(m => ({ default: m.RapportsModule })));
const UtilisateursModule = lazy(() => import('./components/Modules/UtilisateursModule').then(m => ({ default: m.UtilisateursModule })));
const ParametresModule = lazy(() => import('./components/Modules/ParametresModule').then(m => ({ default: m.ParametresModule })));
const IncidentForm = lazy(() => import('./components/Forms/IncidentForm').then(m => ({ default: m.IncidentForm })));

const ModuleLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-500">Chargement du module...</p>
    </div>
  </div>
);

const AppLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
        <svg className="w-10 h-10 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <p className="text-gray-600">Chargement de l'application...</p>
    </div>
  </div>
);

function AppContent() {
  const { user, loading, error } = useAuth();
  const { userSite } = useUserSite(); // 🆕 AJOUT : Récupération du site actuel
  
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const moduleRef = useRef<{ refreshData?: () => Promise<void> } | null>(null);

  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      const moduleId = event.detail;
      if (moduleId && moduleId !== currentModule) {
        setCurrentModule(moduleId);
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('navigateToModule', handleNavigate as EventListener);
    return () => window.removeEventListener('navigateToModule', handleNavigate as EventListener);
  }, [currentModule]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (moduleRef.current?.refreshData) {
        await moduleRef.current.refreshData();
      }
    } catch (error) {
      console.error('Erreur rafraîchissement:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  // 🎯 MODIFICATION CRUCIALE : Ajout de la prop `key` basée sur le site
  const renderModule = useCallback(() => {
    const siteKey = userSite?.site_id || 'no-site'; // Clé magique
    
    const modules: Record<string, React.ReactNode> = {
      dashboard: <Dashboard key={siteKey} ref={moduleRef} />,
      sst: <SSTModule key={siteKey} />,
      incendie: <IncendieModule key={siteKey} />,
      surete: <SureteModule key={siteKey} />,
      environnement: <EnvironnementModule key={siteKey} />,
      qualite: <QualiteModule key={siteKey} />,
      rapports: <RapportsModule key={siteKey} />,
      utilisateurs: <UtilisateursModule key={siteKey} />,
      parametres: <ParametresModule key={siteKey} />,
    };
    return modules[currentModule] || <Dashboard key={siteKey} ref={moduleRef} />;
  }, [currentModule, userSite?.site_id]); // 🆕 AJOUT : userSite?.site_id dans les dépendances

  useEffect(() => {
    moduleRef.current = null;
  }, [currentModule]);

  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-500" size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Erreur de connexion</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <RefreshCw size={18} />
            Réessayer
          </button>
          <p className="text-xs text-gray-400 mt-4">
            💡 Vérifiez votre connexion internet et vos variables d'environnement (.env)
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <AppLoader />;
  if (!user) return <LoginForm />;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        currentModule={currentModule}
        onModuleChange={setCurrentModule}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <TopBar
          onMenuClick={() => setIsMobileSidebarOpen(true)}
          onNewIncident={() => setShowIncidentModal(true)}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
        <main className="flex-1 p-4 lg:p-8">
          <Suspense fallback={<ModuleLoader />}>
            {renderModule()}
          </Suspense>
        </main>
      </div>

      <button
        onClick={() => setShowIncidentModal(true)}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center z-30 hover:bg-emerald-700 transition-all active:scale-95"
        aria-label="Nouveau signalement"
      >
        <Plus size={24} />
      </button>

      {showIncidentModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto" />
              <p className="mt-4 text-gray-600">Chargement du formulaire...</p>
            </div>
          </div>
        }>
          <Modal
            isOpen={showIncidentModal}
            onClose={() => setShowIncidentModal(false)}
            title="Nouveau signalement d'incident"
            size="lg"
          >
            <IncidentForm
              module={currentModule === 'dashboard' ? 'sst' : currentModule}
              onSuccess={() => {
                setShowIncidentModal(false);
                setTimeout(() => handleRefresh(), 500);
              }}
              onCancel={() => setShowIncidentModal(false)}
            />
          </Modal>
        </Suspense>
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppContent />
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
