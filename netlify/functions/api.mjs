import serverless from "serverless-http";
import app from "../src/app.js";

const handleRequest = serverless(app, {
  binary: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg"
  ]
});

export function normalizeFunctionPath(path) {
  const prefix = "/.netlify/functions/api";
  if (path !== prefix && !path.startsWith(`${prefix}/`)) return path;
  const suffix = path.slice(prefix.length);
  return suffix === "/health" ? suffix : `/api${suffix}`;
}

export const handler = (event, context) => handleRequest({
  ...event,
  path: normalizeFunctionPath(event.path)
}, context);
