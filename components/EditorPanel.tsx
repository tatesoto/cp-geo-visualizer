import React, { useRef, useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon, QuestionMarkCircleIcon, PlayIcon, ChevronLeftIcon, DocumentTextIcon, CommandLineIcon } from '@heroicons/react/24/outline';
import { SNIPPETS, SnippetKey } from '../constants/snippets';

interface EditorPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  formatText: string;
  setFormatText: (text: string) => void;
  inputText: string;
  setInputText: (text: string) => void;
  onParse: () => void;
  error: string | null;
}

const MIN_WIDTH = 250;
const MAX_WIDTH = 800;

const EditorPanel: React.FC<EditorPanelProps> = ({
  isOpen,
  onToggle,
  formatText,
  setFormatText,
  inputText,
  setInputText,
  onParse,
  error
}) => {
  const [isFormatOpen, setIsFormatOpen] = useState(true);
  const [isInputOpen, setIsInputOpen] = useState(true);
  const formatInputRef = useRef<HTMLTextAreaElement>(null);

  // Resize State
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
        let newWidth = e.clientX;
        if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
        if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;
        setWidth(newWidth);
    };

    const handleMouseUp = () => {
        setIsResizing(false);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Prevent selection and change cursor during drag
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    };
  }, [isResizing]);

  const loadSnippet = (key: string) => {
    const snippet = SNIPPETS[key as SnippetKey];
    if (snippet) {
        setFormatText(snippet.format);
        setInputText(snippet.input);
    }
  };

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
        const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        let lastLineEnd = value.indexOf('\n', selectionEnd);
        if (lastLineEnd === -1) lastLineEnd = value.length;
        const linesContent = value.substring(firstLineStart, lastLineEnd);
        const lines = linesContent.split('\n');
        const newLines = lines.map(line => {
          if (line.startsWith('\t')) return line.substring(1);
          if (line.startsWith('    ')) return line.substring(4);
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
                    // Simple cursor restore logic
                    formatInputRef.current.selectionStart = selectionStart; 
                    formatInputRef.current.selectionEnd = selectionStart;
                }
            }
        }, 0);
      } else {
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

  if (!isOpen) {
      return (
          <div className="w-12 flex flex-col items-center py-4 border-r border-gray-200 bg-white shrink-0">
              <button 
                  onClick={onToggle}
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              >
                  <ChevronRightIcon className="w-5 h-5" />
              </button>
              <div className="mt-8 flex flex-col gap-6">
                <span className="text-gray-400" title="Format"><CommandLineIcon className="w-5 h-5"/></span>
                <span className="text-gray-400" title="Input"><DocumentTextIcon className="w-5 h-5"/></span>
              </div>
          </div>
      );
  }

  return (
    <div 
        className="flex flex-col border-r border-gray-200 bg-gray-50/30 font-sans relative shrink-0"
        style={{ width: width }}
    >
      
      {/* Format Editor Section */}
      <div className={`flex flex-col border-b border-gray-200 transition-[flex-grow] duration-300 ease-in-out ${isFormatOpen ? 'flex-1 min-h-[200px]' : 'flex-none'}`}>
        <div 
            className="h-10 bg-white border-b border-gray-100 flex items-center px-4 justify-between select-none group"
        >
            <div 
                className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-black transition-colors"
                onClick={() => setIsFormatOpen(!isFormatOpen)}
            >
                {isFormatOpen ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
                <span className="text-xs font-semibold uppercase tracking-wide">Format Script</span>
            </div>
            
            <div className="flex items-center gap-3">
                 <select 
                    className="bg-transparent text-xs text-gray-500 hover:text-gray-900 border-none outline-none cursor-pointer pr-1 transition-colors text-right appearance-none"
                    onChange={(e) => loadSnippet(e.target.value)}
                    value=""
                >
                    <option value="" disabled>Load Snippet...</option>
                    {Object.entries(SNIPPETS).map(([key, snip]) => (
                        <option key={key} value={key}>{snip.label}</option>
                    ))}
                </select>

                <div className="group/help relative">
                    <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer"/>
                    {/* Tooltip */}
                    <div className="hidden group-hover/help:block absolute right-0 top-6 w-72 p-4 bg-white border border-gray-200 rounded-lg shadow-xl text-xs text-gray-600 z-50">
                        <p className="mb-2 font-semibold text-gray-900">Syntax Reference</p>
                        <div className="space-y-1.5 font-mono text-[11px] leading-relaxed">
                            <div className="flex gap-2"><span className="text-purple-600">Read</span> <span className="text-gray-500">vars...</span></div>
                            <div className="flex gap-2"><span className="text-purple-600">rep</span> <span className="text-blue-600">n</span>:</div>
                            <div className="pl-4 text-gray-400">// indented block</div>
                            <div className="flex gap-2"><span className="text-purple-600">Point</span> x y <span className="text-gray-400">[color]</span></div>
                            <div className="flex gap-2"><span className="text-purple-600">Line</span> x1 y1 x2 y2</div>
                            <div className="flex gap-2"><span className="text-purple-600">Circle</span> x y r</div>
                        </div>
                    </div>
                </div>

                <button onClick={onToggle} className="text-gray-400 hover:text-black ml-2" title="Collapse">
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
        
        {isFormatOpen && (
            <div className="flex-1 relative group">
                <textarea
                    ref={formatInputRef}
                    value={formatText}
                    onChange={(e) => setFormatText(e.target.value)}
                    onKeyDown={handleFormatKeyDown}
                    className="absolute inset-0 w-full h-full bg-white text-gray-800 p-4 font-mono text-[13px] resize-none focus:outline-none leading-normal selection:bg-purple-100"
                    spellCheck={false}
                    placeholder="Enter parsing logic..."
                    style={{ tabSize: 4 }}
                />
            </div>
        )}
      </div>

      {/* Input Data Section */}
      <div className={`flex flex-col transition-[flex-grow] duration-300 ease-in-out ${isInputOpen ? 'flex-1 min-h-[150px]' : 'flex-none'}`}>
         <div 
            className="h-10 bg-white border-b border-gray-100 flex items-center px-4 justify-between select-none border-t border-gray-200"
         >
            <div 
                className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-black transition-colors"
                onClick={() => setIsInputOpen(!isInputOpen)}
            >
                {isInputOpen ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
                <span className="text-xs font-semibold uppercase tracking-wide">Input Data</span>
            </div>
            <label 
                className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-gray-100"
            >
                <DocumentTextIcon className="w-3.5 h-3.5" />
                <span>Upload</span>
                <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
        </div>
        
        {isInputOpen && (
            <div className="flex-1 relative">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="absolute inset-0 w-full h-full bg-white text-gray-800 p-4 font-mono text-[13px] resize-none focus:outline-none leading-normal selection:bg-purple-100"
                    spellCheck={false}
                    placeholder="Paste input data here..."
                    style={{ tabSize: 4 }}
                />
            </div>
        )}
      </div>

      {/* Action Area */}
      <div className="p-4 bg-white border-t border-gray-200 shrink-0">
        {error ? (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded text-red-600 text-xs font-mono break-all whitespace-pre-wrap flex gap-2 items-start">
                 <span className="font-bold select-none">Error:</span> {error}
            </div>
        ) : (
            <div className="mb-3 h-[1px]"></div> 
        )}
        
        <button
          onClick={onParse}
          className="w-full group relative flex justify-center items-center gap-2 bg-black hover:bg-gray-800 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-all shadow-sm active:scale-[0.98]"
        >
          <PlayIcon className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" />
          Visualize
        </button>
      </div>

      {/* Resize Handle */}
      <div 
        className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-50 flex flex-col justify-center items-center group/handle"
        onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
        }}
      >
          {/* Visual indicator for handle */}
          <div className="h-8 w-0.5 bg-gray-300 rounded group-hover/handle:bg-white/50" />
      </div>

    </div>
  );
};

export default EditorPanel;