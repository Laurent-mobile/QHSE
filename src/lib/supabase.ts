import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 🚨 AJOUTEZ CES LIGNES POUR LE DÉBOGAGE :
console.log('🔍 DEBUG - URL Supabase:', supabaseUrl);
console.log('🔍 DEBUG - Clé Supabase:', supabaseAnonKey ? 'PRÉSENTE (masquée)' : 'MANQUANTE ❌');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Variables d\'environnement Supabase manquantes. Vérifiez votre fichier .env à la racine du projet.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
