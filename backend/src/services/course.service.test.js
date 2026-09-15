import assert from "node:assert/strict";
import test from "node:test";
import { assertCourseAudience, courseMatchesAudience } from "./course.service.js";

test("global courses match learners without audience filters", () => {
  assert.equal(courseMatchesAudience({}, {}), true);
});

test("targeted courses do not match learners with missing profile values", () => {
  const course = {
    targetDepartments: ["Sales"],
    targetDesignations: ["Manager"]
  };

  assert.equal(courseMatchesAudience(course, {}), false);
  assert.equal(courseMatchesAudience(course, { department: "Sales" }), false);
  assert.equal(courseMatchesAudience(course, { designation: "Manager" }), false);
});

test("targeted courses match when one department and one designation match", () => {
  const course = {
    targetDepartments: ["Sales", "Marketing"],
    targetDesignations: ["Manager", "Executive"]
  };

  assert.equal(
    courseMatchesAudience(course, { department: " sales ", designation: "manager" }),
    true
  );
});

test("targeted courses reject non-matching department or designation", () => {
  const course = {
    targetDepartments: ["Sales"],
    targetDesignations: ["Manager"]
  };

  assert.equal(courseMatchesAudience(course, { department: "Finance", designation: "Manager" }), false);
  assert.equal(courseMatchesAudience(course, { department: "Sales", designation: "Designer" }), false);
});

test("course audience guard blocks users outside the target audience", () => {
  const course = {
    targetDepartments: ["Marketing"],
    targetDesignations: ["Manager"]
  };

  assert.doesNotThrow(() =>
    assertCourseAudience(course, { department: "Marketing", designation: "Manager" })
  );
  assert.throws(
    () => assertCourseAudience(course, { department: "Sales", designation: "Manager" }),
    /not assigned/
  );
});
