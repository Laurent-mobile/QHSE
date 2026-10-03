import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { MessageSquare, Send, Paperclip, User } from 'lucide-react';
import { useToast } from '../common/Toast';

interface Comment {
  id: string;
  incident_id: string;
  user_id: string;
  content: string;
  attachments: string[];
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export function IncidentTimeline({ incidentId }: { incidentId: string }) {
  const { profile } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComments();
    
    // Écouter les nouveaux commentaires en temps réel
    const channel = supabase
      .channel(`comments-${incidentId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'incident_comments', 
          filter: `incident_id=eq.${incidentId}` 
        },
        (payload) => {
          setComments(prev => [...prev, payload.new as Comment]);
          toast.info('Nouveau commentaire ajouté');
        }
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [incidentId]);

  const loadComments = async () => {
    const { data } = await supabase
      .from('incident_comments')
      .select('*, profiles(full_name, email)')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true });
    
    setComments(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('incident_comments').insert({
        incident_id: incidentId,
        user_id: profile?.id,
        content: newComment,
      });

      if (error) throw error;

      setNewComment('');
      toast.success('Commentaire ajouté');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du commentaire');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold flex items-center gap-2">
        <MessageSquare size={18} /> Historique & Commentaires
      </h4>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Aucun commentaire pour le moment
          </p>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {c.profiles?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm">{c.profiles?.full_name}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Ajouter un commentaire..."
          className="flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-emerald-500"
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={loading || !newComment.trim()}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
