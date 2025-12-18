import { useState, useEffect, useRef, useMemo } from 'react';
import Visualizer, { VisualizerHandle } from './components/Visualizer';
import ObjectList from './components/ObjectList';
import Header from './components/Header';
import EditorPanel from './components/EditorPanel';
import VisualizerControls from './components/VisualizerControls';
import SettingsModal from './components/SettingsModal';
import ReferenceModal from './components/ReferenceModal';
import { ShapeType, AppConfig } from './types';
import { useGeometryData } from './hooks/useGeometryData';
import { useImageExport } from './hooks/useImageExport';

function App() {
  // Configuration State
  const [config, setConfig] = useState<AppConfig>({
    executionTimeout: 3000,
    renderTimeout: 200,
    language: 'en'
  } as AppConfig);

  // Custom Hooks for Data & Actions
  const {
    inputText,
    setInputText,
    formatText,
    setFormatText,
    parsedShapes,
    error,
    isParsing,
    handleParse
  } = useGeometryData(config.executionTimeout);

  const visualizerRef = useRef<VisualizerHandle>(null);
  const { handleSaveImage, generateImageBlob } = useImageExport(visualizerRef);

  // UI State
  const [isObjectListOpen, setIsObjectListOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [visibleIdTypes, setVisibleIdTypes] = useState<ShapeType[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Mobile Tab State
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'visualizer'>('editor');

  // Extract Groups
  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    parsedShapes.forEach(s => {
      if (s.groupId) groups.add(s.groupId);
    });
    return Array.from(groups);
  }, [parsedShapes]);

  // Re-parse when timeout setting changes if there is an error (likely timeout error)
  useEffect(() => {
    if (error && error.includes('timed out')) {
      handleParse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.executionTimeout]);

  // Reset selection when shapes change
  useEffect(() => {
    setSelectedShapeId(null);
    // If the current active group no longer exists, reset it (optional, maybe keep it if user is typing)
    if (activeGroupId && !availableGroups.includes(activeGroupId)) {
      setActiveGroupId(null);
    }
  }, [parsedShapes, availableGroups, activeGroupId]);

  const toggleSelection = (id: string | null) => {
    setSelectedShapeId(prev => prev === id ? null : id);
  };

  const toggleIdType = (type: ShapeType) => {
    setVisibleIdTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleLanguage = () => {
    setConfig(prev => ({
      ...prev,
      language: prev.language === 'en' ? 'ja' : 'en'
    }));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans fixed inset-0 overflow-hidden">
      <Header
        isObjectListOpen={isObjectListOpen}
        setIsObjectListOpen={setIsObjectListOpen}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenReference={() => setIsReferenceOpen(true)}
        onSaveImage={handleSaveImage}
        onShareBlob={generateImageBlob}
        onToggleLanguage={toggleLanguage}
        lang={config.language}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Editor */}
        {/* On mobile: hidden if not active tab. On desktop: always flex (controlled by internal open state, but we handle container here) */}
        <div className={`
            ${activeMobileTab === 'editor' ? 'flex' : 'hidden'} 
            md:flex flex-col h-full 
            ${isEditorOpen ? 'md:w-auto' : 'hidden md:flex md:w-auto'} 
            absolute inset-0 md:static z-10 bg-white md:bg-transparent
        `}>
          <EditorPanel
            isOpen={isEditorOpen}
            onToggle={() => setIsEditorOpen(!isEditorOpen)}
            formatText={formatText}
            setFormatText={setFormatText}
            inputText={inputText}
            setInputText={setInputText}
            onParse={() => {
              handleParse();
              // On mobile, auto-switch to visualizer on parse if successful (or even if not, to show error? No, error is in editor)
              if (window.innerWidth < 768) {
                setActiveMobileTab('visualizer');
              }
            }}
            error={error}
            isParsing={isParsing}
            lang={config.language}
          />
        </div>

        {/* Right Panel: Visualization & Object List */}
        <div className={`
            ${activeMobileTab === 'visualizer' ? 'flex' : 'hidden'}
            md:flex flex-1 overflow-hidden bg-white relative
        `}>
          <div className="flex-1 relative min-w-0">
            <Visualizer
              ref={visualizerRef}
              shapes={parsedShapes}
              highlightedShapeId={selectedShapeId}
              visibleIdTypes={visibleIdTypes}
              activeGroupId={activeGroupId}
              renderTimeout={config.renderTimeout}
              lang={config.language}
            />

            <VisualizerControls
              visibleIdTypes={visibleIdTypes}
              onToggleIdType={toggleIdType}
              onResetView={() => visualizerRef.current?.resetView()}
              availableGroups={availableGroups}
              activeGroupId={activeGroupId}
              onSelectGroup={setActiveGroupId}
              lang={config.language}
            />
          </div>

          {/* Slide-in Object List */}
          {isObjectListOpen && (
            <ObjectList
              shapes={parsedShapes}
              highlightedShapeId={selectedShapeId}
              onSelectShape={toggleSelection}
              onClose={() => setIsObjectListOpen(false)}
              activeGroupId={activeGroupId}
              availableGroups={availableGroups}
              onSelectGroup={setActiveGroupId}
              lang={config.language}
            />
          )}
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden h-14 bg-white border-t border-gray-200 flex items-center justify-around shrink-0 z-50 pb-safe">
        <button
          onClick={() => setActiveMobileTab('editor')}
          className={`flex flex-col items-center justify-center w-full h-full ${activeMobileTab === 'editor' ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span className="text-[10px] font-medium mt-0.5">Editor</span>
        </button>
        <button
          onClick={() => setActiveMobileTab('visualizer')}
          className={`flex flex-col items-center justify-center w-full h-full ${activeMobileTab === 'visualizer' ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="text-[10px] font-medium mt-0.5">Visualizer</span>
        </button>
      </div>

      {/* Modals */}
      {isSettingsOpen && (
        <SettingsModal
          config={config}
          onSave={setConfig}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isReferenceOpen && (
        <ReferenceModal
          onClose={() => setIsReferenceOpen(false)}
          lang={config.language}
        />
      )}
    </div>
  );
}

export default App;