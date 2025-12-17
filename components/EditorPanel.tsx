import React, { useRef, useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon, PlayIcon, ChevronLeftIcon, DocumentTextIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import { SNIPPETS, SnippetKey } from '../constants/snippets';
import { Language } from '../types';
import { t, TRANSLATIONS } from '../constants/translations';
import { KEYWORDS } from '../services/parser';
import { getCaretCoordinates } from '../utils/caret';

interface EditorPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  formatText: string;
  setFormatText: (text: string) => void;
  inputText: string;
  setInputText: (text: string) => void;
  onParse: () => void;
  error: string | null;
  isParsing?: boolean;
  lang: Language;
}

const MIN_WIDTH = 250;
const MAX_WIDTH = 800;

// Curated suggestion list with proper casing
const SUGGESTION_LIST = [
  'Point',
  'Line',
  'Seg',
  'Circle',
  'Poly',
  'Push',
  'Text',
  'Read',
  'rep',
  'Group'
].sort();

const EditorPanel: React.FC<EditorPanelProps> = ({
  isOpen,
  onToggle,
  formatText,
  setFormatText,
  inputText,
  setInputText,
  onParse,
  error,
  isParsing = false,
  lang
}) => {
  const [isFormatOpen, setIsFormatOpen] = useState(true);
  const [isInputOpen, setIsInputOpen] = useState(true);
  const formatInputRef = useRef<HTMLTextAreaElement>(null);

  // Resize State
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  // Autocomplete State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [caretCoords, setCaretCoords] = useState({ top: 0, left: 0 });

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
    // Reset value so the same file can be selected again
    e.target.value = '';
  };

  const checkAutocomplete = (text: string, cursorPos: number) => {
      // Find word before cursor
      let start = cursorPos - 1;
      while (start >= 0 && /\w/.test(text[start])) {
          start--;
      }
      const prefix = text.slice(start + 1, cursorPos);
      
      if (prefix.length >= 1) {
          const matches = SUGGESTION_LIST.filter(k => k.toLowerCase().startsWith(prefix.toLowerCase()));
          if (matches.length > 0) {
              setSuggestions(matches);
              setSuggestionIndex(0);
              setShowSuggestions(true);
              
              if (formatInputRef.current) {
                  const coords = getCaretCoordinates(formatInputRef.current, cursorPos);
                  // Adjust for scroll
                  const rect = formatInputRef.current.getBoundingClientRect();
                  // We need relative coordinates inside the parent div
                  // The parent div is `relative`, so offsetTop/Left of the textarea usually 0
                  // But we need to subtract scrollTop of the textarea
                  setCaretCoords({
                      top: coords.top - formatInputRef.current.scrollTop + 20, // + lineHeight
                      left: coords.left - formatInputRef.current.scrollLeft
                  });
              }
              return;
          }
      }
      setShowSuggestions(false);
  };

  const insertSuggestion = (suggestion: string) => {
      if (!formatInputRef.current) return;
      
      const text = formatText;
      const cursorPos = formatInputRef.current.selectionStart;
      
      let start = cursorPos - 1;
      while (start >= 0 && /\w/.test(text[start])) {
          start--;
      }
      start++; // Start of the word
      
      const newText = text.slice(0, start) + suggestion + ' ' + text.slice(cursorPos);
      setFormatText(newText);
      setShowSuggestions(false);
      
      // Move cursor
      setTimeout(() => {
          if (formatInputRef.current) {
              const newPos = start + suggestion.length + 1;
              formatInputRef.current.selectionStart = newPos;
              formatInputRef.current.selectionEnd = newPos;
              formatInputRef.current.focus();
          }
      }, 0);
  };

  const handleFormatChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setFormatText(val);
      checkAutocomplete(val, e.target.selectionStart);
  };

  const handleFormatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const { selectionStart, selectionEnd, value } = target;

    // Autocomplete Navigation
    if (showSuggestions) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSuggestionIndex(prev => (prev + 1) % suggestions.length);
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
            return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            insertSuggestion(suggestions[suggestionIndex]);
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setShowSuggestions(false);
            return;
        }
    }

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

  const handleFormatClick = () => {
      setShowSuggestions(false);
  };

  if (!isOpen) {
      return (
          <div className="w-12 flex flex-col items-center py-4 border-r border-gray-200 bg-white shrink-0 group transition-all hover:bg-gray-50 cursor-pointer z-30" onClick={onToggle}>
              <button 
                  className="p-2 text-gray-400 group-hover:text-gray-900 rounded-lg transition-colors mb-4"
                  title="Expand Editor"
              >
                  <ArrowsPointingOutIcon className="w-5 h-5" />
              </button>
              
              <div 
                  className="mt-2 text-gray-400 group-hover:text-gray-600 text-[10px] tracking-[0.2em] font-bold select-none whitespace-nowrap uppercase"
                  style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
              >
                  {t(lang, 'config')}
              </div>
          </div>
      );
  }

  return (
    <div 
        className="flex flex-col border-r border-gray-200 bg-gray-50/30 font-sans relative shrink-0 h-full max-h-full z-30"
        style={{ width: width }}
    >
      {/* Panel Header with Collapse Button */}
      <div className="h-10 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t(lang, 'config')}</span>
          <button 
             onClick={onToggle}
             className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded-md transition-colors"
             title="Collapse Panel"
          >
             <ChevronLeftIcon className="w-4 h-4" />
          </button>
      </div>
      
      {/* Scrollable Container for Editors */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
        
        {/* Format Editor Section */}
        <div className={`flex flex-col border-b border-gray-200 transition-all duration-300 ease-in-out ${isFormatOpen ? 'flex-[1.2] min-h-[100px]' : 'flex-none h-9 overflow-hidden'}`}>
            <div 
                className="h-9 bg-white border-b border-gray-100 flex items-center px-4 justify-between select-none group shrink-0 sticky top-0 z-10"
            >
                <div 
                    className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-black transition-colors"
                    onClick={() => setIsFormatOpen(!isFormatOpen)}
                >
                    {isFormatOpen ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                    <span className="text-xs font-semibold uppercase tracking-wide">{t(lang, 'formatScript')}</span>
                </div>
                
                <div className="flex items-center gap-3">
                    <select 
                        className="bg-transparent text-xs text-gray-500 hover:text-gray-900 border-none outline-none cursor-pointer pr-1 transition-colors text-right appearance-none"
                        onChange={(e) => loadSnippet(e.target.value)}
                        value=""
                    >
                        <option value="" disabled>{t(lang, 'loadSnippet')}</option>
                        {Object.entries(SNIPPETS).map(([key, snip]) => (
                            <option key={key} value={key}>{t(lang, `snippet_${key}` as keyof typeof TRANSLATIONS['en'])}</option>
                        ))}
                    </select>
                </div>
            </div>
            
            <div className="flex-1 relative group bg-white">
                <textarea
                    ref={formatInputRef}
                    value={formatText}
                    onChange={handleFormatChange}
                    onKeyDown={handleFormatKeyDown}
                    onClick={handleFormatClick}
                    className="absolute inset-0 w-full h-full bg-white text-gray-800 p-4 font-mono text-[13px] resize-none focus:outline-none leading-normal selection:bg-purple-100"
                    spellCheck={false}
                    placeholder="Enter parsing logic..."
                    style={{ tabSize: 4 }}
                />
                
                {/* Autocomplete Popup */}
                {showSuggestions && (
                    <div 
                        className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden flex flex-col min-w-[120px]"
                        style={{ top: caretCoords.top, left: caretCoords.left }}
                    >
                        {suggestions.map((s, i) => (
                            <div 
                                key={s}
                                className={`px-3 py-1.5 text-xs font-mono cursor-pointer transition-colors flex items-center justify-between ${i === suggestionIndex ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                onClick={() => insertSuggestion(s)}
                            >
                                <span>{s}</span>
                                {i === suggestionIndex && <span className="text-[10px] opacity-70">Enter</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Input Data Section */}
        <div className={`flex flex-col transition-all duration-300 ease-in-out ${isInputOpen ? 'flex-1 min-h-[100px]' : 'flex-none h-9 overflow-hidden'}`}>
            <div 
                className="h-9 bg-white border-b border-gray-100 flex items-center px-4 justify-between select-none border-t border-gray-200 shrink-0 sticky top-0 z-10"
            >
                <div 
                    className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-black transition-colors"
                    onClick={() => setIsInputOpen(!isInputOpen)}
                >
                    {isInputOpen ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                    <span className="text-xs font-semibold uppercase tracking-wide">{t(lang, 'inputData')}</span>
                </div>
                <label 
                    className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-gray-100"
                >
                    <DocumentTextIcon className="w-3.5 h-3.5" />
                    <span>{t(lang, 'upload')}</span>
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
            </div>
            
            <div className="flex-1 relative bg-white">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="absolute inset-0 w-full h-full bg-white text-gray-800 p-4 font-mono text-[13px] resize-none focus:outline-none leading-normal selection:bg-purple-100"
                    spellCheck={false}
                    placeholder="Paste input data here..."
                    style={{ tabSize: 4 }}
                />
            </div>
        </div>

      </div>

      {/* Action Area */}
      <div className="p-4 bg-white border-t border-gray-200 shrink-0 z-10">
        {error ? (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded text-red-600 text-xs font-mono break-all whitespace-pre-wrap flex gap-2 items-start max-h-24 overflow-y-auto">
                 <span className="font-bold select-none">{t(lang, 'error')}</span> {error}
            </div>
        ) : (
            <div className="mb-3 h-[1px]"></div> 
        )}
        
        <button
          onClick={isParsing ? undefined : onParse}
          disabled={isParsing}
          className={`
            w-full group relative flex justify-center items-center gap-2 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-all shadow-sm
            ${isParsing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-black hover:bg-gray-800 active:scale-[0.98]'}
          `}
        >
          {isParsing ? (
             <div className="flex items-center gap-2">
                 <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 <span>{t(lang, 'processing')}</span>
             </div>
          ) : (
              <>
                <PlayIcon className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" />
                {t(lang, 'visualize')}
              </>
          )}
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