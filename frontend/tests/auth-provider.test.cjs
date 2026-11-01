const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");

test("verification is deduplicated and an old account cannot overwrite the new session", async () => {
  const auth = { currentUser: null };
  let listener, state, renderer;
  const requests = [];
  const filename = path.resolve(__dirname, "../components/auth-provider.tsx");
  const loaded = new Module(filename, module);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = (id) => {
    if (id === "firebase/auth") return { onAuthStateChanged: (_, callback) => { listener = callback; return () => {}; } };
    if (id === "@/lib/firebase") return { getFirebaseAuth: () => auth };
    if (id === "@/lib/api") return { apiFetch: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) };
    return require(id);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, filename);
  const { AuthProvider, useAuth } = loaded.exports;
  function Consumer() { state = useAuth(); return null; }
  try {
    await act(async () => { renderer = create(React.createElement(AuthProvider, null, React.createElement(Consumer))); });
    const first = { getIdToken: async () => "first" };
    auth.currentUser = first;
    let firstChange, duplicate;
    await act(async () => { firstChange = listener(first); });
    await act(async () => { duplicate = state.refreshUser(); });
    assert.equal(requests.length, 1);
    const second = { getIdToken: async () => "second" };
    auth.currentUser = second;
    let secondChange;
    await act(async () => { secondChange = listener(second); });
    assert.equal(state.loading, true);
    await act(async () => { requests[0].resolve({ user: { id: "first" } }); await firstChange; await duplicate; });
    assert.equal(state.apiUser, null);
    assert.equal(state.loading, true);
    await act(async () => { requests[1].resolve({ user: { id: "second" } }); await secondChange; });
    assert.equal(state.apiUser.id, "second");
    assert.equal(state.loading, false);
    let oldRefresh, savedRefresh;
    await act(async () => { oldRefresh = state.refreshUser(); });
    await act(async () => { savedRefresh = state.refreshUser(true); });
    assert.equal(requests.length, 4);
    await act(async () => {
      requests[3].resolve({ user: { id: "second", department: "Sales", designation: "Manager" } });
      await savedRefresh;
    });
    await act(async () => {
      requests[2].resolve({ user: { id: "second", department: null, designation: null } });
      await oldRefresh;
    });
    assert.equal(state.apiUser.department, "Sales");
    assert.equal(state.apiUser.designation, "Manager");
    await act(async () => { auth.currentUser = null; await listener(null); });
    assert.equal(state.apiUser, null);
    assert.equal(state.firebaseUser, null);
  } finally { if (renderer) await act(async () => renderer.unmount()); }
});
