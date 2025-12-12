import React, { useState, useEffect, useRef } from 'react';
import Visualizer from './components/Visualizer';
import { parseInput } from './services/parser';
import { Shape } from './types';
import { ArrowPathIcon, QuestionMarkCircleIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const SNIPPETS = {
  default: {
    label: "Test Cases (Polygons)",
    format: `// Read number of test cases
Read t

rep t:
\t// Read N (vertices count)
\tRead n
\t
\trep n:
\t\t// Read x, y
\t\tRead x y
\t\t
\t\t// Buffer for polygon
\t\tPush x y
\t\t
\t\t// Draw vertex point
\t\tPoint x y

\t// Draw polygon from buffer & clear it
\tPoly`,
    input: `2
3
0 0
50 -20
20 40
4
-50 -50
-20 -50
-20 -20
-50 -20`
  },
  points: {
    label: "Points Cloud",
    format: `// Read number of points
Read n

rep n:
\tRead x y
\t// Draw point with label
\tPoint x y`,
    input: `10
10 10
20 50
50 20
80 80
30 40
60 10
90 50
20 90
40 60
70 30`
  },
  segments: {
    label: "Line Segments",
    format: `// Read number of segments
Read n

rep n:
\t// Read x1 y1 x2 y2
\tRead x1 y1 x2 y2
\t// Draw segment
\tSeg x1 y1 x2 y2`,
    input: `5
0 0 50 50
10 80 90 20
20 20 20 80
80 20 80 80
0 50 100 50`
  },
  circles: {
    label: "Circles",
    format: `// Read number of circles
Read n

rep n:
\t// Read x y r
\tRead x y r
\tCircle x y r`,
    input: `4
20 20 15
50 50 25
80 20 10
50 80 15`
  },
  polygon_simple: {
    label: "Simple Polygon",
    format: `// Read N vertices
Read n

rep n:
\tRead x y
\tPush x y
\tPoint x y

// Draw polygon
Poly`,
    input: `5
0 0
40 0
60 40
20 80
-20 40`
  },
  lines: {
      label: "Lines",
      format: `// Read N lines defined by 2 points
Read n
rep n:
\tRead x1 y1 x2 y2
\t// Draw infinite line passing through p1, p2
\tLine x1 y1 x2 y2`,
      input: `3
0 0 1 1
0 50 1 50
50 0 50 1`
  }
};

const INITIAL_KEY = 'default';

function App() {
  const [inputText, setInputText] = useState(SNIPPETS[INITIAL_KEY].input);
  const [formatText, setFormatText] = useState(SNIPPETS[INITIAL_KEY].format);
  const [parsedShapes, setParsedShapes] = useState<Shape[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Collapsible state
  const [isFormatOpen, setIsFormatOpen] = useState(true);
  const [isInputOpen, setIsInputOpen] = useState(true);

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

  const loadSnippet = (key: string) => {
    const snippet = SNIPPETS[key as keyof typeof SNIPPETS];
    if (snippet) {
        setFormatText(snippet.format);
        setInputText(snippet.input);
        
        // Parse immediately
        const result = parseInput(snippet.format, snippet.input);
        if (result.error) {
            setError(result.error);
            setParsedShapes([]);
        } else {
            setError(null);
            setParsedShapes(result.shapes);
        }
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

      if (e.shiftKey) {
        // Shift + Tab: Unindent
        const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        let lastLineEnd = value.indexOf('\n', selectionEnd);
        if (lastLineEnd === -1) lastLineEnd = value.length;

        const linesContent = value.substring(firstLineStart, lastLineEnd);
        const lines = linesContent.split('\n');

        let totalRemoved = 0;
        const newLines = lines.map(line => {
          if (line.startsWith('\t')) {
            totalRemoved++;
            return line.substring(1);
          }
          if (line.startsWith('    ')) {
              totalRemoved += 4;
              return line.substring(4);
          }
          return line;
        });

        const newContent = newLines.join('\n');
        
        if (linesContent === newContent) return;

        const newValue = value.substring(0, firstLineStart) + newContent + value.substring(lastLineEnd);
        setFormatText(newValue);

        setTimeout(() => {
            if (formatInputRef.current) {
                if (selectionStart !== selectionEnd) {
                    formatInputRef.current.selectionStart = firstLineStart;
                    formatInputRef.current.selectionEnd = firstLineStart + newContent.length;
                } else {
                    const firstLine = lines[0];
                    let startShift = 0;
                    if (firstLine.startsWith('\t')) startShift = 1;
                    else if (firstLine.startsWith('    ')) startShift = 4;
                    
                    const offsetInLine = selectionStart - firstLineStart;
                    const actualShift = offsetInLine >= startShift ? startShift : offsetInLine;
                    
                    const newCursorPos = Math.max(firstLineStart, selectionStart - actualShift);
                    formatInputRef.current.selectionStart = newCursorPos;
                    formatInputRef.current.selectionEnd = newCursorPos;
                }
            }
        }, 0);

      } else {
        // Tab: Indent
        if (selectionStart !== selectionEnd) {
          const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
          let lastLineEnd = value.indexOf('\n', selectionEnd);
          if (lastLineEnd === -1) lastLineEnd = value.length;

          const linesContent = value.substring(firstLineStart, lastLineEnd);
          const lines = linesContent.split('\n');
          
          const newLines = lines.map(line => '\t' + line);
          const newContent = newLines.join('\n');

          const newValue = value.substring(0, firstLineStart) + newContent + value.substring(lastLineEnd);

          setFormatText(newValue);

          setTimeout(() => {
              if (formatInputRef.current) {
                  formatInputRef.current.selectionStart = firstLineStart;
                  formatInputRef.current.selectionEnd = firstLineStart + newContent.length;
              }
          }, 0);
        } else {
          const newValue = value.substring(0, selectionStart) + '\t' + value.substring(selectionEnd);
          setFormatText(newValue);
          setTimeout(() => {
              if (formatInputRef.current) {
                  formatInputRef.current.selectionStart = selectionStart + 1;
                  formatInputRef.current.selectionEnd = selectionStart + 1;
              }
          }, 0);
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const lineContent = value.substring(lineStart, selectionStart);
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
          <div className={`flex flex-col border-b border-slate-800 transition-all duration-200 ${isFormatOpen ? 'flex-1 min-h-0' : 'flex-none'}`}>
            <div 
                className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between select-none cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => setIsFormatOpen(!isFormatOpen)}
            >
                <div className="flex items-center gap-2">
                    {isFormatOpen ? <ChevronDownIcon className="w-3 h-3 text-slate-500" /> : <ChevronRightIcon className="w-3 h-3 text-slate-500" />}
                    <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parsing Format</span>
                        <select 
                            className="bg-slate-800 text-xs text-slate-300 border border-slate-700 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                            onChange={(e) => loadSnippet(e.target.value)}
                            defaultValue=""
                        >
                            <option value="" disabled>Examples...</option>
                            {Object.entries(SNIPPETS).map(([key, snip]) => (
                                <option key={key} value={key}>{snip.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="group relative" onClick={(e) => e.stopPropagation()}>
                    <QuestionMarkCircleIcon className="w-4 h-4 text-slate-500 hover:text-slate-300 cursor-pointer"/>
                    <div className="hidden group-hover:block absolute right-0 top-6 w-80 p-3 bg-slate-800 border border-slate-700 rounded shadow-xl text-xs text-slate-300 z-50">
                        <p className="mb-2 font-bold text-slate-100">Syntax Guide</p>
                        <ul className="list-disc pl-3 space-y-1">
                            <li><code>Read var1 var2</code>: Read input numbers</li>
                            <li><code>rep n:</code>: Repeat block n times</li>
                            <li><code>Point x y [color] ["label"]</code></li>
                            <li><code>Line x1 y1 x2 y2</code>: Infinite line</li>
                            <li><code>Seg x1 y1 x2 y2</code>: Line segment</li>
                            <li><code>Circle x y r</code>: Circle</li>
                            <li><code>Push x y</code>: Buffer for polygon</li>
                            <li><code>Poly</code>: Draw polygon from buffer</li>
                            <li><code>Text x y [size] "content"</code></li>
                            <li><code>// ...</code>: Comment</li>
                        </ul>
                    </div>
                </div>
            </div>
            {isFormatOpen && (
                <textarea
                ref={formatInputRef}
                value={formatText}
                onChange={(e) => setFormatText(e.target.value)}
                onKeyDown={handleFormatKeyDown}
                className="flex-1 bg-[#0d1117] text-slate-300 p-4 font-mono text-sm resize-none focus:outline-none leading-relaxed"
                spellCheck={false}
                placeholder="Enter format script..."
                style={{ tabSize: 4 }}
                />
            )}
          </div>

          {/* Input Editor */}
          <div className={`flex flex-col transition-all duration-200 ${isInputOpen ? 'flex-1 min-h-0' : 'flex-none'}`}>
             <div 
                className="h-9 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between select-none cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => setIsInputOpen(!isInputOpen)}
             >
                <div className="flex items-center gap-2">
                    {isInputOpen ? <ChevronDownIcon className="w-3 h-3 text-slate-500" /> : <ChevronRightIcon className="w-3 h-3 text-slate-500" />}
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Input Data</span>
                </div>
                <label 
                    className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    <span>Load File</span>
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
            </div>
            {isInputOpen && (
                <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-[#0d1117] text-slate-300 p-4 font-mono text-sm resize-none focus:outline-none leading-relaxed"
                spellCheck={false}
                placeholder="Paste test case input here..."
                style={{ tabSize: 4 }}
                />
            )}
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