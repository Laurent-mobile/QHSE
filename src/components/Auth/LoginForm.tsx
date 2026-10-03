import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../common/Toast';
import { LogIn, Loader } from 'lucide-react';
import { rateLimiter } from '../../lib/rateLimiter';

export function LoginForm() {
  const { signIn } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Rate limiting : 5 tentatives par minute
    if (!rateLimiter.canAttempt(`login_${email}`, 5, 60000)) {
      toast.error('Trop de tentatives', 'Veuillez réessayer dans 1 minute');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error('Erreur de connexion', 'Email ou mot de passe incorrect');
      } else {
        toast.success('Connexion réussie', 'Bienvenue sur Afri SafeTrack');
      }
    } catch (err) {
      toast.error('Erreur inattendue', 'Veuillez réessayer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Afri SafeTrack</h1>
            <p className="text-gray-600">Plateforme QHSE Intégrée</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="votreemail@exemple.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader className="animate-spin" size={20} /> : <LogIn size={20} />}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Première connexion ? Contactez votre administrateur</p>
          </div>
        </div>
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>© 2026 Afri SafeTrack - Tous droits réservés</p>
        </div>
      </div>
    </div>
  );
}
