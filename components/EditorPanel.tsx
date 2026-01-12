import React, { useRef, useState, useEffect } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorState, EditorSelection, Prec, RangeSetBuilder } from '@codemirror/state';
import { EditorView, keymap, placeholder, Decoration, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { autocompletion, completeFromList } from '@codemirror/autocomplete';
import { ChevronDownIcon, ChevronRightIcon, PlayIcon, ChevronLeftIcon, DocumentTextIcon, ArrowsPointingOutIcon, TrashIcon, RectangleStackIcon } from '@heroicons/react/24/outline';
import { SNIPPETS, SnippetKey } from '../constants/snippets';
import { Language } from '../types';
import { t, TRANSLATIONS } from '../constants/translations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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
const INDENT_SIZE = 4;
const INDENT_UNIT = ' '.repeat(INDENT_SIZE);

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
    'Group',
    'if',
    'elif',
    'else',
    'break',
    'continue'
].sort();

const formatEditorTheme = EditorView.theme({
    '&': {
        height: '100%',
        backgroundColor: '#ffffff'
    },
    '.cm-scroller': {
        fontFamily: 'ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '13px',
        lineHeight: '1.5'
    },
    '.cm-content': {
        padding: '16px'
    },
    '.cm-gutters': {
        display: 'none'
    },
    '.cm-activeLine': {
        backgroundColor: 'transparent'
    },
    '.cm-line.cm-comment-line': {
        color: '#9ca3af'
    }
});

const commentLineDecoration = Decoration.line({ class: 'cm-comment-line' });

const commentLinePlugin = ViewPlugin.fromClass(class {
    decorations;
    constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
    }
    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
        }
    }
    buildDecorations(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        for (const { from, to } of view.visibleRanges) {
            let pos = from;
            while (pos <= to) {
                const line = view.state.doc.lineAt(pos);
                if (line.text.trimStart().startsWith('//')) {
                    builder.add(line.from, line.from, commentLineDecoration);
                }
                pos = line.to + 1;
            }
        }
        return builder.finish();
    }
}, {
    decorations: (v) => v.decorations
});

const normalizeIndent = (indent: string) => {
    let column = 0;
    let normalized = '';
    for (const char of indent) {
        if (char === '\t') {
            const spaces = INDENT_SIZE - (column % INDENT_SIZE);
            normalized += ' '.repeat(spaces);
            column += spaces;
        } else {
            normalized += ' ';
            column += 1;
        }
    }
    return normalized;
};

const getLineIndent = (lineText: string) => {
    const match = lineText.match(/^[\t ]*/);
    return match ? normalizeIndent(match[0]) : '';
};

const stripInlineComment = (lineText: string) => {
    let inQuote = false;
    let quoteChar = '';
    for (let i = 0; i < lineText.length; i++) {
        const char = lineText[i];
        if (inQuote) {
            if (char === quoteChar) {
                inQuote = false;
            }
        } else if (char === '"' || char === "'") {
            inQuote = true;
            quoteChar = char;
        } else if (char === '/' && lineText[i + 1] === '/') {
            return lineText.slice(0, i);
        }
    }
    return lineText;
};

const shouldIndentAfterLine = (lineText: string) => {
    const withoutComment = stripInlineComment(lineText);
    return withoutComment.trimEnd().endsWith(':');
};

const insertNewlineWithIndent = (view: EditorView) => {
    const { state } = view;
    const transaction = state.changeByRange((range) => {
        const line = state.doc.lineAt(range.from);
        const baseIndent = getLineIndent(line.text);
        const extraIndent = shouldIndentAfterLine(line.text) ? INDENT_UNIT : '';
        const insert = `\n${baseIndent}${extraIndent}`;
        return {
            changes: { from: range.from, to: range.to, insert },
            range: EditorSelection.cursor(range.from + insert.length)
        };
    });
    view.dispatch(transaction);
    return true;
};

const getSelectedLineNumbers = (state: EditorState) => {
    const lines = new Set<number>();
    for (const range of state.selection.ranges) {
        const from = range.from;
        let to = range.to;
        if (to > from && state.doc.lineAt(to).from === to) {
            to -= 1;
        }
        const startLine = state.doc.lineAt(from).number;
        const endLine = state.doc.lineAt(to).number;
        for (let lineNo = startLine; lineNo <= endLine; lineNo++) {
            lines.add(lineNo);
        }
    }
    return Array.from(lines).sort((a, b) => a - b);
};

