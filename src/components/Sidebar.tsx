import React from 'react';
import { 
  Type, 
  Hash, 
  AtSign, 
  Anchor, 
  Repeat, 
  Square, 
  ChevronRight,
  Database,
  ShieldCheck,
  MousePointer2
} from 'lucide-react';

const Sidebar = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodeCategories = [
    {
      name: 'Basic Blocks',
      nodes: [
        { type: 'text', label: 'Plain Text', icon: <Type size={16} /> },
        { type: 'charClass', label: 'Char Class', icon: <Square size={16} /> },
        { type: 'anyChar', label: 'Any Char', icon: <MousePointer2 size={16} /> },
      ]
    },
    {
      name: 'Anchors & Logic',
      nodes: [
        { type: 'startAnchor', label: 'Line Start', icon: <Anchor size={16} /> },
        { type: 'endAnchor', label: 'Line End', icon: <Anchor size={16} /> },
        { type: 'quantifier', label: 'Quantifier', icon: <Repeat size={16} /> },
      ]
    },
    {
      name: 'Presets',
      nodes: [
        { type: 'email', label: 'Email', icon: <AtSign size={16} /> },
        { type: 'number', label: 'Number', icon: <Hash size={16} /> },
        { type: 'ipv4', label: 'IPv4', icon: <Database size={16} /> },
        { type: 'password', label: 'Password', icon: <ShieldCheck size={16} /> },
      ]
    }
  ];

  return (
    <aside className="w-60 glass-dark border-r border-white/5 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-tighter">
          Nodes Library
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {nodeCategories.map((category) => (
          <div key={category.name} className="space-y-3">
            <h3 className="text-[10px] font-semibold text-gray-400 uppercase flex items-center gap-1">
              <ChevronRight size={10} className="text-blue-500" />
              {category.name}
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {category.nodes.map((node) => (
                <div
                  key={node.type}
                  className="flex items-center gap-3 p-3 rounded-xl glass hover:bg-white/5 cursor-grab active:cursor-grabbing transition-all border border-white/5 hover:border-blue-500/50 group"
                  onDragStart={(event) => onDragStart(event, node.type)}
                  draggable
                >
                  <div className="p-2 rounded-lg bg-slate-800 text-blue-400 group-hover:text-white transition-colors">
                    {node.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                    {node.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 glass m-3 rounded-xl border-blue-500/20">
        <div className="text-[10px] text-blue-400 font-bold mb-1">PRO TIP</div>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          Drag nodes onto the canvas and connect them to build your regex logic chain.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
