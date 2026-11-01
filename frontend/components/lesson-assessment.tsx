"use client";

import { type FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Course } from "@/lib/types";

type Assessment = {
  title: string;
  instructions?: string;
  passingPercentage: number;
  maxAttempts: number | null;
  attemptsUsed: number;
  questions: { _key: string; prompt: string; questionType: string; options: { _key: string; label: string }[] }[];
};

export function LessonAssessment({ courseId, lessonId, onPassed }: {
  courseId: string; lessonId: string; onPassed: (course: Course) => void;
}) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const endpoint = `/api/assessments/lesson/${encodeURIComponent(courseId)}/${encodeURIComponent(lessonId)}`;
  const exhausted = Boolean(assessment?.maxAttempts && assessment.attemptsUsed >= assessment.maxAttempts);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch<{ assessment: Assessment }>(endpoint);
      setAssessment(result.assessment);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load assessment");
    } finally { setBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!assessment || busy || exhausted) return;
    if (assessment.questions.some((question) => !answers[question._key]?.length)) {
      setError("Answer every question before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch<{ attempt: { passed: boolean; score: number; attemptNumber: number }; course: Course }>(`${endpoint}/submit`, {
        method: "POST", body: JSON.stringify({ answers })
      });
      setScore(result.attempt.score);
      setAssessment({ ...assessment, attemptsUsed: result.attempt.attemptNumber });
      if (result.attempt.passed) onPassed(result.course);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to submit assessment");
      // Refresh attempt limits before allowing a resubmission after an uncertain response.
      try { setAssessment((await apiFetch<{ assessment: Assessment }>(endpoint)).assessment); } catch { /* Preserve the original error. */ }
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-6 border-t border-gray-200 pt-6" aria-label="Lesson assessment">
      <h2 className="text-lg font-bold">{assessment?.title || "Lesson Assessment"}</h2>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      {!assessment ? (
        <button type="button" disabled={busy} onClick={load} className="mt-4 rounded-lg bg-ocean px-4 py-2 font-bold text-white disabled:opacity-50">{busy ? "Loading..." : "Start assessment"}</button>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-5">
          {assessment.instructions ? <p className="whitespace-pre-line text-sm">{assessment.instructions}</p> : null}
          <p className="text-sm text-gray-600">Pass mark: {assessment.passingPercentage}%{assessment.maxAttempts ? ` | Attempts: ${assessment.attemptsUsed}/${assessment.maxAttempts}` : ""}</p>
          {score !== null ? <p role="status" className="font-semibold">Score: {score}%. {exhausted ? "No attempts remain. Contact your course administrator." : "Not passed. Review your answers and try again."}</p> : null}
          {assessment.questions.map((question, index) => (
            <fieldset key={question._key} disabled={busy || exhausted} className="space-y-2">
              <legend className="mb-2 font-semibold">{index + 1}. {question.prompt}</legend>
              {question.options.map((option) => (
                <label key={option._key} className="flex items-start gap-3 py-1">
                  <input type={question.questionType === "multipleChoice" ? "checkbox" : "radio"} name={question._key}
                    checked={answers[question._key]?.includes(option._key) || false}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setAnswers((previous) => ({ ...previous, [question._key]: question.questionType === "multipleChoice"
                        ? checked ? [...(previous[question._key] || []), option._key] : (previous[question._key] || []).filter((key) => key !== option._key)
                        : [option._key] }));
                    }} className="mt-1 shrink-0" />
                  <span className="min-w-0 break-words text-sm">{option.label}</span>
                </label>
              ))}
            </fieldset>
          ))}
          {exhausted && score === null ? <p role="status" className="text-sm">No attempts remain. Contact your course administrator.</p> : null}
          <button type="submit" disabled={busy || exhausted} className="rounded-lg bg-ocean px-4 py-2 font-bold text-white disabled:opacity-50">{busy ? "Submitting..." : "Submit answers"}</button>
        </form>
      )}
    </section>
  );
}