const indentSelection = (view: EditorView) => {
    const { state } = view;
    const hasSelection = state.selection.ranges.some((range) => !range.empty);
    if (!hasSelection) {
        const transaction = state.changeByRange((range) => ({
            changes: { from: range.from, to: range.to, insert: INDENT_UNIT },
            range: EditorSelection.cursor(range.from + INDENT_UNIT.length)
        }));
        view.dispatch(transaction);
        return true;
    }

    const lineNumbers = getSelectedLineNumbers(state);
    if (lineNumbers.length === 0) return false;
    const changes = lineNumbers.map((lineNo) => {
        const line = state.doc.line(lineNo);
        return { from: line.from, to: line.from, insert: INDENT_UNIT };
    });
    view.dispatch({ changes });
    return true;
};

const unindentSelection = (view: EditorView) => {
    const { state } = view;
    const lineNumbers = getSelectedLineNumbers(state);
    if (lineNumbers.length === 0) return false;

    const changes: { from: number; to: number; insert: string }[] = [];
    for (const lineNo of lineNumbers) {
        const line = state.doc.line(lineNo);
        if (line.text.startsWith('\t')) {
            changes.push({ from: line.from, to: line.from + 1, insert: '' });
            continue;
        }
        let removeCount = 0;
        while (removeCount < INDENT_SIZE && line.text[removeCount] === ' ') {
            removeCount += 1;
        }
        if (removeCount > 0) {
            changes.push({ from: line.from, to: line.from + removeCount, insert: '' });
        }
    }

    if (changes.length === 0) return false;
    view.dispatch({ changes });
    return true;
};

const toggleLineComment = (view: EditorView) => {
    const { state } = view;
    const changes: { from: number; to: number; insert: string }[] = [];
    const processed = new Set<number>();

    for (const range of state.selection.ranges) {
        const from = range.from;
        let to = range.to;
        if (to > from && state.doc.lineAt(to).from === to) {
            to -= 1;
        }
        const startLine = state.doc.lineAt(from).number;
        const endLine = state.doc.lineAt(to).number;

        let allCommented = true;
        for (let lineNo = startLine; lineNo <= endLine; lineNo++) {
            const line = state.doc.line(lineNo);
            if (line.text.trim().length === 0) continue;
            if (!line.text.trimStart().startsWith('//')) {
                allCommented = false;
                break;
            }
        }

        for (let lineNo = startLine; lineNo <= endLine; lineNo++) {
            if (processed.has(lineNo)) continue;
            processed.add(lineNo);
            const line = state.doc.line(lineNo);
            if (line.text.trim().length === 0) continue;
            const indentMatch = line.text.match(/^(\s*)/);
            const indentLen = indentMatch ? indentMatch[1].length : 0;
            const afterIndent = line.text.slice(indentLen);
            if (allCommented) {
                if (afterIndent.startsWith('//')) {
                    const removeLen = afterIndent.startsWith('// ') ? 3 : 2;
                    changes.push({
                        from: line.from + indentLen,
                        to: line.from + indentLen + removeLen,
                        insert: ''
                    });
                }
            } else {
                changes.push({
                    from: line.from + indentLen,
                    to: line.from + indentLen,
                    insert: '// '
                });
            }
        }
    }

    if (changes.length === 0) return false;
    changes.sort((a, b) => (b.from - a.from) || (b.to - a.to));
    view.dispatch({ changes });
    return true;
};

