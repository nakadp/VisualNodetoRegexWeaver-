import React, { useState, useMemo } from 'react';
import { Beaker, Search, Replace, Layers, AlertTriangle } from 'lucide-react';

interface TesterPanelProps {
  regex: string;
  collapsed: boolean;
}

const TesterPanel: React.FC<TesterPanelProps> = ({ regex, collapsed }) => {
  const [testText, setTestText] = useState<string>(
    "Sample text: user@example.com, test.name@company.org, and ip address 192.168.1.100."
  );
  const [replaceText, setReplaceText] = useState<string>("[$&]");
  const [activeTab, setActiveTab] = useState<'highlight' | 'details' | 'replace'>('highlight');

  // Compile regex and perform matches reactively when regex or testText changes
  const { regexObj, matches, hasGroups } = useMemo(() => {
    if (!regex) {
      return { regexObj: null, matches: [], hasGroups: false };
    }
    try {
      const match = regex.match(/^\/(.*)\/([gimsuy]*)$/);
      let pattern = regex;
      let flags = 'g';
      if (match) {
        pattern = match[1];
        flags = match[2];
        if (!flags.includes('g')) flags += 'g'; // Enforce global flag for scanning all matches
        if (!flags.includes('d')) flags += 'd'; // Enforce indices flag for accurate group highlighting
      } else {
        flags = 'gd';
      }
      
      const re = new RegExp(pattern, flags);
      
      // Check capturing groups
      const cleanPattern = pattern.replace(/\\./g, '');
      const hasCapturingGroups = /\((?!\?(?!<))/.test(cleanPattern);
      
      const m: RegExpExecArray[] = [];
      let currentMatch;
      let iterations = 0;
      
      re.lastIndex = 0; // Reset
      
      while ((currentMatch = re.exec(testText)) !== null && iterations < 1000) {
        m.push(currentMatch);
        iterations++;
        // Prevent infinite loops on empty matches
        if (currentMatch.index === re.lastIndex) {
          re.lastIndex++;
        }
      }
      return { regexObj: re, matches: m, hasGroups: hasCapturingGroups };
    } catch {
      return { regexObj: null, matches: [], hasGroups: false };
    }
  }, [regex, testText]);

  // Execute Replace logic
  const getReplacedText = (): string => {
    if (!regexObj || !regex) return testText;
    try {
      return testText.replace(regexObj, replaceText);
    } catch {
      return testText;
    }
  };

  // Determine highlight class for character at index `i`
  const getCharHighlightClass = (i: number): string => {
    for (const m of matches) {
      const matchVal = m[0];
      if (i >= m.index && i < m.index + matchVal.length) {
        let activeGroup = 0; // Default: full match
        
        // Use RegExp Match Indices (d flag) for 100% accurate group tracking if available
        const indices = (m as unknown as { indices?: [number, number][] }).indices;
        if (indices) {
          for (let g = 1; g < indices.length; g++) {
            const range = indices[g];
            if (range && i >= range[0] && i < range[1]) {
              activeGroup = g;
            }
          }
        } else {
          // Fallback if indices is not available
          for (let g = 1; g < m.length; g++) {
            const groupVal = m[g];
            if (groupVal !== undefined && groupVal !== '') {
              // Find start of group inside the match
              const groupIdx = matchVal.indexOf(groupVal);
              if (groupIdx !== -1) {
                const gStart = m.index + groupIdx;
                const gEnd = gStart + groupVal.length;
                if (i >= gStart && i < gEnd) {
                  activeGroup = g;
                }
              }
            }
          }
        }
        return `hl-match group-${activeGroup % 5}`;
      }
    }
    return '';
  };

  return (
    <footer className={`tester-panel-wrapper panel-transition ${collapsed ? 'collapsed' : ''}`}>
      <div className="tester-header">
        <div className="tester-tabs">
          <button 
            className={`tester-tab ${activeTab === 'highlight' ? 'active' : ''}`}
            onClick={() => setActiveTab('highlight')}
          >
            <Beaker size={12} style={{ marginRight: 6, display: 'inline' }} />
            Match Highlight
          </button>
          <button 
            className={`tester-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <Layers size={12} style={{ marginRight: 6, display: 'inline' }} />
            Details & Groups
          </button>
          <button 
            className={`tester-tab ${activeTab === 'replace' ? 'active' : ''}`}
            onClick={() => setActiveTab('replace')}
          >
            <Replace size={12} style={{ marginRight: 6, display: 'inline' }} />
            Replace Sandbox
          </button>
        </div>
        
        <div className="tester-stats">
          <Search size={12} />
          <span>{matches.length} matches found</span>
        </div>
      </div>

      <div className="tester-content">
        {/* Left Side: Test Input Area */}
        <div className="tester-pane border-r">
          <label>Test Input</label>
          <textarea
            className="tester-input"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Enter test text here..."
          />
        </div>

        {/* Right Side: Tab-dependent output panes */}
        <div className="tester-pane" style={{ backgroundColor: 'rgba(9, 13, 22, 0.4)' }}>
          {activeTab === 'highlight' && (
            <>
              <label>Highlight Result</label>
              <div className="tester-output-view">
                {testText.split('').map((char, i) => (
                  <span key={i} className={getCharHighlightClass(i)}>
                    {char}
                  </span>
                ))}
                {testText.length === 0 && (
                  <span style={{ color: '#475569', fontStyle: 'italic' }}>
                    Type text on the left to see matching highlights...
                  </span>
                )}
              </div>
            </>
          )}

          {activeTab === 'details' && (
            <>
              <label>Match Inspector</label>
              <div className="tester-output-view" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!hasGroups && (
                  <div style={{ 
                    padding: '10px 12px', 
                    background: 'rgba(59,130,246,0.05)', 
                    border: '1px dashed rgba(59,130,246,0.2)', 
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#94a3b8',
                    lineHeight: '1.5',
                    marginBottom: '4px'
                  }}>
                    <strong style={{ color: 'var(--primary-hover)' }}>Tip:</strong> Your regular expression contains no capturing groups. Drag <strong>Group Start</strong> and <strong>Group End</strong> nodes onto the canvas and connect them around elements you want to capture (e.g. wrapper around digits) to see detailed group extractions here.
                  </div>
                )}
                {matches.length > 0 ? (
                  matches.map((m, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        padding: '6px 10px', 
                        background: 'rgba(255,255,255,0.02)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '6px' 
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary-hover)' }}>Match #{idx + 1}</span>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>Index: {m.index} - {m.index + m[0].length}</span>
                      </div>
                      <div style={{ fontFamily: 'monospace', color: '#f1f5f9', wordBreak: 'break-all' }}>
                        Value: "{m[0]}"
                      </div>
                      
                      {/* Render capturing groups if any */}
                      {m.length > 1 && (
                        <div style={{ marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                          {Array.from(m).slice(1).map((groupVal, gIdx) => (
                            <div key={gIdx} style={{ fontSize: '11px', color: '#94a3b8' }}>
                              <span style={{ 
                                color: gIdx === 0 ? '#a855f7' : (gIdx === 1 ? '#14b8a6' : '#f97316'), 
                                fontWeight: 'semibold' 
                              }}>
                                Group {gIdx + 1}:
                              </span>{' '}
                              {groupVal !== undefined ? `"${groupVal}"` : <span style={{ color: '#475569', fontStyle: 'italic' }}>undefined</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#475569', fontStyle: 'italic' }}>No matches found.</div>
                )}
              </div>
            </>
          )}

          {activeTab === 'replace' && (
            <>
              {replaceText && /\$\d+/.test(replaceText) && !hasGroups && (
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(245,158,11,0.05)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#fbbf24',
                  lineHeight: '1.4',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <AlertTriangle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    <strong>Warning:</strong> Replacement text contains group placeholders (like <code>$1</code>), but your regular expression has no capturing groups. They will be replaced as literal text.
                  </span>
                </div>
              )}
              <div className="replace-input-bar">
                <label style={{ margin: 0 }}>Replace With</label>
                <input 
                  type="text" 
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replacement e.g. $1"
                  style={{ padding: '4px 8px', width: '150px' }}
                />
              </div>
              <label>Replace Result</label>
              <div className="tester-output-view" style={{ color: 'var(--success)' }}>
                {getReplacedText()}
              </div>
            </>
          )}
        </div>
      </div>
    </footer>
  );
};

export default TesterPanel;
