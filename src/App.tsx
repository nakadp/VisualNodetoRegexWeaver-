import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Panel
} from 'reactflow';
import type { Connection, Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';

import Sidebar from './components/Sidebar.tsx';
import OutputPanel from './components/OutputPanel.tsx';
import TesterPanel from './components/TesterPanel.tsx';
import Header from './components/Header.tsx';
import CustomNode from './nodes/CustomNode.tsx';
import { generateRegex } from './utils/regexGenerator';
import { evolveRegex } from './utils/darwinMagic';

import './App.css';

const nodeTypes = {
  text: CustomNode,
  charClass: CustomNode,
  anyChar: CustomNode,
  startAnchor: CustomNode,
  endAnchor: CustomNode,
  quantifier: CustomNode,
  email: CustomNode,
  number: CustomNode,
  ipv4: CustomNode,
  password: CustomNode,
};

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'startAnchor',
    data: { label: 'Start of Line', type: 'startAnchor' },
    position: { x: 50, y: 150 },
  },
];

const initialEdges: Edge[] = [];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [regex, setRegex] = useState<string>('');
  const [showMagic, setShowMagic] = useState(false);
  const [magicInput, setMagicInput] = useState('');

  useEffect(() => {
    const generated = generateRegex(nodes, edges);
    setRegex(generated);
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = { x: event.clientX - 300, y: event.clientY - 100 };
      const newNode = {
        id: `${Date.now()}`,
        type,
        position,
        data: { 
          label: type.charAt(0).toUpperCase() + type.slice(1),
          type: type,
          value: type === 'text' ? 'hello' : (type === 'charClass' ? 'a-z' : undefined)
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const handleMagic = () => {
    const inputs = magicInput.split(',').map(s => s.trim()).filter(s => s);
    const evolved = evolveRegex(inputs);
    if (evolved) {
      setRegex(evolved);
      setShowMagic(false);
      // For now, we just update the regex string. 
      // In a full version, we'd clear the graph and rebuild nodes.
    }
  };

  return (
    <div className="app-container">
      <Header onMagicClick={() => setShowMagic(true)} />
      <div className="main-content">
        <Sidebar />
        <div className="flow-wrapper" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#334155" gap={20} />
            <Controls />
            <MiniMap 
              style={{ backgroundColor: '#1e293b' }} 
              maskColor="rgba(15, 23, 42, 0.6)"
            />
            <Panel position="top-right">
               <div className="glass p-2 rounded shadow-lg text-[10px] uppercase font-bold text-blue-400 tracking-widest">
                 Visual Logic Canvas
               </div>
            </Panel>
          </ReactFlow>
        </div>
        <OutputPanel regex={regex} />
      </div>
      <TesterPanel regex={regex} />

      {showMagic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-dark w-full max-w-md rounded-2xl p-6 shadow-2xl border border-blue-500/30">
            <h2 className="text-xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Darwin Magic
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Enter examples separated by commas. We'll evolve the best regex for you.
            </p>
            <textarea
              className="w-full h-32 bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-blue-300 outline-none focus:border-blue-500 transition-colors"
              placeholder="apple, banana, cherry..."
              value={magicInput}
              onChange={(e) => setMagicInput(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowMagic(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleMagic}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition-all shadow-lg shadow-blue-500/20"
              >
                Evolve Logic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppWithProvider() {
  return (
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  );
}
