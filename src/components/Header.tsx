import React from 'react';
import { Share2, Download, Zap, Code } from 'lucide-react';

interface HeaderProps {
  onMagicClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMagicClick }) => {
  return (
    <header className="glass-dark px-6 py-3 flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Zap className="text-white fill-white" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Regex Weaver
          </h1>
          <p className="text-[10px] text-blue-400 uppercase tracking-widest font-semibold">
            Visual Logic Processor
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={onMagicClick}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-medium"
        >
          <Zap size={16} />
          Darwin Magic
        </button>
        <div className="h-6 w-[1px] bg-white/10 mx-2" />
        <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white">
          <Share2 size={20} />
        </button>
        <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white">
          <Download size={20} />
        </button>
        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noreferrer"
          className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
        >
          <Code size={20} />
        </a>
      </div>
    </header>
  );
};

export default Header;
