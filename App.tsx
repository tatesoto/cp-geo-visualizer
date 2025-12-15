import React, { useState, useEffect, useRef } from 'react';
import Visualizer, { VisualizerHandle } from './components/Visualizer';
import ObjectList from './components/ObjectList';
import Header from './components/Header';
import EditorPanel from './components/EditorPanel';
import VisualizerControls from './components/VisualizerControls';
import { parseInput } from './services/parser';
import { Shape, ShapeType } from './types';
import { SNIPPETS } from './constants/snippets';

const INITIAL_KEY = 'points';

function App() {
  const [inputText, setInputText] = useState(SNIPPETS[INITIAL_KEY].input);
  const [formatText, setFormatText] = useState(SNIPPETS[INITIAL_KEY].format);
  const [parsedShapes, setParsedShapes] = useState<Shape[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [isObjectListOpen, setIsObjectListOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [visibleIdTypes, setVisibleIdTypes] = useState<ShapeType[]>([]);

  const visualizerRef = useRef<VisualizerHandle>(null);

  const handleParse = () => {
    const result = parseInput(formatText, inputText);
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      setParsedShapes(result.shapes);
      // Reset selection when shapes change
      setSelectedShapeId(null);
    }
  };

  // Initial parse on mount
  useEffect(() => {
    handleParse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans">
      <Header 
        isObjectListOpen={isObjectListOpen} 
        setIsObjectListOpen={setIsObjectListOpen} 
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
        />

        {/* Right Panel: Visualization & Object List */}
        <div className="flex-1 flex overflow-hidden bg-black relative">
            <div className="flex-1 relative min-w-0">
                <Visualizer 
                    ref={visualizerRef}
                    shapes={parsedShapes} 
                    highlightedShapeId={selectedShapeId}
                    visibleIdTypes={visibleIdTypes}
                />
                
                <VisualizerControls 
                    visibleIdTypes={visibleIdTypes}
                    onToggleIdType={toggleIdType}
                    onResetView={() => visualizerRef.current?.resetView()}
                />
            </div>
            
            {/* Slide-in Object List */}
            {isObjectListOpen && (
                <ObjectList 
                    shapes={parsedShapes} 
                    highlightedShapeId={selectedShapeId}
                    onSelectShape={toggleSelection}
                    onClose={() => setIsObjectListOpen(false)}
                />
            )}
        </div>
      </div>
    </div>
  );
}

export default App;