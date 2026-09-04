import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import { ZodError } from "zod";
import { coachTranscript, createSpeech, transcribeRecording } from "./coach.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  const provider = process.env.GROQ_API_KEY
    ? "Groq Whisper"
    : process.env.OPENAI_API_KEY
      ? "OpenAI"
      : null;
  response.json({ ready: Boolean(provider), provider });
});

app.post("/api/speech", async (request, response) => {
  try {
    const text = String(request.body.text ?? "").trim();
    const languageCode = String(request.body.languageCode ?? "en");
    if (!text) {
      response.status(400).json({ error: "There is nothing to read aloud." });
      return;
    }
    if (text.length > 1200) {
      response
        .status(400)
        .json({ error: "That passage is too long to read aloud." });
      return;
    }

    const audio = await createSpeech(text, languageCode);
    response.type("audio/wav").send(audio);
  } catch (error) {
    handleError(error, response);
  }
});

app.post("/api/practice", upload.single("audio"), async (request, response) => {
  try {
    if (!request.file) {
      response.status(400).json({ error: "No recording was received." });
      return;
    }

    const language = String(request.body.language ?? "English");
    const languageCode = String(request.body.languageCode ?? "en");
    const level = String(request.body.level ?? "beginner");
    const transcript = await transcribeRecording(
      request.file.buffer,
      request.file.originalname || "practice.webm",
      request.file.mimetype || "audio/webm",
      languageCode,
    );

    if (!transcript) {
      response.status(422).json({
        error:
          "I couldn't hear a complete sentence. Try again a little closer to the microphone.",
      });
      return;
    }

    const feedback = await coachTranscript(transcript, language, level);
    response.json({ transcript, ...feedback });
  } catch (error) {
    handleError(error, response);
  }
});

function handleError(error: unknown, response: express.Response) {
  console.error(error);
  if (error instanceof ZodError) {
    response.status(502).json({
      error: "The feedback arrived in an unexpected format. Please try again.",
    });
    return;
  }
  const originalMessage = error instanceof Error ? error.message : "";
  const isConnectionFailure =
    error instanceof Error &&
    (error.name === "APIConnectionError" ||
      originalMessage.toLowerCase().includes("connection error"));
  const isOutOfCredits =
    (error as { status?: number })?.status === 429 ||
    originalMessage.toLowerCase().includes("no credits remaining") ||
    originalMessage.toLowerCase().includes("insufficient_quota");
  const message = isOutOfCredits
    ? "This OpenAI API account has no credits remaining. Add billing credits, then try again."
    : isConnectionFailure
      ? "The voice service could not reach OpenAI. Check the internet connection, then try again."
      : originalMessage ||
        "Something went wrong while processing the recording.";
  const status = isOutOfCredits
    ? 402
    : message.includes("OPENAI_API_KEY")
      ? 503
      : 500;
  response.status(status).json({ error: message });
}

app.listen(port, () => {
  console.log(`Lingua API is listening on http://localhost:${port}`);
});
