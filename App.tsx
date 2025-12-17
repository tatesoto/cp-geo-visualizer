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
  const [config, setConfig] = useState<AppConfig>(({
      executionTimeout: 3000,
      renderTimeout: 200,
      language: 'en'
  } as AppConfig));

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
  const { handleSaveImage } = useImageExport(visualizerRef);

  // UI State
  const [isObjectListOpen, setIsObjectListOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [visibleIdTypes, setVisibleIdTypes] = useState<ShapeType[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

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
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
      <Header 
        isObjectListOpen={isObjectListOpen} 
        setIsObjectListOpen={setIsObjectListOpen}
        onOpenSettings={() => setIsSettingsOpen(true)} 
        onOpenReference={() => setIsReferenceOpen(true)}
        onSaveImage={handleSaveImage}
        onToggleLanguage={toggleLanguage}
        lang={config.language}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Editor */}
        <EditorPanel 
            isOpen={isEditorOpen}
            onToggle={() => setIsEditorOpen(!isEditorOpen)}
            formatText={formatText}
            setFormatText={setFormatText}
            inputText={inputText}
            setInputText={setInputText}
            onParse={handleParse}
            error={error}
            isParsing={isParsing}
            lang={config.language}
        />

        {/* Right Panel: Visualization & Object List */}
        <div className="flex-1 flex overflow-hidden bg-white relative">
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