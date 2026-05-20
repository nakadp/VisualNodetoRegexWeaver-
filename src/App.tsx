import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Panel
} from 'reactflow';
import type { Connection, Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';

import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  StopCircle, 
  X, 
  Check
} from 'lucide-react';

import Sidebar from './components/Sidebar.tsx';
import OutputPanel from './components/OutputPanel.tsx';
import TesterPanel from './components/TesterPanel.tsx';
import Header from './components/Header.tsx';
import CustomNode from './nodes/CustomNode.tsx';
import { generateRegex } from './utils/regexGenerator';
import { reverseEngineer } from './utils/reverseEngineering';
import { evolveRegexAsync } from './utils/darwinMagic';
import type { EvolutionProgress } from './utils/darwinMagic';

import './App.css';

const nodeTypes = {
  text: CustomNode,
  charClass: CustomNode,
  anyChar: CustomNode,
  startAnchor: CustomNode,
  endAnchor: CustomNode,
  wordBoundary: CustomNode,
  quantifier: CustomNode,
  groupStart: CustomNode,
  groupEnd: CustomNode,
  or: CustomNode,
  email: CustomNode,
  number: CustomNode,
  ipv4: CustomNode,
  password: CustomNode,
};

const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'startAnchor',
    data: { label: 'Line Start', type: 'startAnchor' },
    position: { x: 50, y: 150 },
  },
];

