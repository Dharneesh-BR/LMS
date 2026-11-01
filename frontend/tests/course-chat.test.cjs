const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");

function loadChat(apiFetch) {
  let pathname = "/programs/courses/course-one/lessons/lesson";
  let user = { id: "learner" };
  const filename = path.resolve(__dirname, "../components/course-chat.tsx");
  const loaded = new Module(filename, module);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = (id) => {
    if (id === "next/navigation") return { usePathname: () => pathname };
    if (id === "@/components/auth-provider") return { useAuth: () => ({ apiUser: user, firebaseUser: user, loading: false }) };
    if (id === "@/lib/api") return { apiFetch };
    return require(id);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, filename);
  return { Chat: loaded.exports.CourseChat, setPath(value) { pathname = value; }, logout() { user = null; } };
}

const knowledge = { courseId: "course-one", courseTitle: "Sales Skills", enabled: true, chatConfigured: true, status: "ready" };
const button = (renderer, label) => renderer.root.findByProps({ "aria-label": label });

test("course chat sends bounded history, renders cited plain text, and clears the local conversation", async () => {
  const requests = [];
  const { Chat } = loadChat(async (url, options = {}) => {
    if (url.endsWith("/status")) return { knowledge };
    requests.push(JSON.parse(options.body));
    return { answer: "Align territories with demand.", remainingQuestions: 19, sources: [
      { id: "source", title: "Handbook", page: 2, url: "https://cdn.sanity.io/files/project/production/abc.pdf#page=2", quote: "territories with demand" }
    ] };
  });
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(Chat)); });
    await act(async () => button(renderer, "Ask about this course").props.onClick());
    await act(async () => renderer.root.findByType("textarea").props.onChange({ target: { value: "Explain territories" } }));
    await act(async () => renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }));
    assert.equal(requests[0].question, "Explain territories");
    assert.deepEqual(requests[0].history, []);
    assert.match(requests[0].requestId, /^[0-9a-f-]{36}$/);
    assert.equal(renderer.root.findByType("a").props.target, "_blank");
    assert.ok(renderer.root.findAllByType("p").some((node) => node.children.join("") === "19 questions remaining today"));
    await act(async () => button(renderer, "Clear conversation").props.onClick());
    assert.equal(renderer.root.findAllByType("article").length, 0);
    assert.equal(renderer.root.findByType("textarea").props.value, "");
  } finally { if (renderer) await act(async () => renderer.unmount()); }
});

test("failed requests restore the question and do not display a fabricated answer", async () => {
  const { Chat } = loadChat(async (url) => {
    if (url.endsWith("/status")) return { knowledge };
    throw new Error("Daily usage allowance reached");
  });
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(Chat)); });
    await act(async () => button(renderer, "Ask about this course").props.onClick());
    await act(async () => renderer.root.findByType("textarea").props.onChange({ target: { value: "Explain territories" } }));
    await act(async () => renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }));
    assert.equal(renderer.root.findByType("textarea").props.value, "Explain territories");
    assert.equal(renderer.root.findAllByType("article").length, 0);
    assert.equal(renderer.root.findByProps({ role: "alert" }).children[0], "Daily usage allowance reached");
  } finally { if (renderer) await act(async () => renderer.unmount()); }
});

test("changing courses or logging out clears the panel instead of leaking conversation state", async () => {
  const fixture = loadChat(async () => ({ knowledge }));
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(fixture.Chat)); });
    await act(async () => button(renderer, "Ask about this course").props.onClick());
    assert.equal(renderer.root.findAllByProps({ role: "dialog" }).length, 1);
    fixture.setPath("/courses/course-two");
    await act(async () => renderer.update(React.createElement(fixture.Chat)));
    assert.equal(renderer.root.findAllByProps({ role: "dialog" }).length, 0);
    fixture.logout();
    await act(async () => renderer.update(React.createElement(fixture.Chat)));
    assert.equal(renderer.toJSON(), null);
  } finally { if (renderer) await act(async () => renderer.unmount()); }
});
