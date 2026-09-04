import OpenAI, { toFile } from "openai";
import { z } from "zod";

const noteSchema = z.object({
  category: z.enum(["grammar", "vocabulary", "naturalness", "pronunciation"]),
  original: z.string(),
  suggestion: z.string(),
  explanation: z.string(),
});

export const coachingResultSchema = z.object({
  correctedSentence: z.string(),
  naturalAlternative: z.string(),
  encouragement: z.string(),
  notes: z.array(noteSchema).max(5),
  scores: z.object({
    grammar: z.number().min(0).max(100),
    vocabulary: z.number().min(0).max(100),
    naturalness: z.number().min(0).max(100),
  }),
  practicePrompt: z.string(),
});

export type CoachingResult = z.infer<typeof coachingResultSchema>;

export async function createSpeech(text: string, languageCode = "en") {
  const sarvamKey = process.env.SARVAM_API_KEY;
  const sarvamLanguages: Record<string, string> = {
    en: "en-IN",
    hi: "hi-IN",
    te: "te-IN",
  };
  const sarvamLanguage = sarvamLanguages[languageCode];
  let sarvamFailure: string | null = null;

  if (sarvamKey && sarvamLanguage) {
    const speakers: Record<string, string> = {
      en: "ratan",
      hi: "shubh",
      te: "ratan",
    };
    try {
      const response = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "api-subscription-key": sarvamKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          language_code: sarvamLanguage,
          speaker: speakers[languageCode],
          model: process.env.SARVAM_SPEECH_MODEL || "bulbul:v3",
          pace: 0.88,
          temperature: 0.45,
          speech_sample_rate: 24000,
          output_audio_codec: "wav",
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as { audios?: string[] };
        if (payload.audios?.[0]) {
          return Buffer.from(payload.audios[0], "base64");
        }
        sarvamFailure = "Sarvam returned an empty audio response.";
      } else {
        sarvamFailure = `Sarvam voice request failed (${response.status}).`;
      }
    } catch {
      sarvamFailure = "Sarvam voice service could not be reached.";
    }
  }

  const { client, provider } = getClient();
  if (provider !== "groq" || languageCode !== "en") {
    throw new Error(
      sarvamFailure ??
        "A natural studio voice is unavailable for this language.",
    );
  }

  const speech = await client.audio.speech.create({
    model: process.env.GROQ_SPEECH_MODEL || "canopylabs/orpheus-v1-english",
    voice: process.env.GROQ_SPEECH_VOICE || "daniel",
    input: `[deep, warm, calm] ${text}`,
    response_format: "wav",
  });

  return Buffer.from(await speech.arrayBuffer());
}

function getClient() {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    return {
      client: new OpenAI({
        apiKey: groqKey,
        baseURL: "https://api.groq.com/openai/v1",
      }),
      provider: "groq" as const,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is missing. Add it to .env before practising.",
    );
  }
  return { client: new OpenAI({ apiKey }), provider: "openai" as const };
}

export async function transcribeRecording(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  languageCode?: string,
) {
  const { client, provider } = getClient();
  const file = await toFile(buffer, filename, { type: mimeType });
  const languagePrompts: Record<string, string> = {
    en: "This is an Indian English language practice sentence. Preserve the learner's exact words and grammar.",
    hi: "यह हिंदी भाषा का अभ्यास है। विद्यार्थी ने जो कहा है उसे बिना व्याकरण सुधारे ज्यों का त्यों लिखें।",
    te: "ఇది తెలుగు భాషా అభ్యాసం. విద్యార్థి చెప్పిన మాటలను వ్యాకరణం సరిచేయకుండా యథాతథంగా రాయండి.",
    ja: "これは日本語の会話練習です。学習者が話した言葉を文法修正せず、そのまま書き起こしてください。",
    sa: "इदं संस्कृतभाषाभ्यासवाक्यम्। वक्तुः शब्दान् यथावत् लिखतु, व्याकरणं मा शोधयतु।",
  };
  const supportedLanguageHint =
    languageCode && ["en", "hi", "te", "ja"].includes(languageCode)
      ? languageCode
      : undefined;
  const transcription = await client.audio.transcriptions.create({
    file,
    model:
      provider === "groq"
        ? process.env.GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3"
        : process.env.TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
    ...(supportedLanguageHint ? { language: supportedLanguageHint } : {}),
    prompt:
      languagePrompts[languageCode ?? ""] ??
      "This is a language practice sentence. Preserve exactly what the learner said, including mistakes.",
    response_format: "json",
    temperature: 0,
  });

  return transcription.text.trim();
}

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "correctedSentence",
    "naturalAlternative",
    "encouragement",
    "notes",
    "scores",
    "practicePrompt",
  ],
  properties: {
    correctedSentence: { type: "string" },
    naturalAlternative: { type: "string" },
    encouragement: { type: "string" },
    notes: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "original", "suggestion", "explanation"],
        properties: {
          category: {
            type: "string",
            enum: ["grammar", "vocabulary", "naturalness", "pronunciation"],
          },
          original: { type: "string" },
          suggestion: { type: "string" },
          explanation: { type: "string" },
        },
      },
    },
    scores: {
      type: "object",
      additionalProperties: false,
      required: ["grammar", "vocabulary", "naturalness"],
      properties: {
        grammar: { type: "number", minimum: 0, maximum: 100 },
        vocabulary: { type: "number", minimum: 0, maximum: 100 },
        naturalness: { type: "number", minimum: 0, maximum: 100 },
      },
    },
    practicePrompt: { type: "string" },
  },
} as const;

export async function coachTranscript(
  transcript: string,
  language: string,
  level: string,
) {
  const { client, provider } = getClient();
  const response = await client.responses.create({
    model:
      provider === "groq"
        ? process.env.GROQ_COACH_MODEL || "openai/gpt-oss-120b"
        : process.env.COACH_MODEL || "gpt-4o-mini",
    store: false,
    instructions: [
      `You are a warm, precise ${language} tutor coaching a ${level} learner.`,
      "Correct only genuine issues. If the sentence is already good, say so and keep notes brief.",
      "Never invent pronunciation problems from text alone. Use pronunciation notes only for obvious transcription ambiguity, and clearly state the uncertainty.",
      "Keep explanations short, concrete, and appropriate for the learner's level.",
      "Write correctedSentence and naturalAlternative in the target language. Explanations and encouragement should be in simple English.",
      "Scores are constructive estimates, not scientific measurements.",
      "The practice prompt should naturally rehearse the learner's most important improvement.",
    ].join("\n"),
    input: `The learner said: ${JSON.stringify(transcript)}`,
    text: {
      format: {
        type: "json_schema",
        name: "language_coaching",
        strict: true,
        schema: responseSchema,
      },
    },
  });

  if (!response.output_text) {
    throw new Error(
      "The coach did not return feedback. Please try that recording again.",
    );
  }

  return coachingResultSchema.parse(JSON.parse(response.output_text));
}
