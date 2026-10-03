import { Construction } from 'lucide-react';

interface PlaceholderModuleProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function PlaceholderModule({ title, description, icon }: PlaceholderModuleProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16">
      <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
        {icon || <Construction className="text-gray-400" size={48} />}
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-500 text-center max-w-md mb-6">{description}</p>
      <div className="inline-flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        Module en développement
      </div>
    </div>
  );
}
