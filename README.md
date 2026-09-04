# Lingua — AI Voice Language Tutor

Lingua is a small, welcoming speaking-practice app. A learner records a sentence, receives a faithful transcript and focused language coaching, then listens to a corrected version spoken aloud.

The experience begins with a scroll driven landing page that explains Lingua's purpose through slow parallax, multilingual motion, and a clear path into the speaking studio. Custom animated menus replace inconsistent native browser selectors.

The project was built for the **LLMs Meet Speech** take-home assessment. Its goal is not to overwhelm learners with corrections. It aims to give one useful, human-sized piece of feedback at a time.

## What works

- Records audio in the browser with noise suppression and echo cancellation.
- Transcribes speech without silently correcting the learner's mistakes.
- Returns structured grammar, vocabulary, and naturalness feedback.
- Reads the polished sentence aloud at a learner-friendly pace.
- Supports Hindi, English, Telugu, Japanese, and Sanskrit.
- Offers beginner, intermediate, and advanced coaching levels.
- Saves the last 20 practice results locally for a simple progress view.
- Handles microphone denial, short/empty audio, malformed model output, missing configuration, oversized uploads, and failed audio playback.

## Evaluation criteria

### 1. End-to-end functionality

The complete path is implemented: browser recording → server upload → speech-to-text → structured LLM coaching → UI feedback → text-to-speech playback.

### 2. Thoughtful LLM use

The coach receives explicit teaching boundaries and returns a strict JSON schema. It is told not to invent pronunciation problems from a transcript, not to over-correct good sentences, to adapt explanations to the selected level, and to treat scores as constructive estimates rather than scientific measurements. The server validates every response before it reaches the interface.

The learner's sentence is passed as quoted user input, separate from the higher-priority coaching instructions. API responses are not stored by the Responses request (`store: false`).

### 3. Speech-handling quality

The recorder requests echo cancellation, noise suppression, and automatic gain control. It sends small recording chunks, preserves the browser's actual audio type, prevents accidental zero-length attempts, and gives the transcription model context to preserve language-learning mistakes. Empty or unclear results receive a specific retry message.

### 4. Code quality and structure

Recording, local history, shared types, interface code, server routes, and OpenAI calls live in focused files. Runtime data from the model is checked with Zod. Limits are applied to uploads and speech text. The API key remains on the server.

### 5. Documentation

This README covers setup, architecture, decisions, testing, limitations, and demo guidance. `.env.example` documents every configuration value without containing secrets.

### 6. Creativity and stretch goals

The progress page, adaptive levels, multi-language prompts, three-part coaching score, natural alternative, and personalised next mini-challenge go beyond the core brief.

## Setup

You need Node.js 20 or newer and one Groq API key. Groq runs Whisper transcription and structured language coaching. Add a Sarvam API key for natural Indian English, Hindi, and Telugu playback through Bulbul v3. English automatically falls back to Groq TTS when Sarvam is unavailable or out of credits. Other unsupported voice paths fall back to the best matching lower-pitch voice installed on the device.

1. Install packages:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env` and add your key:

   ```env
   GROQ_API_KEY=your_key_here
   ```

3. Start the client and API:

   ```powershell
   npm run dev
   ```

4. Open `http://localhost:5173` and allow microphone access.

Never commit `.env`. It is already excluded by `.gitignore`.

## Speech and coaching models

The default Groq pipeline is intentionally configurable:

- `whisper-large-v3` for higher accuracy multilingual speech-to-text
- `canopylabs/orpheus-v1-english` with the Daniel voice for natural English playback
- Sarvam `bulbul:v3` with production-recommended male voices for Indian speech
- `openai/gpt-oss-120b` for structured coaching
- Browser Speech Synthesis for spoken feedback

OpenAI remains available as an optional fallback when `GROQ_API_KEY` is absent.

## Architecture

```text
Microphone
   ↓ MediaRecorder
React interface
   ↓ multipart audio
Express API
   ├── Transcription model
   ├── Coaching model + strict schema validation
   └── Speech model
          ↓ MP3
Browser playback
```

The browser never sees the API key. Practice history stays in that browser's local storage; recordings are held in server memory only for the duration of the request and are not written to disk by this app.

## Tests and production build

```powershell
npm test
npm run build
```

The automated tests protect the structured feedback contract, including score bounds and allowed coaching categories.

## Known limitations

- Text transcription alone cannot reliably grade pronunciation. The interface therefore avoids pretending that it can. Audio-level pronunciation analysis would be a future specialist feature.
- Progress is browser-local and is not synchronised between devices.
- Recording format support depends on the browser. Recent Chrome, Edge, Firefox, and Safari releases support at least one of the formats selected by the recorder.
- This version processes complete turns rather than streaming partial transcripts. That keeps the intermediate project reliable and easy to review.
- API usage costs and availability depend on the OpenAI account and selected models.

## Suggested assessment demo

1. Choose Hindi and Intermediate.
2. Speak a natural sentence about your day.
3. Show the preserved transcript and the focused correction.
4. Play the polished sentence.
5. Open Progress to show the saved result.
6. Briefly show the helpful error produced when a recording is too short or the microphone is denied.
