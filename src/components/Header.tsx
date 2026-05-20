import React, { useState } from 'react';
import { Share2, Download, Zap, Code, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onMagicClick: () => void;
  onReverseEngineer: (regex: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onMagicClick, onReverseEngineer }) => {
  const [reverseInput, setReverseInput] = useState<string>('');

  const handleReverseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reverseInput.trim()) {
      onReverseEngineer(reverseInput);
    }
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo">
          <Zap className="text-white fill-white" size={18} />
        </div>
        <div className="brand-title">
          <h1>Regex Weaver</h1>
          <p>Visual Logic IDE</p>
        </div>
      </div>

      <div className="header-actions">
        {/* Reverse Engineering Form */}
        <form onSubmit={handleReverseSubmit} className="reverse-engineer-input-container">
          <input 
            type="text"
            placeholder="Paste raw regex, e.g. /^\\d+$/..."
            value={reverseInput}
            onChange={(e) => setReverseInput(e.target.value)}
          />
          <button 
            type="submit" 
            className="icon-btn" 
            title="Decompile Regex to Node Canvas"
            style={{ padding: '4px' }}
          >
            <RefreshCw size={14} className="text-blue-400 hover:rotate-180 transition-all duration-300" />
          </button>
        </form>

        <button 
          onClick={onMagicClick}
          className="header-btn primary"
        >
          <Zap size={14} className="fill-white" />
          Darwin Magic
        </button>
        
        <div className="divider" />
        
        <button className="icon-btn" title="Share Project">
          <Share2 size={16} />
        </button>
        <button className="icon-btn" title="Download Schema">
          <Download size={16} />
        </button>
        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noreferrer"
          className="icon-btn"
          title="Source Code"
        >
          <Code size={16} />
        </a>
      </div>
    </header>
  );
};

export default Header;
