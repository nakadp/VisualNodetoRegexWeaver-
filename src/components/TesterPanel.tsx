import React, { useState, useEffect } from 'react';
import { Beaker, Search, ListFilter } from 'lucide-react';

interface TesterPanelProps {
  regex: string;
}

const TesterPanel: React.FC<TesterPanelProps> = ({ regex }) => {
  const [testText, setTestText] = useState<string>("Sample text to test your regex: user@example.com, 123-456-7890, and some random words.");
  const [matches, setMatches] = useState<RegExpExecArray[]>([]);

  useEffect(() => {
    try {
      if (!regex) {
        setMatches([]);
        return;
      }
      // Simple regex parser for demo, extracting between slashes if present
      const match = regex.match(/^\/(.*)\/([gimsuy]*)$/);
      let pattern = regex;
      let flags = 'g';
      if (match) {
        pattern = match[1];
        flags = match[2].includes('g') ? match[2] : match[2] + 'g';
      }
      
      const re = new RegExp(pattern, flags);
      const m: RegExpExecArray[] = [];
      let currentMatch;
      let iterations = 0;
      
      // Reset lastIndex because of 'g' flag
      re.lastIndex = 0;
      
      while ((currentMatch = re.exec(testText)) !== null && iterations < 1000) {
        m.push(currentMatch);
        iterations++;
        if (currentMatch.index === re.lastIndex) re.lastIndex++; // Prevent infinite loops
      }
      setMatches(m);
    } catch (e) {
      setMatches([]);
    }
  }, [regex, testText]);

  return (
    <footer className="h-52 glass-dark border-t border-white/5 flex flex-col">
      <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Beaker size={16} className="text-blue-500" />
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-tighter">
            Real-time Sandbox
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
            <Search size={12} />
            {matches.length} matches found
          </div>
          <button className="p-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors">
            <ListFilter size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 border-r border-white/5 flex flex-col">
          <label className="text-[10px] font-bold text-gray-500 uppercase mb-2">Test Input</label>
          <textarea
            className="flex-1 bg-transparent border-none outline-none resize-none font-mono text-sm text-gray-300 placeholder:text-gray-600"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Enter text to test your regex..."
          />
        </div>
        <div className="flex-1 p-4 bg-slate-900/30 overflow-y-auto">
          <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Match Result</label>
          <div className="font-mono text-sm leading-relaxed relative">
            {testText.split('').map((char, i) => {
              const isMatched = matches.some(m => i >= m.index && i < m.index + m[0].length);
              return (
                <span 
                  key={i} 
                  className={isMatched ? "bg-blue-500/30 text-blue-300 rounded-sm py-0.5 border-b border-blue-500/50" : ""}
                >
                  {char}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default TesterPanel;
