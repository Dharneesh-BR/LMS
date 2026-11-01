import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAssessment, scoreAssessment } from "./assessment.service.js";

const assessment = {
  _id: "assessment-1",
  title: "Lesson check",
  passingPercentage: 70,
  questions: [
    {
      _key: "single",
      prompt: "Choose one",
      questionType: "singleChoice",
      options: [
        { _key: "a", label: "A", isCorrect: true },
        { _key: "b", label: "B", isCorrect: false }
      ]
    },
    {
      _key: "multiple",
      prompt: "Choose two",
      questionType: "multipleChoice",
      options: [
        { _key: "x", label: "X", isCorrect: true },
        { _key: "y", label: "Y", isCorrect: true },
        { _key: "z", label: "Z", isCorrect: false }
      ]
    }
  ]
};

test("public assessment data never exposes correct-answer flags", () => {
  const sanitized = sanitizeAssessment(assessment);
  assert.equal("isCorrect" in sanitized.questions[0].options[0], false);
});

test("assessment scoring compares complete answer sets", () => {
  const result = scoreAssessment(assessment, {
    single: ["a"],
    multiple: ["y", "x"]
  });
  assert.equal(result.score, 100);
  assert.equal(result.passed, true);
});

test("partially selecting a multiple-choice answer is incorrect", () => {
  const result = scoreAssessment(assessment, {
    single: ["a"],
    multiple: ["x"]
  });
  assert.equal(result.score, 50);
  assert.equal(result.passed, false);
});
