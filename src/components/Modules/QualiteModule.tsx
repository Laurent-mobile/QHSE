import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Award, ClipboardCheck, AlertCircle, FolderOpen, Plus, FileText,
  Download, Upload, X, Search, Trash2, Edit, Eye, Loader,
  File, FileSpreadsheet, Image, Archive, FileWarning, RefreshCw, CheckCircle,
  User, Calendar, PlayCircle
} from 'lucide-react';
import type { Database } from '../../lib/database.types';
import { Modal } from '../common/Modal';
import { AuditForm } from '../Forms/AuditForm';
import { NonConformiteForm } from '../Forms/NonConformiteForm';
import { CAPAForm } from '../Forms/CAPAForm';
import { useUserSite } from '../../hooks/useUserSite';
import { useToast } from '../common/Toast';
import { useConfirm } from '../common/ConfirmDialog';

type Audit = Database['public']['Tables']['audits']['Row'];
type NonConformite = Database['public']['Tables']['non_conformites']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

// 🎯 Interface corrigée pour correspondre aux colonnes de la base de données
interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  file_path: string;
  category: string;
  version: string;
  uploaded_by: string;
  uploaded_at: string;
  description?: string;
  tags?: string[];
}

export function QualiteModule() {
  const toast = useToast();
  const confirm = useConfirm();
  const { userSite } = useUserSite();

  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'audits' | 'nc' | 'ged'>('overview');
  const [audits, setAudits] = useState<Audit[]>([]);
  const [nonConformites, setNonConformites] = useState<NonConformite[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showNcModal, setShowNcModal] = useState(false);
  const [showCapaModal, setShowCapaModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false); // 🎯 Modale de détails document

  const [selectedNc, setSelectedNc] = useState<NonConformite | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [ncModalMode, setNcModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'manuel',
    version: '1.0',
    description: '',
    tags: '',
    file: null as File | null
  });

  const categories = [
    { value: 'manuel', label: 'Manuels qualité' },
    { value: 'procedure', label: 'Procédures' },
    { value: 'certificat', label: 'Certificats' },
    { value: 'rapport', label: 'Rapports d\'audit' },
    { value: 'fiche', label: 'Fiches techniques' },
    { value: 'autre', label: 'Autres documents' }
  ];

  useEffect(() => {
    if (userSite?.site_id) setCurrentSiteId(userSite.site_id);
  }, [userSite]);

  useEffect(() => {
    if (currentSiteId) {
      loadData();
      loadDocuments();
      loadProfiles();
    }
  }, [currentSiteId]);

  async function loadData() {
    if (!currentSiteId) return;
    try {
      const auditsQuery = supabase.from('audits').select('*').eq('site_id', currentSiteId).order('date', { ascending: false });
      const ncQuery = supabase.from('non_conformites').select('*').eq('site_id', currentSiteId).order('created_at', { ascending: false });
      const [auditsData, ncData] = await Promise.all([auditsQuery, ncQuery]);
      setAudits(auditsData.data || []);
      setNonConformites(ncData.data || []);
    } catch (error) {
      console.error('Error loading quality data:', error);
      toast.error('Erreur', 'Impossible de charger les données qualité');
    } finally {
      setLoading(false);
    }
  }

  async function loadProfiles() {
    try {
      const { data } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  }

  async function loadDocuments() {
    if (!currentSiteId) return;
    try {
      const { data } = await supabase.from('documents').select('*').eq('site_id', currentSiteId).order('uploaded_at', { ascending: false });
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }

  const handleViewNc = (nc: NonConformite) => {
    setSelectedNc(nc);
    setNcModalMode('view');
    setShowNcModal(true); // 🎯 Réutilisation de la même modale en mode lecture
  };

  const handleEditNc = (nc: NonConformite) => {
    setSelectedNc(nc);
    setNcModalMode('edit');
    setShowNcModal(true);
  };

  const handleDeleteNc = async (id: string, reference: string) => {
    const ok = await confirm({
      title: 'Supprimer cette non-conformité ?',
      message: `La NC ${reference} sera définitivement supprimée. Cette action est irréversible.`,
      variant: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    });

    if (!ok) return;

    try {
      const { error } = await supabase.from('non_conformites').delete().eq('id', id);
      if (error) throw error;
      toast.success('NC supprimée', `Référence: ${reference}`);
      loadData();
    } catch (error: any) {
      console.error('Error deleting non-conformite:', error);
      toast.error('Erreur', error.message || 'Impossible de supprimer la NC');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('non_conformites')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Statut mis à jour', `NC passée à: ${status}`);
      loadData();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Erreur', error.message || 'Impossible de mettre à jour le statut');
    }
  };

  const handleCreateCapa = (nc: NonConformite) => {
    setSelectedNc(nc);
    setShowCapaModal(true);
  };

  const getResponsibleName = (responsibleId: string | null) => {
    if (!responsibleId) return 'Non assigné';
    const profile = profiles.find(p => p.id === responsibleId);
    return profile?.full_name || 'Non assigné';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critique': return 'bg-red-100 text-red-600';
      case 'majeure': return 'bg-orange-100 text-orange-600';
      case 'mineure': return 'bg-yellow-100 text-yellow-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'cloture': return 'bg-emerald-100 text-emerald-600';
      case 'en_cours': return 'bg-blue-100 text-blue-600';
      case 'ouvert': return 'bg-orange-100 text-orange-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'cloture': return 'Clôturé';
      case 'en_cours': return 'En cours';
      case 'ouvert': return 'Ouvert';
      default: return status;
    }
  };

  async function handleUploadDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadForm.file) return;
    setUploading(true);
    try {
      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `${Date.now()}_${uploadForm.name.replace(/\s+/g, '_')}.${fileExt}`;
      const filePath = `qualite/${uploadForm.category}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, uploadForm.file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
      const { data: { user } } = await supabase.auth.getUser();

      const { error: dbError } = await supabase.from('documents').insert({
        name: uploadForm.name,
        filename: uploadForm.file.name,
        file_path: filePath,
        file_url: publicUrl,
        file_size: uploadForm.file.size,
        file_type: fileExt,
        category: uploadForm.category,
        version: uploadForm.version,
        description: uploadForm.description,
        tags: uploadForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        uploaded_by: user?.id,
        site_id: currentSiteId
      });
      if (dbError) throw dbError;

      await loadDocuments();
      setShowUploadModal(false);
      resetUploadForm();
      toast.success('Document téléchargé', uploadForm.name);
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error('Erreur', error.message || 'Impossible de télécharger le document');
    } finally {
      setUploading(false);
    }
  }

  const resetUploadForm = () => {
    setUploadForm({ name: '', category: 'manuel', version: '1.0', description: '', tags: '', file: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadForm({ ...uploadForm, file, name: uploadForm.name || file.name.split('.')[0] });
    }
  };

  const getFileIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'pdf': return <FileWarning className="text-red-500" size={24} />;
      case 'docx': case 'doc': return <FileText className="text-blue-500" size={24} />;
      case 'xlsx': case 'xls': return <FileSpreadsheet className="text-green-500" size={24} />;
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': return <Image className="text-purple-500" size={24} />;
      case 'zip': case 'rar': case '7z': return <Archive className="text-orange-500" size={24} />;
      default: return <File className="text-gray-500" size={24} />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDeleteDocument = async (doc: Document) => {
    const ok = await confirm({
      title: 'Supprimer ce document ?',
      message: `Le document "${doc.name}" sera définitivement supprimé.`,
      variant: 'danger',
      confirmText: 'Supprimer'
    });

    if (!ok) return;

    try {
      // 🎯 Utilisation de file_path pour une suppression fiable du storage
      if (doc.file_path) {
        await supabase.storage.from('documents').remove([doc.file_path]);
      }
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw error;
      toast.success('Document supprimé', doc.name);
      loadDocuments();
    } catch (error: any) {
      toast.error('Erreur', error.message || 'Impossible de supprimer le document');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const ncCritiques = nonConformites.filter(nc => nc.priority === 'critique' && nc.status !== 'cloture');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Qualité</h2>
          <p className="text-gray-500">
            Audits, non-conformités et amélioration continue
            {userSite && <span className="ml-2 text-purple-600 text-sm">• Site: {userSite.site_name}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setActiveTab('ged'); setShowUploadModal(true); }} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
            <Upload size={20} /> Upload document
          </button>
          <button onClick={() => { setSelectedNc(null); setNcModalMode('create'); setShowNcModal(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
            <Plus size={20} /> Nouvelle NC
          </button>
          <button onClick={() => setShowAuditModal(true)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
            <ClipboardCheck size={20} /> Nouvel audit
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          <button onClick={() => setActiveTab('overview')} className={`px-6 py-4 font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'overview' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-800'}`}>
            <Award size={18} /> Vue d'ensemble
          </button>
          <button onClick={() => setActiveTab('audits')} className={`px-6 py-4 font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'audits' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-800'}`}>
            <ClipboardCheck size={18} /> Audits & Inspections
          </button>
          <button onClick={() => setActiveTab('nc')} className={`px-6 py-4 font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'nc' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-800'}`}>
            <AlertCircle size={18} /> Non-conformités
          </button>
          <button onClick={() => setActiveTab('ged')} className={`px-6 py-4 font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'ged' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:text-gray-800'}`}>
            <FolderOpen size={18} /> Documentation (GED)
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                <h3 className="text-lg font-semibold mb-4">Progression Audits 2025</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-purple-100 text-sm">Réalisés</p>
                    <p className="text-3xl font-bold">{audits.filter(a => a.status === 'termine').length}/{audits.length || 12}</p>
                  </div>
                  <div className="bg-white/20 rounded-full h-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: `${audits.length ? (audits.filter(a => a.status === 'termine').length / audits.length) * 100 : 25}%` }} />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-3">
                <h3 className="font-semibold text-gray-800 mb-2">Non-conformités critiques</h3>
                {ncCritiques.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Aucune non-conformité critique en cours</p>
                  </div>
                ) : (
                  ncCritiques.map((nc) => (
                    <div key={nc.id} className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border-l-4 border-red-500 hover:shadow-md transition-all cursor-pointer" onClick={() => handleViewNc(nc)}>
                      <span className="text-red-500 font-mono text-sm">{nc.reference}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{nc.description}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><User size={12} />{getResponsibleName(nc.responsible_id)}</span>
                          <span className="flex items-center gap-1"><Calendar size={12} />Échéance: {new Date(nc.due_date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getPriorityColor(nc.priority)}`}>{nc.priority.toUpperCase()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'audits' && (
            <div className="overflow-x-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">Liste des audits</h3>
                <button onClick={() => setShowAuditModal(true)} className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1">
                  <Plus size={16} /> Nouvel audit
                </button>
              </div>
              {audits.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Aucun audit enregistré</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Référence</th>
                      <th className="pb-3 font-medium">Auditeur</th>
                      <th className="pb-3 font-medium text-center">Score</th>
                      <th className="pb-3 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {audits.map((audit) => (
                      <tr key={audit.id} className="hover:bg-gray-50">
                        <td className="py-3">{new Date(audit.date).toLocaleDateString('fr-FR')}</td>
                        <td className="py-3 font-medium">{audit.type}</td>
                        <td className="py-3 font-mono text-xs">{audit.reference}</td>
                        <td className="py-3 text-gray-600">{(audit as any).auditeur || 'Non assigné'}</td>
                        <td className="py-3 text-center"><span className="text-emerald-600 font-bold">{audit.score || '-'}%</span></td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs ${audit.status === 'termine' ? 'bg-emerald-100 text-emerald-600' : audit.status === 'en_cours' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                            {audit.status === 'termine' ? 'Terminé' : audit.status === 'en_cours' ? 'En cours' : 'Planifié'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'nc' && (
            <div className="overflow-x-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">Non-conformités</h3>
                <button onClick={() => { setSelectedNc(null); setNcModalMode('create'); setShowNcModal(true); }} className="text-sm bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1">
                  <Plus size={16} /> Nouvelle NC
                </button>
              </div>
              {nonConformites.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Aucune non-conformité enregistrée</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-3 font-medium">ID</th>
                      <th className="pb-3 font-medium">Description</th>
                      <th className="pb-3 font-medium">Priorité</th>
                      <th className="pb-3 font-medium">Responsable</th>
                      <th className="pb-3 font-medium">Échéance</th>
                      <th className="pb-3 font-medium">Statut</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {nonConformites.map((nc) => (
                      <tr key={nc.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 font-mono text-xs">{nc.reference}</td>
                        <td className="py-3 max-w-xs">
                          <p className="font-medium text-gray-800 truncate" title={nc.description}>{nc.description}</p>
                        </td>
                        <td className="py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${getPriorityColor(nc.priority)}`}>{nc.priority}</span></td>
                        <td className="py-3 text-gray-600">{getResponsibleName(nc.responsible_id)}</td>
                        <td className="py-3">
                          <span className={new Date(nc.due_date) < new Date() && nc.status !== 'cloture' ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {new Date(nc.due_date).toLocaleDateString('fr-FR')}
                            {new Date(nc.due_date) < new Date() && nc.status !== 'cloture' && ' (En retard)'}
                          </span>
                        </td>
                        <td className="py-3"><span className={`px-2 py-1 rounded text-xs ${getStatusColor(nc.status)}`}>{getStatusLabel(nc.status)}</span></td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleViewNc(nc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Voir"><Eye size={16} /></button>
                            <button onClick={() => handleEditNc(nc)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="Modifier"><Edit size={16} /></button>
                            {nc.status === 'ouvert' && <button onClick={() => handleUpdateStatus(nc.id, 'en_cours')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Commencer"><PlayCircle size={16} /></button>}
                            {nc.status === 'en_cours' && <button onClick={() => handleUpdateStatus(nc.id, 'cloture')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Clôturer"><CheckCircle size={16} /></button>}
                            <button onClick={() => handleCreateCapa(nc)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg" title="Créer CAPA"><AlertCircle size={16} /></button>
                            <button onClick={() => handleDeleteNc(nc.id, nc.reference)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'ged' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input type="text" placeholder="Rechercher un document..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500" />
                </div>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500">
                  <option value="all">Toutes les catégories</option>
                  {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
                <button onClick={() => setShowUploadModal(true)} className="px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors flex items-center gap-2">
                  <Upload size={20} /> Upload
                </button>
              </div>
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Aucun document trouvé</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocuments.map((doc) => (
                    <div key={doc.id} className="p-5 border border-gray-100 rounded-xl bg-white hover:shadow-lg transition-all cursor-pointer group" onClick={() => { setSelectedDocument(doc); setShowDocumentModal(true); }}>
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">{getFileIcon(doc.file_type)}</div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-gray-800 text-sm mb-1 truncate">{doc.name}</h5>
                          <p className="text-xs text-gray-500 mb-2">{categories.find(c => c.value === doc.category)?.label || doc.category}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{formatFileSize(doc.file_size)}</span><span>•</span><span>v{doc.version}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-gray-500">{new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}</p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); window.open(doc.file_url, '_blank'); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Télécharger"><Download size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          MODALES
      ========================================== */}
      
      {/* Modale Upload */}
      <Modal isOpen={showUploadModal} onClose={() => { setShowUploadModal(false); resetUploadForm(); }} title="Télécharger un document" size="lg">
        <form onSubmit={handleUploadDocument} className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
            <Upload className="text-purple-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-purple-800">Téléchargez vos documents qualité</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fichier *</label>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} required className="hidden" />
            {!uploadForm.file ? (
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer">
                <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm text-gray-600"><span className="font-medium text-purple-600">Cliquez pour sélectionner</span></p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(uploadForm.file.name.split('.').pop() || '')}
                    <div>
                      <p className="font-medium text-gray-800">{uploadForm.file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(uploadForm.file.size)}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setUploadForm({ ...uploadForm, file: null }); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom du document *</label>
              <input type="text" required value={uploadForm.name} onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
              <select required value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500">
                {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => { setShowUploadModal(false); resetUploadForm(); }} disabled={uploading} className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={uploading || !uploadForm.file} className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2">
              {uploading ? <><Loader className="animate-spin" size={20} />Téléchargement...</> : <><Upload size={20} />Télécharger</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modale Non-Conformité (Create / Edit / View) */}
      <Modal isOpen={showNcModal} onClose={() => { setShowNcModal(false); setSelectedNc(null); }} title={ncModalMode === 'create' ? "Nouvelle non-conformité" : ncModalMode === 'edit' ? "Modifier la non-conformité" : "Détails de la non-conformité"} size="lg">
        <NonConformiteForm nc={selectedNc} mode={ncModalMode} onSuccess={() => { setShowNcModal(false); setSelectedNc(null); toast.success('NC enregistrée'); loadData(); }} onCancel={() => { setShowNcModal(false); setSelectedNc(null); }} />
      </Modal>

      {/* Modale CAPA */}
      <Modal isOpen={showCapaModal} onClose={() => { setShowCapaModal(false); setSelectedNc(null); }} title="Créer une action CAPA" size="lg">
        {selectedNc && (
          <CAPAForm nc={selectedNc} mode="create" onSuccess={() => { setShowCapaModal(false); setSelectedNc(null); toast.success('Action CAPA créée avec succès'); }} onCancel={() => { setShowCapaModal(false); setSelectedNc(null); }} />
        )}
      </Modal>

      {/* Modale Audit */}
      <Modal isOpen={showAuditModal} onClose={() => setShowAuditModal(false)} title="Planifier un nouvel audit" size="lg">
        <AuditForm onSuccess={() => { setShowAuditModal(false); toast.success('Audit planifié'); loadData(); }} onCancel={() => setShowAuditModal(false)} />
      </Modal>

      {/* 🎯 Modale Détails Document (AJOUTÉE) */}
      <Modal isOpen={showDocumentModal} onClose={() => setShowDocumentModal(false)} title="Détails du document" size="md">
        {selectedDocument && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-sm">
                {getFileIcon(selectedDocument.file_type)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">{selectedDocument.name}</h3>
                <p className="text-sm text-gray-500">{categories.find(c => c.value === selectedDocument.category)?.label || selectedDocument.category}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Version</p>
                <p className="font-medium">v{selectedDocument.version}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Taille</p>
                <p className="font-medium">{formatFileSize(selectedDocument.file_size)}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Ajouté le</p>
                <p className="font-medium">{new Date(selectedDocument.uploaded_at).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Type</p>
                <p className="font-medium uppercase">{selectedDocument.file_type}</p>
              </div>
            </div>

            {selectedDocument.description && (
              <div>
                <p className="text-gray-500 mb-1 text-sm">Description</p>
                <p className="text-gray-800 bg-gray-50 p-3 rounded-lg text-sm">{selectedDocument.description}</p>
              </div>
            )}

            {selectedDocument.tags && selectedDocument.tags.length > 0 && (
              <div>
                <p className="text-gray-500 mb-2 text-sm">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDocument.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => window.open(selectedDocument.file_url, '_blank')}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Download size={18} />
                Télécharger
              </button>
              <button
                onClick={() => {
                  setShowDocumentModal(false);
                  handleDeleteDocument(selectedDocument);
                }}
                className="px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
                title="Supprimer"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
