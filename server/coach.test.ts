import { describe, expect, it } from "vitest";
import { coachingResultSchema } from "./coach";

const usefulFeedback = {
  correctedSentence: "Ayer fui al mercado.",
  naturalAlternative: "Ayer pasé por el mercado.",
  encouragement: "Your meaning was clear.",
  notes: [
    {
      category: "grammar",
      original: "Ayer voy",
      suggestion: "Ayer fui",
      explanation: "Use the past tense for an action that happened yesterday.",
    },
  ],
  scores: { grammar: 76, vocabulary: 84, naturalness: 80 },
  practicePrompt: "Say where you went last Saturday.",
};

describe("coaching feedback", () => {
  it("accepts complete, useful feedback", () => {
    expect(coachingResultSchema.parse(usefulFeedback)).toEqual(usefulFeedback);
  });

  it("rejects scores outside the friendly 0–100 scale", () => {
    expect(() => coachingResultSchema.parse({
      ...usefulFeedback,
      scores: { ...usefulFeedback.scores, grammar: 130 },
    })).toThrow();
  });

  it("rejects unknown coaching categories", () => {
    expect(() => coachingResultSchema.parse({
      ...usefulFeedback,
      notes: [{ ...usefulFeedback.notes[0], category: "spelling" }],
    })).toThrow();
  });
});

