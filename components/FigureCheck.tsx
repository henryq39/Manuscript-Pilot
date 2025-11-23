import React, { useState, useRef, useEffect } from 'react';
import { generateOrEditFigure } from '../services/geminiService';
import { Upload, Image as ImageIcon, AlertCircle, Send, Bot, User, Download, RotateCcw, MessageCircle, Wand2, Eye, History, Monitor, Maximize2, FileText, ChevronDown, Sparkles, Zap, Copy } from 'lucide-react';
import { jsPDF } from "jspdf";
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

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
  
  // Configuration State for Generation
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [imageSize, setImageSize] = useState("1K");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Computed active image based on view mode
  const activeImage = isViewingOriginal ? originalImage : latestImage;
  const hasEdits = originalImage && latestImage && originalImage !== latestImage;

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Paste Event
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const imgStr = event.target?.result as string;
              loadImage(imgStr, "Copied from Clipboard");
            };
            reader.readAsDataURL(blob);
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [targetJournal]);

  const loadImage = (imgStr: string, sourceName: string) => {
    setOriginalImage(imgStr);
    setLatestImage(imgStr);
    setIsViewingOriginal(false);
    
    // Auto-downgrade to 1K (Flash) because Pro doesn't support Edit/Reference
    setImageSize("1K");

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'model',
      text: `Loaded figure from ${sourceName}. \n\nI am now in **Editing Mode** (powered by Nano Banana/Flash).\nYou can ask me to "Remove background", "Change font to Arial", etc.`,
      timestamp: new Date()
    }]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
      setPdfProcessing(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1); // Get first page
        
        const scale = 2; // High quality render
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          const imgStr = canvas.toDataURL('image/png');
          loadImage(imgStr, "PDF Upload");
        }
      } catch (err) {
        console.error("Error parsing PDF", err);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text: "Error reading PDF file. Please try converting it to an image first.",
          timestamp: new Date()
        }]);
      } finally {
        setPdfProcessing(false);
      }
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imgStr = reader.result as string;
        loadImage(imgStr, "Image Upload");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const userText = overrideText || input.trim();
    if ((!userText && !activeImage) || isLoading) return;
    if (!userText && !activeImage) return;

    // Add User Message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText || "(Requesting analysis)", timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let result;

    if (activeImage) {
      // Send currently visible image + prompt
      const [mimeTypePart, base64Data] = activeImage.split(';base64,');
      const mimeType = mimeTypePart.split(':')[1];
      result = await generateOrEditFigure(userText, targetJournal, aspectRatio, imageSize, base64Data, mimeType);
    } else {
      // GENERATION Mode (Text only)
      result = await generateOrEditFigure(userText, targetJournal, aspectRatio, imageSize);
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
        text: activeImage ? "Figure updated. You can Toggle to Original to compare." : "Generated figure displayed.",
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

  const handleDownloadPNG = () => {
    if (activeImage) {
      const link = document.createElement('a');
      link.href = activeImage;
      link.download = isViewingOriginal ? 'figure_original.png' : 'figure_edited.png';
      link.click();
      setShowDownloadMenu(false);
    }
  };

  const handleDownloadPDF = () => {
    if (activeImage) {
      const doc = new jsPDF();
      const imgProps = doc.getImageProperties(activeImage);
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      const pageHeight = doc.internal.pageSize.getHeight();
      let finalWidth = pdfWidth;
      let finalHeight = pdfHeight;

      if (pdfHeight > pageHeight) {
        finalHeight = pageHeight;
        finalWidth = (imgProps.width * pageHeight) / imgProps.height;
      }

      doc.addImage(activeImage, 'PNG', 0, 0, finalWidth, finalHeight);
      doc.save(isViewingOriginal ? 'figure_original.pdf' : 'figure_edited.pdf');
      setShowDownloadMenu(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    "Signaling pathway schematic (Receptor -> Kinase -> TF)",
    "Bar chart with significance stars (** P<0.01)",
    "Confocal microscopy simulation: DAPI (blue) & GFP (green)",
    "Mechanism of action diagram: Drug inhibition"
  ];

  const getFooterText = () => {
    // Dynamic footer text based on active mode
    if (activeImage) {
        return "Editing Mode: Using Gemini 2.5 Flash Image (Nano Banana) for pixel-level edits.";
    }
    if (imageSize === '2K') {
        return "Generation Mode: Using Gemini 3 Pro Image (High Res / Publication Quality)";
    }
    return "Generation Mode: Using Gemini 2.5 Flash Image (Fast Draft)";
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
                 disabled={pdfProcessing}
                 className="px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded flex items-center disabled:opacity-50"
               >
                 {pdfProcessing ? <div className="animate-spin w-3 h-3 mr-2 border-2 border-gray-500 border-t-transparent rounded-full"/> : <Upload className="w-3 h-3 mr-2" />} 
                 {activeImage ? 'Replace' : 'Upload'}
               </button>
               
               {activeImage && (
                 <>
                   <div className="w-px bg-gray-300 my-1"></div>
                   <div className="relative">
                     <button 
                       onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                       className="px-3 py-1.5 text-xs font-bold text-natureRed hover:bg-red-50 rounded flex items-center"
                     >
                       <Download className="w-3 h-3 mr-2" /> Download <ChevronDown className="w-3 h-3 ml-1" />
                     </button>
                     {showDownloadMenu && (
                       <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden">
                         <button onClick={handleDownloadPNG} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 flex items-center">
                            <ImageIcon className="w-3 h-3 mr-2" /> PNG Image
                         </button>
                         <button onClick={handleDownloadPDF} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 flex items-center">
                            <FileText className="w-3 h-3 mr-2" /> PDF Doc
                         </button>
                       </div>
                     )}
                   </div>
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
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative" onClick={() => setShowDownloadMenu(false)}>
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
             <div className="w-full h-full flex items-center justify-center">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl w-full p-8">
                    
                    {/* OPTION 1: UPLOAD */}
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group text-center flex flex-col items-center justify-center h-64"
                    >
                       <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Upload className="w-6 h-6 text-blue-500" />
                       </div>
                       <h3 className="font-bold text-lg text-gray-800 mb-1">Upload Reference</h3>
                       <p className="text-sm text-gray-400 mb-4">Upload Image or PDF</p>
                       <div className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
                         Interactive Editing
                       </div>
                    </div>

                    {/* OPTION 2: GENERATE */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:border-natureRed hover:shadow-lg transition-all text-center flex flex-col items-center h-64 relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-1 bg-natureRed"></div>
                       <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4 mt-2">
                          <Sparkles className="w-6 h-6 text-natureRed" />
                       </div>
                       <h3 className="font-bold text-lg text-gray-800 mb-1">Generate New</h3>
                       <p className="text-sm text-gray-400 mb-4">Create from text prompt</p>
                       
                       {/* Mini Controls */}
                       <div className="w-full grid grid-cols-2 gap-2 text-left bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block">Ratio</label>
                            <select 
                              value={aspectRatio} 
                              onChange={(e) => setAspectRatio(e.target.value)}
                              className="w-full text-xs bg-white border-gray-200 rounded mt-1 outline-none focus:ring-1 focus:ring-natureRed"
                            >
                              <option value="1:1">1:1 Square</option>
                              <option value="4:3">4:3 Panel</option>
                              <option value="16:9">16:9 Wide</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block">Mode</label>
                            <select 
                              value={imageSize} 
                              onChange={(e) => setImageSize(e.target.value)}
                              className="w-full text-xs bg-white border-gray-200 rounded mt-1 outline-none focus:ring-1 focus:ring-natureRed"
                            >
                              <option value="1K">1K (Fast)</option>
                              <option value="2K">2K (High Res Pro)</option>
                            </select>
                          </div>
                       </div>
                    </div>

                </div>
             </div>
           )}
           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
        </div>
      </div>

      {/* RIGHT: Chat Interface (40%) */}
      <div className="w-2/5 h-full flex flex-col bg-white z-10 shadow-xl border-l border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center bg-white justify-between">
          <div className="flex items-center">
            <Wand2 className="w-5 h-5 text-natureRed mr-2" />
            <h2 className="font-serif font-bold text-natureDark">Figure Illustrator</h2>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-1 rounded">
            {activeImage ? "Edit Mode" : "Generation Mode"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 && !activeImage && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 pb-10">
              <Zap className="w-8 h-8 mb-3 opacity-20" />
              <p className="text-sm font-medium mb-4">Scientific Illustration Prompts</p>
              <div className="space-y-2 w-full px-8">
                {quickPrompts.map((qp, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSend(qp)}
                    className="w-full text-left p-3 bg-white border border-gray-200 hover:border-natureRed hover:text-natureRed text-xs rounded-lg transition-colors shadow-sm"
                  >
                    {qp}
                  </button>
                ))}
              </div>
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
                   ? "Describe edits (e.g. 'remove background'). 2K mode disabled for edits."
                   : `Describe scientific figure (e.g. 'Schematic of...')...`
               }
               rows={1}
               className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-300 focus:border-natureRed focus:ring-1 focus:ring-natureRed outline-none resize-none bg-gray-50 focus:bg-white transition-all"
             />
             <button 
               onClick={() => handleSend()}
               disabled={!input.trim() || isLoading}
               className="absolute right-2 top-2 p-1.5 bg-natureRed text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-natureRed transition-colors"
             >
               <Send className="w-4 h-4" />
             </button>
           </div>
           <p className="text-[10px] text-gray-400 text-center mt-2">
             {getFooterText()}
           </p>
        </div>
      </div>
    </div>
  );
};

export default FigureCheck;