
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisType, ChatMessage } from '../types';
import { analyzeManuscriptText, createRefinementChat } from '../services/geminiService';
import { Play, CheckCircle, Zap, Scissors, MessageSquare, Clock, RotateCcw, Trash2, ChevronDown, ChevronRight, MessageCircle, Send, User, Bot, BookOpen } from 'lucide-react';
import { Chat, GenerateContentResponse } from "@google/genai";

interface HistoryItem {
  id: string;
  type: AnalysisType;
  input: string;
  output: string;
  timestamp: Date;
  chatMessages: ChatMessage[]; // For the specific discussion thread
  isChatOpen: boolean;
  targetJournal: string; // Track which journal this was polished for
}

interface EditorProps {
  targetJournal: string;
}

const Editor: React.FC<EditorProps> = ({ targetJournal }) => {
  const [inputText, setInputText] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisType, setAnalysisType] = useState<AnalysisType>(AnalysisType.IMPACT_POLISH);
  const [expandedInputs, setExpandedInputs] = useState<Set<string>>(new Set());
  
  // Map to store active chat sessions for each history item
  const chatSessions = useRef<Map<string, Chat>>(new Map());
  // Input state for the refinement chat box of each item
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    const response = await analyzeManuscriptText(inputText, analysisType, targetJournal);
    
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      type: analysisType,
      input: inputText,
      output: response,
      timestamp: new Date(),
      chatMessages: [],
      isChatOpen: false,
      targetJournal: targetJournal
    };

    setHistory(prev => [newItem, ...prev]);
    setIsLoading(false);
  };

  const toggleInputExpand = (id: string) => {
    const newSet = new Set(expandedInputs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedInputs(newSet);
  };

  const restoreInput = (text: string) => {
    if (window.confirm('Replace current editor content with this historical input?')) {
      setInputText(text);
    }
  };

  const clearHistory = () => {
    if (window.confirm('Clear all analysis history?')) {
      setHistory([]);
      chatSessions.current.clear();
    }
  };

  const toggleChat = (itemId: string) => {
    setHistory(prev => prev.map(item => {
      if (item.id === itemId) {
        // Initialize session if not exists
        if (!chatSessions.current.has(itemId) && !item.isChatOpen) {
           // Use the journal from history, not current state, to maintain consistency
           chatSessions.current.set(itemId, createRefinementChat(item.input, item.output, item.type, item.targetJournal));
        }
        return { ...item, isChatOpen: !item.isChatOpen };
      }
      return item;
    }));
  };

  const handleSendChat = async (itemId: string) => {
    const input = chatInputs[itemId];
    if (!input?.trim()) return;

    const session = chatSessions.current.get(itemId);
    if (!session) return;

    // Update UI with user message
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setHistory(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, chatMessages: [...item.chatMessages, userMsg] } 
        : item
    ));
    setChatInputs(prev => ({ ...prev, [itemId]: '' }));

    // Stream response
    const aiMsgId = (Date.now() + 1).toString();
    setHistory(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, chatMessages: [...item.chatMessages, { id: aiMsgId, role: 'model', text: '', isStreaming: true }] } 
        : item
    ));

    try {
      const resultStream = await session.sendMessageStream({ message: input });
      let fullText = '';
      
      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullText += c.text;
          setHistory(prev => prev.map(item => {
            if (item.id === itemId) {
               const newMsgs = item.chatMessages.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m);
               return { ...item, chatMessages: newMsgs };
            }
            return item;
          }));
        }
      }
      
      setHistory(prev => prev.map(item => {
        if (item.id === itemId) {
           const newMsgs = item.chatMessages.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m);
           return { ...item, chatMessages: newMsgs };
        }
        return item;
      }));

    } catch (error) {
      console.error("Chat error", error);
      setHistory(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, chatMessages: [...item.chatMessages, { id: Date.now().toString(), role: 'model', text: "Error generating response." }] } 
          : item
      ));
    }
  };

  const getTypeLabel = (type: AnalysisType) => {
    switch (type) {
      case AnalysisType.IMPACT_POLISH: return { label: 'Impact Polish', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-100' };
      case AnalysisType.LOGIC_CHECK: return { label: 'Logic Check', icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' };
      case AnalysisType.CONCISENESS: return { label: 'Conciseness', icon: Scissors, color: 'text-green-600', bg: 'bg-green-100' };
      case AnalysisType.REBUTTAL: return { label: 'Rebuttal', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-100' };
      default: return { label: 'Analysis', icon: Play, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  return (
    <div className="flex h-full">
      {/* Input Area */}
      <div className="flex-1 flex flex-col border-r border-gray-200 h-full bg-white">
        
        {/* Header / Settings */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-4">
           <div className="flex justify-between items-center">
              <h2 className="font-serif font-semibold text-natureDark">Input Text</h2>
              
              {/* Journal Display */}
              <div className="flex items-center space-x-2 bg-white rounded-md border border-gray-200 px-2 py-1">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase mr-1">Target:</span>
                <span className="text-sm font-bold text-natureRed">{targetJournal}</span>
              </div>
           </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setAnalysisType(AnalysisType.IMPACT_POLISH)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full flex items-center transition-all ${
                analysisType === AnalysisType.IMPACT_POLISH ? 'bg-natureDark text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              <Zap className="w-3 h-3 mr-1" /> Polish
            </button>
            <button
              onClick={() => setAnalysisType(AnalysisType.LOGIC_CHECK)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full flex items-center transition-all ${
                analysisType === AnalysisType.LOGIC_CHECK ? 'bg-natureDark text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              <CheckCircle className="w-3 h-3 mr-1" /> Logic
            </button>
            <button
              onClick={() => setAnalysisType(AnalysisType.CONCISENESS)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full flex items-center transition-all ${
                analysisType === AnalysisType.CONCISENESS ? 'bg-natureDark text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              <Scissors className="w-3 h-3 mr-1" /> Shorten
            </button>
            <button
              onClick={() => setAnalysisType(AnalysisType.REBUTTAL)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full flex items-center transition-all ${
                analysisType === AnalysisType.REBUTTAL ? 'bg-natureDark text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              <MessageSquare className="w-3 h-3 mr-1" /> Rebuttal
            </button>
          </div>
        </div>

        <textarea
          className="flex-1 p-6 resize-none outline-none font-serif text-lg leading-relaxed text-gray-800 placeholder-gray-300 focus:bg-gray-50 transition-colors"
          placeholder={`Paste your text for ${targetJournal} here...`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
           <div className="text-xs text-gray-400">
             {inputText.length > 0 && `${inputText.split(/\s+/).filter(w => w.length > 0).length} words`}
           </div>
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !inputText.trim()}
            className={`flex items-center px-6 py-2 rounded-md font-semibold text-white transition-all ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-natureRed hover:bg-red-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center">
                 <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                 Analyzing...
              </span>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2 fill-current" /> Run Analysis
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output / History Area */}
      <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm z-10">
          <h2 className="font-serif font-semibold text-natureDark flex items-center">
            <Clock className="w-4 h-4 mr-2 text-natureRed" />
            Revision History
          </h2>
          {history.length > 0 && (
            <button 
              onClick={clearHistory}
              className="text-xs text-gray-400 hover:text-red-600 flex items-center transition-colors"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Clear
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {history.length > 0 ? (
            history.map((item) => {
              const style = getTypeLabel(item.type);
              const isExpanded = expandedInputs.has(item.id);
              const hasChatMessages = item.chatMessages.length > 0;
              
              return (
                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
                  {/* Card Header */}
                  <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center space-x-3">
                      <span className={`flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${style.bg} ${style.color}`}>
                        <style.icon className="w-3 h-3 mr-1.5" />
                        {style.label}
                      </span>
                      
                      {/* Journal Badge */}
                      <span className="flex items-center px-2 py-0.5 rounded border border-gray-200 bg-white text-xs font-medium text-gray-600">
                        For: {item.targetJournal}
                      </span>

                      <span className="text-xs text-gray-400 font-mono">
                        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button 
                      onClick={() => restoreInput(item.input)}
                      title="Restore original text to editor"
                      className="text-gray-400 hover:text-natureRed transition-colors p-1 rounded hover:bg-red-50"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Original Input Toggle */}
                  <div className="px-6 py-2 bg-gray-50 border-b border-gray-100">
                    <button 
                      onClick={() => toggleInputExpand(item.id)}
                      className="flex items-center text-xs font-bold text-gray-500 hover:text-natureDark uppercase tracking-wider w-full text-left py-1 focus:outline-none"
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                      Original Text
                    </button>
                    {isExpanded && (
                      <div className="mt-2 text-sm text-gray-600 font-serif italic bg-gray-100 p-3 rounded border border-gray-200 whitespace-pre-wrap">
                        "{item.input}"
                      </div>
                    )}
                  </div>

                  {/* AI Output */}
                  <div className="p-6">
                     <div className="prose prose-sm prose-headings:font-serif prose-p:font-sans prose-p:leading-relaxed max-w-none text-gray-800">
                       <div className="whitespace-pre-wrap">{item.output}</div>
                     </div>
                  </div>

                  {/* Inline Chat Section */}
                  <div className={`border-t ${item.isChatOpen ? 'border-gray-200' : 'border-transparent'}`}>
                    <button 
                       onClick={() => toggleChat(item.id)}
                       className={`w-full flex items-center justify-center py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
                         item.isChatOpen ? 'bg-gray-100 text-natureDark' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                       }`}
                    >
                      <MessageCircle className="w-3 h-3 mr-2" />
                      {item.isChatOpen ? 'Hide Discussion' : (hasChatMessages ? 'Continue Discussion' : 'Discuss & Refine')}
                    </button>

                    {item.isChatOpen && (
                      <div className="bg-gray-50 p-4 border-t border-gray-200">
                         {/* Messages List */}
                         <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2">
                            {item.chatMessages.length === 0 && (
                               <div className="text-center text-xs text-gray-400 py-4">
                                 Ask questions specifically about this revision. e.g., "Can you make the tone more formal?"
                               </div>
                            )}
                            {item.chatMessages.map((msg) => (
                              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                   <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-natureDark ml-2' : 'bg-white border border-gray-300 mr-2'}`}>
                                      {msg.role === 'user' ? <User className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-natureRed" />}
                                   </div>
                                   <div className={`p-2 rounded-lg text-sm ${msg.role === 'user' ? 'bg-white border border-gray-200 text-gray-800' : 'bg-gray-200/50 text-gray-800'}`}>
                                     {msg.text}
                                     {msg.isStreaming && <span className="inline-block w-1 h-3 ml-1 bg-natureRed animate-pulse" />}
                                   </div>
                                </div>
                              </div>
                            ))}
                         </div>
                         
                         {/* Chat Input */}
                         <div className="flex items-center relative">
                           <input 
                              type="text" 
                              className="w-full pl-3 pr-10 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-natureRed focus:ring-1 focus:ring-natureRed"
                              placeholder="Reply to this revision..."
                              value={chatInputs[item.id] || ''}
                              onChange={(e) => setChatInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendChat(item.id);
                                }
                              }}
                           />
                           <button 
                             onClick={() => handleSendChat(item.id)}
                             disabled={!chatInputs[item.id]?.trim()}
                             className="absolute right-2 p-1 text-natureRed hover:bg-red-50 rounded disabled:opacity-50 disabled:hover:bg-transparent"
                           >
                             <Send className="w-4 h-4" />
                           </button>
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-6">
                <Play className="w-8 h-8 text-gray-400 ml-1" />
              </div>
              <p className="text-lg font-medium">Ready to analyze</p>
              <p className="text-sm mt-2 text-center max-w-xs">Select an analysis mode and run your manuscript text to see revisions for <strong>{targetJournal}</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor;
