import app from "./app.js";
import { env, isDesignPreview } from "./config/env.js";

app.listen(env.PORT, () => {
  console.log(`Magnafic Academy API listening on http://localhost:${env.PORT}`);
  console.log(`Design preview mode: ${isDesignPreview ? "enabled" : "disabled"}`);
});
