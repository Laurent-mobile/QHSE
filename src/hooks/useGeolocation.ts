// src/hooks/useGeolocation.ts
import { useState, useEffect, useCallback, useRef } from 'react';

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  address?: string;
  country?: string;
  city?: string;
  formattedAddress?: string;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  autoReverseGeocode?: boolean;
  watchPosition?: boolean;
}

interface UseGeolocationReturn {
  location: Location | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
  clearLocation: () => void;
}

export function useGeolocation(
  options: UseGeolocationOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
    autoReverseGeocode: true,
    watchPosition: false,
  }
): UseGeolocationReturn {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Reverse geocoding via Nominatim (OpenStreetMap - gratuit)
  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'fr',
            // Nominatim exige un User-Agent personnalisé
            'User-Agent': 'AfriSafeTrack/1.0 (https://afrisafetrack.app)',
          },
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.display_name || null;
    } catch (err) {
      console.warn('Reverse geocoding failed:', err);
      return null;
    }
  }, []);

  // Récupérer la position actuelle
  const getCurrentPosition = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const loc: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
        };

        // Reverse geocoding automatique
        if (options.autoReverseGeocode) {
          const address = await reverseGeocode(loc.latitude, loc.longitude);
          if (address) {
            loc.formattedAddress = address;
          }
        }

        setLocation(loc);
        setLoading(false);
      },
      (err) => {
        let errorMessage = 'Impossible d\'obtenir la position';
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Permission de géolocalisation refusée. Veuillez l\'autoriser dans les paramètres du navigateur.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Position indisponible. Vérifiez que le GPS est activé.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Délai d\'attente dépassé. Veuillez réessayer.';
            break;
        }
        
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: options.timeout,
        maximumAge: options.maximumAge,
      }
    );
  }, [options, reverseGeocode]);

  // Watch position (suivi continu)
  useEffect(() => {
    if (options.watchPosition && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const loc: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
          };

          if (options.autoReverseGeocode) {
            const address = await reverseGeocode(loc.latitude, loc.longitude);
            if (address) loc.formattedAddress = address;
          }

          setLocation(loc);
        },
        (err) => {
          console.warn('Watch position error:', err);
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeout,
          maximumAge: options.maximumAge,
        }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [options, reverseGeocode]);

  const refresh = useCallback(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return {
    location,
    error,
    loading,
    refresh,
    clearLocation,
  };
}
