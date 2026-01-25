import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import Visualizer, { VisualizerHandle } from './components/Visualizer';
import ObjectList from './components/ObjectList';
import Header from './components/Header';
import VisualizerControls from './components/VisualizerControls';
import { ShapeType, AppConfig } from './types';
import { useGeometryData } from './hooks/useGeometryData';
import { useImageExport } from './hooks/useImageExport';
import { t } from './constants/translations';

const EditorPanel = lazy(() => import('./components/EditorPanel'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const ReferenceModal = lazy(() => import('./components/ReferenceModal'));

function App() {
  const OBJECT_LIST_WARN_THRESHOLD = 1000;
  // Configuration State
  const [config, setConfig] = useState<AppConfig>({
    executionTimeout: 3000,
    renderTimeout: 200,
    language: 'en',
    idIndexBase: 0
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
  const [areControlsVisible, setAreControlsVisible] = useState(true);

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

  const getObjectListCount = () => {
    if (!activeGroupId) return parsedShapes.length;
    let count = 0;
    for (const shape of parsedShapes) {
      if (shape.groupId === activeGroupId) count += 1;
    }
    return count;
  };

  const handleToggleObjectList = () => {
    if (isObjectListOpen) {
      setIsObjectListOpen(false);
      return;
    }
    const count = getObjectListCount();
    if (count >= OBJECT_LIST_WARN_THRESHOLD) {
      const countLabel = config.language === 'ja'
        ? `${count}${t(config.language, 'objects')}`
        : `${count} ${t(config.language, 'objects')}`;
      const confirmMessage = `${t(config.language, 'objectListHeavyConfirm')} (${countLabel})`;
      if (!window.confirm(confirmMessage)) return;
    }
    setIsObjectListOpen(true);
  };

  return (
    <div className="flex flex-col h-screen supports-[height:100svh]:h-[100svh] bg-gray-50 text-gray-900 font-sans fixed inset-0 overflow-hidden">
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenReference={() => setIsReferenceOpen(true)}
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
          <Suspense
            fallback={(
              <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
                {t(config.language, 'processing')}
              </div>
            )}
          >
            <EditorPanel
              isOpen={isEditorOpen}
              onToggle={() => setIsEditorOpen(!isEditorOpen)}
              formatText={formatText}
              setFormatText={setFormatText}
              inputText={inputText}
              setInputText={setInputText}
              onParse={() => {
                if (isObjectListOpen) {
                  setIsObjectListOpen(false);
                }
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
          </Suspense>
        </div>

        {/* Right Panel: Visualization & Object List */}
        <div className={`
            ${activeMobileTab === 'visualizer' ? 'flex flex-col' : 'hidden'}
            md:flex md:flex-row flex-1 overflow-hidden bg-white relative
        `}>
          <div className="flex-1 relative min-w-0 min-h-0">
            <Visualizer
              ref={visualizerRef}
              shapes={parsedShapes}
              highlightedShapeId={selectedShapeId}
              visibleIdTypes={visibleIdTypes}
              activeGroupId={activeGroupId}
              renderTimeout={config.renderTimeout}
              idIndexBase={config.idIndexBase}
              lang={config.language}
            />

            <VisualizerControls
              visibleIdTypes={visibleIdTypes}
              onToggleIdType={toggleIdType}
              idIndexBase={config.idIndexBase}
              onChangeIdIndexBase={(base) => setConfig(prev => ({ ...prev, idIndexBase: base }))}
              onResetView={() => visualizerRef.current?.resetView()}
              availableGroups={availableGroups}
              activeGroupId={activeGroupId}
              onSelectGroup={setActiveGroupId}
              isObjectListOpen={isObjectListOpen}
              onToggleObjectList={handleToggleObjectList}
              onSaveImage={handleSaveImage}
              onShareBlob={generateImageBlob}
              isVisible={areControlsVisible}
              onToggleVisible={() => setAreControlsVisible(prev => !prev)}
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
              idIndexBase={config.idIndexBase}
              lang={config.language}
            />
          )}
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden h-14 bg-white border-t border-gray-200 flex items-center justify-around shrink-0 z-50 pb-[env(safe-area-inset-bottom)]">
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
        <Suspense fallback={null}>
          <SettingsModal
            config={config}
            onSave={setConfig}
            onClose={() => setIsSettingsOpen(false)}
          />
        </Suspense>
      )}

      {isReferenceOpen && (
        <Suspense fallback={null}>
          <ReferenceModal
            onClose={() => setIsReferenceOpen(false)}
            lang={config.language}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
