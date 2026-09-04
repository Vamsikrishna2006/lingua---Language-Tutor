import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ArrowRight,
  Check,
  Clock3,
  History,
  Mic,
  Pause,
  RotateCcw,
  Sparkles,
  Square,
  TrendingUp,
  Volume2,
} from "lucide-react";
import { loadHistory, saveAttempt } from "./storage";
import { Landing } from "./Landing";
import { MotionCursor } from "./MotionCursor";
import { SelectMenu } from "./SelectMenu";
import type { CoachingResult, Level, PracticeAttempt } from "./types";
import { useRecorder } from "./useRecorder";

const languages = [
  { name: "Hindi", code: "hi", flag: "हि" },
  { name: "English", code: "en", flag: "EN" },
  { name: "Telugu", code: "te", flag: "తె" },
  { name: "Japanese", code: "ja", flag: "日" },
  { name: "Sanskrit", code: "sa", flag: "सं" },
];

const prompts: Record<string, string> = {
  Hindi: "आज आपके दिन की सबसे अच्छी बात क्या थी?",
  English: "What is one thing you want to do this week?",
  Telugu: "ఈ రోజు మీకు బాగా నచ్చిన విషయం ఏమిటి?",
  Japanese: "週末に何をしたか話してください。",
  Sanskrit: "भवान् अद्य किं कृतवान् अथवा भवती किं कृतवती?",
};

type Stage = "ready" | "recording" | "thinking" | "feedback";

