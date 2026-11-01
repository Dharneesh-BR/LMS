const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");

test("video completion reveals the required assessment and passing unlocks Next lesson", async () => {
  const user = { id: "learner" };
  const course = { _id: "course", title: "Course", modules: [{ _id: "module", lessons: [
    { _id: "one", title: "One", videoUrl: "https://player.vimeo.com/video/123", locked: false, assessment: { _id: "check", title: "Knowledge Check" } },
    { _id: "two", title: "Two", locked: true }
  ] }] };
  const assessment = { title: "Knowledge Check", passingPercentage: 70, maxAttempts: 3, attemptsUsed: 0,
    questions: [{ _key: "question", prompt: "Choose an answer", questionType: "singleChoice", options: [
      { _key: "correct", label: "Correct" }, { _key: "wrong", label: "Wrong" }
    ] }] };
  let progress = null;
  const requests = [];
  async function apiFetch(url, init = {}) {
    requests.push(url);
    if (url === "/api/course/course") return { course: structuredClone(course) };
    if (url === "/api/progress/course") return { progress: progress ? [progress] : [] };
    if (url === "/api/progress/update") {
      const update = JSON.parse(init.body);
      assert.equal(update.completionSource, "video-ended");
      progress = { lessonId: "one", watchedSeconds: 100, durationSeconds: 100, contentCompleted: true, completed: false };
      return { progress, course: structuredClone(course) };
    }
    if (url.endsWith("/submit")) {
      const passed = JSON.parse(init.body).answers.question.includes("correct");
      assessment.attemptsUsed++;
      if (passed) { course.modules[0].lessons[1].locked = false; progress.completed = true; }
      return { attempt: { passed, score: passed ? 100 : 0, attemptNumber: assessment.attemptsUsed }, course: structuredClone(course) };
    }
    if (url === "/api/assessments/lesson/course/one") return { assessment: structuredClone(assessment) };
    throw new Error(`Unexpected endpoint: ${url}`);
  }
  function load(relative) {
    const filename = path.resolve(__dirname, relative);
    const loaded = new Module(filename, module);
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    loaded.require = (id) => {
      if (id === "@/lib/api") return { apiFetch };
      if (id === "@/components/auth-provider") return { useAuth: () => ({ apiUser: user, firebaseUser: user, loading: false }) };
      if (id === "@/components/protected") return { Protected: ({ children }) => children };
      if (id === "@/components/vimeo-player") return { VimeoPlayer: (props) => React.createElement("video-test", props) };
      if (id === "@/components/lesson-assessment") return load("../components/lesson-assessment.tsx");
      if (id === "@portabletext/react") return { PortableText: () => null };
      if (id === "next/link") return { __esModule: true, default: (props) => React.createElement("a", props) };
      return require(id);
    };
    loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
    }).outputText, filename);
    return loaded.exports;
  }
  const Page = load("../app/courses/[courseId]/lessons/[lessonId]/page.tsx").default;
  let renderer;
  const nextLinks = () => renderer.root.findAllByType("a").filter((node) => node.children.includes("Next lesson"));
  try {
    await act(async () => { renderer = create(React.createElement(Page, { params: { courseId: "course", lessonId: "one" } })); });
    assert.equal(nextLinks().length, 0);
    await act(async () => renderer.root.findByType("video-test").props.onProgressSave({ watchedSeconds: 100, durationSeconds: 100, completed: true, completionSource: "video-ended" }));
    assert.equal(nextLinks().length, 0);
    assert.ok(JSON.stringify(renderer.toJSON()).includes("Pass the lesson assessment"));
    await act(async () => renderer.root.findByType("button").props.onClick());
    await act(async () => renderer.root.findAllByType("input")[1].props.onChange({ target: { checked: true } }));
    await act(async () => renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }));
    assert.equal(nextLinks().length, 0);
    assert.ok(JSON.stringify(renderer.toJSON()).includes("Not passed"));
    await act(async () => renderer.root.findAllByType("input")[0].props.onChange({ target: { checked: true } }));
    await act(async () => renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }));
    assert.equal(nextLinks().length, 2);
    assert.equal(nextLinks()[0].props.href, "/programs/courses/course/lessons/two");
    await act(async () => renderer.unmount());
    renderer = null;
    await act(async () => { renderer = create(React.createElement(Page, { params: { courseId: "course", lessonId: "one" } })); });
    assert.equal(nextLinks().length, 2);
    assert.equal(requests.filter((url) => url.endsWith("/submit")).length, 2);
  } finally { if (renderer) await act(async () => renderer.unmount()); }
});
