
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Trash2, Sparkles } from 'lucide-react';
import { Chat, GenerateContentResponse } from "@google/genai";
import { createChatSession } from '../services/geminiService';
import { ChatMessage } from '../types';

const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSession = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize chat session on mount
    chatSession.current = createChatSession();
    setMessages([{
      id: 'init',
      role: 'model',
      text: 'Hello! I am your research assistant. Ask me about experimental design, statistics, or clarifications on submission requirements.'
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || !chatSession.current) return;

    const userText = input.trim();
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Create a placeholder for the AI response to stream into
    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMsgId, role: 'model', text: '', isStreaming: true }]);

    try {
      const resultStream = await chatSession.current.sendMessageStream({ message: userText });
      
      let fullText = '';
      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        const textChunk = c.text;
        if (textChunk) {
          fullText += textChunk;
          setMessages(prev => prev.map(msg => 
            msg.id === aiMsgId ? { ...msg, text: fullText } : msg
          ));
        }
      }

      setMessages(prev => prev.map(msg => 
        msg.id === aiMsgId ? { ...msg, isStreaming: false } : msg
      ));

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: "I apologize, but I encountered an error processing your request. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    if (window.confirm("Clear conversation history?")) {
      chatSession.current = createChatSession(); // Reset Gemini session
      setMessages([{
        id: Date.now().toString(),
        role: 'model',
        text: 'Conversation cleared. How can I help you now?'
      }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center">
          <Sparkles className="w-5 h-5 text-natureRed mr-2" />
          <h2 className="font-serif font-bold text-natureDark text-lg">Research Companion</h2>
        </div>
        <button 
          onClick={clearChat}
          className="text-xs text-gray-400 hover:text-red-600 flex items-center transition-colors"
        >
          <Trash2 className="w-3 h-3 mr-1" /> Clear Chat
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div 
              key={msg.id} 
              className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-1 shadow-sm ${
                  isUser ? 'bg-natureDark ml-3' : 'bg-white border border-gray-200 mr-3'
                }`}>
                  {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-natureRed" />}
                </div>

                {/* Bubble */}
                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser 
                    ? 'bg-natureRed text-white rounded-tr-none' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                }`}>
                  {msg.text}
                  {msg.isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-natureRed animate-pulse align-middle">|</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about statistics, review comments, or editing..."
            className="w-full p-4 pr-12 rounded-xl border border-gray-300 focus:border-natureRed focus:ring-1 focus:ring-natureRed outline-none resize-none shadow-sm bg-gray-50 focus:bg-white transition-colors"
            rows={1}
            style={{ minHeight: '60px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all ${
              input.trim() 
                ? 'bg-natureDark text-white hover:bg-black' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">AI can make mistakes. Please verify important scientific information.</p>
      </div>
    </div>
  );
};

export default ChatAssistant;
