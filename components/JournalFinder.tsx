
import React, { useState } from 'react';
import { suggestTargetJournals, evaluateJournalFit } from '../services/geminiService';
import { Compass, Search, AlertCircle, BarChart3, ArrowRight, Target, FileText, CheckCircle2, XCircle, Scale, Microscope } from 'lucide-react';
import { JournalEvaluationResult } from '../types';

// Updated interface to include quality-specific analysis
interface JournalSuggestion {
  name: string;
  matchScore: number;
  tier: string;
  rationale: string; // Scope/Topic fit
  qualityAnalysis: string; // Level/Rigor fit
  advice: string;
}

type Mode = 'DISCOVER' | 'CHECK';

const JournalFinder: React.FC = () => {
  const [mode, setMode] = useState<Mode>('DISCOVER');
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [fullText, setFullText] = useState('');
  const [targetJournal, setTargetJournal] = useState('');
  
  const [suggestions, setSuggestions] = useState<JournalSuggestion[]>([]);
  const [evaluation, setEvaluation] = useState<JournalEvaluationResult | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleAction = async () => {
    if (!title.trim() || !abstract.trim()) return;
    
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      if (mode === 'DISCOVER') {
        const results = await suggestTargetJournals(title, abstract, fullText);
        setSuggestions(results);
        setEvaluation(null);
      } else {
        if (!targetJournal.trim()) return;
        const result = await evaluateJournalFit(title, abstract, fullText, targetJournal);
        setEvaluation(result);
        setSuggestions([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 40) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      {/* Input Panel */}
      <div className="w-1/3 h-full overflow-y-auto border-r border-gray-200 bg-white p-6 shadow-sm z-10">
        <div className="flex items-center mb-6">
          <Compass className="w-6 h-6 text-natureRed mr-2" />
          <h2 className="text-xl font-serif font-bold text-natureDark">Journal Matcher</h2>
        </div>
        
        {/* Mode Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => setMode('DISCOVER')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${
              mode === 'DISCOVER' ? 'bg-white text-natureDark shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setMode('CHECK')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${
              mode === 'CHECK' ? 'bg-white text-natureDark shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Check Fit
          </button>
        </div>

        <div className="space-y-5">
          <p className="text-sm text-gray-600 leading-relaxed">
            {mode === 'DISCOVER' 
              ? "Get AI-driven journal recommendations based on an OBJECTIVE assessment of your manuscript's quality, data rigor, and scope."
              : "Evaluate if your manuscript meets the specific criteria and standards of a target journal."}
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Manuscript Title</label>
            <input 
              type="text" 
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:border-natureRed focus:ring-1 focus:ring-natureRed outline-none transition-shadow"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter the full title..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Abstract</label>
            <textarea 
              rows={6}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:border-natureRed focus:ring-1 focus:ring-natureRed outline-none resize-none transition-shadow"
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Paste your abstract here..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center">
              <FileText className="w-3 h-3 mr-1" /> Full Text / Main Body
            </label>
            <div className="relative">
              <textarea 
                rows={8}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:border-natureRed focus:ring-1 focus:ring-natureRed outline-none resize-none transition-shadow bg-gray-50 focus:bg-white"
                value={fullText}
                onChange={(e) => setFullText(e.target.value)}
                placeholder="Paste Introduction, Results, and Discussion here for accurate quality assessment."
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400 pointer-events-none bg-white/80 px-1 rounded">
                {fullText.length > 0 ? `${(fullText.length / 1000).toFixed(1)}k chars` : 'Recommended'}
              </div>
            </div>
          </div>

          {mode === 'CHECK' && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 animate-fade-in">
              <label className="block text-xs font-bold text-blue-800 uppercase mb-2">Target Journal</label>
              <input 
                type="text" 
                className="w-full p-3 border border-blue-200 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                value={targetJournal}
                onChange={(e) => setTargetJournal(e.target.value)}
                placeholder="e.g., Nature Cell Biology, Molecular Cell..."
              />
            </div>
          )}

          <button
            onClick={handleAction}
            disabled={isLoading || !title || !abstract || (mode === 'CHECK' && !targetJournal)}
            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center transition-all ${
              isLoading || !title || !abstract || (mode === 'CHECK' && !targetJournal)
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-natureDark text-white hover:bg-natureRed shadow-md hover:shadow-lg'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                {mode === 'DISCOVER' ? <Search className="w-4 h-4 mr-2" /> : <Scale className="w-4 h-4 mr-2" />}
                {mode === 'DISCOVER' ? 'Find Journals' : `Evaluate Fit`}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Panel */}
      <div className="w-2/3 h-full overflow-y-auto bg-gray-50 p-8">
        {/* DISCOVER MODE RESULTS */}
        {mode === 'DISCOVER' && (
          suggestions.length > 0 ? (
            <div className="max-w-3xl mx-auto space-y-6">
               <div className="flex justify-between items-end mb-4">
                 <div>
                   <h3 className="text-lg font-bold text-gray-800">Recommended Journals</h3>
                   <p className="text-xs text-gray-500 mt-1">
                     Suggestions based on objective assessment of scientific level, novelty, and scope.
                   </p>
                 </div>
               </div>
               
               {suggestions.map((journal, index) => (
                 <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${index === 0 ? 'bg-natureRed' : 'bg-gray-300'}`} />
                    
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <h4 className="text-xl font-serif font-bold text-natureDark">{journal.name}</h4>
                        <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide font-bold">{journal.tier}</p>
                      </div>
                      <div className={`flex items-center px-3 py-1 rounded-full text-sm font-bold border ${getScoreColor(journal.matchScore)}`}>
                         <Target className="w-3 h-3 mr-1" />
                         {journal.matchScore}% Overall Match
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Scope/Topic Section */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h5 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center">
                                <Compass className="w-3 h-3 mr-1" /> Topic Fit
                            </h5>
                            <p className="text-sm text-gray-700 leading-relaxed">{journal.rationale}</p>
                        </div>

                        {/* Quality/Level Section - NEW */}
                        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                            <h5 className="text-xs font-bold text-indigo-800 uppercase mb-2 flex items-center">
                                <Microscope className="w-3 h-3 mr-1" /> Quality & Rigor Assessment
                            </h5>
                            <p className="text-sm text-indigo-900 leading-relaxed">{journal.qualityAnalysis}</p>
                        </div>
                    </div>
                      
                    <div className="flex items-start pt-4 border-t border-gray-100">
                         <ArrowRight className="w-4 h-4 text-natureRed mr-2 mt-0.5 flex-shrink-0" /> 
                         <p className="text-sm text-gray-600 italic">
                            <span className="font-bold text-natureDark not-italic mr-1">Strategy:</span>
                            "{journal.advice}"
                         </p>
                    </div>
                 </div>
               ))}
            </div>
          ) : renderEmptyState(hasSearched, isLoading)
        )}

        {/* CHECK MODE RESULTS */}
        {mode === 'CHECK' && (
          evaluation ? (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="bg-natureDark text-white p-8">
                  <h2 className="text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Editorial Assessment</h2>
                  <h1 className="text-3xl font-serif font-bold mb-6">{evaluation.journalName}</h1>
                  
                  <div className="flex items-center space-x-6">
                    <div className="flex flex-col">
                      <span className="text-xs opacity-70 uppercase">Fit Probability</span>
                      <span className={`text-4xl font-bold ${evaluation.matchScore > 70 ? 'text-green-400' : 'text-amber-400'}`}>
                        {evaluation.matchScore}%
                      </span>
                    </div>
                    <div className="h-10 w-px bg-white/20"></div>
                    <div className="flex flex-col">
                      <span className="text-xs opacity-70 uppercase">Verdict</span>
                      <span className="text-xl font-bold">{evaluation.verdict}</span>
                    </div>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  {/* Editor's Note */}
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 relative">
                    <div className="absolute -top-3 left-6 bg-gray-200 text-gray-600 px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider">
                      Internal Editor's Note
                    </div>
                    <p className="text-gray-700 font-serif italic leading-relaxed">
                      "{evaluation.editorComments}"
                    </p>
                  </div>

                  {/* SWOT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="flex items-center text-sm font-bold text-green-700 uppercase mb-4 border-b border-green-100 pb-2">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Strengths
                      </h3>
                      <ul className="space-y-3">
                        {evaluation.strengths.map((str, i) => (
                          <li key={i} className="flex items-start text-sm text-gray-700">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            {str}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="flex items-center text-sm font-bold text-red-700 uppercase mb-4 border-b border-red-100 pb-2">
                        <XCircle className="w-4 h-4 mr-2" /> Weaknesses / Gaps
                      </h3>
                      <ul className="space-y-3">
                        {evaluation.weaknesses.map((weak, i) => (
                          <li key={i} className="flex items-start text-sm text-gray-700">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            {weak}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : renderEmptyState(hasSearched, isLoading)
        )}
      </div>
    </div>
  );
};

const renderEmptyState = (hasSearched: boolean, isLoading: boolean) => {
  if (isLoading) return null;
  return (
    <div className="h-full flex flex-col items-center justify-center text-gray-400">
      {hasSearched ? (
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No results found. Please verify your input.</p>
        </div>
      ) : (
        <div className="text-center opacity-60">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-600">Ready to Analyze</h3>
          <p className="max-w-xs mx-auto mt-2 text-sm">
            Provide your abstract and full text to begin the journal assessment process.
          </p>
        </div>
      )}
    </div>
  );
};

export default JournalFinder;
