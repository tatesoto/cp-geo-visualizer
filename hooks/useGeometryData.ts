import { useState, useEffect } from 'react';
import { Shape } from '../types';
import { parseInput } from '../services/parser';
import { SNIPPETS, SnippetKey } from '../constants/snippets';

const INITIAL_KEY: SnippetKey = 'groups';

export const useGeometryData = (executionTimeout: number) => {
  const [inputText, setInputText] = useState<string>(SNIPPETS[INITIAL_KEY].input);
  const [formatText, setFormatText] = useState<string>(SNIPPETS[INITIAL_KEY].format);
  const [parsedShapes, setParsedShapes] = useState<Shape[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleParse = () => {
    setIsParsing(true);
    
    // Increase timeout to ensure the browser has enough time 
    // to repaint the UI with the loading spinner before the main thread is blocked.
    setTimeout(() => {
        const result = parseInput(formatText, inputText, executionTimeout);
        
        if (result.error) {
            setError(result.error);
        } else {
            setError(null);
            setParsedShapes(result.shapes);
        }
        setIsParsing(false);
    }, 100);
  };

  // Initial parse on mount
  useEffect(() => {
    handleParse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    inputText,
    setInputText,
    formatText,
    setFormatText,
    parsedShapes,
    error,
    isParsing,
    handleParse
  };
};