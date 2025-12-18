import { MutableRefObject } from 'react';
import { VisualizerHandle } from '../components/Visualizer';

export const useImageExport = (visualizerRef: MutableRefObject<VisualizerHandle | null>) => {

  const createBlobAndFilename = async () => {
    if (!visualizerRef.current) return null;
    const blob = await visualizerRef.current.getCanvasBlob();
    if (!blob) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `visualization_${timestamp}.png`;
    return { blob, filename };
  };

  const handleSaveImage = async () => {
    const result = await createBlobAndFilename();
    if (!result) return;
    const { blob, filename } = result;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return { handleSaveImage, generateImageBlob: createBlobAndFilename };
};