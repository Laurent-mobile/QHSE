import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Loader } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onClose, onError }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  
  // ID stable pour éviter les réinitialisations du DOM
  const scannerId = useRef('qr-reader-' + Math.random().toString(36).substring(7)).current;

  useEffect(() => {
    let isMounted = true;
    let scanner: Html5Qrcode | null = null;
    
    const startScanner = async () => {
      try {
        setStarting(true);
        scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Empêcher les scans multiples et marquer comme arrêté
            if (isMounted && isScanningRef.current) {
              isScanningRef.current = false; 
              onScan(decodedText);
              
              // Arrêter le scanner après un scan réussi
              if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
              }
            }
          },
          () => {
            // Erreur de détection ignorée (comportement normal)
          }
        );
        
        if (isMounted) {
          isScanningRef.current = true;
          setStarting(false);
        }
      } catch (err: any) {
        if (isMounted) {
          const errorMsg = err?.message || 'Impossible d\'accéder à la caméra. Vérifiez les permissions.';
          setError(errorMsg);
          setStarting(false);
          onError?.(errorMsg);
        }
      }
    };

    startScanner();

    // 🛡️ Fonction de nettoyage ultra-défensive
    return () => {
      isMounted = false;
      
      // Ne tenter d'arrêter que si le scanner est encore considéré comme "en cours de scan"
      // (Si un scan a réussi, nous l'avons déjà arrêté et isScanningRef est à false)
      if (scannerRef.current && isScanningRef.current) {
        isScanningRef.current = false; // Verrouillage immédiat
        try {
          const stopResult = scannerRef.current.stop();
          if (stopResult && typeof stopResult.catch === 'function') {
            stopResult.catch(() => {});
          }
        } catch (e) {
          // Ignorer les erreurs synchrones de stop()
        }
      }
      
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          // Ignorer les erreurs de clear()
        }
        scannerRef.current = null;
      }
    };
  }, []); // Tableau vide : ne s'exécute qu'au montage/démontage

  return (
    <div className="space-y-4">
      <div className="relative">
        <div 
          id={scannerId} 
          className="rounded-xl overflow-hidden bg-black min-h-[300px]"
        />
        
        {starting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-xl">
            <div className="text-center text-white">
              <Loader className="animate-spin mx-auto mb-2" size={32} />
              <p className="text-sm">Initialisation de la caméra...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-xl">
            <div className="text-center text-white p-4">
              <Camera size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-2">Erreur d'accès à la caméra</p>
              <p className="text-xs text-gray-300">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
        <p className="text-sm text-blue-800 text-center">
          📱 Pointez la caméra vers un QR code d'équipement, de badge visiteur ou d'EPI
        </p>
      </div>

      <button
        onClick={onClose}
        className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium"
      >
        <X size={18} /> Fermer le scanner
      </button>
    </div>
  );
}
