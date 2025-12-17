import React, { useState, useEffect, useRef } from 'react';
import Visualizer, { VisualizerHandle } from './components/Visualizer';
import ObjectList from './components/ObjectList';
import Header from './components/Header';
import EditorPanel from './components/EditorPanel';
import VisualizerControls from './components/VisualizerControls';
import SettingsModal from './components/SettingsModal';
import { parseInput } from './services/parser';
import { Shape, ShapeType, AppConfig } from './types';
import { SNIPPETS } from './constants/snippets';

const INITIAL_KEY = 'points';

function App() {
  const [inputText, setInputText] = useState(SNIPPETS[INITIAL_KEY].input);
  const [formatText, setFormatText] = useState(SNIPPETS[INITIAL_KEY].format);
  const [parsedShapes, setParsedShapes] = useState<Shape[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Configuration State
  const [config, setConfig] = useState<AppConfig>({
      executionTimeout: 3000,
      renderTimeout: 200,
      language: 'en'
  });

  // UI State
  const [isObjectListOpen, setIsObjectListOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [visibleIdTypes, setVisibleIdTypes] = useState<ShapeType[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const visualizerRef = useRef<VisualizerHandle>(null);

  const handleParse = () => {
    setIsParsing(true);
    
    // Increase timeout to 100ms to ensure the browser has enough time 
    // to repaint the UI with the loading spinner before the main thread is blocked.
    setTimeout(() => {
        const result = parseInput(formatText, inputText, config.executionTimeout);
        
        if (result.error) {
            setError(result.error);
        } else {
            setError(null);
            setParsedShapes(result.shapes);
            setSelectedShapeId(null);
        }
        setIsParsing(false);
    }, 100);
  };

  // Initial parse on mount
  useEffect(() => {
    handleParse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-parse when timeout setting changes if there is an error (likely timeout error)
  useEffect(() => {
      if (error && error.includes('timed out')) {
          handleParse();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.executionTimeout]);

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

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
      <Header 
        isObjectListOpen={isObjectListOpen} 
        setIsObjectListOpen={setIsObjectListOpen}
        onOpenSettings={() => setIsSettingsOpen(true)} 
        lang={config.language}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Editor */}
        <EditorPanel 
            isOpen={isEditorOpen}
            onToggle={() => setIsEditorOpen(!isEditorOpen)}
            formatText={formatText}
            setFormatText={(text) => {
                setFormatText(text);
            }}
            inputText={inputText}
            setInputText={(text) => {
                setInputText(text);
            }}
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
                    renderTimeout={config.renderTimeout}
                    lang={config.language}
                />
                
                <VisualizerControls 
                    visibleIdTypes={visibleIdTypes}
                    onToggleIdType={toggleIdType}
                    onResetView={() => visualizerRef.current?.resetView()}
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
    </div>
  );
}

export default App;