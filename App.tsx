import React, { useState } from 'react';
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