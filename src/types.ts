export type Level = "beginner" | "intermediate" | "advanced";

export interface CoachingNote {
  category: "grammar" | "vocabulary" | "naturalness" | "pronunciation";
  original: string;
  suggestion: string;
  explanation: string;
}

export interface CoachingResult {
  transcript: string;
  correctedSentence: string;
  naturalAlternative: string;
  encouragement: string;
  notes: CoachingNote[];
  scores: {
    grammar: number;
    vocabulary: number;
    naturalness: number;
  };
  practicePrompt: string;
}

export interface PracticeAttempt extends CoachingResult {
  id: string;
  language: string;
  level: Level;
  createdAt: string;
}
