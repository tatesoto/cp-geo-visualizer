import React, { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { AppConfig, Language } from '../types';
import { t } from '../constants/translations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface SettingsModalProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ config, onSave, onClose }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);

  const handleChange = (key: keyof AppConfig, value: string | number) => {
    if (key === 'language') {
        setLocalConfig(prev => ({ ...prev, language: value as Language }));
    } else {
        const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
        if (!isNaN(numValue)) {
            setLocalConfig(prev => ({ ...prev, [key]: numValue }));
        }
    }
  };

  const isHighExecution = localConfig.executionTimeout > 5000;
  const isHighRender = localConfig.renderTimeout > 500;
  const lang = localConfig.language;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-100 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-sm font-semibold text-gray-900">{t(lang, 'settings')}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-md hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Language */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700 block">
              {t(lang, 'language')}
            </label>
            <Select value={localConfig.language} onValueChange={(value) => handleChange('language', value)}>
              <SelectTrigger className="h-9 w-full text-sm text-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <hr className="border-gray-100" />

          {/* Execution Timeout */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700 flex justify-between">
              <span>{t(lang, 'executionTimeout')}</span>
              <span className="text-gray-400 font-normal">Default: 3000</span>
            </label>
            <input 
              type="number" 
              value={localConfig.executionTimeout}
              onChange={(e) => handleChange('executionTimeout', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
            />
            <p className="text-[10px] text-gray-500">
              {t(lang, 'executionTimeoutDesc')}
            </p>
            {isHighExecution && (
               <div className="flex items-start gap-2 text-amber-600 text-[11px] bg-amber-50 p-2 rounded border border-amber-100">
                  <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t(lang, 'executionTimeoutWarn')}</span>
               </div>
            )}
          </div>

          {/* Render Timeout */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700 flex justify-between">
              <span>{t(lang, 'renderTimeout')}</span>
              <span className="text-gray-400 font-normal">Default: 200</span>
            </label>
            <input 
              type="number" 
              value={localConfig.renderTimeout}
              onChange={(e) => handleChange('renderTimeout', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
            />
            <p className="text-[10px] text-gray-500">
              {t(lang, 'renderTimeoutDesc')}
            </p>
            {isHighRender && (
               <div className="flex items-start gap-2 text-amber-600 text-[11px] bg-amber-50 p-2 rounded border border-amber-100">
                  <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t(lang, 'renderTimeoutWarn')}</span>
               </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            {t(lang, 'cancel')}
          </button>
          <button 
            onClick={() => { onSave(localConfig); onClose(); }}
            className="px-4 py-2 text-xs font-medium text-white bg-black rounded-lg shadow-sm hover:bg-gray-800 transition-colors"
          >
            {t(lang, 'saveChanges')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
