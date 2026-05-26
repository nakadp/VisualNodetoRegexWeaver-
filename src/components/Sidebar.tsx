import React from 'react';
import { 
  Type, 
  Hash, 
  AtSign, 
  Anchor, 
  Repeat, 
  Square, 
  Database,
  ShieldCheck,
  MousePointer2,
  FolderMinus,
  FolderPlus,
  GitBranch,
  SearchCode,
  Link2
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodeCategories = [
    {
      name: 'Basic Blocks',
      nodes: [
        { type: 'text', label: 'Plain Text', icon: <Type size={14} />, desc: 'Match exact text sequence' },
        { type: 'charClass', label: 'Char Class', icon: <Square size={14} />, desc: 'Match set of characters (e.g. [a-z])' },
        { type: 'anyChar', label: 'Any Char', icon: <MousePointer2 size={14} />, desc: 'Match any character (.)' },
      ]
    },
    {
      name: 'Anchors & Boundaries',
      nodes: [
        { type: 'startAnchor', label: 'Line Start', icon: <Anchor size={14} />, desc: 'Match start of line (^)' },
        { type: 'endAnchor', label: 'Line End', icon: <Anchor size={14} />, desc: 'Match end of line ($)' },
        { type: 'wordBoundary', label: 'Word Boundary', icon: <SearchCode size={14} />, desc: 'Match boundary between word/non-word' },
      ]
    },
    {
      name: 'Groups & Logic',
      nodes: [
        { type: 'groupStart', label: 'Group Start', icon: <FolderPlus size={14} />, desc: 'Start group / lookaround (' },
        { type: 'groupEnd', label: 'Group End', icon: <FolderMinus size={14} />, desc: 'Close open group / lookaround )' },
        { type: 'quantifier', label: 'Quantifier', icon: <Repeat size={14} />, desc: 'Specify count (+, *, ?, {n,m})' },
        { type: 'or', label: 'Alternation (OR)', icon: <GitBranch size={14} />, desc: 'Match alternative strings (A|B)' },
        { type: 'backreference', label: 'Backreference', icon: <Link2 size={14} />, desc: 'Match same text matched by previous group (\\1)' },
      ]
    },
    {
      name: 'Common Presets',
      nodes: [
        { type: 'email', label: 'Email Address', icon: <AtSign size={14} />, desc: 'Match standard email regex' },
        { type: 'number', label: 'Number', icon: <Hash size={14} />, desc: 'Match 1 or more digits' },
        { type: 'ipv4', label: 'IPv4 Address', icon: <Database size={14} />, desc: 'Match IPv4 address formats' },
        { type: 'password', label: 'Strong Password', icon: <ShieldCheck size={14} />, desc: 'Require numbers, letters, symbols' },
      ]
    }
  ];

  return (
    <aside className={`sidebar-wrapper sidebar-transition ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2>Nodes Library</h2>
      </div>
      
      <div className="sidebar-content">
        {nodeCategories.map((category) => (
          <div key={category.name} className="category-group">
            <h3 className="category-title">
              {category.name}
            </h3>
            <div>
              {category.nodes.map((node) => (
                <div
                  key={node.type}
                  className="node-item"
                  onDragStart={(event) => onDragStart(event, node.type)}
                  draggable
                  title={node.desc}
                >
                  <div className="node-icon">
                    {node.icon}
                  </div>
                  <span className="node-label">
                    {node.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-tip">
        <h4>Workflow Tip</h4>
        <p>
          Drag components into the editor, fill out properties, and chain them left-to-right to compile regex.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
