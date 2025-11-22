import React, { useState } from 'react';
import { AppTab, PRESET_JOURNALS } from '../types';
import { BookOpen, FileText, Image as ImageIcon, PenTool, MessageCircle, Compass, Settings, ChevronDown } from 'lucide-react';

interface SidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  targetJournal: string;
  onJournalChange: (journal: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, targetJournal, onJournalChange }) => {
  const [isCustomJournal, setIsCustomJournal] = useState(false);

  const navItems = [
    { id: AppTab.EDITOR, label: 'Manuscript Editor', icon: PenTool },
    { id: AppTab.CHAT, label: 'AI Assistant', icon: MessageCircle },
    { id: AppTab.JOURNAL_FINDER, label: 'Journal Matcher', icon: Compass },
    { id: AppTab.FIGURE_CHECK, label: 'Figure Audit', icon: ImageIcon },
    { id: AppTab.COVER_LETTER, label: 'Cover Letter', icon: FileText },
    { id: AppTab.GUIDELINES, label: 'Guidelines', icon: BookOpen },
  ];

  const handleJournalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'CUSTOM') {
      setIsCustomJournal(true);
      onJournalChange('');
    } else {
      setIsCustomJournal(false);
      onJournalChange(e.target.value);
    }
  };

  return (
    <div className="w-64 bg-[#F5F5F7] text-gray-800 h-full flex flex-col flex-shrink-0 border-r border-gray-200 z-10 font-sans transition-all duration-300">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center space-x-2 mb-1">
           <div className="w-3 h-3 rounded-full bg-natureRed"></div>
           <h1 className="text-sm font-bold text-gray-900 tracking-tight">
             Manuscript Pilot
           </h1>
        </div>
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest pl-5">Scientific AI</p>
      </div>

      {/* Journal Selector - Mac Style */}
      <div className="px-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3">
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center">
               <Settings className="w-3 h-3 mr-1" /> Target Journal
            </label>
            {isCustomJournal ? (
               <div className="flex items-center space-x-1">
                  <input 
                   type="text" 
                   value={targetJournal}
                   onChange={(e) => onJournalChange(e.target.value)}
                   placeholder="Type name..."
                   className="w-full bg-gray-50 text-gray-900 text-sm rounded px-2 py-1.5 border border-gray-200 focus:border-blue-500 outline-none"
                   autoFocus
                  />
                  <button 
                   onClick={() => { setIsCustomJournal(false); onJournalChange("Nature Cell Biology"); }}
                   className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
               </div>
             ) : (
               <div className="relative">
                 <select 
                   value={targetJournal}
                   onChange={handleJournalChange}
                   className="w-full bg-gray-50 text-gray-900 text-sm font-medium rounded-md px-2 py-1.5 border border-gray-200 outline-none appearance-none focus:ring-2 focus:ring-blue-100 transition-shadow cursor-pointer"
                 >
                   {PRESET_JOURNALS.map(j => <option key={j} value={j}>{j}</option>)}
                   <option value="CUSTOM">Custom / Other...</option>
                 </select>
                 <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-2.5 pointer-events-none" />
               </div>
             )}
          </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
           const isActive = activeTab === item.id;
           return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 group ${
                isActive
                  ? 'bg-gray-200/80 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-4 h-4 mr-3 transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`} />
              {item.label}
            </button>
           );
        })}
      </nav>
      
      {/* Footer Info */}
      <div className="p-4 border-t border-gray-200 bg-[#F5F5F7]">
        <div className="flex items-center text-xs text-gray-500 mb-1">
           <div className={`w-2 h-2 rounded-full mr-2 ${targetJournal ? 'bg-green-500' : 'bg-gray-300'}`}></div>
           <span className="font-medium">Active Target</span>
        </div>
        <p className="text-xs font-semibold text-gray-800 truncate pl-4">{targetJournal || 'None Selected'}</p>
      </div>
    </div>
  );
};

export default Sidebar;