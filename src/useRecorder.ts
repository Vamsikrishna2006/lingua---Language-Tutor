import { useEffect, useRef, useState } from "react";

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => () => stopTracks(), []);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const preferredType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(MediaRecorder.isTypeSupported);
    recorder.current = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
    chunks.current = [];
    recorder.current.ondataavailable = (event) => event.data.size && chunks.current.push(event.data);
    recorder.current.start(250);
    setSeconds(0);
    setIsRecording(true);
    timer.current = window.setInterval(() => setSeconds((value) => value + 1), 1_000);
  }

  function stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!recorder.current || recorder.current.state === "inactive") {
        reject(new Error("There is no active recording."));
        return;
      }
      recorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: recorder.current?.mimeType || "audio/webm" });
        stopTracks();
        resolve(blob);
      };
      recorder.current.stop();
      setIsRecording(false);
      if (timer.current) window.clearInterval(timer.current);
    });
  }

  function stopTracks() {
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
  }

  return { isRecording, seconds, start, stop };
}
