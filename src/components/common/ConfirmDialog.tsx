import { createContext, useContext, useState, ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Modal } from './Modal'; // Assurez-vous que le chemin est correct

export interface ConfirmOptions {
  title: string;
  message: string;
  variant?: 'warning' | 'danger' | 'info';
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  // 🎯 Cette fonction est ce que useConfirm() doit retourner
  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  };

  const handleClose = (result: boolean) => {
    setIsOpen(false);
    setOptions(null);
    if (resolvePromise) {
      resolvePromise(result);
      setResolvePromise(null);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      
      {isOpen && options && (
        <Modal isOpen={isOpen} onClose={() => handleClose(false)} title={options.title} size="sm">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full flex-shrink-0 ${
                options.variant === 'danger' ? 'bg-red-100 text-red-600' : 
                options.variant === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
              }`}>
                <AlertTriangle size={24} />
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{options.message}</p>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {options.cancelText || 'Annuler'}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${
                  options.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
                  options.variant === 'warning' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {options.confirmText || 'Confirmer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

// 🎯 Export qui garantit le retour de la fonction, pas d'un objet
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm doit être utilisé à l\'intérieur d\'un ConfirmProvider');
  }
  return context.confirm; 
}
