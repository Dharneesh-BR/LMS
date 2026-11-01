const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");

test("signup saves the selected profile before refreshing or navigating", async () => {
  const events = [];
  const profile = { companyName: "Example", phoneNumber: "1234567890", department: "Sales", designation: "Manager" };
  const filename = path.resolve(__dirname, "../app/login/page.tsx");
  const loaded = new Module(filename, module);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = (id) => {
    if (id === "next/image") return { __esModule: true, default: () => null };
    if (id === "next/navigation") return { useRouter: () => ({ push: () => events.push("navigate"), replace: () => {} }) };
    if (id === "@/components/auth-provider") return { useAuth: () => ({
      firebaseUser: null, apiUser: null, loading: false,
      refreshUser: async (force) => { assert.equal(force, true); events.push("refresh"); return { ...profile, role: "STUDENT" }; }
    }) };
    if (id === "@/lib/firebase") return { signupWithEmail: async () => ({ user: { getIdToken: async () => "token" } }) };
    if (id === "@/lib/api") return { apiFetch: async (url, init) => {
      assert.equal(url, "/api/auth/profile");
      assert.equal(init.method, "PUT");
      assert.deepEqual(JSON.parse(init.body), profile);
      assert.equal(init.headers.Authorization, "Bearer token");
      events.push("save");
      return { user: profile };
    } };
    if (id === "@/lib/audience-options") return { departmentOptions: ["Sales"], designationOptions: ["Manager"] };
    return require(id);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, filename);
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(loaded.exports.default)); });
    await act(async () => renderer.root.findAllByType("button").find((node) => node.children.includes("Create account")).props.onClick());
    await act(async () => {
      const inputs = renderer.root.findAllByType("input");
      ["test@example.com", "password123", profile.companyName, profile.phoneNumber].forEach((value, index) => inputs[index].props.onChange({ target: { value } }));
      renderer.root.findAllByType("select").forEach((node, index) => node.props.onChange({ target: { value: index ? profile.designation : profile.department } }));
    });
    await act(async () => renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }));
    assert.deepEqual(events, ["save", "refresh", "navigate"]);
  } finally { if (renderer) await act(async () => renderer.unmount()); }
});
