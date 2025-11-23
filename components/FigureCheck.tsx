
import React, { useState, useRef, useEffect } from 'react';
import { generateOrEditFigure } from '../services/geminiService';
import { Upload, Image as ImageIcon, AlertCircle, Send, Bot, User, Download, RotateCcw, MessageCircle, Wand2, Eye, History } from 'lucide-react';

interface FigureCheckProps {
  targetJournal: string;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const FigureCheck: React.FC<FigureCheckProps> = ({ targetJournal }) => {
  // Image State
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [latestImage, setLatestImage] = useState<string | null>(null);
  const [isViewingOriginal, setIsViewingOriginal] = useState(false);
  
  // Computed active image based on view mode
  const activeImage = isViewingOriginal ? originalImage : latestImage;
  const hasEdits = originalImage && latestImage && originalImage !== latestImage;

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imgStr = reader.result as string;
        setOriginalImage(imgStr);
        setLatestImage(imgStr);
        setIsViewingOriginal(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text: `I've loaded your figure. I can audit it for **${targetJournal}** standards or help you modify it (e.g., "Remove background", "Fix font size").`,
          timestamp: new Date()
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !activeImage) || isLoading) return;
    
    const userText = input.trim();
    if (!userText && !activeImage) return;

    // Add User Message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText || "(Requesting analysis)", timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let result;

    if (activeImage) {
      // EDIT Mode: Send currently visible image + prompt
      const [mimeTypePart, base64Data] = activeImage.split(';base64,');
      const mimeType = mimeTypePart.split(':')[1];
      result = await generateOrEditFigure(userText, targetJournal, base64Data, mimeType);
    } else {
      // GENERATION Mode: Send only prompt
      result = await generateOrEditFigure(userText, targetJournal);
    }

    // Handle Response
    const aiMsg: Message = { 
      id: (Date.now() + 1).toString(), 
      role: 'model', 
      text: result.text, 
      timestamp: new Date() 
    };
    setMessages(prev => [...prev, aiMsg]);

