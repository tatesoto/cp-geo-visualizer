import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Language } from '../types';
import { t } from '../constants/translations';

interface ReferenceModalProps {
  onClose: () => void;
  lang: Language;
}

const Row = ({ syntax, desc }: { syntax: React.ReactNode, desc: string }) => (
  <tr className="border-b border-gray-100 last:border-0">
    <td className="py-2 pr-4 font-mono text-xs text-gray-800 whitespace-nowrap align-top">{syntax}</td>
    <td className="py-2 text-xs text-gray-600 align-top">{desc}</td>
  </tr>
);

const ExampleBlock = ({ label, format, input }: { label: string, format: string, input?: string }) => (
    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-3">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
        <div className="flex gap-4">
            <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-400 mb-1">Format Script</div>
                <pre className="font-mono text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">
                    {format}
                </pre>
            </div>
            {input && (
                <div className="flex-1 border-l border-gray-200 pl-4 min-w-0">
                    <div className="text-[10px] text-gray-400 mb-1">Input Data</div>
                    <pre className="font-mono text-xs text-gray-700 leading-relaxed overflow-x-auto whitespace-pre">
                        {input}
                    </pre>
                </div>
            )}
        </div>
    </div>
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
          
          {/* 1. Section: Control Flow */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                {t(lang, 'ref_control')}
            </h3>
            <table className="w-full text-left border-collapse mb-2">
              <thead>
                <tr className="border-b border-gray-200">
                    <th className="py-1 text-xs font-medium text-gray-500 w-1/3">{t(lang, 'ref_col_syntax')}</th>
                    <th className="py-1 text-xs font-medium text-gray-500">{t(lang, 'ref_col_desc')}</th>
                </tr>
              </thead>
              <tbody>
                <Row syntax={<>Read <span className="text-gray-400">vars...</span></>} desc={t(lang, 'ref_desc_read')} />
                <Row syntax={<>
                    <div>rep <span className="text-pink-600">[i]</span> <span className="text-blue-600">N</span>:</div>
                    <div className="pl-4 text-gray-400">...</div>
                </>} desc={t(lang, 'ref_desc_rep')} />
              </tbody>
            </table>
            
            <ExampleBlock 
                label={t(lang, 'ref_example')}
                format={`Read n m
rep n:
    rep i m:
        Point 2-i i*i/2`}
                input={`3 5`}
            />
          </section>

          {/* 2. Section: Shapes */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-green-500 rounded-full"></span>
                {t(lang, 'ref_shapes')}
            </h3>
            <table className="w-full text-left border-collapse mb-2">
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

            <ExampleBlock 
                label={t(lang, 'ref_example')}
                format={`Read x y r
Circle x y r
// Fixed coordinates
Line 0 0 100 100`}
                input={`50 50 20`}
            />
          </section>

          {/* 3. Section: Advanced Polygon */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                {t(lang, 'ref_poly_adv')}
            </h3>
            <div className="text-xs text-gray-600 mb-2">
                {t(lang, 'ref_poly_adv_intro')}
            </div>
            <table className="w-full text-left border-collapse mb-2">
               <tbody>
                <Row syntax="Push x y" desc={t(lang, 'ref_desc_push')} />
                <Row syntax="Poly" desc={`${t(lang, 'ref_desc_poly')} ${t(lang, 'ref_poly_uses_pushed')}`} />
               </tbody>
            </table>

            <ExampleBlock 
                label={t(lang, 'ref_example')}
                format={`Read n
rep n:
    Read x y
    Push x y
Poly`}
                input={`3
0 0
50 0
25 40`}
            />
          </section>

          {/* 4. Section: Groups */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-yellow-500 rounded-full"></span>
                {t(lang, 'ref_groups')}
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
               {t(lang, 'ref_group_detail')}
            </p>
            <table className="w-full text-left border-collapse mb-2">
               <tbody>
                <Row syntax={<>
                    <div>Group <span className="text-blue-600">ID</span>:</div>
                    <div className="pl-4 text-gray-400">...</div>
                </>} desc={t(lang, 'ref_desc_group')} />
               </tbody>
            </table>
            
            <ExampleBlock 
                label={t(lang, 'ref_example')}
                format={`Read t         // Number of cases
rep i t:       // Loop t times
    Group i:   // Group 0, Group 1...
        Read n
        rep n:
            Read x y
            Point x y`}
                input={`2           // t=2
3           // Case 0 (n=3)
0 0
10 10
20 0
2           // Case 1 (n=2)
50 50
60 60`}
            />
          </section>

          {/* 5. Section: Colors & Labels */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                {t(lang, 'ref_colors')}
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
               {t(lang, 'ref_colors_desc')}
            </p>

             <ExampleBlock 
                label={t(lang, 'ref_example')}
                format={`Point 10 20 "#ff0000"
Line 0 0 100 100 "Diagonal"
// Variables allowed
Read r
Circle 50 50 r "Target" "#00ff00"`}
                input={`10`}
            />
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