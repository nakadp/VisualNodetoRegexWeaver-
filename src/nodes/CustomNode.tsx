import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Settings2, X } from 'lucide-react';

const CustomNode: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={`px-4 py-3 shadow-xl rounded-xl glass min-w-[150px] border-2 transition-all ${selected ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-white/5'}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500 border-2 border-slate-900" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-blue-500/20 text-blue-400">
            {data.icon || <Settings2 size={12} />}
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{data.type || 'Node'}</span>
        </div>
        <button className="text-gray-600 hover:text-red-400 transition-colors">
          <X size={12} />
        </button>
      </div>

      <div className="text-sm font-semibold text-white mb-1">
        {data.label}
      </div>

      {data.value !== undefined && (
        <div className="mt-2 pt-2 border-t border-white/5">
           <input 
             className="w-full bg-slate-800/50 border-none rounded px-2 py-1 text-xs text-blue-300 outline-none focus:ring-1 focus:ring-blue-500/50"
             value={data.value}
             readOnly
           />
        </div>
      )}

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500 border-2 border-slate-900" />
    </div>
  );
};

export default CustomNode;
