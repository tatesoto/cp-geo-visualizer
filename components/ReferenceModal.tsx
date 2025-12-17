import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Language } from '../types';
import { t } from '../constants/translations';

interface ReferenceModalProps {
  onClose: () => void;
  lang: Language;
}

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
);

const Row = ({ syntax, desc }: { syntax: React.ReactNode, desc: string }) => (
  <tr className="border-b border-gray-100 last:border-0">
    <td className="py-2 pr-4 font-mono text-xs text-gray-800 whitespace-nowrap align-top">{syntax}</td>
    <td className="py-2 text-xs text-gray-600 align-top">{desc}</td>
  </tr>
);

const ReferenceModal: React.FC<ReferenceModalProps> = ({ onClose, lang }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">{t(lang, 'syntaxRef')}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-md hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-8">
          
          {/* Section: Control Flow */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                {t(lang, 'ref_control')}
            </h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                    <th className="py-1 text-xs font-medium text-gray-500 w-1/3">{t(lang, 'ref_col_syntax')}</th>
                    <th className="py-1 text-xs font-medium text-gray-500">{t(lang, 'ref_col_desc')}</th>
                </tr>
              </thead>
              <tbody>
                <Row syntax={<>Read <span className="text-gray-400">vars...</span></>} desc={t(lang, 'ref_desc_read')} />
                <Row syntax={<>
                    <div>rep <span className="text-blue-600">N</span>:</div>
                    <div className="pl-4 text-gray-400">...</div>
                </>} desc={t(lang, 'ref_desc_rep')} />
              </tbody>
            </table>
          </section>

          {/* Section: Shapes */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-green-500 rounded-full"></span>
                {t(lang, 'ref_shapes')}
            </h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                    <th className="py-1 text-xs font-medium text-gray-500 w-1/3">{t(lang, 'ref_col_syntax')}</th>
                    <th className="py-1 text-xs font-medium text-gray-500">{t(lang, 'ref_col_desc')}</th>
                </tr>
              </thead>
              <tbody>
                <Row syntax="Point x y" desc={t(lang, 'ref_desc_point')} />
                <Row syntax="Line x1 y1 x2 y2" desc={t(lang, 'ref_desc_line')} />
                <Row syntax="Seg x1 y1 x2 y2" desc={t(lang, 'ref_desc_seg')} />
                <Row syntax="Circle x y r" desc={t(lang, 'ref_desc_circle')} />
                <Row syntax="Poly x1 y1 x2 y2 ..." desc={t(lang, 'ref_desc_poly')} />
                <Row syntax="Text x y string" desc={t(lang, 'ref_desc_text')} />
              </tbody>
            </table>
          </section>

          {/* Section: Advanced Polygon */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                {t(lang, 'ref_poly_adv')}
            </h3>
            <div className="text-xs text-gray-600 mb-2">
                {t(lang, 'ref_poly_adv_intro')}
            </div>
            <table className="w-full text-left border-collapse">
               <tbody>
                <Row syntax="Push x y" desc={t(lang, 'ref_desc_push')} />
                <Row syntax="Poly" desc={`${t(lang, 'ref_desc_poly')} ${t(lang, 'ref_poly_uses_pushed')}`} />
               </tbody>
            </table>
            
            <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">{t(lang, 'ref_example')}</p>
                <pre className="font-mono text-xs text-gray-700">
{`Read n      // Vertices count
rep n:
    Read x y
    Push x y
Poly        // Draw polygon from pushed points`}
                </pre>
            </div>
          </section>

          {/* Section: Colors & Labels */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                {t(lang, 'ref_colors')}
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
               {t(lang, 'ref_colors_desc')}
            </p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">{t(lang, 'ref_example')}</p>
                <div className="space-y-1 font-mono text-xs text-gray-700">
                    <div>Point 10 20 <span className="text-pink-600">"#ff0000"</span></div>
                    <div>Line 0 0 100 100 <span className="text-blue-600">"My Line"</span></div>
                    <div>Circle 50 50 10 <span className="text-pink-600">"#00ff00"</span> <span className="text-blue-600">"Target"</span></div>
                </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            {t(lang, 'close')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReferenceModal;