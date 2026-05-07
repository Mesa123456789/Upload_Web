import { auth } from "../lib/firebase";
import type { DynamicSubmission } from "../features/upload/types/submission";

const CLASS_CODE_KEY = "ai-dashboard-class-code";
const LATEST_SUBMISSION_KEY = "ai-dashboard-latest-submission";
const SAVED_ANALYSES_KEY = "ai-dashboard-saved-analyses";

export function deriveClassCode(email?: string | null) {
  if (!email) return "CLASS-DEMO";
  const prefix = email.split("@")[0] || "student";
  const clean = prefix.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  return `CMU-${clean || "DEMO"}`;
}

export function getStoredClassCode() {
  return localStorage.getItem(CLASS_CODE_KEY);
}

export function setStoredClassCode(code: string) {
  localStorage.setItem(CLASS_CODE_KEY, code.trim().toUpperCase());
}

export function getActiveClassCode() {
  return getStoredClassCode() || deriveClassCode(auth.currentUser?.email);
}

export function rememberLatestSubmission(submission: DynamicSubmission) {
  localStorage.setItem(LATEST_SUBMISSION_KEY, JSON.stringify(submission));
}

export function getRememberedLatestSubmission() {
  const raw = localStorage.getItem(LATEST_SUBMISSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DynamicSubmission;
  } catch {
    return null;
  }
}

export function saveAnalysisLocally(submission: DynamicSubmission) {
  const current = getSavedAnalyses();
  const next = [
    { ...submission, savedToDashboard: true },
    ...current.filter((item) => item.timestamp !== submission.timestamp),
  ].slice(0, 12);
  localStorage.setItem(SAVED_ANALYSES_KEY, JSON.stringify(next));
}

export function getSavedAnalyses() {
  const raw = localStorage.getItem(SAVED_ANALYSES_KEY);
  if (!raw) return [] as DynamicSubmission[];
  try {
    return JSON.parse(raw) as DynamicSubmission[];
  } catch {
    return [];
  }
}
