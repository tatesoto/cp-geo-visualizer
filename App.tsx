import React, { useState, useEffect, useRef } from 'react';
import Visualizer from './components/Visualizer';
import { parseInput } from './services/parser';
import { Shape } from './types';
import { ArrowPathIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'; // Need to import heroicons or use simple svg

// Sample Initial State showing nested loops (Test Cases -> Polygon)
const INITIAL_INPUT = `2
3
0 0
50 -20
20 40
4
-50 -50
-20 -50
-20 -20
-50 -20`;

const INITIAL_FORMAT = `// Read number of test cases
read t

rep t:
  // Read N (vertices count)
  read n
  
  rep n:
    // Read x, y
    read x y
    
    // Buffer for polygon
    Push x y
    
    // Draw vertex point
    Point x y

  // Draw polygon from buffer & clear it
  Poly
`;

function App() {
  const [inputText, setInputText] = useState(INITIAL_INPUT);
  const [formatText, setFormatText] = useState(INITIAL_FORMAT);
  const [parsedShapes, setParsedShapes] = useState<Shape[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const formatInputRef = useRef<HTMLTextAreaElement>(null);

  const handleParse = () => {
    const result = parseInput(formatText, inputText);
    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      setParsedShapes(result.shapes);
    }
  };

  // Initial parse
  useEffect(() => {
    handleParse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setInputText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleFormatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const { selectionStart, selectionEnd, value } = target;

    if (e.key === 'Tab') {
      e.preventDefault();

      if (selectionStart !== selectionEnd) {
        // Multi-line or selection active: Indent lines involved
        // Find start of the first line involved
        const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        // Find end of the last line involved
        let lastLineEnd = value.indexOf('\n', selectionEnd);
        if (lastLineEnd === -1) lastLineEnd = value.length;

        // Extract the lines
        const linesContent = value.substring(firstLineStart, lastLineEnd);
        const lines = linesContent.split('\n');
        
        // Add tab to each line (using shift key to unindent could be added here, but sticking to request)
        const newLines = lines.map(line => '\t' + line);
        const newContent = newLines.join('\n');

        const newValue = value.substring(0, firstLineStart) + newContent + value.substring(lastLineEnd);

        setFormatText(newValue);

        // Adjust selection to cover the modified lines
        setTimeout(() => {
            if (formatInputRef.current) {
                formatInputRef.current.selectionStart = firstLineStart;
                formatInputRef.current.selectionEnd = firstLineStart + newContent.length;
            }
        }, 0);
      } else {
        // Single cursor: Insert tab
        const newValue = value.substring(0, selectionStart) + '\t' + value.substring(selectionEnd);
        setFormatText(newValue);
        setTimeout(() => {
            if (formatInputRef.current) {
                formatInputRef.current.selectionStart = selectionStart + 1;
                formatInputRef.current.selectionEnd = selectionStart + 1;
            }
        }, 0);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      
      // Auto-indentation
      // Get the line content before the cursor
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const lineContent = value.substring(lineStart, selectionStart);
      
      // Calculate indentation (spaces or tabs)
      const match = lineContent.match(/^(\s*)/);
      const indentation = match ? match[1] : '';
      
      const newValue = value.substring(0, selectionStart) + '\n' + indentation + value.substring(selectionEnd);
      
      setFormatText(newValue);
      
      setTimeout(() => {
        if (formatInputRef.current) {
          formatInputRef.current.selectionStart = selectionStart + 1 + indentation.length;
          formatInputRef.current.selectionEnd = selectionStart + 1 + indentation.length;
        }
      }, 0);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Header */}
      <header className="h-14 border-b border-slate-800 flex items-center px-6 bg-slate-900 justify-between shrink-0 z-10">
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center">
                <span className="font-bold text-white text-xs">CP</span>
            </div>
            <h1 className="font-bold text-lg tracking-tight">GeoVisualizer</h1>
        </div>
        
        <div className="flex items-center gap-4">
             <a href="https://github.com/google/genai" target="_blank" rel="noreferrer" className="text-xs text-slate-500 hover:text-slate-300 transition">
                 Powered by React & Canvas
             </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Editor */}
        <div className="w-1/3 min-w-[350px] max-w-[600px] flex flex-col border-r border-slate-800 bg-slate-900/50">
          
          {/* Format Editor */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-slate-800">
            <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between select-none">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parsing Format</span>
                <div className="group relative">
                    <QuestionMarkCircleIcon className="w-4 h-4 text-slate-500 hover:text-slate-300 cursor-pointer"/>
                    <div className="hidden group-hover:block absolute right-0 top-6 w-80 p-3 bg-slate-800 border border-slate-700 rounded shadow-xl text-xs text-slate-300 z-50">
                        <p className="mb-2 font-bold text-slate-100">Syntax Guide</p>
                        <ul className="list-disc pl-3 space-y-1">
                            <li><code>read var1 var2</code>: Read input numbers</li>
                            <li><code>rep n:</code>: Repeat block n times</li>
                            <li><code>Point x y</code>: Draw point</li>
                            <li><code>Line x1 y1 x2 y2</code>: Draw line</li>
                            <li><code>Push x y</code>: Buffer for polygon</li>
                            <li><code>Poly</code>: Draw polygon from buffer</li>
                            <li><code>// ...</code>: Comment</li>
                        </ul>
                    </div>
                </div>
            </div>
            <textarea
              ref={formatInputRef}
              value={formatText}
              onChange={(e) => setFormatText(e.target.value)}
              onKeyDown={handleFormatKeyDown}
              className="flex-1 bg-[#0d1117] text-slate-300 p-4 font-mono text-sm resize-none focus:outline-none leading-relaxed"
              spellCheck={false}
              placeholder="Enter format script..."
            />
          </div>

          {/* Input Editor */}
          <div className="flex-1 flex flex-col min-h-0">
             <div className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between select-none">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Input Data</span>
                <label className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-1">
                    <span>Load File</span>
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[#0d1117] text-slate-300 p-4 font-mono text-sm resize-none focus:outline-none leading-relaxed"
              spellCheck={false}
              placeholder="Paste test case input here..."
            />
          </div>

          {/* Action Bar */}
          <div className="p-4 bg-slate-900 border-t border-slate-800">
            {error && (
                <div className="mb-3 px-3 py-2 bg-red-900/30 border border-red-800 rounded text-red-200 text-xs font-mono break-all whitespace-pre-wrap">
                    {error}
                </div>
            )}
            <button
              onClick={handleParse}
              className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors shadow-lg shadow-blue-900/20"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Visualize
            </button>
          </div>
        </div>

        {/* Right Panel: Visualization */}
        <div className="flex-1 relative bg-black">
          <Visualizer shapes={parsedShapes} />
        </div>
      </div>
    </div>
  );
}

export default App;