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

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.EDITOR:
        return <Editor targetJournal={targetJournal} />;
      case AppTab.CHAT:
        return <ChatAssistant />;
      case AppTab.JOURNAL_FINDER:
        return <JournalFinder />;
      case AppTab.COVER_LETTER:
        return <CoverLetterGen targetJournal={targetJournal} />;
      case AppTab.FIGURE_CHECK:
        return <FigureCheck targetJournal={targetJournal} />;
      case AppTab.GUIDELINES:
        return <Guidelines targetJournal={targetJournal} />;
      default:
        return <Editor targetJournal={targetJournal} />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden font-sans text-gray-900">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        targetJournal={targetJournal}
        onJournalChange={setTargetJournal}
      />
      <main className="flex-1 h-full relative overflow-hidden bg-white z-0">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;