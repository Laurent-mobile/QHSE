// src/components/common/SignatureView.tsx
import { Calendar, User } from 'lucide-react';

interface SignatureViewProps {
  signature: string;
  signatureDate?: string | null;
  signerName?: string | null;
}

export function SignatureView({ signature, signatureDate, signerName }: SignatureViewProps) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
      <div className="flex items-start gap-4">
        {/* Signature image */}
        <div className="bg-white border border-emerald-200 rounded-lg p-2 flex-shrink-0">
          <img
            src={signature}
            alt="Signature électronique"
            className="h-20 max-w-[200px] object-contain"
          />
        </div>
        
        {/* Informations */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <p className="text-sm font-semibold text-emerald-800">
              Signature électronique validée
            </p>
          </div>
          
          {signerName && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 mb-1">
              <User size={14} />
              <span>{signerName}</span>
            </div>
          )}
          
          {signatureDate && (
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <Calendar size={12} />
              <span>
                Signé le {new Date(signatureDate).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
