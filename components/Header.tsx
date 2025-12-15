import React from 'react';
import { ListBulletIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  isObjectListOpen: boolean;
  setIsObjectListOpen: (isOpen: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ isObjectListOpen, setIsObjectListOpen }) => {
  return (
    <header className="h-14 border-b border-slate-800 flex items-center px-6 bg-slate-900 justify-between shrink-0 z-10">
      <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center">
              <span className="font-bold text-white text-xs">CP</span>
          </div>
          <h1 className="font-bold text-lg tracking-tight">GeoVisualizer</h1>
      </div>
      
      <div className="flex items-center gap-4">
          <button
             onClick={() => setIsObjectListOpen(!isObjectListOpen)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold border transition-all ${isObjectListOpen ? 'bg-blue-600/20 text-blue-300 border-blue-600/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}
          >
             <ListBulletIcon className="w-4 h-4" />
             Objects
          </button>
      </div>
    </header>
  );
};

export default Header;