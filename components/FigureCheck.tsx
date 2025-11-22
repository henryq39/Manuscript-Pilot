
import React, { useState, useRef } from 'react';
import { analyzeFigure } from '../services/geminiService';
import { Upload, Image as ImageIcon, AlertCircle, Search } from 'lucide-react';

interface FigureCheckProps {
  targetJournal: string;
}

const FigureCheck: React.FC<FigureCheckProps> = ({ targetJournal }) => {
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysis(null); // Reset analysis on new image
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setIsLoading(true);
    
    // Extract base64 data and mime type
    const [mimeTypePart, base64Data] = image.split(';base64,');
    const mimeType = mimeTypePart.split(':')[1];

    const result = await analyzeFigure(base64Data, mimeType, context, targetJournal);
    setAnalysis(result);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-serif font-bold text-natureDark mb-2">Figure Audit</h2>
            <p className="text-gray-600">Upload a figure panel to check for compliance with <span className="font-bold text-natureRed">{targetJournal}</span> standards.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <div 
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px] transition-colors ${
                image ? 'border-natureRed bg-white' : 'border-gray-300 hover:border-gray-400 bg-gray-100'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {image ? (
                <img src={image} alt="Preview" className="max-h-[400px] object-contain" />
              ) : (
                <div className="text-center cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="font-medium text-gray-600">Click to upload image</p>
                  <p className="text-xs text-gray-400 mt-2">PNG, JPG (Max 5MB)</p>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {image && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Figure Context (Caption/Description)</label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:border-natureRed outline-none"
                  rows={3}
                  placeholder="e.g., Western blot showing p53 levels after drug treatment..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={isLoading}
                  className="w-full mt-4 bg-natureDark text-white py-3 rounded-lg font-medium hover:bg-black transition-colors flex items-center justify-center"
                >
                  {isLoading ? 'Analyzing Figure...' : <><Search className="w-4 h-4 mr-2" /> Audit for {targetJournal}</>}
                </button>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 h-fit">
            <div className="flex items-center mb-6 pb-4 border-b border-gray-100">
              <ImageIcon className="w-5 h-5 text-natureRed mr-3" />
              <h3 className="text-lg font-bold text-gray-800">AI Assessment</h3>
            </div>

            {analysis ? (
              <div className="prose prose-sm prose-headings:text-natureDark prose-a:text-natureRed">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {analysis}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <AlertCircle className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Upload an image to check against {targetJournal}'s specific legibility and formatting rules.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FigureCheck;
