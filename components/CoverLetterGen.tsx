
import React, { useState } from 'react';
import { generateCoverLetter } from '../services/geminiService';
import { CoverLetterParams } from '../types';
import { FileText, RefreshCw, Copy, Check } from 'lucide-react';

interface CoverLetterGenProps {
  targetJournal: string;
}

const CoverLetterGen: React.FC<CoverLetterGenProps> = ({ targetJournal }) => {
  const [params, setParams] = useState<CoverLetterParams>({
    title: '',
    authorName: '',
    affiliation: '',
    abstract: '',
    manuscriptText: '',
    editorName: ''
  });
  const [letter, setLetter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleChange = (field: keyof CoverLetterParams, value: string) => {
    setParams(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    const result = await generateCoverLetter(params, targetJournal);
    setLetter(result);
    setIsLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      {/* Form */}
      <div className="w-1/3 h-full overflow-y-auto border-r border-gray-200 bg-white p-6 shadow-sm z-10">
        <h2 className="text-xl font-serif font-bold text-natureDark mb-2">Cover Letter</h2>
        <p className="text-xs text-natureRed font-bold uppercase mb-6">Targeting: {targetJournal}</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Manuscript Title</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded text-sm focus:border-natureRed focus:ring-1 focus:ring-natureRed outline-none"
              value={params.title}
              onChange={(e) => handleChange('title', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Corr. Author</label>
              <input 
                type="text" 
                className="w-full p-2 border border-gray-300 rounded text-sm focus:border-natureRed focus:ring-1 focus:ring-natureRed outline-none"
                value={params.authorName}
                onChange={(e) => handleChange('authorName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Editor (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. Dr. Smith"
                className="w-full p-2 border border-gray-300 rounded text-sm focus:border-natureRed focus:ring-1 focus:ring-natureRed outline-none"
                value={params.editorName}
                onChange={(e) => handleChange('editorName', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Affiliation</label>
            <input 
              type="text" 
              className="w-full p-2 border border-gray-300 rounded text-sm focus:border-natureRed focus:ring-1 focus:ring-natureRed outline-none"
              value={params.affiliation}
              onChange={(e) => handleChange('affiliation', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Abstract</label>
            <textarea 
              rows={6}
              className="w-full p-2 border border-gray-300 rounded text-sm focus:border-natureRed focus:ring-1 focus:ring-natureRed outline-none"
              value={params.abstract}
              onChange={(e) => handleChange('abstract', e.target.value)}
              placeholder="Paste abstract..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Manuscript Text</label>
            <textarea 
              rows={8}
              placeholder="Paste Introduction, Results, and Discussion here. The AI will extract the novelty for you."
              className="w-full p-2 border border-gray-300 rounded text-sm focus:border-natureRed focus:ring-1 focus:ring-natureRed outline-none"
              value={params.manuscriptText}
              onChange={(e) => handleChange('manuscriptText', e.target.value)}
            />
             <p className="text-xs text-gray-400 mt-1">The AI will analyze this text to identify the conceptual advance and tailor the pitch to {targetJournal}.</p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading || !params.manuscriptText}
            className={`w-full py-3 bg-natureRed text-white font-bold rounded hover:bg-red-700 transition-colors flex items-center justify-center ${isLoading || !params.manuscriptText ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><FileText className="w-4 h-4 mr-2" /> Generate Letter</>}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="w-2/3 h-full flex flex-col p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full bg-white shadow-lg min-h-[800px] p-12 relative">
          {letter ? (
            <>
              <button 
                onClick={handleCopy}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-natureRed transition-colors"
                title="Copy to Clipboard"
              >
                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              </button>
              <div className="font-serif text-sm leading-relaxed whitespace-pre-wrap text-gray-900">
                {letter}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <FileText className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-center">Paste your manuscript text to auto-generate a high-impact cover letter for <strong>{targetJournal}</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoverLetterGen;