const editorKeymap = Prec.high(keymap.of([
    { key: 'Mod-/', run: toggleLineComment },
    { key: 'Tab', run: indentSelection },
    { key: 'Shift-Tab', run: unindentSelection },
    { key: 'Enter', run: insertNewlineWithIndent }
]));

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
    const formatEditorRef = useRef<ReactCodeMirrorRef>(null);
    const [snippetSelectKey, setSnippetSelectKey] = useState(0);
    const inputEditorRef = useRef<ReactCodeMirrorRef>(null);

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

    // Mobile check
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);


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

    const handleManualIndent = () => {
        const view = formatEditorRef.current?.view;
        if (!view) return;
        indentSelection(view);
        view.focus();
    };

    const handleClear = () => {
        if (window.confirm(t(lang, 'clearConfirm'))) {
            setFormatText('');
            formatEditorRef.current?.view?.focus();
        }
    };

    const handleClearInput = () => {
        if (window.confirm(t(lang, 'clearConfirm'))) {
            setInputText('');
            inputEditorRef.current?.view?.focus();
        }
    };

    const handleFormatChange = (value: string) => {
        setFormatText(value);
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
            style={{ width: isMobile ? '100%' : width }}
        >
            {/* Panel Header with Collapse Button */}
            <div className="h-10 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t(lang, 'config')}</span>
                {!isMobile && (
                    <button
                        onClick={onToggle}
                        className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded-md transition-colors"
                        title="Collapse Panel"
                    >
                        <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                )}
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
                            {isMobile && (
                                <button
                                    type="button"
                                    onPointerDown={(e) => {
                                        e.preventDefault(); // Keep textarea focus so the keyboard stays open on mobile
                                        handleManualIndent();
                                    }}
                                    className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-bold rounded uppercase border border-gray-200 transition-colors"
                                    title="Insert Tab"
                                >
                                    Tab
                                </button>
                            )}
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={handleClear}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    title={t(lang, 'clear')}
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                                <Select
                                    key={snippetSelectKey}
                                    onValueChange={(value) => {
                                        loadSnippet(value);
                                        setSnippetSelectKey((prev) => prev + 1);
                                    }}
                                >
                                    <SelectTrigger
                                        className={`h-7 ${lang === 'ja' ? 'min-w-[160px]' : 'min-w-[130px]'} max-w-[220px] text-gray-500 hover:text-gray-900`}
                                        aria-label={t(lang, 'loadSnippet')}
                                    >
                                        <RectangleStackIcon className="h-3.5 w-3.5 text-gray-400" />
                                        <span className="min-w-0 flex-1 truncate">
                                            <SelectValue className="data-[placeholder]:text-gray-400" placeholder={t(lang, 'loadSnippet')} />
                                        </span>
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                        {Object.entries(SNIPPETS).map(([key, _snip]) => (
                                            <SelectItem key={key} value={key}>
                                                {t(lang, `snippet_${key}` as keyof typeof TRANSLATIONS['en'])}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 relative group bg-white">
                        <CodeMirror
                            ref={formatEditorRef}
                            value={formatText}
                            onChange={handleFormatChange}
                            className="absolute inset-0"
                            height="100%"
                            width="100%"
                            basicSetup={{
                                lineNumbers: false,
                                foldGutter: false,
                                highlightActiveLine: false,
                                highlightActiveLineGutter: false
                            }}
                            extensions={[
                                formatEditorTheme,
                                EditorView.lineWrapping,
                                EditorState.tabSize.of(INDENT_SIZE),
                                editorKeymap,
                                autocompletion({ override: [completeFromList(SUGGESTION_LIST)] }),
                                placeholder('Enter parsing logic...'),
                                commentLinePlugin
                            ]}
                        />
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
                        <div className="flex items-center gap-1.0">
                            <button
                                onClick={handleClearInput}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title={t(lang, 'clear')}
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                            <label
                                className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer flex items-center gap-1.5 transition-colors px-2 py-1 rounded hover:bg-gray-100"
                            >
                                <DocumentTextIcon className="w-3.5 h-3.5" />
                                <span>{t(lang, 'upload')}</span>
                                <input type="file" className="hidden" onChange={handleFileUpload} />
                            </label>
                        </div>
                    </div>

                    <div className="flex-1 relative bg-white">
                        <CodeMirror
                            ref={inputEditorRef}
                            value={inputText}
                            onChange={(value) => setInputText(value)}
                            className="absolute inset-0"
                            height="100%"
                            width="100%"
                            basicSetup={{
                                lineNumbers: false,
                                foldGutter: false,
                                highlightActiveLine: false,
                                highlightActiveLineGutter: false
                            }}
                            extensions={[
                                formatEditorTheme,
                                EditorView.lineWrapping,
                                EditorState.tabSize.of(INDENT_SIZE),
                                editorKeymap,
                                placeholder('Paste input data here...'),
                                commentLinePlugin
                            ]}
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
