// src/lib/rateLimiter.ts

class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  /**
   * Vérifie si une action est autorisée en fonction du nombre de tentatives dans une fenêtre de temps.
   * @param key Identifiant unique (ex: email de l'utilisateur ou adresse IP)
   * @param maxAttempts Nombre maximum de tentatives autorisées
   * @param windowMs Fenêtre de temps en millisecondes (ex: 60000 pour 1 minute)
   * @returns true si l'action est autorisée, false sinon
   */
  canAttempt(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Ne garder que les tentatives récentes (dans la fenêtre de temps)
    const recent = attempts.filter(t => now - t < windowMs);
    
    if (recent.length >= maxAttempts) {
      return false; // Trop de tentatives
    }
    
    // Enregistrer la nouvelle tentative
    recent.push(now);
    this.attempts.set(key, recent);
    return true;
  }

  /**
   * Réinitialise le compteur pour une clé donnée (utile après une connexion réussie)
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();
