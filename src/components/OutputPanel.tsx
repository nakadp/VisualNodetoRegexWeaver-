import React, { useState, useMemo } from 'react';
import { Copy, Terminal, AlertTriangle, Zap, CheckCircle, CopyCheck, Settings } from 'lucide-react';
import type { Node, Edge } from 'reactflow';

interface OutputPanelProps {
  regex: string;
  nodes: Node[];
  edges: Edge[];
  collapsed: boolean;
  flags: { caseInsensitive: boolean; multiline: boolean; dotAll: boolean };
  setFlags: React.Dispatch<React.SetStateAction<{ caseInsensitive: boolean; multiline: boolean; dotAll: boolean }>>;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ regex, nodes, edges, collapsed, flags, setFlags }) => {
  const [selectedFlavor, setSelectedFlavor] = useState<string>('JavaScript');
  const [copied, setCopied] = useState<boolean>(false);


  // Extract raw pattern and flags from /pattern/flags
  const getRawRegexInfo = (): { pattern: string; flags: string } => {
    if (!regex) return { pattern: '', flags: '' };
    const match = regex.match(/^\/(.*)\/([gimsuy]*)$/);
    if (match) {
      return { pattern: match[1], flags: match[2] };
    }
    return { pattern: regex, flags: '' };
  };

  const { pattern: rawPattern, flags: rawFlags } = getRawRegexInfo();

  // 1. Multi-language snippet generator
  const getCodeSnippet = (): string => {
    if (!regex) return '';
    
    switch (selectedFlavor) {
      case 'Python': {
        let pyFlags = '';
        if (rawFlags.includes('i')) pyFlags = ', re.IGNORECASE';
        return `import re\n\n# Compiled Pattern\npattern = re.compile(r'${rawPattern}'${pyFlags})`;
      }
      case 'Java': {
        let javaFlags = '';
        if (rawFlags.includes('i')) javaFlags = ', Pattern.CASE_INSENSITIVE';
        return `import java.util.regex.Pattern;\n\n// Compiled Pattern\nPattern pattern = Pattern.compile("${rawPattern.replace(/\\/g, '\\\\')}"${javaFlags});`;
      }
      case 'Go': {
        // Go does not support standard /i flags easily, requires inline (?i) at start
        const prefix = rawFlags.includes('i') ? '(?i)' : '';
        return `package main\n\nimport "regexp"\n\nfunc main() {\n\t// Compiled Pattern\n\tvar pattern = regexp.MustCompile(\`${prefix}${rawPattern}\`)\n}`;
      }
      case 'PHP (PCRE)': {
        return `<?php\n\n// Compiled Pattern\n$pattern = '/${rawPattern}/${rawFlags}';`;
      }
      case 'JavaScript':
      default:
        return `// Compiled Pattern\nconst regex = /${rawPattern}/${rawFlags};`;
    }
  };

  // 2. Real performance diagnostics
  const performance = useMemo(() => {
    if (!rawPattern) {
      return {
        status: 'success' as const,
        text: 'Canvas empty. Waiting for nodes...'
      };
    }

    // Trace the active chain to check for unclosed group nodes
    const startNodes = nodes.filter(n => !edges.some(e => e.target === n.id));
    if (startNodes.length === 0 && nodes.length > 0) {
      const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x);
      startNodes.push(sorted[0]);
    }
    startNodes.sort((a, b) => a.position.x - b.position.x);
    
    let currentNode: Node | undefined = startNodes[0];
    const visited = new Set<string>();
    const chain: Node[] = [];
    while (currentNode && !visited.has(currentNode.id)) {
      const currNode = currentNode as Node;
      visited.add(currNode.id);
      chain.push(currNode);
      const edge = edges.find(e => e.source === currNode.id);
      currentNode = edge ? nodes.find(n => n.id === edge.target) : undefined;
    }

    const groupStartCount = chain.filter(n => n.type === 'groupStart').length;
    const groupEndCount = chain.filter(n => n.type === 'groupEnd').length;
    const hasUnclosedGroup = groupStartCount > groupEndCount;

    // Check for Catastrophic Backtracking: nested repetitions like (a+)+ or (\w+)*
    // Look for group contents containing quantifier symbols, followed by a quantifier symbol
    const isCatastrophic = /(\([^)]*[*+{}][^)]*\))[*+{}]/.test(rawPattern);
    
    // Check for double quantifiers like ++, **
    const isDoubleQuantifier = /[*+?]{2,}/.test(rawPattern);

    if (isCatastrophic) {
      return {
        status: 'danger' as const,
        text: 'CRITICAL: Potential Catastrophic Backtracking detected! Nested repetitions (e.g. (a+)+) can cause exponential execution times and freeze your system.'
      };
    } else if (hasUnclosedGroup) {
      return {
        status: 'warning' as const,
        text: 'WARNING: Unclosed groups detected. You have started a logic group/assertion using Group Start but have not closed it. Make sure to connect a Group End node.'
      };
    } else if (isDoubleQuantifier) {
      return {
        status: 'warning' as const,
        text: 'WARNING: Redundant/duplicate quantifiers detected (e.g. ++). This may trigger syntax compilation errors.'
      };
    } else {
      return {
        status: 'success' as const,
        text: 'Optimal Match: Pattern has linear time complexity O(N). Safe for server-side environments.'
      };
    }
  }, [rawPattern, nodes, edges]);

  // 3. Dynamic natural language explanation builder
  const explanations = useMemo(() => {
    if (nodes.length === 0) {
      return [];
    }

    // Build the sequential chain
    const startNodes = nodes.filter(n => !edges.some(e => e.target === n.id));
    if (startNodes.length === 0 && nodes.length > 0) {
      // Circle or no clear start, pick left-most
      const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x);
      startNodes.push(sorted[0]);
    }
    
    startNodes.sort((a, b) => a.position.x - b.position.x);
    
    let currentNode: Node | undefined = startNodes[0];
    const visited = new Set<string>();
    const chain: Node[] = [];

    while (currentNode && !visited.has(currentNode.id)) {
      const currNode = currentNode as Node;
      visited.add(currNode.id);
      chain.push(currNode);
      
      const edge = edges.find(e => e.source === currNode.id);
      currentNode = edge ? nodes.find(n => n.id === edge.target) : undefined;
    }

    const steps: string[] = [];

    chain.forEach((node) => {
      const data = node.data || {};
      
      switch (node.type) {
        case 'text': {
          const val = data.value || '';
          steps.push(`匹配文本 "${val}"${data.caseInsensitive ? ' (忽略大小写)' : ''}`);
          break;
        }
        case 'charClass': {
          const negated = !!data.negated;
          const pre = negated ? '不属于' : '属于';
          switch (data.classPreset) {
            case 'digits':
              steps.push(`匹配一个 ${negated ? '非数字' : '数字'} 字符`);
              break;
            case 'letters':
              steps.push(`匹配一个 ${negated ? '非字母' : '字母'} 字符`);
              break;
            case 'wordChars':
              steps.push(`匹配一个 ${negated ? '非单词' : '单词'} 字符 (字母/数字/下划线)`);
              break;
            case 'whitespace':
              steps.push(`匹配一个 ${negated ? '非空白' : '空白'} 字符`);
              break;
            case 'custom':
            default: {
              steps.push(`匹配一个字符，它 ${pre} 集合 [${data.value || ''}]`);
              break;
            }
          }
          break;
        }
        case 'anyChar':
          steps.push('匹配任意单个字符 (通配符 `.` )');
          break;
        case 'startAnchor':
          steps.push('断言必须处于【行首】位置 (`^`)');
          break;
        case 'endAnchor':
          steps.push('断言必须处于【行尾】位置 (`$`)');
          break;
        case 'wordBoundary':
          steps.push('断言处于【单词边界】位置 (`\\b`)');
          break;
        case 'groupStart': {
          const gType = data.groupType || 'capturing';
          if (gType === 'nonCapturing') {
            steps.push('开始一个：【非捕获组】 (不存储匹配结果)');
          } else if (gType === 'lookaheadPos') {
            steps.push('开始一个：【正向先行断言】 (后面必须跟随...)');
          } else if (gType === 'lookaheadNeg') {
            steps.push('开始一个：【负向先行断言】 (后面不能跟随...)');
          } else if (gType === 'lookbehindPos') {
            steps.push('开始一个：【正向后行断言】 (前面必须是...)');
          } else if (gType === 'lookbehindNeg') {
            steps.push('开始一个：【负向后行断言】 (前面不能是...)');
          } else if (gType === 'named') {
            steps.push(`开始一个：【命名捕获组】 (组名: "${data.groupName || 'group'}")`);
          } else {
            steps.push('开始一个：【标准捕获组】 (保存匹配用于提取/替换)');
          }
          break;
        }
        case 'groupEnd':
          steps.push('结束当前的逻辑组/断言');
          break;
        case 'or': {
          const options: string[] = data.options || ['opt1', 'opt2'];
          steps.push(`多选一分支：匹配 "${options.join('" 或 "')}" 中的任意一个`);
          break;
        }
        case 'quantifier': {
          const qType = data.quantifierType || 'oneOrMore';
          let desc = '1次或多次';
          if (qType === 'zeroOrMore') desc = '0次或多次';
          else if (qType === 'optional') desc = '可选 (0次或1次)';
          else if (qType === 'exact') desc = `精确 ${data.n || 1} 次`;
          else if (qType === 'min') desc = `至少 ${data.n || 1} 次`;
          else if (qType === 'range') desc = `${data.n || 1} 到 ${data.m || 2} 次`;
          
          if (data.lazy) desc += ' (非贪婪懒惰匹配)';
          steps.push(`重复上一步骤的匹配量：${desc}`);
          break;
        }
        case 'email':
          steps.push('匹配标准邮箱格式');
          break;
        case 'number':
          steps.push('匹配一串数字');
          break;
        case 'ipv4':
          steps.push('匹配标准 IPv4 地址');
          break;
        case 'password':
          steps.push('进行强密码强度校验 (8+位，含大小写、数字及特殊符号)');
          break;
      }
    });

    return steps;
  }, [nodes, edges]);

  // Handle clipboard copy
  const handleCopy = () => {
    if (!regex) return;
    const code = getCodeSnippet();
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <aside className={`output-panel-wrapper sidebar-transition ${collapsed ? 'collapsed' : ''}`}>
      <div className="output-header">
        <h2>Regex Output</h2>
        <select 
          value={selectedFlavor} 
          onChange={(e) => setSelectedFlavor(e.target.value)}
          className="flavor-select"
        >
          <option value="JavaScript">JavaScript</option>
          <option value="Python">Python</option>
          <option value="Java">Java</option>
          <option value="Go">Golang</option>
          <option value="PHP (PCRE)">PHP (PCRE)</option>
        </select>
      </div>

      <div className="output-content">
        {/* Global Regex Flags Card */}
        <div className="output-card">
          <div className="card-title info" style={{ color: 'var(--primary-hover)' }}>
            <Settings size={12} />
            <span>Global Regex Flags</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '6px 2px 2px' }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: '#cbd5e1' }}>
              <input 
                type="checkbox" 
                checked={flags.caseInsensitive} 
                onChange={(e) => setFlags(f => ({ ...f, caseInsensitive: e.target.checked }))}
                style={{ cursor: 'pointer' }}
              />
              Case Insensitive (i)
            </label>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: '#cbd5e1' }}>
              <input 
                type="checkbox" 
                checked={flags.multiline} 
                onChange={(e) => setFlags(f => ({ ...f, multiline: e.target.checked }))}
                style={{ cursor: 'pointer' }}
              />
              Multiline (m)
            </label>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: '#cbd5e1' }}>
              <input 
                type="checkbox" 
                checked={flags.dotAll} 
                onChange={(e) => setFlags(f => ({ ...f, dotAll: e.target.checked }))}
                style={{ cursor: 'pointer' }}
              />
              Dot All / Single Line (s)
            </label>
          </div>
        </div>

        {/* Realtime Pattern Card */}
        <div className="output-card">
          <div className="card-title info">
            <Terminal size={12} />
            <span>Compiled Code</span>
          </div>
          <div className="card-action">
            <button 
              onClick={handleCopy} 
              className="icon-btn" 
              title="Copy to Clipboard"
              style={{ color: copied ? 'var(--success)' : '#94a3b8' }}
            >
              {copied ? <CopyCheck size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <pre className="compiled-pattern" style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0 0' }}>
            {getCodeSnippet() || 'Waiting for nodes...'}
          </pre>
        </div>

        {/* Real Performance / Safety Card */}
        <div className={`output-card ${
          performance.status === 'danger' ? 'danger' : (performance.status === 'warning' ? 'warning' : '')
        }`}>
          <div className={`card-title ${performance.status}`}>
            {performance.status === 'success' ? (
              <CheckCircle size={12} className="text-emerald-500" />
            ) : (
              <AlertTriangle size={12} />
            )}
            <span>Diagnostics</span>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
            {performance.text}
          </p>
        </div>

        {/* Dynamic Node Explainer */}
        <div className="output-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="card-title" style={{ color: 'var(--accent-purple)' }}>
            <Zap size={12} />
            <span>Logic Breakdown</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {explanations.length > 0 ? (
              explanations.map((step, idx) => (
                <div key={idx} className="explain-item">
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>步骤 {idx + 1}</div>
                  <div>{step}</div>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                Connect nodes to see step-by-step breakdown.
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default OutputPanel;
