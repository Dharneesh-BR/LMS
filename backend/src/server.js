import app from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, () => {
  console.log(`Magnafic Academy API listening on http://localhost:${env.PORT}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down API`);
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
