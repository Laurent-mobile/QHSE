import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../common/Toast';
import { MessageSquare, Send, Lock, Globe, Clock, Trash2 } from 'lucide-react';

interface Comment {
  id: string;
  incident_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  profiles?: { full_name: string; role: string };
}

interface IncidentCommentsProps {
  incidentId: string;
}

export function IncidentComments({ incidentId }: IncidentCommentsProps) {
  const { user } = useAuth();
  const toast = useToast();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // 1. Chargement initial des commentaires
  const loadComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('incident_comments')
        .select(`
          id, incident_id, user_id, content, is_internal, created_at,
          profiles:user_id (full_name, role)
        `)
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error('Erreur chargement commentaires:', error);
      toast.error('Erreur', 'Impossible de charger les commentaires');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();

    // 2. Abonnement Realtime
    const channel = supabase
      .channel(`comments-realtime-${incidentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incident_comments',
          filter: `incident_id=eq.${incidentId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCommentData = payload.new as any;
            
            // Récupérer le profil de l'auteur du nouveau commentaire
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, role')
              .eq('id', newCommentData.user_id)
              .single();
            
            setComments(prev => [...prev, { ...newCommentData, profiles: profileData }]);
            
            // Notification si ce n'est pas notre propre commentaire
            if (newCommentData.user_id !== user?.id) {
              toast.info('Nouveau commentaire', `${profileData?.full_name || 'Quelqu\'un'} a ajouté un commentaire`);
            }
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incidentId, user?.id]);

  // 3. Soumission d'un nouveau commentaire (SANS balise <form>)
  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('incident_comments').insert({
        incident_id: incidentId,
        user_id: user.id,
        content: newComment.trim(),
        is_internal: isInternal,
      });

      if (error) throw error;

      setNewComment('');
      setIsInternal(false);
      toast.success('Commentaire ajouté');
    } catch (error: any) {
      toast.error('Erreur', error.message || 'Impossible d\'ajouter le commentaire');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Suppression d'un commentaire
  const handleDelete = async (commentId: string) => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    try {
      const { error } = await supabase.from('incident_comments').delete().eq('id', commentId);
      if (error) throw error;
      toast.success('Commentaire supprimé');
    } catch (error: any) {
      toast.error('Erreur', error.message);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const diffMins = Math.floor((new Date().getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full max-h-[500px]">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <MessageSquare size={18} className="text-emerald-600" />
          Commentaires
          <span className="text-xs font-normal text-gray-500">({comments.length})</span>
        </h3>
        <div className="flex items-center gap-1 text-xs text-emerald-600">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Temps réel
        </div>
      </div>

      {/* Liste des commentaires */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <MessageSquare size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Aucun commentaire pour le moment</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isOwnComment = comment.user_id === user?.id;
            return (
              <div 
                key={comment.id} 
                className={`p-3 rounded-xl border ${
                  comment.is_internal 
                    ? 'bg-orange-50 border-orange-200' 
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {comment.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {comment.profiles?.full_name || 'Utilisateur'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock size={12} />
                        {formatTimeAgo(comment.created_at)}
                        {comment.is_internal && (
                          <span className="flex items-center gap-1 text-orange-600 font-medium">
                            <Lock size={10} /> Interne
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {isOwnComment && (
                    <button 
                      onClick={() => handleDelete(comment.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                
                <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            );
          })
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* 🎯 CORRECTION : Remplacer <form> par <div> pour éviter l'imbrication */}
      <div className="pt-4 border-t border-gray-200">
        <div className="relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              // Permettre l'envoi avec Ctrl+Entrée ou Cmd+Entrée
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                handleSubmit();
              }
            }}
            placeholder="Ajouter un commentaire... (Ctrl+Entrée pour envoyer)"
            rows={2}
            maxLength={5000}
            className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-sm"
            disabled={submitting}
          />
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            {isInternal ? (
              <span className="flex items-center gap-1 text-orange-600 font-medium">
                <Lock size={12} /> Commentaire interne
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-500">
                <Globe size={12} /> Public
              </span>
            )}
          </label>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm transition-colors"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Send size={16} />
            )}
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
