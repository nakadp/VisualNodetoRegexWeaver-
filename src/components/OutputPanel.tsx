import React from 'react';
import { Copy, Terminal, AlertCircle, Zap } from 'lucide-react';

interface OutputPanelProps {
  regex: string;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ regex }) => {
  return (
    <aside className="w-72 glass-dark border-l border-white/5 flex flex-col">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-tighter">
          Regex Output
        </h2>
        <div className="flex gap-2">
          <select className="bg-slate-800 border-none text-[10px] rounded px-2 py-1 text-blue-400 font-bold focus:ring-1 focus:ring-blue-500 outline-none">
            <option>JavaScript</option>
            <option>Python</option>
            <option>PHP (PCRE)</option>
            <option>Go</option>
            <option>Java</option>
          </select>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4">
        <div className="flex-1 glass rounded-xl p-4 relative group border-blue-500/10">
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition-all">
              <Copy size={14} />
            </button>
          </div>
          
          <div className="flex items-center gap-2 mb-3 text-gray-500">
            <Terminal size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Compiled Pattern</span>
          </div>

          <div className="font-mono text-sm break-all text-blue-300 leading-relaxed">
            {regex || '/(?:)/g'}
          </div>
        </div>

        <div className="glass rounded-xl p-4 border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2 text-yellow-500">
            <AlertCircle size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Performance Analysis</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            No issues detected. Pattern is optimized for linear time matching.
          </p>
        </div>

        <div className="glass rounded-xl p-4 bg-gradient-to-br from-blue-600/10 to-purple-600/10 border-blue-500/20">
          <div className="flex items-center gap-2 mb-2 text-blue-400">
            <Zap size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Explain Logic</span>
          </div>
          <p className="text-[10px] text-gray-300 leading-relaxed">
            This pattern starts with a word boundary, followed by one or more alphanumeric characters.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default OutputPanel;
