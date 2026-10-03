import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Filet de sécurité de 5 secondes
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Auth timeout - déblocage forcé');
        setLoading(false);
      }
    }, 5000);

    async function init() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Requête simple et directe (maintenant instantanée grâce au RLS désactivé)
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();

          if (mounted) {
            if (data) {
              setProfile(data);
            } else {
              // Profil de secours si inexistant
              setProfile({
                id: currentUser.id,
                email: currentUser.email || '',
                full_name: currentUser.user_metadata?.full_name || 'Utilisateur',
                role: 'employe',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as Profile);
            }
          }
        }
      } catch (err) {
        console.error('Auth error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(timeout);
        }
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      if (_event === 'INITIAL_SESSION') return; // Ignorer l'initialisation déjà gérée

      setSession(newSession);
      const newUser = newSession?.user ?? null;
      setUser(newUser);
      
      if (newUser) {
         supabase.from('profiles').select('*').eq('id', newUser.id).maybeSingle().then(({ data }) => {
            if (mounted) {
               setProfile(data || {
                id: newUser.id,
                email: newUser.email || '',
                full_name: newUser.user_metadata?.full_name || 'Utilisateur',
                role: 'employe',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as Profile);
            }
         });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
