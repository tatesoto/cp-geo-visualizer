import React from 'react';
import { ListBulletIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  isObjectListOpen: boolean;
  setIsObjectListOpen: (isOpen: boolean) => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ isObjectListOpen, setIsObjectListOpen, onOpenSettings }) => {
  return (
    <header className="h-12 border-b border-gray-100 flex items-center justify-between px-4 bg-white/80 backdrop-blur-sm z-20 sticky top-0">
      <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 19H22L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="13" r="3" fill="white"/>
              </svg>
          </div>
          <h1 className="font-medium text-sm tracking-tight text-gray-900">Geometry Visualizer</h1>
      </div>
      
      <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-all"
            title="Settings"
          >
            <Cog6ToothIcon className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1"></div>
          <button
             onClick={() => setIsObjectListOpen(!isObjectListOpen)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                 isObjectListOpen 
                 ? 'bg-gray-100 text-gray-900 border-gray-200' 
                 : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-sm'
             }`}
          >
             <ListBulletIcon className="w-4 h-4" />
             <span className="hidden sm:inline">Object List</span>
          </button>
      </div>
    </header>
  );
};

export default Header;