const initialEdges: Edge[] = [];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [regex, setRegex] = useState<string>('');
  
  // Panel Collapse States
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  // Global Regex Flags
  const [flags, setFlags] = useState({
    caseInsensitive: false,
    multiline: false,
    dotAll: false,
  });

  // Darwin Magic Evolution Modal State
  const [showMagic, setShowMagic] = useState(false);
  const [magicPositives, setMagicPositives] = useState("a123!\nb456!\nc789!");
  const [magicNegatives, setMagicNegatives] = useState("123\nabc\na123\nxyz");
  const [evolving, setEvolving] = useState(false);
  const [evolutionProgress, setEvolutionProgress] = useState<EvolutionProgress | null>(null);
  const [evolvedPattern, setEvolvedPattern] = useState<string>('');
  const stopEvolutionRef = useRef<(() => void) | null | undefined>(null);

  // Live compile nodes to regex when nodes, edges, or flags change
  useEffect(() => {
    const generated = generateRegex(nodes, edges, flags);
    setRegex(generated);
  }, [nodes, edges, flags]);

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

      // Calculate position relative to container
      const position = { x: event.clientX - 300, y: event.clientY - 100 };
      
      // Default label mapping
      let label = type.charAt(0).toUpperCase() + type.slice(1);
      if (type === 'startAnchor') label = 'Line Start';
      if (type === 'endAnchor') label = 'Line End';
      if (type === 'wordBoundary') label = 'Word Boundary';
      if (type === 'charClass') label = 'Char Class';
      if (type === 'groupStart') label = 'Group Start';
      if (type === 'groupEnd') label = 'Group End';
      if (type === 'or') label = 'Alternation (OR)';

      const newNode: Node = {
        id: `${Date.now()}`,
        type,
        position,
        data: { 
          label,
          type,
          value: type === 'text' ? 'hello' : (type === 'charClass' ? 'a-z' : undefined)
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  // Decompile raw regex into Node Canvas
  const handleReverseEngineer = useCallback((regexStr: string) => {
    const { nodes: newNodes, edges: newEdges } = reverseEngineer(regexStr);
    if (newNodes.length > 0) {
      setNodes(newNodes);
      setEdges(newEdges);
      
      // Extract flags from the reverse engineered regex if any
      const match = regexStr.trim().match(/^\/(.*)\/([gimsuy]*)$/);
      if (match) {
        const flagStr = match[2];
        setFlags({
          caseInsensitive: flagStr.includes('i'),
          multiline: flagStr.includes('m'),
          dotAll: flagStr.includes('s'),
        });
      }
    }
  }, [setNodes, setEdges]);

  // Start GA evolution
  const startEvolution = () => {
    const positives = magicPositives.split('\n').map(s => s.trim()).filter(s => s);
    const negatives = magicNegatives.split('\n').map(s => s.trim()).filter(s => s);
    
    if (positives.length === 0) return;
    
    setEvolving(true);
    setEvolutionProgress(null);
    setEvolvedPattern('');
    
    const cancel = evolveRegexAsync(positives, negatives, {
      maxGenerations: 100,
      populationSize: 80,
      onProgress: (progress) => {
        setEvolutionProgress(progress);
      },
      onComplete: (bestPattern) => {
        setEvolving(false);
        setEvolvedPattern(bestPattern);
        stopEvolutionRef.current = null;
      }
    });
    
    stopEvolutionRef.current = cancel ?? null;
  };

  // Stop GA evolution
  const stopEvolution = () => {
    if (stopEvolutionRef.current) {
      stopEvolutionRef.current();
      stopEvolutionRef.current = null;
    }
    setEvolving(false);
  };

  // Close Evolution modal
  const closeMagicModal = () => {
    stopEvolution();
    setShowMagic(false);
    setEvolutionProgress(null);
    setEvolvedPattern('');
  };

  // Apply Evolved Regex back to canvas
  const applyEvolvedPattern = () => {
    if (evolvedPattern) {
      let finalRegex = evolvedPattern;
      if (!finalRegex.startsWith('/')) {
        finalRegex = `/${finalRegex}/g`;
      }
      handleReverseEngineer(finalRegex);
      setShowMagic(false);
      setEvolutionProgress(null);
      setEvolvedPattern('');
    }
  };

  // Dynamically inject onUpdate & onDelete callbacks for CustomNode interaction
  const enrichedNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onUpdate: (newData: any) => {
          setNodes((nds) =>
            nds.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, ...newData } } : n))
          );
        },
        onDelete: () => {
          setNodes((nds) => nds.filter((n) => n.id !== node.id));
          setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
        },
      },
    }));
  }, [nodes, setNodes, setEdges]);

  return (
    <div className="app-container">
      <Header onMagicClick={() => setShowMagic(true)} onReverseEngineer={handleReverseEngineer} />
      
      <div className="main-content">
        <Sidebar collapsed={leftCollapsed} />
        
        <div className="center-workspace">
          <div className="flow-wrapper" onDrop={onDrop} onDragOver={onDragOver}>
            <ReactFlow
              nodes={enrichedNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
            >
              <Background color="#334155" gap={20} />
              
              <Panel position="top-left" style={{ pointerEvents: 'auto' }}>
                <div className="glass p-2 rounded shadow-lg text-[10px] uppercase font-bold text-blue-400 tracking-widest">
                  Visual Logic Canvas
                </div>
              </Panel>
            </ReactFlow>
            
            {/* Panels Collapsible buttons */}
            <button 
              className="collapse-trigger left" 
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              title={leftCollapsed ? "Expand Nodes Library" : "Collapse Nodes Library"}
            >
              {leftCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            
            <button 
              className="collapse-trigger right" 
              onClick={() => setRightCollapsed(!rightCollapsed)}
              title={rightCollapsed ? "Expand Output Panel" : "Collapse Output Panel"}
            >
              {rightCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>

            <button 
              className="collapse-trigger bottom" 
              onClick={() => setBottomCollapsed(!bottomCollapsed)}
              title={bottomCollapsed ? "Expand Tester Panel" : "Collapse Tester Panel"}
            >
              {bottomCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
          
          <TesterPanel regex={regex} collapsed={bottomCollapsed} />
        </div>

        <OutputPanel 
          regex={regex} 
          nodes={nodes} 
          edges={edges} 
          collapsed={rightCollapsed} 
          flags={flags}
          setFlags={setFlags}
        />
      </div>

      {/* Darwinian Evolution Modal Overlay */}
      {showMagic && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Darwin Magic Regex Evolver</h3>
              <button onClick={closeMagicModal} className="icon-btn" title="Close Modal">
                <X size={16} />
              </button>
            </div>
            
            <div className="modal-body">
              {!evolving && !evolvedPattern ? (
                // Input Stage
                <>
                  <p className="text-xs text-gray-400 mb-4" style={{ margin: '0 0 16px 0', fontSize: '12px', lineHeight: '1.4' }}>
                    Describe your pattern by providing positive examples that must match, and negative examples that should not. Our Genetic Algorithm will automatically evolve the best pattern for you!
                  </p>
                  
                  <div className="darwin-grid">
                    <div className="darwin-column">
                      <label>Positive Matches (One per line)</label>
                      <textarea
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-sm text-blue-300 outline-none focus:border-blue-500 transition-colors"
                        value={magicPositives}
                        onChange={(e) => setMagicPositives(e.target.value)}
                        placeholder="apple&#10;banana&#10;cherry"
                      />
                    </div>
                    <div className="darwin-column">
                      <label>Negative Exclusions (One per line)</label>
                      <textarea
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-sm text-pink-300 outline-none focus:border-blue-500 transition-colors"
                        value={magicNegatives}
                        onChange={(e) => setMagicNegatives(e.target.value)}
                        placeholder="123&#10;orange&#10;grape"
                      />
                    </div>
                  </div>
                </>
              ) : (
                // Live Dashboard Stage
                <div className="evolution-dashboard">
                  <div className="evolution-stats-row">
                    <div className="stat-box">
                      <span className="label">Generation</span>
                      <span className="val">{evolutionProgress?.generation ?? 0}</span>
                    </div>
                    <div className="stat-box">
                      <span className="label">Best Fitness</span>
                      <span className="val success">
                        {evolutionProgress ? Math.round(evolutionProgress.bestFitness * 100) : 0}%
                      </span>
                    </div>
                    <div className="stat-box">
                      <span className="label">Status</span>
                      <span className="val" style={{ color: evolving ? 'var(--primary-hover)' : 'var(--success)' }}>
                        {evolving ? 'Running...' : 'Complete!'}
                      </span>
                    </div>
                  </div>

                  <div className="best-candidate-box">
                    <h5>Current Best Pattern</h5>
                    <div className="best-pattern-text">
                      /{(evolutionProgress?.bestPattern ?? evolvedPattern) || '...'}/
                    </div>
                  </div>

                  <div className="darwin-grid">
                    <div className="darwin-column">
                      <label>Positive Matches</label>
                      <div className="evolution-cases-list">
                        {(evolutionProgress?.positiveScores || []).map((item, idx) => (
                          <div key={idx} className={`case-item ${item.passed ? 'pass' : 'fail'}`}>
                            <span className="case-text">"{item.text}"</span>
                            <span className={`case-badge ${item.passed ? 'pass' : 'fail'}`}>
                              {item.passed ? 'Pass' : 'Fail'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="darwin-column">
                      <label>Negative Exclusions</label>
                      <div className="evolution-cases-list">
                        {(evolutionProgress?.negativeScores || []).map((item, idx) => (
                          <div key={idx} className={`case-item ${item.passed ? 'pass' : 'fail'}`}>
                            <span className="case-text">"{item.text}"</span>
                            <span className={`case-badge ${item.passed ? 'pass' : 'fail'}`}>
                              {item.passed ? 'Pass' : 'Fail'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {!evolving && !evolvedPattern ? (
                <>
                  <button onClick={closeMagicModal} className="header-btn">
                    Cancel
                  </button>
                  <button onClick={startEvolution} className="header-btn primary">
                    <Play size={12} style={{ marginRight: 6, display: 'inline', fill: 'white' }} />
                    Start Evolution
                  </button>
                </>
              ) : evolving ? (
                <button onClick={stopEvolution} className="header-btn" style={{ backgroundColor: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' }}>
                  <StopCircle size={12} style={{ marginRight: 6, display: 'inline' }} />
                  Stop
                </button>
              ) : (
                <>
                  <button onClick={closeMagicModal} className="header-btn">
                    Close
                  </button>
                  <button onClick={applyEvolvedPattern} className="header-btn primary">
                    <Check size={12} style={{ marginRight: 6, display: 'inline' }} />
                    Apply to Canvas
                  </button>
                </>
              )}
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
