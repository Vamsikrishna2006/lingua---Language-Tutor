import type { PracticeAttempt } from "./types";

const HISTORY_KEY = "lingua-practice-history";

export function loadHistory(): PracticeAttempt[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveAttempt(attempt: PracticeAttempt) {
  const history = [attempt, ...loadHistory()].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}