export default function App() {
  const [language, setLanguage] = useState(
    languages.find((item) => item.code === "en")!,
  );
  const [level, setLevel] = useState<Level>("intermediate");
  const [stage, setStage] = useState<Stage>("ready");
  const [result, setResult] = useState<CoachingResult | null>(null);
  const [history, setHistory] = useState(loadHistory);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [view, setView] = useState<"home" | "practice" | "progress">("home");
  const currentSpeech = useRef<SpeechSynthesisUtterance | null>(null);
  const generatedAudio = useRef<HTMLAudioElement | null>(null);
  const hero = useRef<HTMLElement | null>(null);
  const { isRecording, seconds, start, stop } = useRecorder();
  const { scrollYProgress } = useScroll({
    target: hero,
    offset: ["start start", "end start"],
  });
  const heroImageY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const heroCopyY = useTransform(scrollYProgress, [0, 1], [0, -45]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);

  const average = useMemo(() => {
    if (!history.length) return 0;
    const points = history.flatMap((attempt) => Object.values(attempt.scores));
    return Math.round(
      points.reduce((sum, score) => sum + score, 0) / points.length,
    );
  }, [history]);

  async function toggleRecording() {
    setError("");
    if (!isRecording) {
      try {
        await start();
        setStage("recording");
      } catch {
        setError("Microphone access is needed to hear your practice sentence.");
      }
      return;
    }

    if (seconds < 1) {
      setError("Give me a full sentence. Keep speaking for another moment.");
      return;
    }

    try {
      const recording = await stop();
      setStage("thinking");
      const form = new FormData();
      form.append(
        "audio",
        recording,
        recording.type.includes("mp4") ? "practice.m4a" : "practice.webm",
      );
      form.append("language", language.name);
      form.append("languageCode", language.code);
      form.append("level", level);
      const response = await fetch("/api/practice", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Your recording couldn't be processed.");
      setResult(data);
      const attempt: PracticeAttempt = {
        ...data,
        id: crypto.randomUUID(),
        language: language.name,
        level,
        createdAt: new Date().toISOString(),
      };
      setHistory(saveAttempt(attempt));
      setStage("feedback");
    } catch (problem) {
      setStage("ready");
      setError(
        problem instanceof Error
          ? problem.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  async function speak(text: string) {
    if (playing) {
      window.speechSynthesis.cancel();
      generatedAudio.current?.pause();
      setPlaying(false);
      return;
    }

    try {
      setError("");
      window.speechSynthesis.cancel();
      generatedAudio.current?.pause();

      if (["en", "hi", "te"].includes(language.code)) {
        const response = await fetch("/api/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, languageCode: language.code }),
        });
        if (response.ok) {
          const audioUrl = URL.createObjectURL(await response.blob());
          const audio = new Audio(audioUrl);
          generatedAudio.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            generatedAudio.current = null;
            setPlaying(false);
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            generatedAudio.current = null;
            setPlaying(false);
            setError("The studio voice couldn't be played. Please try again.");
          };
          setPlaying(true);
          await audio.play();
          return;
        }
      }

      if (!("speechSynthesis" in window)) {
        throw new Error("Speech playback is not supported by this browser.");
      }

      const localeByLanguage: Record<string, string> = {
        en: "en-IN",
        hi: "hi-IN",
        te: "te-IN",
        ja: "ja-JP",
        sa: "hi-IN",
      };
      const utterance = new SpeechSynthesisUtterance(text);
      const locale = localeByLanguage[language.code] ?? language.code;
      const voices = window.speechSynthesis.getVoices();
      const preferredMaleNames: Record<string, string[]> = {
        en: ["David", "Guy", "Mark", "Ryan", "male"],
        hi: ["Madhur", "Hemant", "Ravi", "male"],
        te: ["Mohan", "male"],
        ja: ["Ichiro", "Keita", "male"],
        sa: ["Madhur", "Hemant", "Ravi", "male"],
      };
      const localVoices = voices.filter(
        (voice) =>
          voice.lang.toLowerCase() === locale.toLowerCase() ||
          voice.lang.toLowerCase().startsWith(language.code),
      );
      const preferredVoice = localVoices.find((voice) =>
        (preferredMaleNames[language.code] ?? []).some((name) =>
          voice.name.toLowerCase().includes(name.toLowerCase()),
        ),
      );
      utterance.voice = preferredVoice ?? localVoices[0] ?? null;
      utterance.lang = locale;
      utterance.rate = 0.8;
      utterance.pitch = 0.78;
      utterance.onend = () => {
        setPlaying(false);
      };
      utterance.onerror = () => {
        setPlaying(false);
        setError("Speech playback was interrupted. Tap Hear it to try again.");
      };
      currentSpeech.current = utterance;
      setPlaying(true);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (problem) {
      setPlaying(false);
      setError(
        problem instanceof Error
          ? problem.message
          : "The audio couldn't be played.",
      );
    }
  }

  function reset() {
    window.speechSynthesis?.cancel();
    generatedAudio.current?.pause();
    generatedAudio.current = null;
    currentSpeech.current = null;
    setPlaying(false);
    setResult(null);
    setError("");
    setStage("ready");
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="app-shell"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <MotionCursor />
        <motion.div
          className="ambient ambient-a"
          animate={{ x: [0, 80, -20], y: [0, 40, 100], scale: [1, 1.18, 0.95] }}
          transition={{
            duration: 18,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="ambient ambient-b"
          animate={{ x: [0, -50, 60], y: [0, -70, -20], scale: [1, 0.9, 1.15] }}
          transition={{
            duration: 22,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
        <div className="grain" />
        <motion.header
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.65 }}
        >
          <button
            className="brand"
            onClick={() => {
              setView("home");
              reset();
            }}
          >
            <span className="brand-mark">L</span>
            <span>
              LINGUA<small>VOICE STUDIO</small>
            </span>
          </button>
          <nav aria-label="Main navigation">
            <motion.button
              className={view === "home" ? "active" : ""}
              onClick={() => setView("home")}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.94 }}
            >
              Home
            </motion.button>
            <motion.button
              className={view === "practice" ? "active" : ""}
              onClick={() => setView("practice")}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.94 }}
            >
              Studio
            </motion.button>
            <motion.button
              className={view === "progress" ? "active" : ""}
              onClick={() => setView("progress")}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.94 }}
            >
              Journal
            </motion.button>
          </nav>
          <div className="streak">
            <span className="live-dot" />
            <strong>{history.length || "NEW"}</strong>
            <small>{history.length ? "SESSIONS" : "START HERE"}</small>
          </div>
        </motion.header>

        <AnimatePresence mode="wait">
          {view === "home" ? (
            <Landing key="home" onStart={() => setView("practice")} />
          ) : view === "progress" ? (
            <motion.div
              key="journal"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.45 }}
            >
              <Progress
                history={history}
                average={average}
                onPractice={() => setView("practice")}
              />
            </motion.div>
          ) : (
            <motion.main
              key="studio"
              className="studio-page"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.section
                className="hero-stage"
                ref={hero}
                initial={{ clipPath: "inset(0 0 100% 0)" }}
                animate={{ clipPath: "inset(0 0 0% 0)" }}
                transition={{ duration: 1.15, ease: [0.76, 0, 0.24, 1] }}
              >
                <motion.img
                  src="/images/language-landscape.png"
                  alt="Abstract ribbons of sound flowing through a warm, dreamlike landscape"
                  style={{ y: heroImageY, scale: 1.06 }}
                />
                <div className="hero-shade" />
                <motion.div
                  className="hero-copy"
                  style={{ y: heroCopyY, opacity: heroOpacity }}
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: {
                      transition: {
                        staggerChildren: 0.12,
                        delayChildren: 0.65,
                      },
                    },
                  }}
                >
                  <motion.div
                    className="eyebrow"
                    variants={{
                      hidden: { opacity: 0, x: -25 },
                      show: { opacity: 1, x: 0 },
                    }}
                  >
                    <span /> SPEAK BEYOND THE TEXTBOOK
                  </motion.div>
                  <motion.h1
                    variants={{
                      hidden: { opacity: 0, y: 45 },
                      show: {
                        opacity: 1,
                        y: 0,
                        transition: {
                          duration: 0.75,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      },
                    }}
                  >
                    Your voice,
                    <br />
                    <em>somewhere new.</em>
                  </motion.h1>
                  <motion.p
                    variants={{
                      hidden: { opacity: 0, y: 18 },
                      show: { opacity: 1, y: 0 },
                    }}
                  >
                    A private studio for practising the words you almost know
                    until they finally feel like yours.
                  </motion.p>
                </motion.div>
                <motion.div
                  className="hero-stamp"
                  initial={{ opacity: 0, scale: 0.5, rotate: -18 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  whileHover={{ scale: 1.08, rotate: 8 }}
                  transition={{ delay: 1, type: "spring", stiffness: 130 }}
                >
                  <span>✦</span>
                  <b>
                    DAILY
                    <br />
                    VOICE
                    <br />
                    RITUAL
                  </b>
                </motion.div>
                <div className="sound-ribbon">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </motion.section>

              <motion.section
                className="practice-card"
                id="studio"
                initial={{ opacity: 0, y: 90, rotateX: 8 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="card-index">SESSION / 01</div>
                <div className="settings-row">
                  <SelectMenu
                    label="LANGUAGE"
                    value={language.code}
                    options={languages.map((item) => ({
                      value: item.code,
                      label: item.name,
                      mark: item.flag,
                    }))}
                    onChange={(code) =>
                      setLanguage(languages.find((item) => item.code === code)!)
                    }
                  />
                  <span className="settings-line" />
                  <SelectMenu
                    label="COMFORT ZONE"
                    value={level}
                    options={[
                      { value: "beginner", label: "Beginner" },
                      { value: "intermediate", label: "Intermediate" },
                      { value: "advanced", label: "Advanced" },
                    ]}
                    onChange={(nextLevel) => setLevel(nextLevel as Level)}
                  />
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  {stage === "feedback" && result ? (
                    <motion.div
                      key="feedback"
                      initial={{ opacity: 0, y: 25 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -18 }}
                      transition={{ duration: 0.45 }}
                    >
                      <Feedback
                        result={result}
                        playing={playing}
                        onSpeak={() => speak(result.correctedSentence)}
                        onReset={reset}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="record"
                      className="record-area"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        className="prompt-copy"
                        initial={{ opacity: 0, x: -25 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="prompt-label">
                          TODAY'S THREAD <span>✦</span>
                        </div>
                        <AnimatePresence mode="wait">
                          <motion.p
                            className="prompt"
                            key={language.code}
                            lang={language.code}
                            initial={{
                              opacity: 0,
                              y: 16,
                              filter: "blur(8px)",
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              filter: "blur(0px)",
                            }}
                            exit={{
                              opacity: 0,
                              y: -12,
                              filter: "blur(8px)",
                            }}
                            transition={{ duration: 0.38 }}
                          >
                            {prompts[language.name]}
                          </motion.p>
                        </AnimatePresence>
                        <p className="prompt-hint">
                          Answer in {language.name}, or take the conversation
                          anywhere.
                        </p>
                      </motion.div>
                      <motion.div
                        className="record-console"
                        initial={{ opacity: 0, x: 25 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.28 }}
                      >
                        <div className={`mic-orbit ${stage}`}>
                          <motion.button
                            className="mic-button"
                            disabled={stage === "thinking"}
                            onClick={toggleRecording}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.9 }}
                            animate={
                              isRecording
                                ? { scale: [1, 1.08, 1] }
                                : { scale: 1 }
                            }
                            transition={
                              isRecording
                                ? { duration: 1.25, repeat: Infinity }
                                : {
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 20,
                                  }
                            }
                            aria-label={
                              isRecording ? "Stop recording" : "Start recording"
                            }
                          >
                            {stage === "thinking" ? (
                              <span className="spinner" />
                            ) : isRecording ? (
                              <Square size={24} fill="currentColor" />
                            ) : (
                              <Mic size={27} />
                            )}
                          </motion.button>
                          <span className="orbit-label">REC</span>
                          {isRecording && <span className="pulse one" />}
                          {isRecording && <span className="pulse two" />}
                        </div>
                        <div className="console-copy">
                          <span className="status-line">
                            <i className={isRecording ? "on" : ""} />{" "}
                            {stage === "thinking"
                              ? "ANALYSING"
                              : isRecording
                                ? "RECORDING"
                                : "STUDIO READY"}
                          </span>
                          <h2>
                            {stage === "thinking"
                              ? "Finding the useful details…"
                              : isRecording
                                ? "Keep going. Take up space."
                                : "Press record when the thought arrives."}
                          </h2>
                          <p className="record-hint">
                            {stage === "thinking"
                              ? "Your coach is listening for meaning, not perfection."
                              : isRecording
                                ? `${formatTime(seconds)} / tap again to finish`
                                : "For the clearest result, speak for 3 to 15 seconds and stay close to the microphone."}
                          </p>
                          <div className="wave" aria-hidden="true">
                            {Array.from({ length: 34 }, (_, index) => (
                              <i
                                key={index}
                                style={{
                                  height: isRecording
                                    ? `${12 + ((index * 17) % 30)}px`
                                    : `${5 + ((index * 7) % 10)}px`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="error"
                      role="alert"
                      initial={{ opacity: 0, height: 0, x: -14 }}
                      animate={{ opacity: 1, height: "auto", x: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.div
                  className="privacy"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                >
                  <span>PRIVATE BY DESIGN</span> Your voice is processed for
                  this moment, then released.
                </motion.div>
              </motion.section>

              <motion.section
                className="how-it-works"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.5 }}
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.13 } },
                }}
              >
                <p>THE RITUAL</p>
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 24 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <span>01</span>
                  <strong>Let it out</strong>
                  <small>Speak before you overthink it.</small>
                </motion.div>
                <ArrowRight />
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 24 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <span>02</span>
                  <strong>Notice one thing</strong>
                  <small>Get precise, generous coaching.</small>
                </motion.div>
                <ArrowRight />
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 24 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <span>03</span>
                  <strong>Say it your way</strong>
                  <small>Listen, repeat, make it yours.</small>
                </motion.div>
              </motion.section>
            </motion.main>
          )}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  );
}

function Feedback({
  result,
  playing,
  onSpeak,
  onReset,
}: {
  result: CoachingResult;
  playing: boolean;
  onSpeak: () => void;
  onReset: () => void;
}) {
  return (
    <motion.div
      className="feedback"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
    >
      <motion.div
        className="feedback-title"
        variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
      >
        <div>
          <span className="success-icon">
            <Check />
          </span>
          <div>
            <small>NICE WORK</small>
            <h2>{result.encouragement}</h2>
          </div>
        </div>
        <motion.button
          className="secondary"
          onClick={onReset}
          whileHover={{ scale: 1.04, rotate: -1 }}
          whileTap={{ scale: 0.95 }}
        >
          <RotateCcw size={16} /> Try another
        </motion.button>
      </motion.div>
      <motion.div
        className="sentence original"
        variants={{
          hidden: { opacity: 0, x: -24 },
          show: { opacity: 1, x: 0 },
        }}
      >
        <small>WHAT I HEARD</small>
        <p>“{result.transcript}”</p>
      </motion.div>
      <motion.div
        className="sentence corrected"
        variants={{ hidden: { opacity: 0, x: 24 }, show: { opacity: 1, x: 0 } }}
      >
        <small>A POLISHED VERSION</small>
        <p>{result.correctedSentence}</p>
        <motion.button
          onClick={onSpeak}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
        >
          {playing ? <Pause size={18} /> : <Volume2 size={18} />}{" "}
          {playing ? "Pause" : "Hear it"}
        </motion.button>
      </motion.div>
      <div className="scores">
        {Object.entries(result.scores).map(([name, score], index) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + index * 0.1 }}
          >
            <div>
              <span>{name}</span>
              <strong>{score}</strong>
            </div>
            <div className="score-track">
              <motion.i
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{
                  delay: 0.48 + index * 0.1,
                  duration: 0.9,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
      {result.notes.length > 0 && (
        <div className="notes">
          <h3>A few useful details</h3>
          {result.notes.map((note, index) => (
            <motion.article
              key={`${note.category}-${index}`}
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.09 }}
            >
              <span>{index + 1}</span>
              <div>
                <small>{note.category}</small>
                <p>
                  <del>{note.original}</del> <ArrowRight size={13} />{" "}
                  <strong>{note.suggestion}</strong>
                </p>
                <p>{note.explanation}</p>
              </div>
            </motion.article>
          ))}
        </div>
      )}
      <motion.div
        className="natural"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.62 }}
        whileHover={{ y: -3 }}
      >
        <Sparkles size={18} />
        <div>
          <small>ANOTHER NATURAL WAY TO SAY IT</small>
          <p>{result.naturalAlternative}</p>
        </div>
      </motion.div>
      <motion.div
        className="next-prompt"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.72 }}
      >
        <div>
          <small>YOUR NEXT PRACTICE</small>
          <p>{result.practicePrompt}</p>
        </div>
        <motion.button
          onClick={onReset}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.95 }}
        >
          Practise it <ArrowRight size={16} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function Progress({
  history,
  average,
  onPractice,
}: {
  history: PracticeAttempt[];
  average: number;
  onPractice: () => void;
}) {
  return (
    <motion.main
      className="progress-page"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
    >
      <motion.div
        className="eyebrow"
        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      >
        <span /> YOUR LEARNING JOURNEY
      </motion.div>
      <motion.h1
        variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0 } }}
      >
        Small steps become
        <br />
        <em>real confidence.</em>
      </motion.h1>
      <div className="stat-grid">
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 22 },
            show: { opacity: 1, y: 0 },
          }}
          whileHover={{ y: -6 }}
        >
          <History />
          <strong>{history.length}</strong>
          <span>sentences practised</span>
        </motion.div>
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 22 },
            show: { opacity: 1, y: 0 },
          }}
          whileHover={{ y: -6 }}
        >
          <TrendingUp />
          <strong>{average || "0"}</strong>
          <span>average coaching score</span>
        </motion.div>
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 22 },
            show: { opacity: 1, y: 0 },
          }}
          whileHover={{ y: -6 }}
        >
          <Clock3 />
          <strong>
            {new Set(history.map((item) => item.createdAt.slice(0, 10))).size}
          </strong>
          <span>active practice days</span>
        </motion.div>
      </div>
      <motion.section
        className="history-card"
        variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }}
      >
        <h2>Recent practice</h2>
        {history.length ? (
          history.map((attempt) => (
            <motion.article
              key={attempt.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ x: 7 }}
            >
              <span className="language-dot">
                {languages.find((item) => item.name === attempt.language)
                  ?.flag ?? "💬"}
              </span>
              <div>
                <strong>{attempt.correctedSentence}</strong>
                <small>
                  {attempt.language} · {attempt.level} ·{" "}
                  {new Date(attempt.createdAt).toLocaleDateString()}
                </small>
              </div>
              <b>
                {Math.round(
                  Object.values(attempt.scores).reduce((a, b) => a + b, 0) / 3,
                )}
              </b>
            </motion.article>
          ))
        ) : (
          <div className="empty">
            <Mic />
            <p>Your first sentence will appear here.</p>
            <motion.button
              onClick={onPractice}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
            >
              Start practising
            </motion.button>
          </div>
        )}
      </motion.section>
    </motion.main>
  );
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
