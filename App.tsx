import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import CoverLetterGen from './components/CoverLetterGen';
import FigureCheck from './components/FigureCheck';
import Guidelines from './components/Guidelines';
import ChatAssistant from './components/ChatAssistant';
import JournalFinder from './components/JournalFinder';
import { AppTab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.EDITOR);
  const [targetJournal, setTargetJournal] = useState<string>("Nature Cell Biology");
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkApiKey = async () => {
      if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        // Fallback/Default to true if not running in the specific AI Studio environment wrapper
        setHasApiKey(true);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      // Assume success after triggering the dialog to avoid race conditions
      setHasApiKey(true);
      // Force reload of Gemini instance potentially by triggering a re-render or context update if needed
    }
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-gray-900 font-sans p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-200">
           <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
             </svg>
           </div>
           <h1 className="text-2xl font-bold mb-2 text-gray-900">API Key Required</h1>
           <p className="text-gray-500 mb-8 leading-relaxed">
             To use the advanced <strong>Gemini 3 Pro</strong> features for high-fidelity scientific image generation, you must select a valid API key.
           </p>
           
           <button 
             onClick={handleSelectKey}
             className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-md hover:shadow-lg mb-4"
           >
             Select API Key
           </button>
           
           <a 
             href="https://ai.google.dev/gemini-api/docs/billing" 
             target="_blank" 
             rel="noopener noreferrer"
             className="text-xs text-gray-400 hover:text-blue-600 hover:underline"
           >
             View Billing Documentation
           </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden font-sans text-gray-900">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        targetJournal={targetJournal}
        onJournalChange={setTargetJournal}
      />
      <main className="flex-1 h-full relative overflow-hidden bg-white z-0">
        <div className={activeTab === AppTab.EDITOR ? 'block h-full' : 'hidden'}>
           <Editor targetJournal={targetJournal} />
        </div>
        <div className={activeTab === AppTab.CHAT ? 'block h-full' : 'hidden'}>
           <ChatAssistant />
        </div>
        <div className={activeTab === AppTab.JOURNAL_FINDER ? 'block h-full' : 'hidden'}>
           <JournalFinder />
        </div>
        <div className={activeTab === AppTab.COVER_LETTER ? 'block h-full' : 'hidden'}>
           <CoverLetterGen targetJournal={targetJournal} />
        </div>
        <div className={activeTab === AppTab.FIGURE_CHECK ? 'block h-full' : 'hidden'}>
           <FigureCheck targetJournal={targetJournal} />
        </div>
        <div className={activeTab === AppTab.GUIDELINES ? 'block h-full' : 'hidden'}>
           <Guidelines targetJournal={targetJournal} />
        </div>
      </main>
    </div>
  );
};

export default App;