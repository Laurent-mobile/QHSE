// src/components/common/LocationDisplay.tsx
import { MapPin, RefreshCw, Loader, AlertCircle, Navigation } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useEffect } from 'react';

interface LocationDisplayProps {
  onLocationChange?: (location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address: string | null;
  } | null) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
  required?: boolean;
}

export function LocationDisplay({ onLocationChange, initialLocation, required = false }: LocationDisplayProps) {
  const { location, error, loading, refresh } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    autoReverseGeocode: true,
  });

  // Notifier le parent quand la position change
  useEffect(() => {
    if (location && onLocationChange) {
      onLocationChange({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        address: location.formattedAddress || null,
      });
    }
  }, [location, onLocationChange]);

  // Récupération automatique au montage
  useEffect(() => {
    if (!initialLocation) {
      refresh();
    }
  }, []);

  const displayLocation = initialLocation || location;

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy < 10) return 'text-emerald-600 bg-emerald-50';
    if (accuracy < 50) return 'text-blue-600 bg-blue-50';
    if (accuracy < 100) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getAccuracyLabel = (accuracy: number) => {
    if (accuracy < 10) return 'Excellente';
    if (accuracy < 50) return 'Bonne';
    if (accuracy < 100) return 'Moyenne';
    return 'Faible';
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            {loading ? (
              <Loader className="text-blue-500 animate-spin" size={20} />
            ) : (
              <MapPin className="text-blue-500" size={20} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-blue-900">
                Localisation GPS {required && <span className="text-red-500">*</span>}
              </p>
              {displayLocation && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${getAccuracyColor(displayLocation.accuracy)}`}>
                  {getAccuracyLabel(displayLocation.accuracy)}
                </span>
              )}
            </div>

            {loading && !displayLocation && (
              <p className="text-xs text-blue-700">Acquisition du signal GPS...</p>
            )}

            {error && !displayLocation && (
              <div className="flex items-start gap-2 text-xs text-orange-700">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {displayLocation && (
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center gap-2 text-xs text-blue-800">
                  <Navigation size={12} className="flex-shrink-0" />
                  <span className="font-mono">
                    {displayLocation.latitude.toFixed(6)}, {displayLocation.longitude.toFixed(6)}
                  </span>
                </div>
                
                {displayLocation.formattedAddress && (
                  <p className="text-xs text-blue-700 leading-relaxed">
                    📍 {displayLocation.formattedAddress}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-blue-600 pt-1">
                  <span>Précision: ±{Math.round(displayLocation.accuracy)}m</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 flex-shrink-0"
          title="Actualiser la position"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>
    </div>
  );
}
