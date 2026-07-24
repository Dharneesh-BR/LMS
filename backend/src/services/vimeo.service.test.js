import assert from "node:assert/strict";
import test from "node:test";
import { getSecureVimeoUrl } from "./vimeo.service.js";

test("converts a Vimeo share URL to a player URL", () => {
  assert.equal(
    getSecureVimeoUrl("https://vimeo.com/76979871"),
    "https://player.vimeo.com/video/76979871"
  );
});

test("preserves the privacy hash for an unlisted Vimeo URL", () => {
  assert.equal(
    getSecureVimeoUrl("https://vimeo.com/123456789/abc123def4"),
    "https://player.vimeo.com/video/123456789?h=abc123def4"
  );
});

test("accepts an existing Vimeo player URL", () => {
  assert.equal(
    getSecureVimeoUrl("https://player.vimeo.com/video/76979871?h=abc123"),
    "https://player.vimeo.com/video/76979871?h=abc123"
  );
});

test("rejects non-Vimeo URLs", () => {
  assert.throws(
    () => getSecureVimeoUrl("https://example.com/video/76979871"),
    /Vimeo URL/
  );
});
