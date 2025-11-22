
import React, { useEffect, useState } from 'react';
import { getJournalGuidelines } from '../services/geminiService';
import { JournalGuidelines } from '../types';
import { BookOpen, RefreshCw } from 'lucide-react';

interface GuidelinesProps {
  targetJournal: string;
}

const Guidelines: React.FC<GuidelinesProps> = ({ targetJournal }) => {
  const [guidelines, setGuidelines] = useState<JournalGuidelines | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchGuidelines = async () => {
      setIsLoading(true);
      const data = await getJournalGuidelines(targetJournal);
      setGuidelines(data);
      setIsLoading(false);
    };

    if (targetJournal) {
      fetchGuidelines();
    }
  }, [targetJournal]);

  return (
    <div className="h-full overflow-y-auto bg-white p-8 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 border-b border-gray-200 pb-6">
           <h1 className="text-3xl font-serif font-bold text-natureDark mb-2">{targetJournal}</h1>
           <p className="text-gray-500 flex items-center">
              <BookOpen className="w-4 h-4 mr-2" /> Submission Guidelines Reference
           </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-4" />
            <p>Fetching latest guidelines for {targetJournal}...</p>
          </div>
        ) : guidelines ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in">
            <section>
              <h3 className="text-lg font-bold text-natureRed mb-4 uppercase tracking-wider text-xs">Format & Length</h3>
              <ul className="space-y-4 text-sm text-gray-700">
                <li className="flex flex-col">
                  <span className="font-bold mb-1">Article Limit:</span>
                  <span>{guidelines.wordCounts.article}</span>
                </li>
                <li className="flex flex-col">
                  <span className="font-bold mb-1">Abstract:</span>
                  <span>{guidelines.wordCounts.abstract}</span>
                </li>
                <li className="flex flex-col">
                  <span className="font-bold mb-1">Methods:</span>
                  <span>{guidelines.wordCounts.methods}</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-bold text-natureRed mb-4 uppercase tracking-wider text-xs">Formatting Rules</h3>
              <ul className="space-y-4 text-sm text-gray-700">
                <li className="flex flex-col">
                  <span className="font-bold mb-1">Figures:</span>
                  <span>{guidelines.formatting.figures}</span>
                </li>
                <li className="flex flex-col">
                  <span className="font-bold mb-1">Fonts:</span>
                  <span>{guidelines.formatting.fonts}</span>
                </li>
                <li className="flex flex-col">
                  <span className="font-bold mb-1">References:</span>
                  <span>{guidelines.formatting.references}</span>
                </li>
              </ul>
            </section>

            <section className="col-span-1 md:col-span-2 bg-gray-50 p-6 rounded-lg border border-gray-100">
              <h3 className="text-lg font-bold text-natureDark mb-4 font-serif">Editorial Criteria</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h4 className="font-bold mb-2">Scope</h4>
                  <p className="text-gray-600 leading-relaxed">{guidelines.editorialCriteria.scope}</p>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Novelty Requirement</h4>
                  <p className="text-gray-600 leading-relaxed">{guidelines.editorialCriteria.novelty}</p>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Data Rigor</h4>
                  <p className="text-gray-600 leading-relaxed">{guidelines.editorialCriteria.dataRigor}</p>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <p>Unable to load guidelines. Please check your connection.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Guidelines;
