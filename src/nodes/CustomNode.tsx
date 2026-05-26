import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Trash2, Plus, Type, Square, MousePointer2, Anchor, Repeat, FolderPlus, FolderMinus, GitBranch, Settings, Link2 } from 'lucide-react';

const CustomNode: React.FC<NodeProps> = ({ data, selected }) => {
  const onUpdate = data.onUpdate || (() => {});
  const onDelete = data.onDelete || (() => {});

  const renderIcon = () => {
    switch (data.type) {
      case 'text': return <Type size={12} className="text-blue-400" />;
      case 'charClass': return <Square size={12} className="text-purple-400" />;
      case 'anyChar': return <MousePointer2 size={12} className="text-teal-400" />;
      case 'startAnchor':
      case 'endAnchor':
      case 'wordBoundary':
        return <Anchor size={12} className="text-orange-400" />;
      case 'quantifier': return <Repeat size={12} className="text-pink-400" />;
      case 'groupStart': return <FolderPlus size={12} className="text-indigo-400" />;
      case 'groupEnd': return <FolderMinus size={12} className="text-gray-400" />;
      case 'or': return <GitBranch size={12} className="text-green-400" />;
      case 'backreference': return <Link2 size={12} className="text-teal-400" />;
      default: return <Settings size={12} className="text-blue-400" />;
    }
  };

  const getBorderColor = () => {
    if (selected) return 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]';
    switch (data.type) {
      case 'text': return 'border-blue-500/25 bg-blue-950/20';
      case 'charClass': return 'border-purple-500/25 bg-purple-950/20';
      case 'quantifier': return 'border-pink-500/25 bg-pink-950/20';
      case 'groupStart':
      case 'groupEnd':
        return 'border-indigo-500/25 bg-indigo-950/20';
      case 'or': return 'border-green-500/25 bg-green-950/20';
      case 'backreference': return 'border-teal-500/25 bg-teal-950/20';
      default: return 'border-slate-800 bg-slate-900/60';
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ value: e.target.value });
  };

  const handleCheckboxChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ [field]: e.target.checked });
  };

  const handleSelectChange = (field: string) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ [field]: e.target.value });
  };

  const renderNodeBody = () => {
    switch (data.type) {
      case 'text':
        return (
          <div className="node-body">
            <div className="node-form-group">
              <label>Match Text</label>
              <input 
                type="text" 
                placeholder="e.g. hello" 
                value={data.value || ''} 
                onChange={handleTextChange}
              />
            </div>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={!!data.caseInsensitive} 
                onChange={handleCheckboxChange('caseInsensitive')}
              />
              Ignore Case
            </label>
          </div>
        );

      case 'charClass':
        return (
          <div className="node-body">
            <div className="node-form-group">
              <label>Class Preset</label>
              <select value={data.classPreset || 'custom'} onChange={handleSelectChange('classPreset')}>
                <option value="custom">Custom Set</option>
                <option value="digits">Digits (0-9)</option>
                <option value="letters">Letters (a-zA-Z)</option>
                <option value="wordChars">Word Chars (\w)</option>
                <option value="whitespace">Whitespace (\s)</option>
              </select>
            </div>
            {(!data.classPreset || data.classPreset === 'custom') && (
              <div className="node-form-group">
                <label>Characters</label>
                <input 
                  type="text" 
                  placeholder="e.g. a-z0-9" 
                  value={data.value || ''} 
                  onChange={handleTextChange}
                />
              </div>
            )}
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={!!data.negated} 
                onChange={handleCheckboxChange('negated')}
              />
              Negate Set ([^...])
            </label>
          </div>
        );

      case 'quantifier':
        return (
          <div className="node-body">
            <div className="node-form-group">
              <label>Type</label>
              <select value={data.quantifierType || 'oneOrMore'} onChange={handleSelectChange('quantifierType')}>
                <option value="oneOrMore">1 or more (+)</option>
                <option value="zeroOrMore">0 or more (*)</option>
                <option value="optional">Optional (?)</option>
                <option value="exact">Exactly N times</option>
                <option value="range">Between N and M</option>
                <option value="min">At least N times</option>
              </select>
            </div>
            {['exact', 'range', 'min'].includes(data.quantifierType) && (
              <div className="node-form-row">
                <div className="node-form-group">
                  <label>N</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={data.n || 1} 
                    onChange={(e) => onUpdate({ n: parseInt(e.target.value) || 1 })}
                  />
                </div>
                {data.quantifierType === 'range' && (
                  <div className="node-form-group">
                    <label>M</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={data.m || 2} 
                      onChange={(e) => onUpdate({ m: parseInt(e.target.value) || 2 })}
                    />
                  </div>
                )}
              </div>
            )}
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={!!data.lazy} 
                onChange={handleCheckboxChange('lazy')}
              />
              Lazy Match (?)
            </label>
          </div>
        );

      case 'groupStart':
        return (
          <div className="node-body">
            <div className="node-form-group">
              <label>Group Type</label>
              <select value={data.groupType || 'capturing'} onChange={handleSelectChange('groupType')}>
                <option value="capturing">Capturing Group ( )</option>
                <option value="nonCapturing">Non-Capturing (?: )</option>
                <option value="lookaheadPos">Followed By (?= )</option>
                <option value="lookaheadNeg">Not Followed By (?! )</option>
                <option value="lookbehindPos">Preceded By (?&lt;= )</option>
                <option value="lookbehindNeg">Not Preceded By (?&lt;! )</option>
                <option value="named">Named Capture Group</option>
              </select>
            </div>
            {data.groupType === 'named' && (
              <div className="node-form-group">
                <label>Group Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. id" 
                  value={data.groupName || ''} 
                  onChange={(e) => onUpdate({ groupName: e.target.value })}
                />
              </div>
            )}
          </div>
        );

      case 'groupEnd':
        return (
          <div className="node-body">
            <span className="text-[11px] text-gray-500 font-semibold uppercase">Closes open group</span>
          </div>
        );

      case 'or': {
        const options = data.options || ['opt1', 'opt2'];
        const handleOptionChange = (index: number, val: string) => {
          const newOptions = [...options];
          newOptions[index] = val;
          onUpdate({ options: newOptions });
        };
        const addOption = () => {
          onUpdate({ options: [...options, `opt${options.length + 1}`] });
        };
        const removeOption = (index: number) => {
          if (options.length <= 2) return; // Keep at least 2 options
          const newOptions = options.filter((_: string, i: number) => i !== index);
          onUpdate({ options: newOptions });
        };
        return (
          <div className="node-body">
            <label className="text-[9px] color-[#64748b] font-semibold uppercase block mb-1">Alternatives</label>
            {options.map((opt: string, idx: number) => (
              <div key={idx} className="dynamic-option-item">
                <input 
                  type="text" 
                  value={opt} 
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                />
                {options.length > 2 && (
                  <button 
                    onClick={() => removeOption(idx)}
                    className="p-1 text-gray-500 hover:text-red-400 bg-transparent border-none cursor-pointer"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button onClick={addOption} className="add-option-btn mt-1">
              <Plus size={10} style={{ marginRight: 4 }} /> Add Option
            </button>
          </div>
        );
      }

      case 'email':
      case 'number':
      case 'ipv4':
      case 'password':
        return (
          <div className="node-body">
            <span className="text-[11px] text-blue-400/80 font-mono font-semibold">Preset validation pattern</span>
          </div>
        );

      case 'anyChar':
        return (
          <div className="node-body">
            <span className="text-[11px] text-teal-400/80 font-semibold uppercase">Matches any single character</span>
          </div>
        );

      case 'startAnchor':
        return (
          <div className="node-body">
            <span className="text-[11px] text-orange-400/80 font-semibold uppercase">Asserts start of line (^)</span>
          </div>
        );

      case 'endAnchor':
        return (
          <div className="node-body">
            <span className="text-[11px] text-orange-400/80 font-semibold uppercase">Asserts end of line ($)</span>
          </div>
        );

      case 'wordBoundary':
        return (
          <div className="node-body">
            <span className="text-[11px] text-orange-400/80 font-semibold uppercase">Asserts word boundary (\b)</span>
          </div>
        );

      case 'backreference':
        return (
          <div className="node-body">
            <div className="node-form-group">
              <label>Group Index / Name</label>
              <input 
                type="text" 
                placeholder="e.g. 1" 
                value={data.groupIndex || '1'} 
                onChange={(e) => onUpdate({ groupIndex: e.target.value })}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`custom-node-container glass sidebar-transition ${getBorderColor()}`}>
      <Handle type="target" position={Position.Left} />
      
      <div className="node-header">
        <div className="node-title-group">
          {renderIcon()}
          <span className="node-badge">{data.type || 'Node'}</span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="node-delete-btn"
          title="Delete Node"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="node-label-text">
        {data.label}
      </div>

      {renderNodeBody()}

      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default CustomNode;
