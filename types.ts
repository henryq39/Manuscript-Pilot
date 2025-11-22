
export enum AppTab {
  EDITOR = 'EDITOR',
  COVER_LETTER = 'COVER_LETTER',
  FIGURE_CHECK = 'FIGURE_CHECK',
  GUIDELINES = 'GUIDELINES',
  CHAT = 'CHAT',
  JOURNAL_FINDER = 'JOURNAL_FINDER'
}

export enum AnalysisType {
  IMPACT_POLISH = 'IMPACT_POLISH',
  LOGIC_CHECK = 'LOGIC_CHECK',
  CONCISENESS = 'CONCISENESS',
  REBUTTAL = 'REBUTTAL'
}

export interface AnalysisResult {
  originalText: string;
  modifiedText?: string;
  critique: string;
  type: AnalysisType;
}

export interface CoverLetterParams {
  title: string;
  authorName: string;
  affiliation: string;
  abstract: string;
  noveltyStatement: string;
  editorName?: string;
}

export interface FigureAnalysis {
  imageUrl: string;
  critique: string;
  suggestions: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
}

export interface JournalEvaluationResult {
  journalName: string;
  matchScore: number;
  verdict: 'Strong Candidate' | 'Worth Trying' | 'High Risk' | 'Out of Scope';
  strengths: string[];
  weaknesses: string[];
  editorComments: string;
}

export interface JournalGuidelines {
  journalName: string;
  wordCounts: {
    article: string;
    abstract: string;
    methods: string;
  };
  formatting: {
    figures: string;
    references: string;
    fonts: string;
  };
  editorialCriteria: {
    scope: string;
    novelty: string;
    dataRigor: string;
  };
}

export const PRESET_JOURNALS = [
  "Nature Cell Biology",
  "Nature",
  "Science",
  "Cell",
  "Molecular Cell",
  "Nature Communications",
  "Journal of Cell Biology",
  "Current Biology",
  "eLife"
];
