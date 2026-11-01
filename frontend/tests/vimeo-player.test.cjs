const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { create, act } = require("react-test-renderer");

const filename = path.resolve(__dirname, "../components/vimeo-player.tsx");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }
});
const componentModule = new Module(filename, module);
componentModule.paths = Module._nodeModulePaths(path.dirname(filename));
componentModule._compile(compiled.outputText, filename);
const { VimeoPlayer } = componentModule.exports;

async function setup(t) {
  const players = [];
  const originalWindow = global.window;
  class Player {
    constructor() { this.events = {}; this.seeks = []; this.destroyed = false; players.push(this); }
    on(event, callback) { this.events[event] = callback; }
    async getDuration() { return 100; }
    async getCurrentTime() { return 10; }
    async setCurrentTime(seconds) { this.seeks.push(seconds); this.events.seeked?.({ seconds }); return seconds; }
    async play() { this.events.play?.(); }
    async destroy() { this.destroyed = true; }
  }
  global.window = { Vimeo: { Player }, setInterval: () => 1, clearInterval: () => {} };
  let renderer;
  t.after(async () => {
    if (renderer) await act(async () => renderer.unmount());
    if (originalWindow === undefined) delete global.window;
    else global.window = originalWindow;
  });
  return {
    players,
    async render(props) {
      await act(async () => {
        const element = React.createElement(VimeoPlayer, props);
        if (renderer) renderer.update(element);
        else renderer = create(element, { createNodeMock: (node) => node.type === "iframe" ? {} : null });
      });
      return renderer;
    }
  };
}

test("saved progress updates do not destroy or restart the current video", async (t) => {
  const { players, render } = await setup(t);
  const props = { url: "https://player.vimeo.com/video/123", initialSeconds: 10, onProgressSave: async () => {} };
  const renderer = await render(props);
  await act(async () => players[0].events.play());
  await render({ ...props, initialSeconds: 20 });
  assert.equal(players.length, 1);
  assert.equal(players[0].destroyed, false);
  assert.deepEqual(players[0].seeks, [10]);
  assert.equal(renderer.root.findAllByType("button").length, 0);
  const iframe = renderer.root.findByType("iframe");
  const url = new URL(iframe.props.src);
  assert.equal(url.searchParams.get("controls"), "0");
  assert.equal(url.searchParams.get("keyboard"), "0");
  assert.ok(iframe.props.className.includes("pointer-events-none"));
});

test("the player still rejects forward seeks and saves natural completion", async (t) => {
  const { players, render } = await setup(t);
  const saved = [];
  let now = 10000;
  t.mock.method(Date, "now", () => now);
  const renderer = await render({ url: "https://player.vimeo.com/video/123", initialSeconds: 10, onProgressSave: async (update) => saved.push(update) });
  await act(async () => players[0].events.play());
  now += 1000;
  await act(async () => players[0].events.seeked({ seconds: 80 }));
  assert.equal(players[0].seeks.at(-1), 10);
  assert.equal(saved.length, 0);
  now += 90000;
  await act(async () => players[0].events.timeupdate({ seconds: 100, duration: 100 }));
  assert.equal(saved.length, 1);
  assert.deepEqual(saved[0], { watchedSeconds: 100, durationSeconds: 100, completed: true, completionSource: "video-ended" });
  assert.equal(renderer.root.findByType("button").props["aria-label"], "Replay video");
});

test("changing the video creates a fresh player and applies its own resume position", async (t) => {
  const { players, render } = await setup(t);
  await render({ url: "https://player.vimeo.com/video/123", initialSeconds: 10 });
  await render({ url: "https://player.vimeo.com/video/456", initialSeconds: 25 });
  assert.equal(players.length, 2);
  assert.equal(players[0].destroyed, true);
  assert.deepEqual(players[1].seeks, [25]);
});
