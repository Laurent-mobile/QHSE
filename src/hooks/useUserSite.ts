// src/hooks/useUserSite.ts
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface UserSite {
  site_id: string;
  site_name: string;
  site_code: string;
}

const SITES_CACHE_KEY = 'afri_safetrack_sites_cache';
const CURRENT_SITE_KEY = 'afri_current_site_id';

export function useUserSite() {
  const { user } = useAuth();
  const [userSite, setUserSite] = useState<UserSite | null>(() => {
    // Charger le site actuel depuis le cache
    const savedSiteId = sessionStorage.getItem(CURRENT_SITE_KEY);
    const cachedSites = sessionStorage.getItem(SITES_CACHE_KEY);
    if (savedSiteId && cachedSites) {
      const sites: UserSite[] = JSON.parse(cachedSites);
      return sites.find(s => s.site_id === savedSiteId) || null;
    }
    return null;
  });
  
  const [loading, setLoading] = useState(true);
  const [allSites, setAllSites] = useState<UserSite[]>(() => {
    // Charger tous les sites depuis le cache
    const cachedSites = sessionStorage.getItem(SITES_CACHE_KEY);
    if (cachedSites) {
      return JSON.parse(cachedSites);
    }
    return [];
  });
  
  const loadedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      setUserSite(null);
      setAllSites([]);
      sessionStorage.removeItem(SITES_CACHE_KEY);
      sessionStorage.removeItem(CURRENT_SITE_KEY);
      setLoading(false);
      loadedForUserRef.current = null;
      return;
    }

    // Ne recharger que si l'utilisateur a changé
    if (loadedForUserRef.current === user.id && allSites.length > 0) {
      setLoading(false);
      return;
    }

    loadUserSites();
  }, [user?.id]);

  async function loadUserSites() {
    if (!user) return;
    
    try {
      setLoading(true);
      loadedForUserRef.current = user.id;

      // 1. Récupérer les liens user_sites
      const { data: userSites, error: userSitesError } = await supabase
        .from('user_sites')
        .select('site_id')
        .eq('user_id', user.id);

      if (userSitesError) {
        console.error('Erreur user_sites:', userSitesError);
        throw userSitesError;
      }

      if (!userSites || userSites.length === 0) {
        setAllSites([]);
        setLoading(false);
        return;
      }

      const siteIds = userSites.map(us => us.site_id);

      // 2. Récupérer les détails des sites
      const { data: sites, error: sitesError } = await supabase
        .from('sites')
        .select('id, name, code')
        .in('id', siteIds);

      if (sitesError) {
        console.error('Erreur sites:', sitesError);
        throw sitesError;
      }

      const sitesWithInfo: UserSite[] = (sites || []).map(site => ({
        site_id: site.id,
        site_name: site.name,
        site_code: site.code || ''
      }));

      setAllSites(sitesWithInfo);
      
      // 🚨 SAUVEGARDE DANS LE CACHE
      sessionStorage.setItem(SITES_CACHE_KEY, JSON.stringify(sitesWithInfo));

      // 3. Définir le site actuel
      const savedSiteId = sessionStorage.getItem(CURRENT_SITE_KEY);
      let currentSite = sitesWithInfo.find(s => s.site_id === savedSiteId);

      if (!currentSite && sitesWithInfo.length > 0) {
        currentSite = sitesWithInfo[0];
      }

      if (currentSite) {
        setUserSite(currentSite);
        sessionStorage.setItem(CURRENT_SITE_KEY, currentSite.site_id);
      }
    } catch (error) {
      console.error('Error loading user sites:', error);
      loadedForUserRef.current = null;
      
      // En cas d'erreur, essayer de charger depuis le cache
      const cachedSites = sessionStorage.getItem(SITES_CACHE_KEY);
      if (cachedSites) {
        const sites: UserSite[] = JSON.parse(cachedSites);
        setAllSites(sites);
        const savedSiteId = sessionStorage.getItem(CURRENT_SITE_KEY);
        const cachedSite = sites.find(s => s.site_id === savedSiteId);
        if (cachedSite) {
          setUserSite(cachedSite);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function switchSite(siteId: string) {
    const site = allSites.find(s => s.site_id === siteId);
    if (site) {
      setUserSite(site);
      sessionStorage.setItem(CURRENT_SITE_KEY, site.site_id);
      
      // Déclencher l'événement pour que les modules se rafraîchissent
      window.dispatchEvent(new CustomEvent('siteChanged', { detail: siteId }));
      console.log(`✅ Site changé vers : ${site.site_name}`);
    }
  }

  return { userSite, loading, allSites, switchSite };
}
