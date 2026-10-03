// src/components/common/SignaturePad.tsx
import { useRef, useState, useEffect } from 'react';
import SignaturePadLib from 'signature_pad';
import { Pen, RotateCcw, Check, X } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel?: () => void;
  initialSignature?: string | null;
  penColor?: string;
}

export function SignaturePad({
  onSave,
  onCancel,
  initialSignature,
  penColor = '#059669'
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signaturePad, setSignaturePad] = useState<SignaturePadLib | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    if (canvasRef.current) {
      const pad = new SignaturePadLib(canvasRef.current, {
        penColor: penColor,
        minWidth: 1,
        maxWidth: 3,
      });
      setSignaturePad(pad);

      if (initialSignature) {
        pad.fromDataURL(initialSignature);
        setIsEmpty(pad.isEmpty());
      }

      pad.addEventListener('endStroke', () => {
        setIsEmpty(pad.isEmpty());
      });

      // Gestion du redimensionnement responsive
      const resizeCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext('2d')!.scale(ratio, ratio);
        
        if (initialSignature) {
          pad.fromDataURL(initialSignature);
        }
      };

      window.addEventListener('resize', resizeCanvas);
      setTimeout(resizeCanvas, 100); // Délai pour s'assurer que le DOM est rendu

      return () => {
        window.removeEventListener('resize', resizeCanvas);
        pad.off();
      };
    }
  }, [initialSignature, penColor]);

  const handleClear = () => {
    if (signaturePad) {
      signaturePad.clear();
      setIsEmpty(true);
    }
  };

  const handleSave = () => {
    if (signaturePad && !signaturePad.isEmpty()) {
      onSave(signaturePad.toDataURL('image/png'));
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-2 bg-gray-50 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-48 bg-white rounded-lg cursor-crosshair touch-none"
        />
        <div className="absolute bottom-8 left-8 right-8 border-b border-gray-300 pointer-events-none" />
        <div className="absolute bottom-2 left-8 text-xs text-gray-400 pointer-events-none">
          Signez ici
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Pen size={14} />
          <span>Utilisez votre souris ou votre doigt</span>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <RotateCcw size={14} />
          Effacer
        </button>
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <X size={16} />
            Annuler
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty}
          className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          <Check size={16} />
          Valider la signature
        </button>
      </div>
    </div>
  );
}