    if (result.modifiedImage) {
      // If a new image was generated, update the latest state
      const newImageStr = `data:image/png;base64,${result.modifiedImage}`;
      setLatestImage(newImageStr);
      
      // If we didn't have an original (pure generation), this becomes the "original" too
      if (!originalImage) {
        setOriginalImage(newImageStr);
      }
      
      // Auto-switch to view the new result
      setIsViewingOriginal(false);

      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'model',
        text: activeImage ? "I've updated the figure based on your request." : "Here is the generated figure.",
        timestamp: new Date()
      }]);
    }

    setIsLoading(false);
  };

  const handleReset = () => {
    if (originalImage && window.confirm("Discard all edits and revert to the original version?")) {
      setLatestImage(originalImage);
      setIsViewingOriginal(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Discarded edits. Back to original.",
        timestamp: new Date()
      }]);
    }
  };

  const handleDownload = () => {
    if (activeImage) {
      const link = document.createElement('a');
      link.href = activeImage;
      link.download = isViewingOriginal ? 'figure_original.png' : 'figure_edited.png';
      link.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      {/* LEFT: Canvas / Image Area (60%) */}
      <div className="w-3/5 h-full flex flex-col border-r border-gray-200 bg-gray-100 relative">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between pointer-events-none">
             <div className="pointer-events-auto bg-white/90 backdrop-blur shadow-sm border border-gray-200 rounded-lg p-1 flex space-x-2">
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded flex items-center"
               >
                 <Upload className="w-3 h-3 mr-2" /> {activeImage ? 'Replace' : 'Upload'}
               </button>
               
               {activeImage && (
                 <>
                   <div className="w-px bg-gray-300 my-1"></div>
                   <button 
                     onClick={handleDownload}
                     className="px-3 py-1.5 text-xs font-bold text-natureRed hover:bg-red-50 rounded flex items-center"
                   >
                     <Download className="w-3 h-3 mr-2" /> Save
                   </button>
                 </>
               )}
             </div>

             <div className="flex space-x-2 pointer-events-auto">
               {/* Comparison / Toggle Controls */}
               {hasEdits && (
                  <div className="bg-white/90 backdrop-blur shadow-sm border border-gray-200 rounded-lg p-1 flex space-x-1">
                     <button
                        onClick={() => setIsViewingOriginal(true)}
                        className={`px-3 py-1.5 text-xs font-bold rounded flex items-center transition-colors ${isViewingOriginal ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}
                     >
                        <Eye className="w-3 h-3 mr-2" /> Original
                     </button>
                     <button
                        onClick={() => setIsViewingOriginal(false)}
                        className={`px-3 py-1.5 text-xs font-bold rounded flex items-center transition-colors ${!isViewingOriginal ? 'bg-natureDark text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                     >
                        <Wand2 className="w-3 h-3 mr-2" /> Latest
                     </button>
                  </div>
               )}

               {hasEdits && (
                 <button 
                   onClick={handleReset}
                   className="bg-white/90 backdrop-blur shadow-sm border border-gray-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center"
                   title="Discard edits and revert to original"
                 >
                   <RotateCcw className="w-3 h-3 mr-2" /> Reset
                 </button>
               )}
               
               {activeImage && (
                  <div className="bg-natureDark/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm backdrop-blur flex items-center">
                    Target: {targetJournal}
                  </div>
               )}
             </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative">
           {activeImage ? (
             <div className="relative group">
               <img 
                 src={activeImage} 
                 alt="Scientific Figure" 
                 className="max-w-full max-h-full object-contain shadow-2xl rounded-md border border-gray-200 bg-white"
               />
               {/* Status Badge Overlay */}
               <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm uppercase tracking-widest pointer-events-none">
                 {isViewingOriginal ? "Original Source" : (originalImage ? "Latest Draft" : "Generated Image")}
               </div>
             </div>
           ) : (
             <div className="text-center">
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 cursor-pointer hover:bg-gray-300 transition-colors"
               >
                 <ImageIcon className="w-12 h-12 text-gray-400" />
               </div>
               <h3 className="text-lg font-bold text-gray-700">Empty Workspace</h3>
               <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
                 Upload a figure to edit, or ask the AI to generate a new scientific illustration.
               </p>
             </div>
           )}
           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      </div>

      {/* RIGHT: Chat Interface (40%) */}
      <div className="w-2/5 h-full flex flex-col bg-white z-10 shadow-xl">
        <div className="p-4 border-b border-gray-200 flex items-center bg-white">
          <Wand2 className="w-5 h-5 text-natureRed mr-2" />
          <h2 className="font-serif font-bold text-natureDark">Figure Illustrator</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 && !activeImage && (
            <div className="text-center text-gray-400 py-10 px-6">
              <p className="text-sm font-medium mb-2">Need a figure?</p>
              <p className="text-xs">Try: "Create a diagram of a macrophage signaling pathway"</p>
              <div className="my-4 border-t border-gray-200 w-1/2 mx-auto"></div>
              <p className="text-sm font-medium mb-2">Have a draft?</p>
              <p className="text-xs">Upload it to fix fonts, remove backgrounds, or adjust for {targetJournal} style.</p>
            </div>
          )}
          
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[90%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${isUser ? 'bg-natureDark ml-2' : 'bg-white border border-gray-200 mr-2'}`}>
                    {isUser ? <User className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-natureRed" />}
                  </div>
                  <div className={`p-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    isUser ? 'bg-natureDark text-white' : 'bg-white text-gray-800 border border-gray-200'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start">
               <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-gray-200 ml-9">
                 <div className="w-2 h-2 bg-natureRed rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-natureRed rounded-full animate-bounce delay-75"></div>
                 <div className="w-2 h-2 bg-natureRed rounded-full animate-bounce delay-150"></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-200">
           <div className="relative">
             <textarea
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder={
                 activeImage 
                   ? (isViewingOriginal ? "Describe edits to ORIGINAL version..." : "Refine this LATEST version...")
                   : "Describe a figure to generate..."
               }
               rows={1}
               className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-300 focus:border-natureRed focus:ring-1 focus:ring-natureRed outline-none resize-none bg-gray-50 focus:bg-white transition-all"
             />
             <button 
               onClick={handleSend}
               disabled={!input.trim() || isLoading}
               className="absolute right-2 top-2 p-1.5 bg-natureRed text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-natureRed transition-colors"
             >
               <Send className="w-4 h-4" />
             </button>
           </div>
           <p className="text-[10px] text-gray-400 text-center mt-2">
             Powered by Nano Banana. Always verify scientific accuracy.
           </p>
        </div>
      </div>
    </div>
  );
};

export default FigureCheck;
