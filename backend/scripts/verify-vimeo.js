import { env } from "../src/config/env.js";

async function verifyVimeo() {
  const token = env.VIMEO_ACCESS_TOKEN?.trim();

  if (!token) {
    console.error("Set VIMEO_ACCESS_TOKEN in backend/.env before running this command");
    process.exitCode = 1;
    return;
  }

  const response = await fetch("https://api.vimeo.com/me", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4"
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload.developer_message || payload.error || "Token was rejected";
    console.error(`Vimeo authentication failed (HTTP ${response.status}): ${detail}`);
    process.exitCode = 1;
    return;
  }

  const account = await response.json();
  console.log(`Connected to Vimeo account: ${account.name || account.uri}`);
}

await verifyVimeo();
